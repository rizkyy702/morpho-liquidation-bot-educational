import {
  ContractTransactionReceipt,
  Provider,
  Signer,
  ethers,
  formatUnits,
  parseUnits,
} from "ethers";
import { fetchAllLiquidatableUsersPositions } from "../fetcher/fetch";
import { compileBorrowersPerMarket } from "./borrowerFetcher";
import {
  incentiveFactor,
  mulDivDown,
  toAssetsDown,
  wMulDown,
} from "../utils/maths";
import {
  LiquidatableUser,
  LiquidatableUserWithSeizableCollateral,
  LiquidationCandidate,
  SwapInput,
  SwapOutput,
} from "../utils/types";
import { ORACLE_PRICE_SCALE, WAD } from "../utils/constants";
import { oneInchSwapCall } from "../oneInch/oneInch";
import { sleep } from "../utils/sleep";
import "dotenv/config";
import { Liquidator__factory } from "../../typechain-types/factories/artifacts/contracts/Liquidator__factory";
import { fetchAssetData } from "../fetcher/queryAssets";
import { getSigner, getAddress } from "../utils/envVariable";

// in the case where there will be no bad debt, one should use repaid shares
// in the case where there will be bad debt, one should use seize collateral

const computeSituation = (
  user: LiquidatableUser
): LiquidatableUserWithSeizableCollateral => {
  let collateralToSwap = 0n;
  let maxShares: boolean;

  const {
    userPosition,
    marketMetadata: { marketState, collateralPrice },
  } = user;

  if (!marketState || !collateralPrice) {
    return { ...user, collateralToSwap: 0n, maxShares: false };
  }

  const borrowerMaxAssets = toAssetsDown(
    userPosition.borrowShares,
    marketState.totalBorrowAssets,
    marketState.totalBorrowShares
  );

  const liquidationIncentiveFactor = incentiveFactor(
    user.marketMetadata.marketParams.lltv
  );

  console.log(
    "\nLiquidation Incentive Factor:",
    formatUnits((liquidationIncentiveFactor - WAD) * 100n, 18),
    "%"
  );

  const theoreticalSeizableCollateralQuotedInLoan = wMulDown(
    borrowerMaxAssets,
    liquidationIncentiveFactor
  );

  const theoreticalSeizableCollateral = mulDivDown(
    theoreticalSeizableCollateralQuotedInLoan,
    ORACLE_PRICE_SCALE,
    collateralPrice
  );

  console.log(
    "Collateral seizable by the liquidator",
    theoreticalSeizableCollateral
  );
  console.log(
    "Collateral of the unhealthy borrower ",
    userPosition.collateral,
    ":\n"
  );

  if (userPosition.collateral >= theoreticalSeizableCollateral) {
    // Case 1:
    // The Liquidation Incentive Factor * RepaidAssets =< Collateral of the unhealthy position
    // Liquidator has to liquidate with `repaidShare`s, ensuring the entire debt is repaid as one can repay the whole debt.
    console.log("Information:");
    console.log(
      "The liquidation will not incur any bad debt as the borrower has more collateral than what is needed to repay the debt"
    );
    console.log("The liquidation will occur by repaying all borrow shares");

    collateralToSwap = theoreticalSeizableCollateral;

    maxShares = true;
  } else {
    // Case 2:
    // The Liquidation Incentive Factor * RepaidAssets > Collateral of the unhealthy position.
    // There will be bad debt realized, liquidator will seize the collateral amount of the user, and repay only a fraction of the debt.
    maxShares = false;
    collateralToSwap = userPosition.collateral;
  }
  return { ...user, collateralToSwap, maxShares };
};

