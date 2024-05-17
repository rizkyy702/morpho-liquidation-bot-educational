import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import "hardhat-tracer";
import * as AggregationRouterV6 from "./abis/AggregationRouterV6.json";
const { RPC_URL } = process.env;

const compilerConfig = {
  viaIR: true,
  optimizer: {
    enabled: true,
    details: {
      yulDetails: {
        optimizerSteps: "u",
      },
    },
  },
};
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.23", settings: compilerConfig },
      { version: "0.8.19", settings: compilerConfig },
    ],
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545", // Default URL for Hardhat local node
      chainId: 1337, // Default chain ID for Hardhat Network
    },
    hardhat: {
      chainId: 1337,
      forking: {
        url: RPC_URL || "http://127.0.0.1:8545",
        blockNumber: 19888759,
      },
    },
  },
  typechain: {
    externalArtifacts: ["abis/*.json"],
    target: "ethers-v6",
  },
  tracer: {
    stateOverrides: {
      "0x111111125421ca6dc452d289314280a0f8842a65": {
        bytecode: AggregationRouterV6.bytecode,
      },
    },
  },
  paths: {
    tests: "./test",
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
