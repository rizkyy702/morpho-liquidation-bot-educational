import { liquidateUsers } from "./liquidate/liquidate";
import { getEnvVar } from "./utils/envVariable";
import { getProvider } from "./fetcher/fetch";

const main = async () => {
  // Initialize the provider
  const provider = getProvider();

  // Retrieve whitelisted markets from environment variables
  const whitelistedMarkets = getEnvVar("WHITELISTED_MARKET_IDS")
    .split(",")
    .map((market) => market.trim());

  // Verify provider and get the latest block
  const block = await provider.getBlock("latest");
  if (!block)
    throw new Error("Unable to retrieve the latest block. Exiting...");
  console.log("Main: Block number:", block.number);

  // Liquidate users in the whitelisted markets
  await liquidateUsers(whitelistedMarkets, provider);
};

main().catch((error) => {
  console.error("An error occurred in the main function:", error);
});
