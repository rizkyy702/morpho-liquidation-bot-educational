import { ethers, isAddress, Provider, ZeroAddress } from "ethers";
import {
  MorphoBlue__factory,
  BlueOracle__factory,
  BlueIrm__factory,
} from "ethers-types";

import {
  IRM_ADDRESS,
  MAX_UINT256,
  MORPHO_ADDRESS,
  ORACLE_PRICE_SCALE,
  WAD,
} from "../utils/constants";

import {
  Contracts,
  MarketParams,
  MarketState,
  PositionUserAssets,
} from "../utils/types";

import {
  wMulDown,
  wTaylorCompounded,
  toSharesDown,
  toAssetsUp,
  mulDivDown,
  wDivDown,
  toAssetsDown,
} from "../utils/maths";

import path from "path";
import fs from "fs";
import { MulticallWrapper } from "ethers-multicall-provider";
import { getEnvVar } from "../utils/envVariable";

// Initialize provider
const initializeProvider = (): Provider => {
  const endpoint = getEnvVar("RPC_URL");
  return MulticallWrapper.wrap(new ethers.JsonRpcProvider(endpoint));
};

export const getProvider = initializeProvider;

export const morphoContracts = async (provider?: Provider) => {
  if (!isAddress(MORPHO_ADDRESS)) throw new Error("MORPHO_ADDRESS unset");
  const morphoBlue = MorphoBlue__factory.connect(
    MORPHO_ADDRESS,
    provider ?? initializeProvider()
  );
  return { morphoBlue };
};

// This function is used to calculate the accrued interests as interest are virtually accruing until next interaction
const accrueInterests = (
  lastBlockTimestamp: bigint,
  marketState: MarketState,
  borrowRate: bigint
) => {
  const elapsed = lastBlockTimestamp - marketState.lastUpdate;

  // Early return if no time has elapsed since the last update
  if (elapsed === 0n || marketState.totalBorrowAssets === 0n) {
    return marketState;
  }

  // Calculate interest
  const interest = wMulDown(
    marketState.totalBorrowAssets,
    wTaylorCompounded(borrowRate, elapsed)
  );

  // Prepare updated market state with new totals
  const marketWithNewTotal = {
    ...marketState,
    totalBorrowAssets: marketState.totalBorrowAssets + interest,
    totalSupplyAssets: marketState.totalSupplyAssets + interest,
  };

  // Early return if there's no fee
  if (marketWithNewTotal.fee === 0n) {
    return marketWithNewTotal;
  }

  // Calculate fee and feeShares if the fee is not zero
  const feeAmount = wMulDown(interest, marketWithNewTotal.fee);
  const feeShares = toSharesDown(
    feeAmount,
    marketWithNewTotal.totalSupplyAssets - feeAmount,
    marketWithNewTotal.totalSupplyShares
  );

  // Return final market state including feeShares
  return {
    ...marketWithNewTotal,
    totalSupplyShares: marketWithNewTotal.totalSupplyShares + feeShares,
  };
};

// This function is used to calculate the updated market state
const fetchMarketsData = async (
  { morphoBlue }: Contracts,
  id: string,
  provider?: Provider
) => {
  const block = await provider?.getBlock("latest");

  const [marketParams_, marketState_] = await Promise.all([
    morphoBlue.idToMarketParams(id),
    morphoBlue.market(id),
  ]);

  const marketParams: MarketParams = {
    loanToken: marketParams_.loanToken,
    collateralToken: marketParams_.collateralToken,
    oracle: marketParams_.oracle,
    irm: marketParams_.irm,
    lltv: marketParams_.lltv,
  };

  let marketState: MarketState = {
    totalSupplyAssets: marketState_.totalSupplyAssets,
    totalSupplyShares: marketState_.totalSupplyShares,
    totalBorrowAssets: marketState_.totalBorrowAssets,
    totalBorrowShares: marketState_.totalBorrowShares,
    lastUpdate: marketState_.lastUpdate,
    fee: marketState_.fee,
  };

  const irm = BlueIrm__factory.connect(IRM_ADDRESS, provider);

  const borrowRate: bigint =
    IRM_ADDRESS !== ZeroAddress
      ? await irm.borrowRateView(marketParams, marketState, {
          blockTag: block?.number,
        })
      : 0n;

  marketState = accrueInterests(
    BigInt(block!.timestamp),
    marketState,
    borrowRate
  );

  const oracle = BlueOracle__factory.connect(marketParams_.oracle, provider);
  const collateralPrice = await oracle.price();

  return {
    marketId: id,
    marketState,
    marketParams,
    collateralPrice,
  };
};

