import { ERC20__factory, MorphoBlue__factory } from "ethers-types";
import { MORPHO_ADDRESS } from "../../src/utils/constants";
import { Provider, formatUnits, parseUnits } from "ethers";
import { fetchAssetData } from "../../src/utils/queryAssets";
import { wMulDown } from "../../src/utils/maths";

const fetchTokenBalance = async (
  tokenAddress: string,
  provider: Provider,
  userAddress: string
) => {
  const token = ERC20__factory.connect(tokenAddress, provider);
  const tokenData = await fetchAssetData(tokenAddress);
  const tokenBalance = await token.balanceOf(userAddress);
  return { token, tokenData, tokenBalance };
};

const calculateUsdValue = (priceUsd: number, balance: bigint) => {
  return wMulDown(parseUnits(priceUsd.toString(), 18) || 0n, balance);
};

const logPosition = (
  label: string,
  userAddress: string,
  loanBalance: bigint,
  collateralBalance: bigint,
  loanAssetUsd: bigint,
  collateralAssetUsd: bigint,
  position: any
) => {
  console.log(`\n${label}:`, userAddress);
  console.log("Loan balance:             ", formatUnits(loanBalance, 18));
  console.log("Collateral balance:       ", formatUnits(collateralBalance, 18));
  console.log("Loan balance in USD:      ", formatUnits(loanAssetUsd, 18), "$");
  console.log(
    "Collateral balance in USD:",
    formatUnits(collateralAssetUsd, 18),
    "$"
  );
  console.log("Supply shares:            ", position.supplyShares);
  console.log("Borrow shares:            ", position.borrowShares);
  console.log("Collateral:               ", position.collateral);
  console.log(
    "Collateral balance in USD:",
    formatUnits(calculateUsdValue(position.collateral, collateralAssetUsd), 18),
    "$"
  );
};

export const summaryPosition = async (
  provider: Provider,
  userAddress: string,
  label: string,
  marketId: string
) => {
  const morpho = MorphoBlue__factory.connect(MORPHO_ADDRESS, provider);
  const marketParams = await morpho.idToMarketParams(marketId);

  const loanData = await fetchTokenBalance(
    marketParams.loanToken,
    provider,
    userAddress
  );

  const collateralData = await fetchTokenBalance(
    marketParams.collateralToken,
    provider,
    userAddress
  );

  const position = await morpho.position(marketId, userAddress);

  const loanAssetUsd = calculateUsdValue(
    loanData.tokenData.priceUsd,
    loanData.tokenBalance
  );

  const collateralAssetUsd = calculateUsdValue(
    collateralData.tokenData.priceUsd,
    collateralData.tokenBalance
  );
  logPosition(
    label,
    userAddress,
    loanData.tokenBalance,
    collateralData.tokenBalance,
    loanAssetUsd,
    collateralAssetUsd,
    position
  );
};
