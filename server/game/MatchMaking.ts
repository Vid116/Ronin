import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './GameRoom';
import { BotPlayer } from './BotPlayer';
import { ContractService } from '../services/ContractService';
import { logger } from '../utils/logger';

interface QueuedPlayer {
  socketId: string;
  entryFee: number;
  joinedAt: number;
  transactionHash?: string;
  isBot?: boolean;
  botName?: string;
  walletAddress?: string;
  matchType?: 'standard' | 'rofl-test'; // Track match type
}

interface PendingMatch {
  localMatchId: string;
  blockchainMatchId: number;
  entryFee: number;
  players: QueuedPlayer[];
  playersPaid: Set<string>; // wallet addresses that have paid
  createdAt: number;
  deadline: number;
}

export class MatchMaking {
  private queue: QueuedPlayer[] = [];
  private activeMatches = new Map<string, GameRoom>();
  private pendingMatches = new Map<string, PendingMatch>(); // localMatchId → pending match
  private walletToSocket = new Map<string, string>(); // wallet address → current socket ID
  private socketToWallet = new Map<string, string>(); // socket ID → wallet address
  private io: SocketIOServer;
  private readonly PLAYERS_PER_MATCH: number;
  private readonly PAYMENT_TIMEOUT_MS = 120000; // 2 minutes for all players to pay
  private contractService: ContractService | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;

    // Get players per match from environment (default to 6 for production)
    this.PLAYERS_PER_MATCH = parseInt(process.env.PLAYERS_PER_MATCH || '6', 10);
    logger.info('MatchMaking initialized', {
      playersPerMatch: this.PLAYERS_PER_MATCH,
      envValue: process.env.PLAYERS_PER_MATCH,
      parsedValue: this.PLAYERS_PER_MATCH
    });

