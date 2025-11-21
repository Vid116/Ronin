# 🎮 RONIN RUMBLE - Implementation with RainbowKit Starter

## 1. PROJECT SETUP WITH RAINBOWKIT

### Step 1: Initialize with RainbowKit Template
```bash
# Use the official RainbowKit starter
npm init @rainbow-me/rainbowkit@latest

# When prompted:
# ✔ What is your project named? … ronin-rumble
# ✔ Which template would you like to use? › Next.js (App Router)
# ✔ Which package manager would you like to use? › npm

cd ronin-rumble
```

### Step 2: Install Additional Game Dependencies
```bash
# Game-specific dependencies
npm install zustand immer
npm install socket.io-client socket.io
npm install framer-motion react-dnd react-dnd-html5-backend
npm install react-hot-toast react-countdown
npm install class-variance-authority clsx tailwind-merge
npm install @supabase/supabase-js

# Development dependencies
npm install -D @types/node concurrently
```

### Step 3: Configure for Ronin Chain
```typescript
// app/providers.tsx (modify the existing one from RainbowKit)
'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
  Chain,
} from '@rainbow-me/rainbowkit';
import {
  argentWallet,
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Define Ronin chains
const roninMainnet: Chain = {
  id: 2020,
  name: 'Ronin Mainnet',
  iconUrl: 'https://roninchain.com/favicon.ico',
  iconBackground: '#fff',
  nativeCurrency: {
    decimals: 18,
    name: 'RON',
    symbol: 'RON',
  },
  rpcUrls: {
    default: {
      http: ['https://api.roninchain.com/rpc'],
    },
    public: {
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

const roninTestnet: Chain = {
  id: 2021,
  name: 'Ronin Testnet',
  iconUrl: 'https://roninchain.com/favicon.ico',
  iconBackground: '#fff',
  nativeCurrency: {
    decimals: 18,
    name: 'RON',
    symbol: 'RON',
  },
  rpcUrls: {
    default: {
      http: ['https://saigon-testnet.roninchain.com/rpc'],
    },
    public: {
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

const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
  appName: 'Ronin Rumble',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  wallets: [
    ...wallets,
    {
      groupName: 'Other',
      wallets: [argentWallet, trustWallet, ledgerWallet],
    },
  ],
  chains: [
    roninTestnet,
    roninMainnet,
  ],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---

## 2. UPDATED PROJECT STRUCTURE

```
ronin-rumble/                    # RainbowKit starter base
├── app/
│   ├── layout.tsx               # Already exists, keep RainbowKit setup
│   ├── page.tsx                 # Modify to game landing
│   ├── providers.tsx            # Already exists, modify for Ronin
│   ├── lobby/
│   │   └── page.tsx            # Game lobby
│   ├── match/
│   │   └── [id]/
│   │       └── page.tsx        # Active game
│   ├── api/
│   │   ├── socket/
│   │   │   └── route.ts        # WebSocket endpoint
│   │   └── game/
│   │       └── route.ts        # Game API
│   └── globals.css             # Extend with game styles
│
├── components/                  # Add game components
│   ├── game/
│   │   ├── Board.tsx
│   │   ├── Card.tsx
│   │   ├── Shop.tsx
│   │   ├── Timer.tsx
│   │   ├── PlayerStats.tsx
│   │   └── OpponentList.tsx
│   ├── ui/                     # Reusable UI
│   │   ├── GameButton.tsx
│   │   └── Modal.tsx
│   └── ConnectButton.tsx       # RainbowKit connect (exists)
│
├── lib/
│   ├── game/                   # Game logic
│   │   ├── engine.ts
│   │   ├── units.ts
│   │   └── abilities.ts
│   ├── socket/                 # WebSocket
│   │   └── client.ts
│   └── blockchain/             # Web3 integration
│       ├── contracts.ts
│       ├── flare.ts
│       └── filecoin.ts
│
├── store/                       # Zustand stores
│   ├── gameStore.ts
│   └── playerStore.ts
│
├── hooks/                       # Custom hooks
│   ├── useGame.ts
│   ├── useSocket.ts
│   └── useContract.ts
│
├── server/                      # Game server (separate)
│   ├── index.ts
│   └── game/
│       └── GameRoom.ts
│
├── contracts/                   # Smart contracts
│   └── RoninRumble.sol
│
└── public/                      # Assets
    └── units/                   # Unit images