// This function is used to calculate the healthfactor of users and return liquidatable positions
export const fetchAllUserData = async (
  contracts: Contracts,
  marketId: string,
  userAddresses: string[],
  marketState: MarketState,
  marketParams: MarketParams,
  collateralPrice: bigint,
  provider?: Provider
): Promise<
  Array<{
    userAddress: string;
    isHealthy: boolean;
    healthFactor: bigint;
    collateral: bigint;
    borrowAssetsUser: bigint;
    supplyAssetsUser: bigint;
    supplyShares: bigint;
    borrowShares: bigint;
  } | null>
> => {
  try {
    provider ??= initializeProvider();

    // Process each user's position in parallel
    const userPositionsPromises = userAddresses.map(async (userAddress) => {
      const position_ = await contracts.morphoBlue.position(
        marketId,
        userAddress
      );

      if (position_.borrowShares === 0n) {
        return null; // Skip users with no borrow position
      }

      const borrowAssetsUser = toAssetsUp(
        position_.borrowShares,
        marketState.totalBorrowAssets,
        marketState.totalBorrowShares
      );

      const supplyAssetsUser = toAssetsDown(
        position_.supplyShares,
        marketState.totalSupplyAssets,
        marketState.totalSupplyShares
      );

      const maxBorrow = wMulDown(
        mulDivDown(position_.collateral, collateralPrice, ORACLE_PRICE_SCALE),
        marketParams.lltv
      );
      const isHealthy = maxBorrow >= borrowAssetsUser;

      let healthFactor =
        borrowAssetsUser === 0n
          ? MAX_UINT256
          : wDivDown(maxBorrow, borrowAssetsUser);

      return {
        userAddress,
        isHealthy,
        healthFactor,
        collateral: position_.collateral,
        borrowAssetsUser: borrowAssetsUser,
        supplyAssetsUser: supplyAssetsUser,
        supplyShares: position_.supplyShares,
        borrowShares: position_.borrowShares,
      };
    });

    // Await all user position promises
    const userPositions = await Promise.all(userPositionsPromises);

    return userPositions.filter((position) => position !== null); // Filter out null positions
  } catch (error) {
    console.error(`Error fetching user data for market ${marketId}:`, error);
    throw error;
  }
};

export const fetchAllLiquidatableUsersPositions = async (
  whitelist: string[],
  provider?: Provider
) => {
  const contracts = await morphoContracts(provider);

  const borrowersDataPath = path.resolve(
    __dirname, // current directory (liquidation-bot-education/src/fetcher)
    "..", // move up to src
    "data", // move into data
    "borrowersPerMarket.json" // file name
  );
  const borrowersData = JSON.parse(fs.readFileSync(borrowersDataPath, "utf8"));

  const markets = await Promise.all(
    whitelist.map((marketId) => fetchMarketsData(contracts, marketId, provider))
  );

  const marketPromises = markets.map(async (market) => {
    // Update access to userAddresses using new data structure
    const userAddresses =
      borrowersData.markets[market.marketId]?.borrowers || [];
    if (userAddresses.length === 0) return [];

    try {
      const usersData = await fetchAllUserData(
        contracts,
        market.marketId,
        userAddresses,
        market.marketState,
        market.marketParams,
        market.collateralPrice,
        provider
      );

      // Filter and map as before
      return usersData
        .filter(
          (userData) =>
            userData && parseFloat(userData.healthFactor.toString()) < WAD
        )
        .map((userData) => {
          if (!userData) return null;

          const detailedPosition: PositionUserAssets = {
            supplyShares: userData.supplyShares,
            borrowShares: userData.borrowShares,
            collateral: userData.collateral,
            borrowAssets: userData.borrowAssetsUser,
          };

          return {
            userAddress: userData.userAddress,
            marketId: market.marketId,
            userPosition: detailedPosition,
            marketMetadata: {
              marketParams: market.marketParams,
              marketState: market.marketState,
              collateralPrice: market.collateralPrice,
            },
            healthFactor: userData.healthFactor,
          };
        });
    } catch (error) {
      console.error(`Error processing market ${market.marketId}:`, error);
      return []; // Return an empty array on error to keep the structure consistent
    }
  });

  const results = await Promise.allSettled(marketPromises);
  let allUserPositions = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  // Ensure no null values before sorting
  allUserPositions = allUserPositions.filter((position) => position !== null);

  return allUserPositions.sort((a, b) => {
    if (!a || !b) return 0; // Handle nulls appropriately
    return (
      parseFloat(a.healthFactor.toString()) -
      parseFloat(b.healthFactor.toString())
    );
  });
};
