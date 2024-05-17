import { expect } from "chai";
import "dotenv/config";
import { deploy } from "../scripts/deployLiquidatorContract";
import { liquidateUsers } from "../src/liquidate/liquidate";
import { ethers } from "ethers";
import { network } from "hardhat";
import { LiquidationCandidate } from "../src/utils/types";
import { setup1InchMock } from "./mocks/oneInch.mock";
import { getEnvVar } from "../src/utils/envVariable";
import { summaryPosition } from "./utils/analyze";

describe("Educational Liquidation Bot", function () {
  let whitelistedMarkets: string[];
  let liquidatorContractAddress: string;
  const provider = new ethers.BrowserProvider(network.provider);

  before(async function () {
    setup1InchMock();
    liquidatorContractAddress = await deploy();
    console.log(
      "\nAddress of the liquidator contract:",
      liquidatorContractAddress
    );

    // Retrieve whitelisted markets from environment variables
    whitelistedMarkets = getEnvVar("WHITELISTED_MARKET_IDS")
      .split(",")
      .map((market) => market.trim());
  });

  it("should be on the correct block number", async function () {
    const blockNumber = await provider.getBlockNumber();
    console.log("\nForked from block:", blockNumber);
    expect(blockNumber).to.equal(19888760); // Replace with your specified block number
  });

  it("Test that the liquidation bot has been deployed", async function () {
    expect(liquidatorContractAddress).to.equal(
      "0xabebE9a2D62Af9a89E86EB208b51321e748640C3"
    );
  });

  it("Should liquidate users (gas costs not considered)", async function () {
    const liquidatorAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const liquidateeAddress = "0x0b03ad6AD7f81521BB35cE8cdbA7992C913ca553";
    const liquidationContractAddress =
      "0x798f111c92E38F102931F34D1e0ea7e671BDBE31";
    const marketId =
      "0xfd8493f09eb6203615221378d89f53fcd92ff4f7d62cca87eece9a2fff59e86f";
    console.log(
      "----------------------------------------------------------------------"
    );
    console.log(
      "\nSUMMARY pre liquidation at block number",
      await provider.getBlockNumber()
    );
    await summaryPosition(provider, liquidatorAddress, "Liquidator", marketId);
    await summaryPosition(provider, liquidateeAddress, "Liquidatee", marketId);
    await summaryPosition(
      provider,
      liquidationContractAddress,
      "Liquidation contract",
      marketId
    );
    console.log(
      "----------------------------------------------------------------------"
    );

    console.log("\nLiquidating users...");
    console.log("\nWhitelisted Markets:", whitelistedMarkets, "\n");

    const liquidatedUsers: LiquidationCandidate[] | null = await liquidateUsers(
      whitelistedMarkets,
      provider
    );
    expect(liquidatedUsers).to.have.length(1);

    if (!liquidatedUsers) {
      console.log("No liquidatable users found.");
      return;
    }

    for (const user of liquidatedUsers) {
      console.log(
        `\nLiquidated user: ${user.userAddress}\nwith ${
          user.collateralToSwap
        } collateral,\nat block ${await provider.getBlockNumber()}\n`
      );
      console.log(
        "----------------------------------------------------------------------"
      );
      console.log(
        "\nSUMMARY post liquidation at block number",
        await provider.getBlockNumber()
      );
      await summaryPosition(
        provider,
        liquidatorAddress,
        "Liquidator",
        marketId
      );
      await summaryPosition(
        provider,
        liquidateeAddress,
        "Liquidatee",
        marketId
      );
      await summaryPosition(
        provider,
        liquidationContractAddress,
        "Liquidation contract",
        marketId
      );
      console.log(
        "----------------------------------------------------------------------"
      );
    }
  });
});