```

---

## 3. MODIFY LANDING PAGE

### app/page.tsx (Replace RainbowKit default)
```tsx
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Home() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [selectedStake, setSelectedStake] = useState<number>(0);

  const handlePlay = () => {
    if (!isConnected) {
      // Will trigger RainbowKit modal
      document.querySelector('[aria-label="Connect Wallet"]')?.click();
      return;
    }
    router.push(`/lobby?stake=${selectedStake}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      {/* Header with RainbowKit Connect Button */}
      <header className="flex justify-between items-center p-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚔️</span>
          <h1 className="text-2xl font-bold text-white">Ronin Rumble</h1>
        </div>
        <ConnectButton />
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-6xl font-bold text-white mb-4">
            Web3 Card
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {" "}Autobattler
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-12">
            10-minute matches • 6-player lobbies • Position-based combat
          </p>

          {/* Stake Selection */}
          <div className="max-w-2xl mx-auto mb-8">
            <h3 className="text-lg text-gray-400 mb-4">Choose Your Stakes</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { value: 0, label: 'Free', color: 'bg-gray-600' },
                { value: 2, label: '2 RON', color: 'bg-green-600' },
                { value: 10, label: '10 RON', color: 'bg-blue-600' },
                { value: 50, label: '50 RON', color: 'bg-purple-600' },
              ].map((stake) => (
                <button
                  key={stake.value}
                  onClick={() => setSelectedStake(stake.value)}
                  className={`
                    p-4 rounded-lg font-bold transition-all
                    ${selectedStake === stake.value 
                      ? `${stake.color} scale-105 ring-2 ring-white` 
                      : 'bg-gray-700 hover:bg-gray-600'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">
                    {stake.value === 0 ? '🎮' : '💰'}
                  </div>
                  <div>{stake.label}</div>
                  {stake.value > 0 && (
                    <div className="text-xs mt-1 text-gray-300">
                      Win: {stake.value * 4} RON
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Play Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlay}
            className="px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg font-bold text-xl text-white hover:from-green-600 hover:to-green-700 transition-all"
          >
            {isConnected ? 'Enter Lobby' : 'Connect Wallet to Play'}
          </motion.button>
        </motion.div>

        {/* Game Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur rounded-lg p-6 text-center"
          >
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-purple-400">10-15</div>
            <div className="text-gray-400">Minutes per Game</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur rounded-lg p-6 text-center"
          >
            <div className="text-3xl mb-2">🎴</div>
            <div className="text-2xl font-bold text-blue-400">30</div>
            <div className="text-gray-400">Unique Units</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur rounded-lg p-6 text-center"
          >
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-green-400">8</div>
            <div className="text-gray-400">Board Positions</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 backdrop-blur rounded-lg p-6 text-center"
          >
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-2xl font-bold text-yellow-400">Top 3</div>
            <div className="text-gray-400">Win Rewards</div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
```

---

## 4. GAME HOOKS WITH WAGMI

### hooks/useGame.ts
```typescript
import { useAccount, useBalance, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { parseEther } from 'viem';
import { GAME_CONTRACT_ABI, GAME_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { useEffect } from 'react';
import useGameStore from '@/store/gameStore';

export function useGame() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  
  // Join Queue Transaction
  const { config: joinConfig } = usePrepareContractWrite({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'joinQueue',
    value: parseEther('10'), // 10 RON entry fee
  });
  
  const { 
    write: joinQueue, 
    isLoading: isJoining,
    isSuccess: joinSuccess 
  } = useContractWrite(joinConfig);
  
  // Get current match
  const { data: currentMatch } = useContractRead({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getPlayerMatch',
    args: [address],
    watch: true,
  });
  
  // Update store when match found
  useEffect(() => {
    if (currentMatch) {
      useGameStore.getState().setMatch(currentMatch);
    }
  }, [currentMatch]);
  
  return {
    address,
    isConnected,
    balance: balance?.formatted,
    joinQueue,
    isJoining,
    currentMatch,
  };
}
```

### hooks/useContract.ts
```typescript
import { 
  useContractRead, 
  useContractWrite,
  useWaitForTransaction,
  usePrepareContractWrite 
} from 'wagmi';
import { toast } from 'react-hot-toast';

export function useGameContract() {
  // Claim rewards after match
  const { config } = usePrepareContractWrite({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'claimRewards',
    args: [matchId],
  });
  
  const { data, write: claimRewards } = useContractWrite({
    ...config,
    onSuccess: () => {
      toast.success('Rewards claimed!');
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });
  
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });
  
  return {
    claimRewards,
    isLoading,
    isSuccess,
  };
}
```

---

## 5. GAME COMPONENTS

### components/game/Board.tsx (with RainbowKit integration)
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Unit, Board as BoardType } from '@/types/game';
import { Card } from './Card';
import { useAccount } from 'wagmi';

interface BoardProps {
  board: BoardType;
  isPlayerBoard: boolean;
  onCardDrop: (card: Unit, position: number) => void;
  onCardClick: (position: number) => void;
  isPlanning: boolean;
}

export function Board({ 
  board, 
  isPlayerBoard, 
  onCardDrop, 
  onCardClick,
  isPlanning 
}: BoardProps) {
  const { address } = useAccount();
  const [highlightedPositions, setHighlightedPositions] = useState<number[]>([]);
  
  const renderSlot = (card: Unit | null, position: number) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: 'card',
      drop: (item: Unit) => onCardDrop(item, position),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
      canDrop: () => isPlayerBoard && isPlanning,
    }), [isPlayerBoard, isPlanning]);

    return (
      <motion.div
        ref={drop}
        key={position}
        className={`
          relative w-24 h-32 border-2 rounded-lg transition-all
          ${isOver && canDrop ? 'border-green-400 bg-green-400/20' : ''}
          ${!isOver && canDrop ? 'border-gray-600' : ''}
          ${!canDrop ? 'border-gray-700' : ''}
          ${highlightedPositions.includes(position) ? 'ring-2 ring-yellow-400' : ''}
        `}
        onClick={() => onCardClick(position)}
        whileHover={isPlanning ? { scale: 1.05 } : {}}
      >
        <AnimatePresence mode="wait">
          {card && (
            <Card 
              unit={card} 
              isDraggable={isPlayerBoard && isPlanning}
              position={position}
            />
          )}
        </AnimatePresence>
        
        {/* Position Number */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold">
          {position + 1}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Board Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">
          {isPlayerBoard ? 'Your Board' : 'Enemy Board'}
        </span>
        {isPlayerBoard && (
          <span className="text-xs text-gray-500">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        )}
      </div>
      
      {/* Top Row (Positions 0-3) */}
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3].map(i => renderSlot(board.top[i], i))}
      </div>
      
      {/* Bottom Row (Positions 4-7) */}
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3].map(i => renderSlot(board.bottom[i], i + 4))}
      </div>
    </div>
  );
}
```

---

## 6. GAME STORE WITH WAGMI

### store/gameStore.ts
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Unit, Board, Player, Shop } from '@/types/game';

interface GameState {
  // Match Info
  matchId: string;
  round: number;
  phase: 'PLANNING' | 'COMBAT' | 'TRANSITION';
  timeRemaining: number;
  
  // Player
  player: Player;
  opponents: Player[];
  currentOpponent?: Player;
  
  // Shop & Board
  shop: Shop;
  board: Board;
  bench: Unit[];
  
  // Actions
  buyCard: (index: number) => void;
  sellCard: (unit: Unit) => void;
  placeCard: (unit: Unit, position: number) => void;
  rerollShop: () => void;
  
  // Match Actions
  setMatch: (match: any) => void;
  updateFromServer: (data: any) => void;
}

const useGameStore = create<GameState>()(
  immer((set) => ({
    matchId: '',
    round: 1,
    phase: 'PLANNING',
    timeRemaining: 20,
    
    player: {
      id: '',
      address: '',
      health: 20,
      gold: 3,
      level: 1,
      xp: 0,
      winStreak: 0,
      loseStreak: 0,
    },
    
    opponents: [],
    currentOpponent: undefined,
    
    shop: {
      cards: [],
      rerollCost: 2,
      freeRerolls: 0,
    },
    
    board: {
      top: [null, null, null, null],
      bottom: [null, null, null, null],
    },
    
    bench: [],
    
    buyCard: (index) => set((state) => {
      const card = state.shop.cards[index];
      if (!card || state.player.gold < card.cost) return;
      
      state.player.gold -= card.cost;
      state.bench.push(card);
      state.shop.cards.splice(index, 1);
    }),
    
    sellCard: (unit) => set((state) => {
      state.player.gold += unit.cost;
      
      // Remove from board
      for (let i = 0; i < 4; i++) {
        if (state.board.top[i]?.id === unit.id) {
          state.board.top[i] = null;
          return;
        }
        if (state.board.bottom[i]?.id === unit.id) {
          state.board.bottom[i] = null;
          return;
        }
      }
      
      // Remove from bench
      state.bench = state.bench.filter(u => u.id !== unit.id);
    }),
    
    placeCard: (unit, position) => set((state) => {
      // Remove from current position
      for (let i = 0; i < 4; i++) {
        if (state.board.top[i]?.id === unit.id) state.board.top[i] = null;
        if (state.board.bottom[i]?.id === unit.id) state.board.bottom[i] = null;
      }
      state.bench = state.bench.filter(u => u.id !== unit.id);
      
      // Place at new position
      if (position < 4) {
        const existing = state.board.top[position];
        if (existing) state.bench.push(existing);
        state.board.top[position] = unit;
      } else {
        const existing = state.board.bottom[position - 4];
        if (existing) state.bench.push(existing);
        state.board.bottom[position - 4] = unit;
      }
    }),
    
    rerollShop: () => set((state) => {
      if (state.shop.freeRerolls > 0) {
        state.shop.freeRerolls--;
      } else if (state.player.gold >= state.shop.rerollCost) {
        state.player.gold -= state.shop.rerollCost;
      }
      // Server will send new shop
    }),
    
    setMatch: (match) => set((state) => {
      state.matchId = match.id;
      state.opponents = match.players;
    }),
    
    updateFromServer: (data) => set((state) => {
      Object.assign(state, data);
    }),
  }))
);

export default useGameStore;
```