export const _atomicLiquidation = async (
  userToLiquidate: LiquidationCandidate
): Promise<ContractTransactionReceipt | null> => {
  try {
    console.log("\nTrying to liquidate user:", userToLiquidate.userAddress);

    const signer = getSigner(
      new ethers.JsonRpcProvider(process.env.LIQUIDATION_RPC_URL)
    );
    const liquidatorAddress = getAddress();
    const Liquidator = Liquidator__factory.connect(liquidatorAddress, signer);

    let tx: any;

    // As a reminder, during a liquidation on Morpho Blue either repaidShares or seizedAssets should be 0.
    if (userToLiquidate.maxShares) {
      // Let's liquidate with borrow shares
      tx = await Liquidator.liquidate(
        userToLiquidate.marketMetadata.marketParams,
        userToLiquidate.userAddress,
        0, // seizedAssets = 0
        userToLiquidate.userPosition.borrowShares, // repaid shares
        userToLiquidate.swap.oneInchResponse.tx.data
      );
    } else {
      // let's liquidate with seized assets
      tx = await Liquidator.liquidate(
        userToLiquidate.marketMetadata.marketParams,
        userToLiquidate.userAddress,
        userToLiquidate.collateralToSwap, // seizedAssets
        0, // repaidShares = 0
        userToLiquidate.swap.oneInchResponse.tx.data
      );
    }
    return await tx.wait();
  } catch (error) {
    console.error("Failed to liquidate user:", userToLiquidate.userAddress);
    console.error("Error details:", error);
    return null;
  }
};

export const atomicLiquidation = (
  userToLiquidate: LiquidationCandidate | null
): Promise<ContractTransactionReceipt | null> => {
  if (!userToLiquidate) {
    return Promise.resolve(null);
  }
  return _atomicLiquidation(userToLiquidate);
};

export const liquidateUsers = async (
  whitelist: string[],
  provider?: Provider
): Promise<LiquidationCandidate[] | null> => {
  console.log("Saving borrowers into a .json file");
  await compileBorrowersPerMarket(whitelist, provider).catch(console.error);

  const userLiquidatablePositions = await fetchAllLiquidatableUsersPositions(
    whitelist,
    provider
  );
  if (!userLiquidatablePositions) {
    console.log("No positions to process.");
    return null;
  }

  console.log(
    "\n",
    userLiquidatablePositions.length,
    "liquidatable positions found."
  );

  const processedUsers = userLiquidatablePositions
    .map((user) => {
      if (!user) {
        console.error("Encountered null user data, skipping.");
        return null;
      }
      return computeSituation(user);
    })
    .filter(
      (user): user is LiquidatableUserWithSeizableCollateral => user !== null
    );

  const results: LiquidationCandidate[] = [];

  for (const userToLiquidate of processedUsers) {
    if (!userToLiquidate) continue;

    const swapParams: SwapInput = {
      src: userToLiquidate.marketMetadata.marketParams.collateralToken,
      dst: userToLiquidate.marketMetadata.marketParams.loanToken,
      amount: userToLiquidate.collateralToSwap.toString(),
      from: process.env.LIQUIDATOR_ADDRESS!,
      slippage: "1",
      disableEstimate: "true",
      allowPartialFill: "false",
      includeTokensInfo: "true",
      compatibility: "true",
    };

    const oneInchResponse = await oneInchSwapCall(swapParams, 1);
    if (!oneInchResponse) return [];

    // Let's compute the gain we will do:
    // Gain = collateral seized minus the amount repaid

    const swapOutput: SwapOutput = oneInchResponse;

    const liquidationIncentiveFactor = incentiveFactor(
      userToLiquidate.marketMetadata.marketParams.lltv
    );

    const seizableCollateral = userToLiquidate.collateralToSwap;

    const repaidAssets = mulDivDown(
      seizableCollateral,
      userToLiquidate.marketMetadata.collateralPrice,
      ORACLE_PRICE_SCALE
    );
    const incentivizedRepaidAssets = wMulDown(
      repaidAssets,
      liquidationIncentiveFactor
    );
    const loanTokenData = await fetchAssetData(
      userToLiquidate.marketMetadata.marketParams.loanToken
    );
    const gainsInLoanAsset = incentivizedRepaidAssets - repaidAssets;
    const gainsUsd = wMulDown(
      parseUnits(loanTokenData.priceUsd.toString(), 18),
      gainsInLoanAsset
    );
    const gainsUsdNormalized: string = formatUnits(gainsUsd, 18);

    await sleep(1000);

    results.push({
      swap: {
        seizableCollateral,
        oneInchResponse,
        gainsUsd,
        gainsUsdNormalized,
      },
      ...userToLiquidate,
    });
  }

  for (const userToLiquidateWithData of results) {
    if (!userToLiquidateWithData) continue;

    await atomicLiquidation(userToLiquidateWithData);
    console.log("Liquidation details:", userToLiquidateWithData);
  }

  return results;
};
