import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { ronin, saigon } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'Ronin Rumble',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    saigon,
    ronin,
  ],
  ssr: true,
});
