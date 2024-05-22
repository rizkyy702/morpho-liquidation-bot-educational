import "dotenv/config";
import { ethers, Provider, Signer } from "ethers";
import { getProvider } from "../fetcher/fetch";

// Validate and retrieve environment variables
export const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    console.error(`${key} not set. Exiting…`);
    process.exit(1);
  }
  return value;
};

export const getAddress = (): string => {
  const { LIQUIDATOR_ADDRESS } = process.env;
  if (!LIQUIDATOR_ADDRESS) {
    throw new Error("No LIQUIDATOR_ADDRESS provided. Exiting...");
  }
  return LIQUIDATOR_ADDRESS;
};

export const getSigner = (provider?: Provider): Signer => {
  const { PRIVATE_KEY } = process.env;
  if (!PRIVATE_KEY) {
    throw new Error("No PRIVATE_KEY in the environment variables. Exiting...");
  }
  provider = provider ?? getProvider();
  return new ethers.Wallet(PRIVATE_KEY, provider);
};
