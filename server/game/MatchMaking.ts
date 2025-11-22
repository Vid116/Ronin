import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './GameRoom';
import { BotPlayer } from './BotPlayer';

interface QueuedPlayer {
  socketId: string;
  entryFee: number;
  joinedAt: number;
  transactionHash?: string;
  isBot?: boolean;
  botName?: string;
}

export class MatchMaking {
  private queue: QueuedPlayer[] = [];
  private activeMatches = new Map<string, GameRoom>();
  private walletToSocket = new Map<string, string>(); // wallet address → current socket ID
  private socketToWallet = new Map<string, string>(); // socket ID → wallet address
  private io: SocketIOServer;
  private readonly PLAYERS_PER_MATCH = 6;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Update socket mapping for a wallet address
   */
  updateSocketMapping(walletAddress: string, socketId: string): void {
    // Remove old mapping if exists
    const oldSocketId = this.walletToSocket.get(walletAddress);
    if (oldSocketId) {
      this.socketToWallet.delete(oldSocketId);
    }

    // Add new mapping
    this.walletToSocket.set(walletAddress, socketId);
    this.socketToWallet.set(socketId, walletAddress);
    console.log(`Updated socket mapping: ${walletAddress} → ${socketId}`);
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
  addToQueue(socketId: string, entryFee: number, transactionHash?: string): void {
    // Check if player is already in queue
    const existingIndex = this.queue.findIndex(p => p.socketId === socketId);
    if (existingIndex !== -1) {
      console.log(`Player ${socketId} already in queue`);
      return;
    }

    // For paid matches, verify transaction hash is provided
    if (entryFee > 0 && !transactionHash) {
      console.warn(`Player ${socketId} attempted to join paid match without transaction hash`);
      // In production, you would reject this. For now, we'll log a warning.
      // this.io.to(socketId).emit('error', { type: 'GAME_ERROR', message: 'Transaction hash required for paid matches' });
      // return;
    }

    // TODO: Verify transaction on blockchain
    if (transactionHash) {
      console.log(`🔗 Transaction hash for ${socketId}: ${transactionHash}`);
      // In production, add verification logic here:
      // 1. Query the blockchain for this transaction
      // 2. Verify it's a valid createMatch or joinMatch call
      // 3. Verify the entry fee matches
      // 4. Verify transaction is confirmed
    }

    // Add to queue
    this.queue.push({
      socketId,
      entryFee,
      joinedAt: Date.now(),
      transactionHash,
    });

    console.log(`Queue: ${this.queue.length}/${this.PLAYERS_PER_MATCH} players`);

    // Notify player they joined queue
    this.io.to(socketId).emit('server_event', {
      type: 'QUEUE_JOINED',
      data: {
        queueSize: this.queue.length,
        position: this.queue.length,
      },
    });

    // Try to create a match
    this.tryCreateMatch();
  }

  /**
   * Remove a player from the queue (e.g., on disconnect)
   */
  removeFromQueue(socketId: string): boolean {
    const index = this.queue.findIndex(p => p.socketId === socketId);
    if (index === -1) {
      return false;
    }

    this.queue.splice(index, 1);
    console.log(`Removed ${socketId} from queue. Queue: ${this.queue.length}/${this.PLAYERS_PER_MATCH}`);
    return true;
  }

  /**
   * Try to create a match if enough players are in queue
   */
  private tryCreateMatch(): void {
    if (this.queue.length < this.PLAYERS_PER_MATCH) {
      return;
    }

    // Take first 6 players from queue
    const matchPlayers = this.queue.splice(0, this.PLAYERS_PER_MATCH);
    const matchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Creating match ${matchId} with ${matchPlayers.length} players`);

    // Create game room
    const gameRoom = new GameRoom(matchId, matchPlayers, this.io);
    this.activeMatches.set(matchId, gameRoom);

    // Notify all players that match was found
    matchPlayers.forEach(({ socketId }) => {
      this.io.to(socketId).emit('server_event', {
        type: 'MATCH_FOUND',
        data: {
          id: matchId,
          players: matchPlayers.map((p, i) => ({
            id: p.socketId,
            address: `0x${i.toString().padStart(40, '0')}`,
            health: 20,
            gold: 3,
            level: 1,
            xp: 0,
            winStreak: 0,
            loseStreak: 0,
          })),
          entryFee: matchPlayers[0].entryFee,
          prizePool: matchPlayers[0].entryFee * this.PLAYERS_PER_MATCH,
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
    // Remove from queue if present
    const removedFromQueue = this.removeFromQueue(socketId);

    if (removedFromQueue) {
      console.log(`Removed ${socketId} from queue on disconnect`);
      return;
    }

    // Find and handle disconnect in active matches
    const matches = Array.from(this.activeMatches.entries());
    for (const [matchId, gameRoom] of matches) {
      if (gameRoom.hasPlayer(socketId)) {
        console.log(`Player ${socketId} disconnected from match ${matchId}`);
        gameRoom.handlePlayerDisconnect(socketId);

        // Remove match if it's completed
        if (gameRoom.isCompleted()) {
          this.activeMatches.delete(matchId);
          console.log(`Cleaned up completed match ${matchId}`);
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
  createBotMatch(socketId: string, entryFee: number, transactionHash?: string): void {
    console.log(`Creating bot match for ${socketId} with entry fee: ${entryFee}`);

    // For paid matches, verify transaction hash is provided
    if (entryFee > 0 && !transactionHash) {
      console.warn(`Player ${socketId} attempted to create paid bot match without transaction hash`);
    }

    // TODO: Verify transaction on blockchain
    if (transactionHash) {
      console.log(`🔗 Transaction hash for bot match ${socketId}: ${transactionHash}`);
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

    // Create game room
    const gameRoom = new GameRoom(matchId, matchPlayers, this.io);
    this.activeMatches.set(matchId, gameRoom);

    // Notify player that bot match was created
    this.io.to(socketId).emit('server_event', {
      type: 'MATCH_FOUND',
      data: {
        id: matchId,
        players: matchPlayers.map((p, i) => ({
          id: p.socketId,
          address: `0x${i.toString().padStart(40, '0')}`,
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
