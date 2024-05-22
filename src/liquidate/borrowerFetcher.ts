import { Provider } from "ethers";
import { getProvider, morphoContracts } from "../fetcher/fetch";
import fs from "fs";
import path from "path";
import { MorphoBlue } from "ethers-types";
import { MORPHO_BLUE_MAINNET_DEPLOYMENT_BLOCK } from "../utils/constants";

// Interface for MorphoBlue contract
export interface Contracts {
  morphoBlue: MorphoBlue;
}

// Interface for borrowers per market data
interface BorrowersPerMarket {
  markets: {
    [marketId: string]: {
      borrowers: string[];
    };
  };
  lastBlock: number;
}

// Fetch borrowers for a specific market within a block range
async function fetchBorrowersForMarket(
  marketId: string,
  morphoBlue: MorphoBlue,
  startBlock: number,
  endBlock: number
): Promise<{ marketId: string; borrowers: string[] }> {
  let currentBlock = startBlock;
  const borrowers = new Set<string>();

  while (currentBlock <= endBlock) {
    const nextBlock = Math.min(currentBlock + 999, endBlock);
    console.log("Fetching from block", currentBlock, "to block", nextBlock);

    const borrowEventFilter = morphoBlue.filters.Borrow();
    const events = await morphoBlue.queryFilter(
      borrowEventFilter,
      currentBlock,
      nextBlock
    );

    events
      .filter((event) => event.args.id.toLowerCase() === marketId.toLowerCase())
      .forEach((event) => borrowers.add(event.args.onBehalf));

    currentBlock = nextBlock + 1;
  }

  return { marketId, borrowers: Array.from(borrowers) };
}

// Compile borrowers for each market in the whitelist
export const compileBorrowersPerMarket = async (
  whitelist: string[],
  provider?: Provider,
  from = MORPHO_BLUE_MAINNET_DEPLOYMENT_BLOCK,
  endBlock?: number
): Promise<void> => {
  provider ??= getProvider();
  const contracts = await morphoContracts(provider);

  if (!endBlock) {
    endBlock = await provider.getBlockNumber();
  }

  const dataPath = path.resolve(
    __dirname,
    "..",
    "data",
    "borrowersPerMarket.json"
  );
  let previousData: BorrowersPerMarket = { markets: {}, lastBlock: from - 1 };

  if (fs.existsSync(dataPath)) {
    previousData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  }

  const promises = whitelist.map((id) =>
    fetchBorrowersForMarket(
      id,
      contracts.morphoBlue,
      previousData.lastBlock + 1,
      endBlock
    )
  );

  const results = await Promise.all(promises);

  results.forEach(({ marketId, borrowers }) => {
    if (previousData.markets[marketId]) {
      // Merge new borrowers with existing ones
      const existingBorrowers = new Set(
        previousData.markets[marketId].borrowers
      );
      borrowers.forEach((borrower) => existingBorrowers.add(borrower));
      previousData.markets[marketId].borrowers = Array.from(existingBorrowers);
    } else {
      // Initialize market if not existing
      previousData.markets[marketId] = { borrowers };
    }
  });

  previousData.lastBlock = endBlock; // Update lastBlock for all markets

  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(previousData, null, 2), "utf8");

  console.log("\nBorrowers address per market has been filtered and saved.\n");
};