---

## 7. LOBBY PAGE

### app/lobby/page.tsx
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { motion } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import toast from 'react-hot-toast';

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stake = Number(searchParams.get('stake')) || 0;
  
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { joinQueue, isJoining, currentMatch } = useGame();
  
  const [isQueuing, setIsQueuing] = useState(false);
  const [playersInQueue, setPlayersInQueue] = useState(0);
  
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected]);
  
  useEffect(() => {
    if (currentMatch) {
      router.push(`/match/${currentMatch.id}`);
    }
  }, [currentMatch]);
  
  const handleJoinQueue = async () => {
    if (stake > 0 && balance && parseFloat(balance.formatted) < stake) {
      toast.error(`Insufficient balance. Need ${stake} RON`);
      return;
    }
    
    setIsQueuing(true);
    
    if (stake > 0) {
      // On-chain queue for paid games
      await joinQueue?.();
    } else {
      // Off-chain queue for free games
      // Connect to WebSocket server
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-white">
          ⚔️ Ronin Rumble - Lobby
        </h1>
        <ConnectButton />
      </header>
      
      <div className="container mx-auto px-4 py-8">
        {/* Queue Status */}
        {isQueuing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">⚔️</div>
            <h2 className="text-3xl font-bold mb-4">Finding Match...</h2>
            <p className="text-xl text-gray-400 mb-8">
              {playersInQueue}/6 Players Found
            </p>
            <div className="flex justify-center gap-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-full ${
                    i < playersInQueue ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setIsQueuing(false)}
              className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Cancel Queue
            </button>
          </motion.div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Stake Info */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Match Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">Entry Fee:</span>
                  <span className="ml-2 font-bold">
                    {stake === 0 ? 'Free' : `${stake} RON`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Prize Pool:</span>
                  <span className="ml-2 font-bold">
                    {stake === 0 ? 'Practice' : `${stake * 6} RON`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Your Balance:</span>
                  <span className="ml-2 font-bold">
                    {balance?.formatted || '0'} {balance?.symbol}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Players:</span>
                  <span className="ml-2 font-bold">6</span>
                </div>
              </div>
            </div>
            
            {/* Rewards */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">Rewards</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>🥇 1st Place:</span>
                  <span className="font-bold text-yellow-400">
                    {stake === 0 ? 'Glory' : `${stake * 4} RON`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>🥈 2nd Place:</span>
                  <span className="font-bold text-gray-400">
                    {stake === 0 ? 'Honor' : `${stake} RON`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>🥉 3rd Place:</span>
                  <span className="font-bold text-orange-600">
                    {stake === 0 ? 'Experience' : `${stake * 0.5} RON`}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleJoinQueue}
                disabled={isJoining}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 rounded-lg font-bold text-xl disabled:opacity-50"
              >
                {isJoining ? 'Joining...' : 'Find Match'}
              </motion.button>
              
              <button
                onClick={() => router.push('/')}
                className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 8. PACKAGE.JSON FOR RAINBOWKIT

```json
{
  "name": "ronin-rumble",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "server": "tsx watch server/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run server\""
  },
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "next": "14.1.0",
    "react": "^18",
    "react-dom": "^18",
    "viem": "2.x",
    "wagmi": "^2.5.0",
    
    "zustand": "^4.4.7",
    "immer": "^10.0.3",
    "socket.io": "^4.6.0",
    "socket.io-client": "^4.6.0",
    "framer-motion": "^10.16.0",
    "react-dnd": "^16.0.1",
    "react-dnd-html5-backend": "^16.0.1",
    "react-hot-toast": "^2.4.1",
    "react-countdown": "^2.3.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "web3.storage": "^4.5.5"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5",
    "eslint": "^8",
    "eslint-config-next": "14.1.0",
    "concurrently": "^8.2.2",
    "tsx": "^4.7.0"
  }
}
```

---

## 9. QUICK START COMMANDS

```bash
# Step 1: Create project with RainbowKit
npm init @rainbow-me/rainbowkit@latest
# Choose: ronin-rumble, Next.js App Router, npm

# Step 2: Install game dependencies
cd ronin-rumble
npm install zustand immer socket.io-client socket.io framer-motion react-dnd react-dnd-html5-backend react-hot-toast react-countdown class-variance-authority clsx tailwind-merge @supabase/supabase-js web3.storage

# Step 3: Install dev dependencies
npm install -D concurrently tsx

# Step 4: Start development
npm run dev

# Step 5: In another terminal, start game server
npm run server
```

---

## KEY DIFFERENCES FROM SCRATCH

1. **Wallet Connection**: RainbowKit handles all wallet UI/UX
2. **Wagmi Hooks**: Use `useAccount`, `useBalance`, `useContractWrite` instead of raw ethers
3. **Provider Setup**: RainbowKit provides the providers wrapper
4. **TypeScript Config**: Already configured properly
5. **Styling**: RainbowKit comes with base styles we extend

## BENEFITS OF USING RAINBOWKIT

✅ **Professional wallet UI** out of the box
✅ **Multiple wallet support** (MetaMask, WalletConnect, Coinbase, etc.)
✅ **Account management** handled automatically  
✅ **Network switching** UI included
✅ **ENS support** built-in
✅ **Mobile responsive** wallet connection
✅ **TypeScript** fully configured
✅ **Best practices** for Web3 UX

This approach gives you a production-ready Web3 foundation to build the game on top of!
