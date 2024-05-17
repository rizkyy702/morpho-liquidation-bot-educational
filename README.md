# Liquidation Bot Education

## Overview

This project is an educational liquidation bot designed to help users understand the process of liquidating unhealthy borrowers in the DeFi ecosystem. It leverages the Hardhat development environment for compiling, deploying, and testing smart contracts.

## Prerequisites

Before you start, make sure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v16.x or later)
- [Yarn](https://yarnpkg.com/getting-started/install) (optional, but recommended)
- [Hardhat](https://hardhat.org/getting-started/) (installed via project dependencies)

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/your-repository/liquidation-bot-education.git
   cd liquidation-bot-education
   ```

2. Install dependencies:

   ```sh
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on the provided `.env.example` and fill in the necessary environment variables:
   ```sh
   cp .env.example .env
   ```

## Environment Variables

Ensure your `.env` file includes the following variables:

```env
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/XXX

LIQUIDATION_RPC_URL=http://localhost:8545

# whitelisted market IDs, separated by commas
WHITELISTED_MARKET_IDS="0xAAA,0xBBB"

# 1inch API key
ONEINCH_API_KEY=XXX

# Deployed contract address
LIQUIDATOR_ADDRESS=0x798f111c92E38F102931F34D1e0ea7e671BDBE31

# Private key of the first Hardhat account
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Usage

### Compile Contracts

First, compile the smart contracts:

```sh
npx hardhat compile
```

### Start the Local Blockchain

In the first terminal, start a local Hardhat node:

```sh
npx hardhat node --show-stack-traces
```

### Run Tests

In the second terminal, run the tests to verify the liquidation bot:

```sh
npx hardhat test --network localhost --show-stack-traces
```

You should have those results:
![Naive Liquidation Results](./images/resultsNaiveLiquidation.png)

## Contributing

Feel free to contribute to this project by submitting issues or pull requests. Any contributions that make the code more educational or improve the functionality are welcome.

## License

This project is licensed under the MIT License - see the (incoming) [LICENSE](LICENSE) file for details.
