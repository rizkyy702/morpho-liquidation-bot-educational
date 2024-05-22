import { BLUE_API } from "../utils/constants";
import { Asset } from "../utils/types";

const assetDataQuery = (address: string): string => {
  return `
  query{
    assets (where: {address_in: "${address}"}) {
      items {
        symbol
        priceUsd
        decimals
      }
    }
  }`;
};

export const fetchAssetData = async (assetAddress: string): Promise<Asset> => {
  const query = assetDataQuery(assetAddress);

  const response = await fetch(BLUE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await response.json();
  return data.data.assets.items[0];
};
