import { MorphoBlue } from "ethers-types";

export type MarketState = {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
};

export type MarketParams = {
  loanToken: string;
  collateralToken: string;
  oracle: string;
  irm: string;
  lltv: bigint;
};

export type PositionUser = {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
};

export type PositionUserAssets = PositionUser & {
  borrowAssets: bigint;
};

export interface Contracts {
  morphoBlue: MorphoBlue;
}

export type LiquidatableUser = {
  userAddress: string;
  marketId: string;
  userPosition: PositionUser;
  marketMetadata: {
    marketParams: MarketParams;
    marketState: MarketState;
    collateralPrice: bigint;
  };
  healthFactor: bigint;
};

export type LiquidatableUserWithSeizableCollateral = LiquidatableUser & {
  collateralToSwap: bigint;
  maxShares: boolean;
};

// Swap Types
export type SwapInput = {
  src: string;
  dst: string;
  amount: string;
  from: string;
  slippage: string;
  disableEstimate: string;
  allowPartialFill: string;
  includeTokensInfo: string;
  compatibility: string;
};

export type SwapOutput = {
  dstAmount: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: number;
    gasPrice: string;
  };
};

export type LiquidationCandidate = {
  swap: {
    seizableCollateral: bigint;
    oneInchResponse: SwapOutput;
    gainsUsd: bigint;
    gainsUsdNormalized: string;
  };
} & LiquidatableUserWithSeizableCollateral;
