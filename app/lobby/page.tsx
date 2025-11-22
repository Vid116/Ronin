'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import toast from 'react-hot-toast';

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stake = Number(searchParams.get('stake')) || 0;

  const { address, isConnected, balance, socket } = useGame();
  const { queue, joinQueue, leaveQueue, updateQueueCount } = usePlayerStore();
  const matchId = useGameStore((state) => state.matchId);

  const [timeInQueue, setTimeInQueue] = useState(0);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Redirect to match when match is found
  useEffect(() => {
    if (matchId) {
      console.log('Match found, redirecting to match:', matchId);
      router.push(`/match/${matchId}`);
    }
  }, [matchId, router]);

  // Update queue timer
  useEffect(() => {
    if (queue.isQueuing && queue.queueStartTime) {
      const interval = setInterval(() => {
        setTimeInQueue(Math.floor((Date.now() - queue.queueStartTime!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [queue.isQueuing, queue.queueStartTime]);

  // Simulate queue player count for demo (in real app, this comes from server)
  useEffect(() => {
    if (queue.isQueuing) {
      const interval = setInterval(() => {
        const currentCount = queue.playersInQueue;
        if (currentCount < 6) {
          updateQueueCount(Math.min(currentCount + Math.floor(Math.random() * 2), 6));
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [queue.isQueuing, queue.playersInQueue, updateQueueCount]);

  const handleJoinQueue = () => {
    if (!socket.isConnected) {
      toast.error('Not connected to game server. Please refresh.');
      return;
    }

    if (stake > 0 && balance && parseFloat(balance) < stake) {
      toast.error(`Insufficient balance. Need ${stake} RON`);
      return;
    }

    // Join queue via socket
    const success = socket.joinQueue(stake);
    if (success) {
      joinQueue(stake);
      toast.success('Searching for opponents...');
    } else {
      toast.error('Failed to join queue');
    }
  };

  const handleLeaveQueue = () => {
    leaveQueue();
    toast.success('Left queue');
    // TODO: Notify server to remove from queue
  };

  const rewards = {
    0: { first: 'Glory', second: 'Honor', third: 'Experience' },
    2: { first: '8 RON', second: '2 RON', third: '0 RON' },
    10: { first: '40 RON', second: '10 RON', third: '5 RON' },
    50: { first: '180 RON', second: '75 RON', third: '25 RON' },
  }[stake as keyof typeof rewards];

  if (!isConnected) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-gray-700">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span className="text-2xl">⚔️</span>
          <h1 className="text-2xl font-bold text-white">Ronin Rumble</h1>
        </button>
        <div className="flex items-center gap-4">
          {/* Connection Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
            <div
              className={`w-2 h-2 rounded-full ${
                socket.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-400">
              {socket.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {queue.isQueuing ? (
            /* QUEUE STATUS */
            <motion.div
              key="queuing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-12"
            >
              {/* Finding Match Animation */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-8xl mb-6"
              >
                ⚔️
              </motion.div>

              <h2 className="text-4xl font-bold mb-4 text-white">Finding Match...</h2>
              <p className="text-xl text-gray-400 mb-8">
                Queue time: {Math.floor(timeInQueue / 60)}:{(timeInQueue % 60).toString().padStart(2, '0')}
              </p>

              {/* Player Counter */}
              <div className="flex justify-center gap-3 mb-8">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
                      ${i < queue.playersInQueue
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-500'
                      }
                    `}
                  >
                    {i < queue.playersInQueue ? '✓' : i + 1}
                  </motion.div>
                ))}
              </div>

              <p className="text-lg text-gray-300 mb-8">
                <span className="text-green-400 font-bold">{queue.playersInQueue}</span>/6 Players Found
              </p>

              {/* Cancel Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLeaveQueue}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-all"
              >
                Cancel Queue
              </motion.button>
            </motion.div>
          ) : (
            /* LOBBY INFO */
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Match Details */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-white">Match Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Entry Fee:</span>
                    <span className="ml-2 font-bold text-white">
                      {stake === 0 ? 'Free' : `${stake} RON`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Prize Pool:</span>
                    <span className="ml-2 font-bold text-white">
                      {stake === 0 ? 'Practice' : `${stake * 6} RON`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Your Balance:</span>
                    <span className="ml-2 font-bold text-yellow-400">
                      {balance || '0'} RON
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Players:</span>
                    <span className="ml-2 font-bold text-white">6</span>
                  </div>
                </div>
              </div>

              {/* Rewards */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-white">Rewards</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <span className="font-bold text-yellow-400">1st Place</span>
                    <span className="font-bold text-yellow-300 text-xl">{rewards?.first}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-700/20 border border-gray-600 rounded-lg">
                    <span className="font-bold text-gray-300">2nd Place</span>
                    <span className="font-bold text-gray-200">{rewards?.second}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
                    <span className="font-bold text-orange-400">3rd Place</span>
                    <span className="font-bold text-orange-300">{rewards?.third}</span>
                  </div>
                </div>
              </div>

              {/* Game Info */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-white">Game Info</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className="font-bold text-purple-400">10-15 Minutes</div>
                      <div className="text-gray-500">Match Duration</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎴</span>
                    <div>
                      <div className="font-bold text-blue-400">30 Units</div>
                      <div className="text-gray-500">5 Tiers</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <div className="font-bold text-green-400">8 Positions</div>
                      <div className="text-gray-500">Tactical Grid</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <div className="font-bold text-yellow-400">20 Seconds</div>
                      <div className="text-gray-500">Per Planning Phase</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJoinQueue}
                  disabled={!socket.isConnected}
                  className={`
                    flex-1 py-4 rounded-lg font-bold text-xl text-white transition-all
                    ${socket.isConnected
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gray-700 cursor-not-allowed'
                    }
                  `}
                >
                  {socket.isConnected ? 'Find Match' : 'Connecting...'}
                </motion.button>

                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white transition-all"
                >
                  Back
                </button>
              </div>

              {!socket.isConnected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-yellow-400 text-sm"
                >
                  Connecting to game server...
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
