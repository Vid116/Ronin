'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import { Board } from '@/components/game/Board';
import { Shop } from '@/components/game/Shop';
import { Timer } from '@/components/game/Timer';
import { PlayerStats } from '@/components/game/PlayerStats';
import { OpponentList } from '@/components/game/OpponentList';
import { Unit } from '@/types/game';

export default function MatchPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isConnected } = useGame();

  const {
    round,
    phase,
    timeRemaining,
    player,
    opponents,
    currentOpponent,
    shop,
    board,
    bench,
    buyCard,
    sellCard,
    placeCard,
    rerollShop,
    buyXP,
  } = useGameStore();

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  const handleCardDrop = (unit: Unit, position: number) => {
    placeCard(unit.id, position);
  };

  const handleBuyCard = (index: number) => {
    buyCard(index);
  };

  const handleSellCard = (position: number) => {
    const unit = position < 4 ? board.top[position] : board.bottom[position - 4];
    if (unit) {
      sellCard(unit.id);
    }
  };

  const canBuyXP = player.gold >= 4;
  const isInteractive = phase === 'PLANNING';

  return (
    <DndProvider backend={HTML5Backend}>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
        <div className="container mx-auto max-w-7xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Leave Match
              </button>
              <div className="text-white">
                <span className="font-bold">Round {round}</span>
                <span className="text-gray-400 ml-2">•</span>
                <span className="text-gray-400 ml-2">Match ID: {params.id.slice(0, 8)}</span>
              </div>
            </div>

            <Timer timeRemaining={timeRemaining} phase={phase} />
          </div>

          {/* Main Game Layout */}
          <div className="grid grid-cols-12 gap-4">
            {/* Left Sidebar - Player Stats & Opponents */}
            <div className="col-span-3 space-y-4">
              <PlayerStats
                player={player}
                onBuyXP={buyXP}
                canBuyXP={canBuyXP && isInteractive}
              />
              <OpponentList
                opponents={opponents}
                currentOpponent={currentOpponent}
                localPlayer={player}
              />
            </div>

            {/* Center - Boards */}
            <div className="col-span-6 space-y-6">
              {/* Enemy Board (if in combat) */}
              {phase === 'COMBAT' && currentOpponent && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Board
                    board={board} // TODO: Should be opponent's board
                    isPlayerBoard={false}
                    isInteractive={false}
                  />
                </motion.div>
              )}

              {/* Player Board */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Board
                  board={board}
                  isPlayerBoard={true}
                  onCardDrop={handleCardDrop}
                  onCardClick={handleSellCard}
                  isInteractive={isInteractive}
                />
              </motion.div>

              {/* Bench */}
              {isInteractive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">
                      🪑 Bench ({bench.length}/8)
                    </span>
                    <span className="text-xs text-gray-400">
                      Drag to board or click to sell
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {bench.map((unit) => (
                      <div
                        key={unit.id}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-20 h-28 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                          <span className="text-xs text-gray-400">{unit.name}</span>
                        </div>
                      </div>
                    ))}

                    {bench.length === 0 && (
                      <div className="w-full text-center py-4 text-gray-500 text-sm">
                        No units on bench. Buy from shop below!
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Shop */}
              {isInteractive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Shop
                    shop={shop}
                    playerGold={player.gold}
                    onBuyCard={handleBuyCard}
                    onReroll={rerollShop}
                    disabled={!isInteractive}
                  />
                </motion.div>
              )}
            </div>

            {/* Right Sidebar - Combat Log / Info */}
            <div className="col-span-3">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 sticky top-4">
                <h3 className="text-sm font-bold text-white mb-3">📋 Combat Log</h3>
                <div className="space-y-2 text-xs text-gray-400 max-h-96 overflow-y-auto">
                  {phase === 'PLANNING' && (
                    <div className="text-center py-8 text-gray-500">
                      <p>⚡ Planning Phase</p>
                      <p className="mt-2">Build your composition!</p>
                    </div>
                  )}
                  {phase === 'COMBAT' && (
                    <div className="text-center py-8 text-gray-500">
                      <p>⚔️ Combat in Progress</p>
                      <p className="mt-2">Watch the battle unfold!</p>
                    </div>
                  )}
                  {phase === 'TRANSITION' && (
                    <div className="text-center py-8 text-gray-500">
                      <p>🔄 Calculating Results</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
