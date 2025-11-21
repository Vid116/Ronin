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
      // Will trigger RainbowKit modal via ConnectButton
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
                { value: 0, label: 'Free', color: 'bg-gray-600', icon: '🎮' },
                { value: 2, label: '2 RON', color: 'bg-green-600', icon: '💰' },
                { value: 10, label: '10 RON', color: 'bg-blue-600', icon: '💎' },
                { value: 50, label: '50 RON', color: 'bg-purple-600', icon: '👑' },
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
                  <div className="text-2xl mb-1">{stake.icon}</div>
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
            disabled={!isConnected}
            className={`
              px-12 py-4 rounded-lg font-bold text-xl transition-all
              ${isConnected
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isConnected ? 'Enter Lobby' : 'Connect Wallet to Play'}
          </motion.button>

          {!isConnected && (
            <p className="text-sm text-gray-500 mt-4">
              Click "Connect Wallet" above to get started
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
