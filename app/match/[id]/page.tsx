'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import { Board } from '@/components/game/Board';
import { Shop } from '@/components/game/Shop';
import { Timer } from '@/components/game/Timer';
import { PlayerStats } from '@/components/game/PlayerStats';
import { OpponentList } from '@/components/game/OpponentList';
import { Card } from '@/components/game/Card';
import { Unit } from '@/types/game';

export default function MatchPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { socket } = useGame();

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
    combatLog,
    buyCard,
    sellCard,
    placeCard,
    rerollShop,
    buyXP,
  } = useGameStore();

  // Redirect if not connected
  useEffect(() => {
    if (!socket.isConnected) {
      console.warn('Not connected to game server, redirecting...');
      // Give a small delay to allow connection
      const timeout = setTimeout(() => {
        if (!socket.isConnected) {
          router.push('/');
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [socket.isConnected, router]);

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

  const handleBenchSell = (unitId: string) => {
    sellCard(unitId);
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
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-lg hover:border-gray-500"
              >
                Leave Match
              </button>
              <div className="text-white">
                <span className="font-bold text-lg">Round {round}</span>
                <span className="text-gray-400 ml-2">•</span>
                <span className="text-gray-400 ml-2 text-sm">
                  Match ID: {params.id.slice(0, 8)}...
                </span>
              </div>
              {/* Connection status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    socket.isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-gray-400">
                  {socket.isConnected ? 'Connected' : 'Disconnected'}
                </span>
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
              <AnimatePresence>
                {phase === 'COMBAT' && currentOpponent && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Board
                      board={board} // TODO: Should be opponent's board from server
                      isPlayerBoard={false}
                      isInteractive={false}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

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
              <AnimatePresence>
                {isInteractive && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-white">
                        Bench ({bench.length}/8)
                      </span>
                      <span className="text-xs text-gray-400">
                        Drag to board or right-click to sell
                      </span>
                    </div>

                    <div className="flex gap-2 flex-wrap min-h-[140px]">
                      {bench.map((unit) => (
                        <motion.div
                          key={unit.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleBenchSell(unit.id);
                          }}
                        >
                          <Card
                            unit={unit}
                            isDraggable={true}
                            showCost={false}
                          />
                        </motion.div>
                      ))}

                      {bench.length === 0 && (
                        <div className="w-full text-center py-8 text-gray-500 text-sm">
                          No units on bench. Buy from shop below!
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Shop */}
              <AnimatePresence>
                {isInteractive && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
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
              </AnimatePresence>
            </div>

            {/* Right Sidebar - Combat Log / Info */}
            <div className="col-span-3">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 sticky top-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <span>Combat Log</span>
                  {combatLog.length > 0 && (
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                      {combatLog.length}
                    </span>
                  )}
                </h3>

                <div className="space-y-2 text-xs max-h-[600px] overflow-y-auto">
                  {/* Combat Events */}
                  {combatLog.length > 0 ? (
                    <motion.div className="space-y-1">
                      {combatLog.slice().reverse().map((event, idx) => (
                        <motion.div
                          key={`${event.timestamp}-${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-2 rounded border-l-2 ${
                            event.type === 'DEATH'
                              ? 'bg-red-900/20 border-red-500'
                              : event.type === 'HEAL'
                              ? 'bg-green-900/20 border-green-500'
                              : event.type === 'ABILITY'
                              ? 'bg-purple-900/20 border-purple-500'
                              : 'bg-gray-800/50 border-gray-600'
                          }`}
                        >
                          <div className="text-gray-300">{event.description}</div>
                          {event.damage && (
                            <div className="text-red-400 text-[10px] mt-0.5">
                              -{event.damage} damage
                            </div>
                          )}
                          {event.healing && (
                            <div className="text-green-400 text-[10px] mt-0.5">
                              +{event.healing} healing
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {phase === 'PLANNING' && (
                        <>
                          <p className="text-2xl mb-2">⚡</p>
                          <p>Planning Phase</p>
                          <p className="mt-2 text-[10px]">Build your composition!</p>
                        </>
                      )}
                      {phase === 'COMBAT' && (
                        <>
                          <p className="text-2xl mb-2">⚔️</p>
                          <p>Combat in Progress</p>
                          <p className="mt-2 text-[10px]">
                            Watch the battle unfold!
                          </p>
                        </>
                      )}
                      {phase === 'TRANSITION' && (
                        <>
                          <p className="text-2xl mb-2">🔄</p>
                          <p>Calculating Results</p>
                        </>
                      )}
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
