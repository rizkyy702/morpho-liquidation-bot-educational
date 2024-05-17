import axios from "axios";
import { getEnvVar } from "../utils/envVariable";
import { SwapInput, SwapOutput } from "../utils/types";

// Custom error class for OneInch API errors
export class OneInchError extends Error {}

// Function to perform a swap call to the 1inch API
export async function oneInchSwapCall(params: SwapInput, chainId: number) {
  const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap`;
  const ONEINCH_API_KEY = getEnvVar("ONEINCH_API_KEY");
  const config = {
    headers: {
      Authorization: `Bearer ${ONEINCH_API_KEY}`,
    },
    params: params,
  };

  try {
    const response = await axios.get<SwapOutput>(url, config);
    const swapOutput: SwapOutput = response.data;
    return swapOutput;
  } catch (error) {
    console.error("OneInch API call failed:", error);
    throw new OneInchError("OneInch API call failed");
  }
}
