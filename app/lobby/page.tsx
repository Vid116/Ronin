'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/hooks/useGame';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { useContract, usePlayerBalance } from '@/hooks/useContract';
import toast from 'react-hot-toast';
import { formatEther } from 'viem';
import { Swords, ArrowLeft, Wallet, Trophy, Users, Clock, Grid3x3, Timer, Bot, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stake = Number(searchParams.get('stake')) || 0;

  const { address, isConnected, balance, socket } = useGame();
  const { queue, joinQueue, leaveQueue, updateQueueCount } = usePlayerStore();
  const matchId = useGameStore((state) => state.matchId);
  const pendingPayment = useGameStore((state) => state.pendingPayment);
  const { joinMatch, claimRewards, isWriting, isConfirming, isConfirmed, txHash } = useContract();
  const { balance: claimableBalance, isLoading: isLoadingBalance } = usePlayerBalance(address);

  const [timeInQueue, setTimeInQueue] = useState(0);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [playersPerMatch, setPlayersPerMatch] = useState(6); // Default to 6, fetched from server

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
        if (currentCount < playersPerMatch) {
          updateQueueCount(Math.min(currentCount + Math.floor(Math.random() * 2), playersPerMatch));
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [queue.isQueuing, queue.playersInQueue, updateQueueCount, playersPerMatch]);

  // Handle payment transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash && pendingPayment && paymentInProgress) {
      console.log('✅ Payment confirmed, submitting to server:', txHash);
      setPaymentInProgress(false);

      // Submit payment to server
      const success = socket.submitPayment(pendingPayment.blockchainMatchId, txHash);
      if (success) {
        toast.success('Payment submitted! Waiting for other players...');
      } else {
        toast.error('Failed to submit payment');
      }
    }
  }, [isConfirmed, txHash, pendingPayment, paymentInProgress, socket]);

  // Auto-trigger payment when AWAITING_PAYMENT event is received
  useEffect(() => {
    if (pendingPayment && !paymentInProgress && !txHash) {
      console.log('💰 Payment required, automatically triggering payment modal');
      // Payment modal is already shown by the pendingPayment state
      // User must click the "Pay" button manually
    }
  }, [pendingPayment, paymentInProgress, txHash]);

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

  const handleJoinROFLTest = async () => {
    if (!socket.isConnected) {
      toast.error('Not connected to game server. Please refresh.');
      return;
    }

    // ROFL test matches are free but use ROFL computation
    const success = socket.joinQueue(0, undefined, 'rofl-test');
    if (success) {
      joinQueue(0);
      toast.success('Joining ROFL test match (free, using TEE)...');
    } else {
      toast.error('Failed to join ROFL test queue');
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-warm-gray-700">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 text-warm-gray-400 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          <Swords className="w-6 h-6 text-sage-500" strokeWidth={2} />
          <h1 className="text-2xl font-semibold text-foreground">Ronin Rumble</h1>
        </button>
        <div className="flex items-center gap-4">
          {/* Claimable Balance Display */}
          {claimableBalance && claimableBalance > 0n && (
            <Card variant="bordered" className="flex items-center gap-3 px-4 py-2">
              <Wallet className="w-5 h-5 text-warning" strokeWidth={2} />
              <div>
                <div className="text-xs text-warm-gray-400">Claimable Prizes</div>
                <div className="font-semibold text-foreground">
                  {formatEther(claimableBalance)} RON
                </div>
              </div>
            </Card>
          )}
          {/* Connection Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg border border-warm-gray-700">
            <div
              className={`w-2 h-2 rounded-full ${
                socket.isConnected ? 'bg-success' : 'bg-error'
              }`}
            />
            <span className="text-xs text-warm-gray-400">
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
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="mb-8"
              >
                <Swords className="w-20 h-20 mx-auto text-sage-500" strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-4xl font-semibold mb-4 text-foreground">Finding Match...</h2>
              <p className="text-xl text-warm-gray-400 mb-8">
                Queue time: {Math.floor(timeInQueue / 60)}:{(timeInQueue % 60).toString().padStart(2, '0')}
              </p>

              {/* Player Counter */}
              <div className="flex justify-center gap-3 mb-8">
                {[...Array(playersPerMatch)].map((_, i) => {
                  const isFilled = i < queue.playersInQueue;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`
                        w-16 h-16 rounded-lg flex items-center justify-center text-xl font-semibold border-2 transition-colors
                        ${isFilled
                          ? 'bg-surface border-sage-500 text-sage-500'
                          : 'bg-surface border-warm-gray-700 text-warm-gray-600'
                        }
                      `}
                    >
                      {isFilled ? <Users className="w-6 h-6" strokeWidth={2} /> : i + 1}
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-lg text-foreground mb-8">
                <span className="text-sage-500 font-semibold">{queue.playersInQueue}</span>
                <span className="text-warm-gray-400">/{playersPerMatch} Players Found</span>
              </p>

              {/* Cancel Button */}
              <Button
                onClick={handleLeaveQueue}
                variant="secondary"
                size="lg"
                className="border-error hover:border-error hover:bg-error/10"
              >
                <X className="w-5 h-5 mr-2" strokeWidth={2} />
                Cancel Queue
              </Button>
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
              <Card variant="default" className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">Match Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-warm-gray-400">Entry Fee:</span>
                    <span className="ml-2 font-semibold text-foreground">
                      {stake === 0 ? 'Free' : `${stake} RON`}
                    </span>
                  </div>
                  <div>
                    <span className="text-warm-gray-400">Prize Pool:</span>
                    <span className="ml-2 font-semibold text-foreground">
                      {stake === 0 ? 'Practice' : `${stake * playersPerMatch} RON`}
                    </span>
                  </div>
                  <div>
                    <span className="text-warm-gray-400">Your Balance:</span>
                    <span className="ml-2 font-semibold text-warning">
                      {balance || '0'} RON
                    </span>
                  </div>
                  <div>
                    <span className="text-warm-gray-400">Players:</span>
                    <span className="ml-2 font-semibold text-foreground">{playersPerMatch}</span>
                  </div>
                </div>
              </Card>

              {/* Rewards */}
              <Card variant="default" className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Rewards</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-surface-light border-2 border-warning rounded-lg">
                    <span className="font-semibold text-warm-gray-300 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-warning" strokeWidth={2} />
                      1st Place
                    </span>
                    <span className="font-semibold text-foreground text-lg">{rewards?.first}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface border border-warm-gray-700 rounded-lg">
                    <span className="font-medium text-warm-gray-400">2nd Place</span>
                    <span className="font-medium text-foreground">{rewards?.second}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface border border-warm-gray-700 rounded-lg">
                    <span className="font-medium text-warm-gray-400">3rd Place</span>
                    <span className="font-medium text-foreground">{rewards?.third}</span>
                  </div>
                </div>
              </Card>

              {/* Game Info */}
              <Card variant="default" className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Game Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-sage-500" strokeWidth={2} />
                    <div>
                      <div className="font-semibold text-foreground">10-15 Minutes</div>
                      <div className="text-warm-gray-500">Match Duration</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-sage-500" strokeWidth={2} />
                    <div>
                      <div className="font-semibold text-foreground">30 Units</div>
                      <div className="text-warm-gray-500">5 Tiers</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Grid3x3 className="w-5 h-5 text-sage-500" strokeWidth={2} />
                    <div>
                      <div className="font-semibold text-foreground">8 Positions</div>
                      <div className="text-warm-gray-500">Tactical Grid</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-sage-500" strokeWidth={2} />
                    <div>
                      <div className="font-semibold text-foreground">20 Seconds</div>
                      <div className="text-warm-gray-500">Per Planning Phase</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Claim Rewards Button (if user has claimable balance) */}
              {claimableBalance && claimableBalance > 0n && (
                <Card variant="bordered" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-warning" strokeWidth={2} />
                        Prizes Ready to Claim!
                      </h3>
                      <p className="text-warm-gray-400 mt-1">
                        You have {formatEther(claimableBalance)} RON waiting for you
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        await claimRewards();
                        toast.success('Claiming your prizes!');
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    disabled={isWriting || isConfirming}
                    variant="primary"
                    size="lg"
                    isLoading={isWriting || isConfirming}
                    className="w-full"
                  >
                    {isWriting || isConfirming ? 'Processing...' : 'Claim Prizes'}
                  </Button>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={handleJoinQueue}
                  disabled={!socket.isConnected || isWriting || isConfirming || paymentInProgress}
                  variant="primary"
                  size="lg"
                  isLoading={paymentInProgress || isWriting || isConfirming}
                  className="flex-1"
                >
                  {paymentInProgress || isWriting || isConfirming
                    ? 'Processing Transaction...'
                    : socket.isConnected
                      ? 'Find Match'
                      : 'Connecting...'}
                </Button>

                <Button
                  onClick={() => router.push('/')}
                  variant="ghost"
                  size="lg"
                >
                  Back
                </Button>
              </div>

              {/* Bot Match Option */}
              <div className="border-t border-warm-gray-700 pt-6">
                <Card variant="default" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Bot className="w-6 h-6 text-sage-500" strokeWidth={2} />
                        Practice vs Bots
                      </h3>
                      <p className="text-sm text-warm-gray-400 mt-1">
                        Play against AI opponents to test strategies
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleJoinBotMatch}
                    disabled={!socket.isConnected || isWriting || isConfirming || paymentInProgress}
                    variant="secondary"
                    size="md"
                    isLoading={paymentInProgress || isWriting || isConfirming}
                    className="w-full"
                  >
                    {paymentInProgress || isWriting || isConfirming
                      ? 'Processing Transaction...'
                      : socket.isConnected
                        ? 'Start Bot Match'
                        : 'Connecting...'}
                  </Button>
                </Card>
              </div>

              {/* ROFL Test Match Option */}
              <div className="border-t border-warm-gray-700 pt-6">
                <Card variant="default" className="p-6 border-2 border-sage-500/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-sage-500" strokeWidth={2} />
                        ROFL Test 1v1
                        <span className="text-xs px-2 py-1 rounded-full bg-sage-500/20 text-sage-400">FREE</span>
                      </h3>
                      <p className="text-sm text-warm-gray-400 mt-1">
                        Test battles computed in Oasis TEE (Trusted Execution Environment)
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleJoinROFLTest}
                    disabled={!socket.isConnected || queue.isQueuing || isWriting || isConfirming || paymentInProgress}
                    variant="primary"
                    size="md"
                    isLoading={paymentInProgress || isWriting || isConfirming}
                    className="w-full bg-sage-600 hover:bg-sage-700"
                  >
                    {paymentInProgress || isWriting || isConfirming
                      ? 'Processing...'
                      : queue.isQueuing
                        ? 'In Queue...'
                        : socket.isConnected
                          ? 'Test ROFL Battle'
                          : 'Connecting...'}
                  </Button>
                </Card>
              </div>

              {!socket.isConnected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-warning text-sm flex items-center justify-center gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  Connecting to game server...
                </motion.div>
              )}

              {/* DEV: Force End Match Button */}
              {process.env.NODE_ENV === 'development' && matchId && (
                <Card variant="default" className="p-4 border-error">
                  <p className="text-error text-sm mb-3 font-semibold">
                    You are currently in a match: {String(matchId).slice(0, 8)}...
                  </p>
                  <Button
                    onClick={() => {
                      if (confirm('Force end ALL active matches on the server? This will kick all players in all matches to lobby.')) {
                        socket.forceEndMatch();
                        toast.success('All matches force ended');
                      }
                    }}
                    variant="secondary"
                    size="sm"
                    className="w-full border-error hover:border-error hover:bg-error/10"
                  >
                    Force End All Matches (DEV)
                  </Button>
                </Card>
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
              >
                <Card variant="bordered" className="p-8 max-w-md w-full mx-4">
                  <h2 className="text-3xl font-semibold text-foreground mb-2 text-center flex items-center justify-center gap-2">
                    <Trophy className="w-8 h-8 text-warning" strokeWidth={2} />
                    Match Found!
                  </h2>
                  <p className="text-warm-gray-400 mb-6 text-center">
                    Pay entry fee to join the match
                  </p>

                  <div className="bg-surface rounded-lg p-6 mb-6 space-y-4 border border-warm-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-warm-gray-400">Entry Fee:</span>
                      <span className="text-2xl font-semibold text-foreground">{pendingPayment.entryFee} RON</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-warm-gray-400">Match ID:</span>
                      <span className="text-foreground font-mono">#{pendingPayment.blockchainMatchId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-warm-gray-400">Time Remaining:</span>
                      <span className="text-error font-semibold flex items-center gap-1">
                        <Timer className="w-4 h-4" strokeWidth={2} />
                        {Math.max(0, Math.floor((pendingPayment.deadline - Date.now()) / 1000))}s
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePayEntry}
                    disabled={isWriting || isConfirming || paymentInProgress}
                    variant="primary"
                    size="lg"
                    isLoading={isWriting || isConfirming}
                    className="w-full mb-3"
                  >
                    {isWriting && 'Waiting for wallet...'}
                    {isConfirming && 'Confirming transaction...'}
                    {!isWriting && !isConfirming && `Pay ${pendingPayment.entryFee} RON`}
                  </Button>

                  <p className="text-xs text-warm-gray-400 text-center">
                    All players must pay within the time limit for the match to start
                  </p>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