    // Initialize contract service if environment is configured
    try {
      this.contractService = new ContractService();
      logger.info('ContractService initialized in MatchMaking', {});
    } catch (error: any) {
      logger.info('ContractService not initialized - blockchain features disabled', {
        error: error.message
      });
    }
  }

  /**
   * Update socket mapping for a wallet address
   */
  updateSocketMapping(walletAddress: string, socketId: string): void {
    // Remove old mapping if exists
    const oldSocketId = this.walletToSocket.get(walletAddress);
    if (oldSocketId) {
      this.socketToWallet.delete(oldSocketId);
      logger.state('Removed old socket mapping', {
        wallet: walletAddress,
        oldSocketId
      });
    }

    // Add new mapping
    this.walletToSocket.set(walletAddress, socketId);
    this.socketToWallet.set(socketId, walletAddress);
    logger.state('Updated socket mapping', {
      wallet: walletAddress,
      socketId
    });
  }

  /**
   * Get active match by wallet address
   */
  getMatchByWallet(walletAddress: string): GameRoom | null {
    for (const match of this.activeMatches.values()) {
      if (match.hasPlayerByWallet(walletAddress)) {
        return match;
      }
    }
    return null;
  }

  /**
   * Add a player to the matchmaking queue
   */
  async addToQueue(socketId: string, entryFee: number, transactionHash?: string, matchType: 'standard' | 'rofl-test' = 'standard'): Promise<void> {
    // Check if player is already in queue
    const existingIndex = this.queue.findIndex(p => p.socketId === socketId);
    const walletAddress = this.socketToWallet.get(socketId);

    if (existingIndex !== -1) {
      logger.action('Player already in queue', {
        wallet: walletAddress,
        socketId
      });
      return;
    }

    logger.action('Player joining queue', {
      wallet: walletAddress,
      socketId,
      entryFee
    });

    // Add to queue (no transaction hash required yet for paid matches)
    this.queue.push({
      socketId,
      entryFee,
      joinedAt: Date.now(),
      walletAddress,
      matchType,
    });

    logger.state('Queue updated', {
      queueSize: this.queue.length,
      playersNeeded: this.PLAYERS_PER_MATCH,
      queueContents: this.queue.map(p => ({
        wallet: p.walletAddress,
        socketId: p.socketId,
        entryFee: p.entryFee
      }))
    });

    // Notify player they joined queue
    this.io.to(socketId).emit('server_event', {
      type: 'QUEUE_JOINED',
      data: {
        queueSize: this.queue.length,
        position: this.queue.length,
      },
    });

    // Try to create a match
    await this.tryCreateMatch();
  }

  /**
   * Remove a player from the queue (e.g., on disconnect)
   */
  removeFromQueue(socketId: string): boolean {
    const index = this.queue.findIndex(p => p.socketId === socketId);
    if (index === -1) {
      return false;
    }

    const walletAddress = this.socketToWallet.get(socketId);
    this.queue.splice(index, 1);
    logger.action('Player removed from queue', {
      wallet: walletAddress,
      socketId,
      queueSize: this.queue.length,
      playersNeeded: this.PLAYERS_PER_MATCH
    });
    return true;
  }

  /**
   * Try to create a match if enough players are in queue
   */
  private async tryCreateMatch(): Promise<void> {
    logger.action('tryCreateMatch called', {
      queueSize: this.queue.length,
      playersNeeded: this.PLAYERS_PER_MATCH,
      willCreateMatch: this.queue.length >= this.PLAYERS_PER_MATCH,
      queueWallets: this.queue.map(p => p.walletAddress).join(', ')
    });

    if (this.queue.length < this.PLAYERS_PER_MATCH) {
      logger.action('Not enough players for match', {
        queueSize: this.queue.length,
        playersNeeded: this.PLAYERS_PER_MATCH
      });
      return;
    }

    // Take first PLAYERS_PER_MATCH players from queue
    const matchPlayers = this.queue.splice(0, this.PLAYERS_PER_MATCH);
    const entryFee = matchPlayers[0].entryFee;

    logger.match('Creating match', {
      playerCount: matchPlayers.length,
      entryFee,
      wallets: matchPlayers.map(p => p.walletAddress).join(', ')
    });

    // Generate local match ID
    const localMatchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let blockchainMatchId: number | null = null;

    // For paid matches, create on blockchain
    if (this.contractService && entryFee > 0) {
      try {
        blockchainMatchId = await this.contractService.createMatch(entryFee);
        logger.match('Blockchain match created', {
          blockchainMatchId,
          entryFee
        });
      } catch (error: any) {
        // Log detailed error information for debugging
        logger.error('Failed to create blockchain match', {
          error: error.message,
          errorCode: error.code,
          errorReason: error.reason,
          errorData: error.data,
          entryFee,
          playerCount: matchPlayers.length,
          stack: error.stack
        });

        // Return players to queue on failure
        this.queue.unshift(...matchPlayers);

        // Create user-friendly error message based on error type
        let userMessage = 'Failed to create match on blockchain. Please try again.';
        if (error.message?.includes('insufficient funds')) {
          userMessage = 'Game server has insufficient funds. Please contact support.';
        } else if (error.message?.includes('network') || error.message?.includes('connection')) {
          userMessage = 'Network connection issue. Please try again in a moment.';
        } else if (error.message?.includes('revert')) {
          userMessage = 'Smart contract rejected the match. Please check entry fee.';
        }

        // Notify players of failure with detailed message
        matchPlayers.forEach(({ socketId }) => {
          this.io.to(socketId).emit('error', {
            type: 'MATCH_CREATION_FAILED',
            message: userMessage,
            details: error.message
          });
        });

        return;
      }
    }

    // For paid matches, wait for all players to pay
    if (blockchainMatchId !== null && entryFee > 0) {
      const deadline = Date.now() + this.PAYMENT_TIMEOUT_MS;

      // Create pending match
      const pendingMatch: PendingMatch = {
        localMatchId,
        blockchainMatchId,
        entryFee,
        players: matchPlayers,
        playersPaid: new Set(),
        createdAt: Date.now(),
        deadline,
      };
      this.pendingMatches.set(localMatchId, pendingMatch);

      logger.match('Blockchain match created, awaiting payments', {
        matchId: localMatchId,
        blockchainMatchId,
        playerCount: matchPlayers.length,
        entryFee,
        deadline: new Date(deadline).toISOString()
      });

      // Notify all players to submit payment
      matchPlayers.forEach(({ socketId }) => {
        this.io.to(socketId).emit('server_event', {
          type: 'AWAITING_PAYMENT',
          data: {
            blockchainMatchId,
            entryFee,
            deadline,
          },
        });
      });

      // Set timeout to cancel match if not all players pay
      setTimeout(() => {
        this.checkPendingMatchTimeout(localMatchId);
      }, this.PAYMENT_TIMEOUT_MS);

      return;
    }

    // For free matches, start immediately
    logger.match('Starting free match', {
      matchId: localMatchId,
      playerCount: matchPlayers.length
    });

    this.startMatch(localMatchId, matchPlayers, blockchainMatchId, entryFee);
  }

  /**
   * Submit payment for a pending match
   */
  async submitPayment(socketId: string, blockchainMatchId: number, transactionHash: string): Promise<void> {
    const walletAddress = this.socketToWallet.get(socketId);
    if (!walletAddress) {
      logger.error('Payment submission failed: no wallet address', { socketId });
      this.io.to(socketId).emit('error', {
        type: 'PAYMENT_FAILED',
        message: 'Wallet address not found',
      });
      return;
    }

    // Find pending match
    let pendingMatch: PendingMatch | undefined;
    let matchId: string | undefined;
    for (const [id, pm] of this.pendingMatches.entries()) {
      if (pm.blockchainMatchId === blockchainMatchId) {
        pendingMatch = pm;
        matchId = id;
        break;
      }
    }

    if (!pendingMatch || !matchId) {
      logger.error('Payment submission failed: pending match not found', {
        wallet: walletAddress,
        blockchainMatchId
      });
      this.io.to(socketId).emit('error', {
        type: 'PAYMENT_FAILED',
        message: 'Match not found or already started',
      });
      return;
    }

    // Check if player already paid
    if (pendingMatch.playersPaid.has(walletAddress)) {
      logger.action('Player already paid for match', {
        wallet: walletAddress,
        blockchainMatchId
      });
      return;
    }

    // Verify transaction
    if (this.contractService) {
      try {
        await this.contractService.verifyJoinMatch(
          transactionHash,
          blockchainMatchId,
          walletAddress,
          pendingMatch.entryFee
        );

        logger.action('Payment verified successfully', {
          wallet: walletAddress,
          blockchainMatchId,
          transactionHash
        });
      } catch (error: any) {
        logger.error('Payment verification failed', {
          wallet: walletAddress,
          blockchainMatchId,
          transactionHash,
          error: error.message
        });
        this.io.to(socketId).emit('error', {
          type: 'PAYMENT_VERIFICATION_FAILED',
          message: `Payment verification failed: ${error.message}`,
        });
        return;
      }
    }

    // Mark player as paid
    pendingMatch.playersPaid.add(walletAddress);

    logger.state('Player payment confirmed', {
      wallet: walletAddress,
      blockchainMatchId,
      playersPaid: pendingMatch.playersPaid.size,
      totalPlayers: pendingMatch.players.length
    });

    // Notify all players in this match about payment progress
    pendingMatch.players.forEach(({ socketId: pSocketId }) => {
      this.io.to(pSocketId).emit('server_event', {
        type: 'PAYMENT_CONFIRMED',
        data: {
          playerId: socketId,
          playersReady: pendingMatch!.playersPaid.size,
          totalPlayers: pendingMatch!.players.length,
        },
      });
    });

    // Start match if all players paid
    if (pendingMatch.playersPaid.size === pendingMatch.players.length) {
      logger.match('All payments confirmed, starting match', {
        matchId,
        blockchainMatchId
      });

      // Remove from pending
      this.pendingMatches.delete(matchId);

      // Notify all players
      pendingMatch.players.forEach(({ socketId: pSocketId }) => {
        this.io.to(pSocketId).emit('server_event', {
          type: 'ALL_PAYMENTS_CONFIRMED',
          data: { matchId },
        });
      });

      // Start the match
      this.startMatch(matchId, pendingMatch.players, blockchainMatchId, pendingMatch.entryFee);
    }
  }

  /**
   * Check if a pending match has timed out
   */
  private checkPendingMatchTimeout(localMatchId: string): void {
    const pendingMatch = this.pendingMatches.get(localMatchId);
    if (!pendingMatch) {
      return; // Already started or cancelled
    }

    if (Date.now() >= pendingMatch.deadline) {
      logger.match('Match cancelled: payment timeout', {
        matchId: localMatchId,
        blockchainMatchId: pendingMatch.blockchainMatchId,
        playersPaid: pendingMatch.playersPaid.size,
        totalPlayers: pendingMatch.players.length
      });

      // Notify all players
      pendingMatch.players.forEach(({ socketId }) => {
        this.io.to(socketId).emit('server_event', {
          type: 'MATCH_CANCELLED',
          data: {
            reason: `Match cancelled: only ${pendingMatch.playersPaid.size}/${pendingMatch.players.length} players paid within time limit`,
          },
        });
      });

      // Return unpaid players to queue
      const unpaidPlayers = pendingMatch.players.filter(p =>
        p.walletAddress && !pendingMatch.playersPaid.has(p.walletAddress)
      );
      this.queue.unshift(...unpaidPlayers);

      logger.state('Unpaid players returned to queue', {
        count: unpaidPlayers.length
      });

      // Remove pending match
      this.pendingMatches.delete(localMatchId);
    }
  }

  /**
   * Start a match (after all payments confirmed or for free matches)
   */
  private startMatch(
    localMatchId: string,
    matchPlayers: QueuedPlayer[],
    blockchainMatchId: number | null,
    entryFee: number
  ): void {
    logger.match('Starting match', {
      matchId: localMatchId,
      blockchainMatchId,
      playerCount: matchPlayers.length,
      entryFee
    });

    // Create game room with both IDs
    const gameRoom = new GameRoom(
      localMatchId,
      matchPlayers,
      this.io,
      this.contractService,
      blockchainMatchId,
      this.PLAYERS_PER_MATCH
    );
    this.activeMatches.set(localMatchId, gameRoom);

    // Notify all players that match is starting
    matchPlayers.forEach(({ socketId }) => {
      this.io.to(socketId).emit('server_event', {
        type: 'MATCH_FOUND',
        data: {
          id: localMatchId,
          blockchainMatchId,
          players: matchPlayers.map((p, i) => ({
            id: p.socketId,
            address: p.walletAddress || `0x${i.toString().padStart(40, '0')}`,
            health: 20,
            gold: 3,
            level: 1,
            xp: 0,
            winStreak: 0,
            loseStreak: 0,
          })),
          entryFee,
          prizePool: entryFee * this.PLAYERS_PER_MATCH,
          status: 'IN_PROGRESS' as const,
          currentRound: 1,
          createdAt: Date.now(),
        },
      });
    });

    // Start the match
    gameRoom.start();
  }

  /**
   * Handle player disconnect
   */
  handleDisconnect(socketId: string): void {
    const walletAddress = this.socketToWallet.get(socketId);

    // Remove from queue if present
    const removedFromQueue = this.removeFromQueue(socketId);

    if (removedFromQueue) {
      logger.disconnect('Player disconnected from queue', {
        wallet: walletAddress,
        socketId
      });
      return;
    }

    // Find and handle disconnect in active matches
    const matches = Array.from(this.activeMatches.entries());
    for (const [matchId, gameRoom] of matches) {
      if (gameRoom.hasPlayer(socketId)) {
        logger.disconnect('Player disconnected from match', {
          wallet: walletAddress,
          socketId,
          matchId
        });
        gameRoom.handlePlayerDisconnect(socketId);

        // Remove match if it's completed
        if (gameRoom.isCompleted()) {
          this.activeMatches.delete(matchId);
          logger.match('Cleaned up completed match', {
            matchId
          });
        }
        break;
      }
    }
  }

  /**
   * Get active match by player socket ID
   */
  getMatchByPlayer(socketId: string): GameRoom | null {
    const rooms = Array.from(this.activeMatches.values());
    for (const gameRoom of rooms) {
      if (gameRoom.hasPlayer(socketId)) {
        return gameRoom;
      }
    }
    return null;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.queue.length,
      activeMatches: this.activeMatches.size,
    };
  }

  /**
   * Create a bot match (1 human player vs 5 bots)
   */
  async createBotMatch(socketId: string, entryFee: number, transactionHash?: string): Promise<void> {
    // Get player's wallet address
    const walletAddress = this.socketToWallet.get(socketId);

    logger.match('Creating bot match', {
      wallet: walletAddress,
      socketId,
      entryFee
    });

    // For paid matches, verify transaction hash is provided
    if (entryFee > 0 && !transactionHash) {
      logger.error('Paid bot match attempted without transaction hash', {
        wallet: walletAddress,
        socketId,
        entryFee
      });
      this.io.to(socketId).emit('error', {
        type: 'GAME_ERROR',
        message: 'Transaction hash required for paid matches'
      });
      return;
    }

    // Verify transaction on blockchain
    if (transactionHash && this.contractService && walletAddress) {
      logger.action('Verifying transaction for bot match', {
        wallet: walletAddress,
        socketId,
        transactionHash
      });

      try {
        const provider = (this.contractService as any).provider;
        const receipt = await provider.getTransactionReceipt(transactionHash);

        if (!receipt || receipt.status !== 1) {
          throw new Error('Transaction not found or failed');
        }

        const contractAddress = this.contractService.getContractAddress();
        if (receipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
          throw new Error('Transaction is not to the game contract');
        }

        logger.action('Transaction verified for bot match', {
          wallet: walletAddress,
          socketId,
          transactionHash
        });
      } catch (error: any) {
        logger.error('Bot match transaction verification failed', {
          wallet: walletAddress,
          socketId,
          transactionHash,
          error: error.message
        });
        this.io.to(socketId).emit('error', {
          type: 'TRANSACTION_VERIFICATION_FAILED',
          message: `Transaction verification failed: ${error.message}`,
        });
        return;
      }
    }

    const matchId = `bot-match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create player list: 1 human + 5 bots
    const matchPlayers: QueuedPlayer[] = [
      {
        socketId,
        entryFee,
        joinedAt: Date.now(),
        transactionHash,
        isBot: false,
        walletAddress,
      }
    ];

    // Add 5 bots
    for (let i = 0; i < 5; i++) {
      const botId = `bot_${matchId}_${i}`;
      matchPlayers.push({
        socketId: botId,
        entryFee,
        joinedAt: Date.now(),
        isBot: true,
        botName: BotPlayer.generateBotName(),
      });
    }

    // Note: Bot matches don't create blockchain matches since bots don't pay entry fees
    // The human player's transaction is just verified
    const gameRoom = new GameRoom(
      matchId,
      matchPlayers,
      this.io,
      this.contractService,
      null, // No blockchain match ID for bot matches
      this.PLAYERS_PER_MATCH
    );
    this.activeMatches.set(matchId, gameRoom);

    // Notify player that bot match was created
    this.io.to(socketId).emit('server_event', {
      type: 'MATCH_FOUND',
      data: {
        id: matchId,
        blockchainMatchId: null,
        players: matchPlayers.map((p, i) => ({
          id: p.socketId,
          address: p.walletAddress || `0x${i.toString().padStart(40, '0')}`,
          health: 20,
          gold: 3,
          level: 1,
          xp: 0,
          winStreak: 0,
          loseStreak: 0,
          isBot: p.isBot,
          botName: p.botName,
        })),
        entryFee: entryFee,
        prizePool: entryFee * this.PLAYERS_PER_MATCH,
        status: 'IN_PROGRESS' as const,
        currentRound: 1,
        createdAt: Date.now(),
        isBotMatch: true,
      },
    });

    // Start the match
    logger.match('Starting bot match', {
      matchId,
      wallet: walletAddress,
      socketId,
      entryFee,
      botCount: 5
    });
    gameRoom.start();
  }

  /**
   * Force end ALL active matches (dev utility)
   * @returns Number of matches that were ended
   */
  forceEndAllMatches(): number {
    const matchIds = Array.from(this.activeMatches.keys());
    const count = matchIds.length;

    logger.action('DEV: Force ending all active matches', {
      matchCount: count,
      matchIds: matchIds.join(', ')
    });

    matchIds.forEach(matchId => {
      const gameRoom = this.activeMatches.get(matchId);
      if (gameRoom && !gameRoom.isCompleted()) {
        gameRoom.forceComplete();
      }
    });

    return count;
  }

  /**
   * Clean up completed matches
   */
  cleanup(): void {
    const matches = Array.from(this.activeMatches.entries());
    for (const [matchId, gameRoom] of matches) {
      if (gameRoom.isCompleted()) {
        gameRoom.cleanup();
        this.activeMatches.delete(matchId);
      }
    }
  }
}
