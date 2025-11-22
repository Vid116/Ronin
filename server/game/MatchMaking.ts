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
}

export class MatchMaking {
  private queue: QueuedPlayer[] = [];
  private activeMatches = new Map<string, GameRoom>();
  private walletToSocket = new Map<string, string>(); // wallet address → current socket ID
  private socketToWallet = new Map<string, string>(); // socket ID → wallet address
  private io: SocketIOServer;
  private readonly PLAYERS_PER_MATCH = 6;
  private contractService: ContractService | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;

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
  async addToQueue(socketId: string, entryFee: number, transactionHash?: string): Promise<void> {
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
      entryFee,
      transactionHash
    });

    // For paid matches, verify transaction hash is provided
    if (entryFee > 0 && !transactionHash) {
      logger.error('Paid match join attempted without transaction hash', {
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
      logger.action('Verifying transaction', {
        wallet: walletAddress,
        socketId,
        transactionHash
      });

      try {
        const provider = (this.contractService as any).provider;
        const receipt = await provider.getTransactionReceipt(transactionHash);

        if (!receipt) {
          throw new Error('Transaction not found or not yet confirmed');
        }

        if (receipt.status !== 1) {
          throw new Error('Transaction failed on blockchain');
        }

        const contractAddress = this.contractService.getContractAddress();
        if (receipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
          throw new Error('Transaction is not to the game contract');
        }

        logger.action('Transaction verified successfully', {
          wallet: walletAddress,
          socketId,
          transactionHash
        });
      } catch (error: any) {
        logger.error('Transaction verification failed', {
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

    // Add to queue
    this.queue.push({
      socketId,
      entryFee,
      joinedAt: Date.now(),
      transactionHash,
      walletAddress,
    });

    logger.state('Queue updated', {
      queueSize: this.queue.length,
      playersNeeded: this.PLAYERS_PER_MATCH
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
    if (this.queue.length < this.PLAYERS_PER_MATCH) {
      return;
    }

    // Take first 6 players from queue
    const matchPlayers = this.queue.splice(0, this.PLAYERS_PER_MATCH);
    const entryFee = matchPlayers[0].entryFee;

    logger.match('Creating PvP match', {
      playerCount: matchPlayers.length,
      entryFee,
      wallets: matchPlayers.map(p => p.walletAddress).join(', ')
    });

    let blockchainMatchId: number | null = null;

    // Create match on blockchain if contract service is available and it's a paid match
    if (this.contractService && entryFee > 0) {
      logger.action('Creating blockchain match', {
        entryFee,
        playerCount: matchPlayers.length
      });

      try {
        blockchainMatchId = await this.contractService.createMatch(entryFee);
        logger.match('Blockchain match created', {
          blockchainMatchId,
          entryFee
        });
      } catch (error: any) {
        logger.error('Failed to create blockchain match', {
          error: error.message,
          entryFee,
          playerCount: matchPlayers.length
        });

        // Return players to queue on failure
        this.queue.unshift(...matchPlayers);

        // Notify players of failure
        matchPlayers.forEach(({ socketId }) => {
          this.io.to(socketId).emit('error', {
            type: 'MATCH_CREATION_FAILED',
            message: 'Failed to create match on blockchain. Please try again.',
          });
        });

        return;
      }
    }

    // Generate local match ID (can be different from blockchain ID)
    const localMatchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.match('Starting PvP match', {
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
      blockchainMatchId
    );
    this.activeMatches.set(localMatchId, gameRoom);

    // Notify all players that match was found
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
      null // No blockchain match ID for bot matches
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
    console.log(`Starting bot match ${matchId}`);
    gameRoom.start();
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
