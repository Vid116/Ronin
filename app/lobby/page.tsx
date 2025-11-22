'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { useContract } from '@/hooks/useContract';
import toast from 'react-hot-toast';

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stake = Number(searchParams.get('stake')) || 0;

  const { address, isConnected, balance, socket } = useGame();
  const { queue, joinQueue, leaveQueue, updateQueueCount } = usePlayerStore();
  const matchId = useGameStore((state) => state.matchId);
  const pendingPayment = useGameStore((state) => state.pendingPayment);
  const { joinMatch, isWriting, isConfirming, isConfirmed, txHash } = useContract();

  const [timeInQueue, setTimeInQueue] = useState(0);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

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

  // Handle payment transaction confirmation
  useEffect(() => {
    if (isConfirmed && paymentInProgress && txHash && pendingPayment) {
      setPaymentInProgress(false);

      // Submit payment to server
      const success = socket.submitPayment(pendingPayment.blockchainMatchId, txHash);
      if (success) {
        toast.success('Payment submitted! Waiting for other players...');
      } else {
        toast.error('Failed to submit payment');
      }
    }
  }, [isConfirmed, paymentInProgress, txHash, socket, pendingPayment]);

  const handleJoinQueue = async () => {
    if (!socket.isConnected) {
      toast.error('Not connected to game server. Please refresh.');
      return;
    }

    if (stake > 0 && balance && parseFloat(balance) < stake) {
      toast.error(`Insufficient balance. Need ${stake} RON`);
      return;
    }

    // Join queue directly - server will create blockchain match when ready
    // For paid matches, players will be prompted to join the match after creation
    const success = socket.joinQueue(stake);
    if (success) {
      joinQueue(stake);
      if (stake > 0) {
        toast.success(`Searching for opponents... You'll be prompted to pay ${stake} RON when match is ready.`);
      } else {
        toast.success('Searching for opponents...');
      }
    } else {
      toast.error('Failed to join queue');
    }
  };

  const handleLeaveQueue = () => {
    leaveQueue();
    toast.success('Left queue');
    // TODO: Notify server to remove from queue
  };

  const handleJoinBotMatch = async () => {
    if (!socket.isConnected) {
      toast.error('Not connected to game server. Please refresh.');
      return;
    }

    if (stake > 0 && balance && parseFloat(balance) < stake) {
      toast.error(`Insufficient balance. Need ${stake} RON`);
      return;
    }

    // Bot matches don't use blockchain - just join directly
    // The server handles bot matches without blockchain integration
    // For paid bot matches, payment verification can be added later
    const success = socket.joinBotMatch(stake);
    if (success) {
      toast.success('Starting bot match...');
    } else {
      toast.error('Failed to create bot match');
    }
  };

  const handlePayEntry = async () => {
    if (!pendingPayment) return;

    if (balance && parseFloat(balance) < pendingPayment.entryFee) {
      toast.error(`Insufficient balance. Need ${pendingPayment.entryFee} RON`);
      return;
    }

    try {
      setPaymentInProgress(true);
      await joinMatch(pendingPayment.blockchainMatchId, pendingPayment.entryFee);
    } catch (error) {
      setPaymentInProgress(false);
      console.error('Payment failed:', error);
    }
  };

  // Calculate prizes based on contract prize distribution
  // 72% first, 18% second, 10% third (after 8.3% platform fee)
  // Note: Players per match can be configured via PLAYERS_PER_MATCH env var
  const playersPerMatch = 6; // TODO: Get from server config
  const calculatePrizes = (entryFee: number) => {
    if (entryFee === 0) {
      return { first: 'Glory', second: 'Honor', third: 'Experience' };
    }
    const prizePool = entryFee * playersPerMatch;
    const afterFee = prizePool * 0.917; // 100% - 8.3% platform fee
    return {
      first: `${(afterFee * 0.72).toFixed(4)} RON`,
      second: `${(afterFee * 0.18).toFixed(4)} RON`,
      third: `${(afterFee * 0.10).toFixed(4)} RON`,
    };
  };
  const rewards = calculatePrizes(stake);

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
                  disabled={!socket.isConnected || isWriting || isConfirming || paymentInProgress}
                  className={`
                    flex-1 py-4 rounded-lg font-bold text-xl text-white transition-all
                    ${socket.isConnected && !isWriting && !isConfirming && !paymentInProgress
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gray-700 cursor-not-allowed'
                    }
                  `}
                >
                  {paymentInProgress || isWriting || isConfirming
                    ? 'Processing Transaction...'
                    : socket.isConnected
                      ? 'Find Match'
                      : 'Connecting...'}
                </motion.button>

                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white transition-all"
                >
                  Back
                </button>
              </div>

              {/* Bot Match Option */}
              <div className="border-t border-gray-700 pt-6">
                <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-purple-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        Practice vs Bots
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Play against AI opponents to test strategies
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleJoinBotMatch}
                    disabled={!socket.isConnected || isWriting || isConfirming || paymentInProgress}
                    className={`
                      w-full py-3 rounded-lg font-bold text-lg text-white transition-all
                      ${socket.isConnected && !isWriting && !isConfirming && !paymentInProgress
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                        : 'bg-gray-700 cursor-not-allowed'
                      }
                    `}
                  >
                    {paymentInProgress || isWriting || isConfirming
                      ? 'Processing Transaction...'
                      : socket.isConnected
                        ? 'Start Bot Match'
                        : 'Connecting...'}
                  </motion.button>
                </div>
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

              {/* DEV: Force End Match Button */}
              {process.env.NODE_ENV === 'development' && matchId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 p-4 bg-red-900/20 border border-red-500 rounded-lg"
                >
                  <p className="text-red-400 text-sm mb-3 font-semibold">
                    ⚠️ You are currently in a match: {matchId.slice(0, 8)}...
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Force end your active match? All players will be kicked to lobby.')) {
                        socket.forceEndMatch();
                        toast.success('Match force ended');
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Force End Active Match (DEV)
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Modal */}
        <AnimatePresence>
          {pendingPayment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-8 max-w-md w-full mx-4 border-2 border-yellow-500 shadow-2xl"
              >
                <h2 className="text-3xl font-bold text-yellow-400 mb-4 text-center">
                  Match Found!
                </h2>
                <p className="text-gray-300 mb-6 text-center">
                  Pay entry fee to join the match
                </p>

                <div className="bg-gray-700 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400">Entry Fee:</span>
                    <span className="text-2xl font-bold text-yellow-400">{pendingPayment.entryFee} RON</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400">Match ID:</span>
                    <span className="text-white font-mono">#{pendingPayment.blockchainMatchId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Time Remaining:</span>
                    <span className="text-red-400 font-bold">
                      {Math.max(0, Math.floor((pendingPayment.deadline - Date.now()) / 1000))}s
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePayEntry}
                  disabled={isWriting || isConfirming || paymentInProgress}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-4 rounded-lg text-lg font-bold transition-all shadow-lg mb-3"
                >
                  {isWriting && 'Waiting for wallet...'}
                  {isConfirming && 'Confirming transaction...'}
                  {!isWriting && !isConfirming && `Pay ${pendingPayment.entryFee} RON`}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  All players must pay within the time limit for the match to start
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
