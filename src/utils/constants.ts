// Main contract addresses for MorphoBlue. Update this value according to the deployed contract.
export const MORPHO_ADDRESS = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
export const IRM_ADDRESS = "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC";

// Maths and Constants
export const pow10 = (exponant: bigint | number) => 10n ** BigInt(exponant);
export const WAD = pow10(18);
export const SECONDS_PER_YEAR = 3600 * 24 * 365;
export const MAX_UINT256 = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
);

// https://github.com/morpho-org/morpho-blue/blob/main/src/libraries/ConstantsLib.sol
export const ORACLE_PRICE_SCALE = pow10(36);
export const LIQUIDATION_CURSOR = 3n * pow10(17n);
export const MAX_LIQUIDATION_INCENTIVE_FACTOR = 115n * pow10(16n);

// https://github.com/morpho-org/morpho-blue/blob/main/src/libraries/SharesMathLib.sol
export const VIRTUAL_ASSETS = 1n;
export const VIRTUAL_SHARES = 10n ** 6n;

// 1Inch AggregatorV6 Mainnet Address
export const ONE_INCH_ADDRESS_MAINNET =
  "0x111111125421ca6dc452d289314280a0f8842a65";

// Morpho Blue API endpoint
export const BLUE_API = "https://blue-api.morpho.org/graphql";

// Blocks
export const MORPHO_BLUE_MAINNET_DEPLOYMENT_BLOCK = 18883124;
