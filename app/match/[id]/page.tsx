'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useEffect, useState, use } from 'react';
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
import toast from 'react-hot-toast';

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { socket } = useGame();

  // Use proper Zustand selectors to ensure component re-renders on state changes
  const round = useGameStore((state) => state.round);
  const phase = useGameStore((state) => state.phase);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const player = useGameStore((state) => state.player);
  const opponents = useGameStore((state) => state.opponents);
  const currentOpponent = useGameStore((state) => state.currentOpponent);
  const shop = useGameStore((state) => state.shop);
  const board = useGameStore((state) => state.board);
  const bench = useGameStore((state) => state.bench);
  const combatLog = useGameStore((state) => state.combatLog);

  // Get action methods from socket hook (server-authoritative)
  const buyCard = socket.buyCard;
  const sellCard = socket.sellCard;
  const placeCard = socket.placeCard;
  const rerollShop = socket.rerollShop;
  const buyXP = socket.buyXP;

  // Debug: Log when component receives new state
  useEffect(() => {
    console.log('🎮 [MATCH PAGE] State updated:', {
      round,
      phase,
      timeRemaining
    });
  }, [round, phase, timeRemaining]);

  // Selection state for click-to-place
  const [selectedCard, setSelectedCard] = useState<{ unit: Unit; source: 'bench' | 'board'; position?: number } | null>(null);

  // REMOVED: Aggressive redirect check that was causing socket disconnect loop
  // The socket has its own reconnection logic and the server will handle invalid matches
  // If user shouldn't be here, server will send an error event

  // Handle match end - navigate back to lobby after showing results
  useEffect(() => {
    const handleMatchEnd = () => {
      console.log('🏁 [MATCH PAGE] Match ended, navigating to lobby in 5 seconds...');
      // Give user time to see the final results toast
      setTimeout(() => {
        console.log('🏁 [MATCH PAGE] Navigating to lobby now');
        router.push('/lobby');
      }, 5000);
    };

    // Listen for server_event and check if it's MATCH_END
    socket.socket?.on('server_event', (event: any) => {
      if (event.type === 'MATCH_END') {
        handleMatchEnd();
      }
    });

    return () => {
      socket.socket?.off('server_event', handleMatchEnd);
    };
  }, [router, socket.socket]);

  // Client-side timer countdown - DISABLED for debugging
  // This was interfering with server state updates
  // TODO: Re-enable with proper server sync after debugging
  useEffect(() => {
    console.log('⏱️ [TIMER] Client timer effect triggered. Phase:', phase, 'Round:', round, 'Time:', timeRemaining);

    // TEMPORARILY DISABLED - Let server handle all time updates
    // if (timeRemaining <= 0) return;

    // const interval = setInterval(() => {
    //   const currentTime = useGameStore.getState().timeRemaining;
    //   if (currentTime > 0) {
    //     useGameStore.getState().setTimeRemaining(currentTime - 1);
    //   }
    // }, 1000);

    // return () => clearInterval(interval);
  }, [phase, round, timeRemaining]);

  const handleCardDrop = (unit: Unit, position: number) => {
    placeCard(unit.id, position);
    setSelectedCard(null); // Clear selection on drop
  };

  const handleBuyCard = (index: number) => {
    buyCard(index);
  };

  const handleBoardClick = (position: number) => {
    if (selectedCard) {
      // Placing selected card
      placeCard(selectedCard.unit.id, position);
      toast.success(`Placed ${selectedCard.unit.name}`);
      setSelectedCard(null);
    } else {
      // Selecting card from board or selling
      const unit = position < 4 ? board.top[position] : board.bottom[position - 4];
      if (unit) {
        setSelectedCard({ unit, source: 'board', position });
        toast(`Selected ${unit.name}. Click a board position to move it.`, { icon: '👆' });
      }
    }
  };

  const handleBenchClick = (unit: Unit) => {
    if (selectedCard) {
      // Deselect if clicking same card
      if (selectedCard.unit.id === unit.id) {
        setSelectedCard(null);
        toast('Deselected');
      }
    } else {
      // Select card from bench
      setSelectedCard({ unit, source: 'bench' });
      toast(`Selected ${unit.name}. Click a board position to place it.`, { icon: '👆' });
    }
  };

  const handleBenchSell = (unitId: string) => {
    sellCard(unitId);
    if (selectedCard?.unit.id === unitId) {
      setSelectedCard(null);
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
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-lg hover:border-gray-500"
              >
                Leave Match
              </button>
              <div className="text-white">
                <span className="font-bold text-lg">Round {round}</span>
                <span className="text-gray-400 ml-2">•</span>
                <span className="text-gray-400 ml-2 text-sm">
                  Match ID: {resolvedParams.id.slice(0, 8)}...
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
                  onCardClick={handleBoardClick}
                  onSlotClick={handleBoardClick}
                  isInteractive={isInteractive}
                  selectedCardId={selectedCard?.unit.id}
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
                        {selectedCard ? '👆 Click board to place' : 'Click or drag cards • Right-click to sell'}
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
                          className={`
                            ${selectedCard?.unit.id === unit.id ? 'ring-4 ring-purple-500 rounded-lg' : ''}
                          `}
                        >
                          <Card
                            unit={unit}
                            isDraggable={true}
                            showCost={false}
                            onClick={() => handleBenchClick(unit)}
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
