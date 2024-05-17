import {
  LIQUIDATION_CURSOR,
  MAX_LIQUIDATION_INCENTIVE_FACTOR,
  VIRTUAL_ASSETS,
  VIRTUAL_SHARES,
  WAD,
} from "./constants";

export const min = (a: bigint, b: bigint) => (a < b ? a : b);
export const max = (a: bigint, b: bigint) => (a < b ? b : a);
export const wMulDown = (x: bigint, y: bigint): bigint => mulDivDown(x, y, WAD);
export const wDivDown = (x: bigint, y: bigint): bigint => mulDivDown(x, WAD, y);
export const wDivUp = (x: bigint, y: bigint): bigint => mulDivUp(x, WAD, y);

export const mulDivDown = (x: bigint, y: bigint, d: bigint): bigint =>
  (x * y) / d;
export const mulDivUp = (x: bigint, y: bigint, d: bigint): bigint =>
  (x * y + (d - 1n)) / d;

export const wTaylorCompounded = (x: bigint, n: bigint): bigint => {
  const firstTerm = x * n;
  const secondTerm = mulDivDown(firstTerm, firstTerm, 2n * WAD);
  const thirdTerm = mulDivDown(secondTerm, firstTerm, 3n * WAD);
  return firstTerm + secondTerm + thirdTerm;
};

export const toAssetsDown = (
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint => {
  return mulDivDown(
    shares,
    totalAssets + VIRTUAL_ASSETS,
    totalShares + VIRTUAL_SHARES
  );
};

/// @dev Calculates the value of `shares` quoted in assets, rounding down.
export const toSharesDown = (
  assets: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint => {
  return mulDivDown(
    assets,
    totalShares + VIRTUAL_SHARES,
    totalAssets + VIRTUAL_ASSETS
  );
};

/// @dev Calculates the value of `shares` quoted in assets, rounding up.
export const toAssetsUp = (
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint => {
  return mulDivUp(
    shares,
    totalAssets + VIRTUAL_ASSETS,
    totalShares + VIRTUAL_SHARES
  );
};

// https://github.com/morpho-org/morpho-blue/blob/main/src/Morpho.sol#L366
export const incentiveFactor = (lltv: bigint) => {
  return min(
    MAX_LIQUIDATION_INCENTIVE_FACTOR,
    wDivDown(WAD, WAD - wMulDown(LIQUIDATION_CURSOR, WAD - lltv))
  );
};
