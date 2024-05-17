import hre from "hardhat";
import {
  MORPHO_ADDRESS,
  ONE_INCH_ADDRESS_MAINNET,
} from "../src/utils/constants";

export const deploy = async () => {
  const liquidatorContract = await hre.ethers.deployContract("Liquidator", [
    MORPHO_ADDRESS,
    ONE_INCH_ADDRESS_MAINNET,
  ]);
  const liquidatorContractAddress = await liquidatorContract.getAddress();
  return liquidatorContractAddress;
};

// Allow running the script standalone
if (require.main === module) {
  deploy()
    .then((address) => {
      console.log(`Deployed Liquidator contract at: ${address}`);
    })
    .catch((error) => {
      console.error("Error deploying Liquidator contract:", error);
    });
}
