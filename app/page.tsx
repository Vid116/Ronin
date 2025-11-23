'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Swords, Clock, Users, Grid3x3, Trophy, Sparkles, Coins, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Home() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [selectedStake, setSelectedStake] = useState<number>(0);
  const [playersPerMatch, setPlayersPerMatch] = useState(6);

  // Fetch server config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
        const response = await fetch(`${serverUrl}/api/config`);
        if (response.ok) {
          const config = await response.json();
          setPlayersPerMatch(config.playersPerMatch);
        }
      } catch (error) {
        console.error('Failed to fetch server config:', error);
      }
    };
    fetchConfig();
  }, []);

  const handlePlay = () => {
    if (!isConnected) {
      // Will trigger RainbowKit modal via ConnectButton
      return;
    }
    router.push(`/lobby?stake=${selectedStake}`);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-warm-gray-700">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-sage-500" strokeWidth={2} />
          <h1 className="text-2xl font-semibold text-foreground">Ronin Rumble</h1>
        </div>
        <ConnectButton />
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-6xl font-semibold text-foreground mb-4">
            Web3 Card Autobattler
          </h2>

          <p className="text-xl text-warm-gray-400 mb-12">
            10-minute matches • {playersPerMatch}-player lobbies • Position-based combat
          </p>

          {/* Stake Selection */}
          <div className="max-w-3xl mx-auto mb-12">
            <h3 className="text-base text-warm-gray-400 mb-6 font-medium">Choose Your Stakes</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { value: 0, label: 'Free', icon: Sparkles, prize: 'Glory' },
                { value: 0.001, label: '0.001 RON', icon: Coins, prize: '0.0043' },
                { value: 0.005, label: '0.005 RON', icon: Coins, prize: '0.0216' },
                { value: 0.01, label: '0.01 RON', icon: Crown, prize: '0.0432' },
              ].map((stake) => {
                const Icon = stake.icon;
                const isSelected = selectedStake === stake.value;
                return (
                  <motion.button
                    key={stake.value}
                    onClick={() => setSelectedStake(stake.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      p-5 rounded-lg transition-all duration-200
                      ${isSelected
                        ? 'bg-surface border-2 border-sage-500'
                        : 'bg-surface border-2 border-warm-gray-700 hover:border-sage-600'
                      }
                    `}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-sage-500' : 'text-warm-gray-400'}`} strokeWidth={2} />
                    <div className="text-sm font-medium text-foreground">{stake.label}</div>
                    <div className="text-xs mt-1 text-warm-gray-400">
                      {stake.value > 0 ? `Win: ${stake.prize} RON` : stake.prize}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Play Button */}
          <Button
            onClick={handlePlay}
            disabled={!isConnected}
            variant="primary"
            size="lg"
            className="px-12"
          >
            {isConnected ? 'Enter Lobby' : 'Connect Wallet to Play'}
          </Button>

          {!isConnected && (
            <p className="text-sm text-warm-gray-500 mt-4">
              Click "Connect Wallet" above to get started
            </p>
          )}
        </motion.div>

        {/* Game Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="default" className="p-6 text-center hover:border-sage-600 transition-colors">
              <Clock className="w-8 h-8 mx-auto mb-3 text-sage-500" strokeWidth={2} />
              <div className="text-2xl font-semibold text-foreground mb-1">10-15</div>
              <div className="text-sm text-warm-gray-400">Minutes per Game</div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="default" className="p-6 text-center hover:border-sage-600 transition-colors">
              <Users className="w-8 h-8 mx-auto mb-3 text-sage-500" strokeWidth={2} />
              <div className="text-2xl font-semibold text-foreground mb-1">30</div>
              <div className="text-sm text-warm-gray-400">Unique Units</div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="default" className="p-6 text-center hover:border-sage-600 transition-colors">
              <Grid3x3 className="w-8 h-8 mx-auto mb-3 text-sage-500" strokeWidth={2} />
              <div className="text-2xl font-semibold text-foreground mb-1">8</div>
              <div className="text-sm text-warm-gray-400">Board Positions</div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="default" className="p-6 text-center hover:border-sage-600 transition-colors">
              <Trophy className="w-8 h-8 mx-auto mb-3 text-sage-500" strokeWidth={2} />
              <div className="text-2xl font-semibold text-foreground mb-1">Top 3</div>
              <div className="text-sm text-warm-gray-400">Win Rewards</div>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
