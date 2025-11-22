import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Configure ts-node to use the Hardhat-specific TypeScript config
import { register } from "ts-node";
register({
  project: "./tsconfig.hardhat.json",
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    // Ronin Testnet (Saigon)
    roninTestnet: {
      url: process.env.RONIN_TESTNET_RPC || "https://saigon-testnet.roninchain.com/rpc",
      chainId: 2021,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 21000000000, // 21 gwei - minimum for Ronin testnet
    },
    // Ronin Mainnet
    roninMainnet: {
      url: process.env.RONIN_MAINNET_RPC || "https://api.roninchain.com/rpc",
      chainId: 2020,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 21000000000, // 21 gwei - minimum for Ronin mainnet
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      roninTestnet: process.env.RONIN_EXPLORER_API_KEY || "no-api-key-needed",
      roninMainnet: process.env.RONIN_EXPLORER_API_KEY || "no-api-key-needed",
    },
    customChains: [
      {
        network: "roninTestnet",
        chainId: 2021,
        urls: {
          apiURL: "https://saigon-app.roninchain.com/api",
          browserURL: "https://saigon-app.roninchain.com",
        },
      },
      {
        network: "roninMainnet",
        chainId: 2020,
        urls: {
          apiURL: "https://app.roninchain.com/api",
          browserURL: "https://app.roninchain.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
