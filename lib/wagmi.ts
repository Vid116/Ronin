import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { Chain } from 'wagmi/chains';

// Define Ronin chains
export const roninMainnet: Chain = {
  id: 2020,
  name: 'Ronin Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'RON',
    symbol: 'RON',
  },
  rpcUrls: {
    default: {
      http: ['https://api.roninchain.com/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Ronin Explorer',
      url: 'https://explorer.roninchain.com'
    },
  },
  testnet: false,
};

export const roninTestnet: Chain = {
  id: 2021,
  name: 'Ronin Testnet (Saigon)',
  nativeCurrency: {
    decimals: 18,
    name: 'RON',
    symbol: 'RON',
  },
  rpcUrls: {
    default: {
      http: ['https://saigon-testnet.roninchain.com/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Ronin Explorer',
      url: 'https://saigon-explorer.roninchain.com'
    },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'Ronin Rumble',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    roninTestnet,
    roninMainnet,
  ],
  ssr: true,
});
