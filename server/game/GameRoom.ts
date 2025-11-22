import { Server as SocketIOServer } from 'socket.io';
import { Player, Board, Unit, Shop, GamePhase } from '../../types/game';
import { ShopGenerator } from './ShopGenerator';
import { EconomyManager } from './EconomyManager';
import { RoundManager } from './RoundManager';
import { StateSync, PlayerGameState } from './StateSync';
import { CombatSimulator } from './CombatSimulator';
import { BotPlayer, createBotPlayers } from './BotPlayer';
import { ContractService } from '../services/ContractService';

interface QueuedPlayer {
  socketId: string;
  walletAddress?: string; // Optional for backward compatibility (bots won't have real wallets)
  entryFee: number;
  isBot?: boolean;
  botName?: string;
}

const REROLL_COST = 2;
const MAX_BENCH_SIZE = 8;

export class GameRoom {
  private matchId: string;
  private io: SocketIOServer;

  // Blockchain integration
  private contractService: ContractService | null;
  private blockchainMatchId: number | null;

  // Player management
  private players: Map<string, Player>; // wallet address → Player
  private playerBoards: Map<string, Board>; // wallet address → Board
  private playerBenches: Map<string, Unit[]>; // wallet address → Bench
  private playerShops: Map<string, Shop>; // wallet address → Shop
  private playerReadyStatus: Map<string, boolean>; // wallet address → ready status
  private disconnectedPlayers: Set<string>; // wallet addresses
  private botPlayers: Map<string, BotPlayer>; // wallet address → BotPlayer
  private isBotMatch: boolean;

  // Socket mapping (wallet ↔ socket ID)
  private walletToSocket: Map<string, string>; // wallet address → current socket ID
  private socketToWallet: Map<string, string>; // socket ID → wallet address

  // Game systems
  private shopGenerator: ShopGenerator;
  private economyManager: EconomyManager;
  private roundManager: RoundManager;
  private stateSync: StateSync;
  private combatSimulator: CombatSimulator;

  // Game state
  private isMatchComplete: boolean = false;
  private eliminatedPlayers: Set<string>;

  constructor(
    matchId: string,
    queuedPlayers: QueuedPlayer[],
    io: SocketIOServer,
    contractService: ContractService | null = null,
    blockchainMatchId: number | null = null
  ) {
    this.matchId = matchId;
    this.io = io;
    this.contractService = contractService;
    this.blockchainMatchId = blockchainMatchId;

    // Initialize systems
    this.shopGenerator = new ShopGenerator();
    this.economyManager = new EconomyManager();
    this.roundManager = new RoundManager();
    this.stateSync = new StateSync(io);
    this.combatSimulator = new CombatSimulator();

    // Initialize player data
    this.players = new Map();
    this.playerBoards = new Map();
    this.playerBenches = new Map();
    this.playerShops = new Map();
    this.playerReadyStatus = new Map();
    this.disconnectedPlayers = new Set();
    this.eliminatedPlayers = new Set();
    this.botPlayers = new Map();
    this.walletToSocket = new Map();
    this.socketToWallet = new Map();
    this.isBotMatch = queuedPlayers.some(qp => qp.isBot);

    // Create player objects
    queuedPlayers.forEach((qp, index) => {
      // For bots, use socketId as wallet address (they don't have real wallets)
      // For real players, use provided wallet address or fall back to socketId for backward compatibility
      const walletAddress = qp.isBot ? qp.socketId : (qp.walletAddress || qp.socketId);

      const player: Player = {
        id: walletAddress, // Use wallet address as player ID
        address: qp.isBot ? `0x${index.toString().padStart(40, '0')}` : walletAddress,
        health: 20,
        gold: 3,
        level: 1,
        xp: 0,
        winStreak: 0,
        loseStreak: 0,
      };

      // Store player by wallet address
      this.players.set(walletAddress, player);

      // Create wallet ↔ socket mapping
      this.walletToSocket.set(walletAddress, qp.socketId);
      this.socketToWallet.set(qp.socketId, walletAddress);

      // Initialize empty board
      this.playerBoards.set(walletAddress, {
        top: [null, null, null, null],
        bottom: [null, null, null, null],
      });

      // Initialize empty bench
      this.playerBenches.set(walletAddress, []);

      // Initialize ready status
      this.playerReadyStatus.set(walletAddress, false);

      // If this is a bot, create the bot AI
      if (qp.isBot) {
        this.botPlayers.set(walletAddress, new BotPlayer(walletAddress, 'easy'));
      }
    });

    // Set up round manager callbacks
    this.roundManager.setOnPhaseChange((phase, round) => {
      this.handlePhaseChange(phase, round);
    });

    this.roundManager.setOnRoundEnd((round) => {
      this.handleRoundComplete(round);
    });

    console.log(`GameRoom ${matchId} created with ${this.players.size} players`);
  }

  /**
   * Start the match
   */
  start(): void {
    console.log(`Starting match ${this.matchId}`);

    // Generate initial shops for all players
    this.players.forEach((player, walletAddress) => {
      const shop = this.generateShopForPlayer(walletAddress);
      this.playerShops.set(walletAddress, shop);

      // Get socket ID to send shop update
      const socketId = this.getSocketFromWallet(walletAddress);
      if (socketId) {
        this.stateSync.syncShopUpdate(socketId, shop);
      }
    });

    // Start round 1
    this.roundManager.startRound(1);
  }

  /**
   * Handle phase changes
   */
  private handlePhaseChange(phase: GamePhase, round: number): void {
    console.log(`\n🎮 Match ${this.matchId}: Round ${round}, Phase ${phase}`);
    console.log(`👥 Active players: ${this.getActivePlayerIds().length}`);

    if (phase === 'PLANNING') {
      console.log(`➡️ Handling PLANNING phase`);
      this.handlePlanningPhase(round);
    } else if (phase === 'COMBAT') {
      console.log(`➡️ Handling COMBAT phase`);
      this.handleCombatPhase(round);
    } else if (phase === 'TRANSITION') {
      console.log(`➡️ Handling TRANSITION phase`);
      this.handleTransitionPhase(round);
    }
  }

  /**
   * Handle planning phase
   */
  private handlePlanningPhase(round: number): void {
    // Give players gold at start of round
    this.players.forEach((player, walletAddress) => {
      if (this.eliminatedPlayers.has(walletAddress)) return;

      const income = this.economyManager.calculateRoundIncome(player);
      player.gold += income;

      // Regenerate shop
      const shop = this.generateShopForPlayer(walletAddress);
      this.playerShops.set(walletAddress, shop);

      // Sync to player via socket
      const socketId = this.getSocketFromWallet(walletAddress);
      if (socketId) {
        this.stateSync.syncShopUpdate(socketId, shop);
      }
    });

    // Broadcast round start with timer - need socket IDs for broadcast
    const timeRemaining = this.roundManager.getTimeRemaining();
    const activeSocketIds = this.getActivePlayerSocketIds();
    this.stateSync.syncRoundStart(activeSocketIds, round, 'PLANNING', timeRemaining);

    // Reset ready status
    this.playerReadyStatus.forEach((_, walletAddress) => {
      this.playerReadyStatus.set(walletAddress, false);
    });

    // Execute bot turns
    if (this.isBotMatch) {
      this.executeBotTurns(round);
    }
  }

  /**
   * Execute bot AI turns during planning phase
   */
  private async executeBotTurns(round: number): Promise<void> {
    for (const [botWallet, bot] of this.botPlayers.entries()) {
      if (this.eliminatedPlayers.has(botWallet)) continue;

      const player = this.players.get(botWallet);
      const shop = this.playerShops.get(botWallet);

      if (!player || !shop) continue;

      // Convert shop to format bot expects
      const shopCards = shop.cards.map((card, index) => ({
        ...card,
        index
      }));

      // Create a player state for the bot
      const playerState = {
        ...player,
        bench: this.playerBenches.get(botWallet) || [],
        board: this.getAllUnitsFromBoard(this.playerBoards.get(botWallet)!)
      };

      // Execute bot turn with action callbacks
      await bot.executeTurn(playerState, shopCards, round, (action, data) => {
        this.handleBotAction(botWallet, action, data);
      });

      // Mark bot as ready
      this.playerReadyStatus.set(botWallet, true);
    }
  }

  /**
   * Handle bot action (botWallet is the wallet address used as bot identifier)
   */
  private handleBotAction(botWallet: string, action: string, data: any): void {
    // Bots use their wallet address as identifier, need to get their "socket ID"
    const botSocketId = this.getSocketFromWallet(botWallet) || botWallet;

    switch (action) {
      case 'reroll':
        this.handleRerollShop(botSocketId);
        break;
      case 'levelUp':
        this.handleBuyXP(botSocketId);
        break;
      case 'buyCard':
        this.handleBuyCard(botSocketId, data.shopIndex);
        break;
      case 'sellCard':
        const bench = this.playerBenches.get(botWallet);
        if (bench && bench[data.benchIndex]) {
          this.handleSellCard(botSocketId, bench[data.benchIndex].id);
        }
        break;
      case 'moveCard':
        const moveBench = this.playerBenches.get(botWallet);
        if (moveBench && moveBench[data.benchIndex]) {
          this.handlePlaceCard(botSocketId, moveBench[data.benchIndex].id, data.boardIndex);
        }
        break;
    }
  }

  /**
   * Handle combat phase
   */
  private handleCombatPhase(round: number): void {
    console.log(`⚔️ Starting combat phase for round ${round}`);

    // Pair opponents (uses wallet addresses)
    const activeWallets = this.getActivePlayerIds();
    const pairings = RoundManager.pairOpponents(activeWallets, round);

    console.log(`📡 Running combat for ${activeWallets.length} players`);

    // Run combat for each pairing (COMBAT_START event sent in runCombat)
    pairings.forEach((opponentWallet, playerWallet) => {
      this.runCombat(playerWallet, opponentWallet);
    });
  }

  /**
   * Run combat between two players (by wallet address)
   */
  private runCombat(playerWallet: string, opponentWallet: string): void {
    const player = this.players.get(playerWallet);
    const opponent = this.players.get(opponentWallet);
    const playerBoard = this.playerBoards.get(playerWallet);
    const opponentBoard = this.playerBoards.get(opponentWallet);

    if (!player || !opponent || !playerBoard || !opponentBoard) {
      console.error(`Missing player data for combat: ${playerWallet} vs ${opponentWallet}`);
      return;
    }

    // Get socket ID for sending events
    const playerSocketId = this.getSocketFromWallet(playerWallet);
    if (!playerSocketId) {
      console.error(`No socket found for player: ${playerWallet}`);
      return;
    }

    // Notify combat start with timeRemaining
    const opponentState = this.stateSync.createOpponentState(
      opponent,
      opponentBoard,
      this.getAllUnitsFromBoard(opponentBoard)
    );
    const timeRemaining = this.roundManager.getTimeRemaining();
    this.stateSync.syncCombatStart(playerSocketId, opponentState, timeRemaining);

    // Simulate combat
    const result = this.combatSimulator.simulateCombat(playerBoard, opponentBoard);

    // Send combat events to player
    result.combatLog.forEach(event => {
      this.stateSync.syncCombatEvent(
        playerSocketId,
        event.type,
        event.source,
        event.target,
        event.damage,
        event.healing,
        event.description
      );
    });

    // Process results
    if (result.winner === 'opponent') {
      // Player lost - take damage
      player.health -= result.damageDealt;

      // Update streaks
      const streaks = this.economyManager.updateStreaks(player, false);
      player.winStreak = streaks.winStreak;
      player.loseStreak = streaks.loseStreak;

      // Notify player of damage with updated player state
      this.stateSync.syncRoundEnd(playerSocketId, result.damageDealt, player);

      // Check for elimination
      if (player.health <= 0) {
        this.eliminatePlayer(playerWallet);
      }
    } else if (result.winner === 'player') {
      // Player won
      const streaks = this.economyManager.updateStreaks(player, true);
      player.winStreak = streaks.winStreak;
      player.loseStreak = streaks.loseStreak;

      // No damage - send updated player state
      this.stateSync.syncRoundEnd(playerSocketId, 0, player);
    } else {
      // Draw - minimal damage
      player.health -= 1;
      this.stateSync.syncRoundEnd(playerSocketId, 1, player);
    }
  }

  /**
   * Handle transition phase
   */
  private handleTransitionPhase(round: number): void {
    console.log(`Starting transition phase for round ${round}`);

    // Broadcast phase change to all players with timeRemaining
    const activeSocketIds = this.getActivePlayerSocketIds();
    const activeWallets = this.getActivePlayerIds();
    const timeRemaining = this.roundManager.getTimeRemaining();
    this.stateSync.syncPhaseChange(activeSocketIds, 'TRANSITION', round, timeRemaining);

    // Check for match end
    if (activeWallets.length <= 1) {
      this.endMatch();
    } else {
      // Start next round after transition
      setTimeout(() => {
        this.roundManager.startRound(round + 1);
      }, 5000);
    }
  }

  /**
   * Handle round complete
   */
  private handleRoundComplete(round: number): void {
    console.log(`Match ${this.matchId}: Round ${round} complete`);
  }

  /**
   * Handle buy card
   */
  handleBuyCard(socketId: string, cardIndex: number): boolean {
    const walletAddress = this.getWalletFromSocket(socketId);
    if (!walletAddress) {
      this.stateSync.syncError(socketId, 'Player not found in match');
      return false;
    }

    const player = this.players.get(walletAddress);
    const shop = this.playerShops.get(walletAddress);
    const bench = this.playerBenches.get(walletAddress);

    if (!player || !shop || !bench) {
      this.stateSync.syncError(socketId, 'Player data not found');
      return false;
    }

    // Check if in planning phase
    if (!this.roundManager.isPlanning()) {
      this.stateSync.syncError(socketId, 'Can only buy cards during planning phase');
      return false;
    }

    // Validate card index
    if (cardIndex < 0 || cardIndex >= shop.cards.length) {
      this.stateSync.syncError(socketId, 'Invalid card index');
      return false;
    }

    const card = shop.cards[cardIndex];
    if (!card) {
      this.stateSync.syncError(socketId, 'Card not available');
      return false;
    }

    // Check if player has enough gold
    if (player.gold < card.cost) {
      this.stateSync.syncError(socketId, 'Not enough gold');
      return false;
    }

    // Check bench space
    if (bench.length >= MAX_BENCH_SIZE) {
      this.stateSync.syncError(socketId, 'Bench is full');
      return false;
    }

    // Purchase card
    player.gold -= card.cost;
    bench.push(card);

    // Remove from shop
    shop.cards.splice(cardIndex, 1);

    // Update shop
    this.stateSync.syncShopUpdate(socketId, shop);
    this.stateSync.syncSuccess(socketId, `Purchased ${card.name}`);

    return true;
  }

  /**
   * Handle sell card
   */
  handleSellCard(socketId: string, unitId: string): boolean {
    const walletAddress = this.getWalletFromSocket(socketId);
    if (!walletAddress) {
      this.stateSync.syncError(socketId, 'Player not found in match');
      return false;
    }

    const player = this.players.get(walletAddress);
    const bench = this.playerBenches.get(walletAddress);
    const board = this.playerBoards.get(walletAddress);

    if (!player || !bench || !board) {
      this.stateSync.syncError(socketId, 'Player data not found');
      return false;
    }

    // Check if in planning phase
    if (!this.roundManager.isPlanning()) {
      this.stateSync.syncError(socketId, 'Can only sell cards during planning phase');
      return false;
    }

    // Find unit in bench
    let unitIndex = bench.findIndex(u => u.id === unitId);
    let isOnBench = true;

    if (unitIndex === -1) {
      // Check board
      const boardUnit = this.findUnitOnBoard(board, unitId);
      if (boardUnit) {
        isOnBench = false;
      } else {
        this.stateSync.syncError(socketId, 'Unit not found');
        return false;
      }
    }

    const unit = isOnBench ? bench[unitIndex] : this.findUnitOnBoard(board, unitId)!;

    // Calculate sell value
    const sellValue = this.economyManager.calculateSellValue(unit.cost, unit.stars);
    player.gold += sellValue;

    // Remove unit
    if (isOnBench) {
      bench.splice(unitIndex, 1);
    } else {
      this.removeUnitFromBoard(board, unitId);
    }

    this.stateSync.syncSuccess(socketId, `Sold ${unit.name} for ${sellValue} gold`);

    return true;
  }

  /**
   * Handle place card
   */
  handlePlaceCard(socketId: string, unitId: string, position: number): boolean {
    const walletAddress = this.getWalletFromSocket(socketId);
    if (!walletAddress) {
      this.stateSync.syncError(socketId, 'Player not found in match');
      return false;
    }

    const player = this.players.get(walletAddress);
    const bench = this.playerBenches.get(walletAddress);
    const board = this.playerBoards.get(walletAddress);

    if (!player || !bench || !board) {
      this.stateSync.syncError(socketId, 'Player data not found');
      return false;
    }

    // Check if in planning phase
    if (!this.roundManager.isPlanning()) {
      this.stateSync.syncError(socketId, 'Can only place cards during planning phase');
      return false;
    }

    // Validate position (0-7: 0-3 top, 4-7 bottom)
    if (position < 0 || position >= 8) {
      this.stateSync.syncError(socketId, 'Invalid position');
      return false;
    }

    // Find unit in bench
    const unitIndex = bench.findIndex(u => u.id === unitId);
    if (unitIndex === -1) {
      this.stateSync.syncError(socketId, 'Unit not in bench');
      return false;
    }

    const unit = bench[unitIndex];

    // Check board size limit
    const currentBoardSize = this.getBoardSize(board);
    const maxBoardSize = this.economyManager.getMaxBoardSize(player.level);

    if (currentBoardSize >= maxBoardSize) {
      this.stateSync.syncError(socketId, `Board is full (max ${maxBoardSize} units)`);
      return false;
    }

    // Place unit on board
    const row = position < 4 ? board.top : board.bottom;
    const index = position % 4;

    // If position occupied, swap with bench
    if (row[index]) {
      bench.push(row[index]!);
    }

    row[index] = unit;
    bench.splice(unitIndex, 1);

    this.stateSync.syncSuccess(socketId, `Placed ${unit.name}`);

    return true;
  }

  /**
   * Handle reroll shop
   */
  handleRerollShop(socketId: string): boolean {
    const walletAddress = this.getWalletFromSocket(socketId);
    if (!walletAddress) {
      this.stateSync.syncError(socketId, 'Player not found in match');
      return false;
    }

    const player = this.players.get(walletAddress);
    const shop = this.playerShops.get(walletAddress);

    if (!player || !shop) {
      this.stateSync.syncError(socketId, 'Player data not found');
      return false;
    }

    // Check if in planning phase
    if (!this.roundManager.isPlanning()) {
      this.stateSync.syncError(socketId, 'Can only reroll during planning phase');
      return false;
    }

    // Check for free rerolls
    if (shop.freeRerolls > 0) {
      shop.freeRerolls--;
    } else {
      // Check if player has enough gold
      if (player.gold < REROLL_COST) {
        this.stateSync.syncError(socketId, 'Not enough gold to reroll');
        return false;
      }
      player.gold -= REROLL_COST;
    }

    // Generate new shop
    const newShop = this.generateShopForPlayer(walletAddress);
    this.playerShops.set(walletAddress, newShop);
    this.stateSync.syncShopUpdate(socketId, newShop);

    return true;
  }

  /**
   * Handle buy XP
   */
  handleBuyXP(socketId: string): boolean {
    const walletAddress = this.getWalletFromSocket(socketId);
    if (!walletAddress) {
      this.stateSync.syncError(socketId, 'Player not found in match');
      return false;
    }

    const player = this.players.get(walletAddress);

    if (!player) {
      this.stateSync.syncError(socketId, 'Player data not found');
      return false;
    }

    // Check if in planning phase
    if (!this.roundManager.isPlanning()) {
      this.stateSync.syncError(socketId, 'Can only buy XP during planning phase');
      return false;
    }

    // Attempt to buy XP
    const result = this.economyManager.buyXP(player);

    if (!result.success) {
      this.stateSync.syncError(socketId, 'Not enough gold to buy XP');
      return false;
    }

    // Update player
    player.gold = result.newGold;
    player.xp = result.newXP;

    if (result.leveledUp) {
      player.level = result.newLevel;
      this.stateSync.syncSuccess(socketId, `Level up! Now level ${result.newLevel}`);
    }

    return true;
  }

  /**
   * Handle player ready
   */
  handleReady(socketId: string): void {
    const walletAddress = this.getWalletFromSocket(socketId);
    if (!walletAddress) {
      console.warn(`Cannot mark unknown player as ready: ${socketId}`);
      return;
    }

    this.playerReadyStatus.set(walletAddress, true);

    // Check if all players are ready
    const allReady = Array.from(this.playerReadyStatus.values()).every(ready => ready);

    if (allReady && this.roundManager.isPlanning()) {
      console.log('All players ready, skipping to combat');
      this.roundManager.forceNextPhase();
    }
  }

  /**
   * Handle player disconnect
   */
  handlePlayerDisconnect(socketId: string): void {
    const walletAddress = this.getWalletFromSocket(socketId);
    if (!walletAddress) {
      console.warn(`Cannot handle disconnect for unknown socket: ${socketId}`);
      return;
    }

    this.disconnectedPlayers.add(walletAddress);
    console.log(`Player ${walletAddress} (socket: ${socketId}) disconnected from match ${this.matchId}`);

    // Give players 60 seconds to reconnect before elimination
    setTimeout(() => {
      if (this.disconnectedPlayers.has(walletAddress)) {
        this.eliminatePlayer(walletAddress);
      }
    }, 60000); // 60 second grace period
  }

  /**
   * Eliminate a player (by wallet address)
   */
  private eliminatePlayer(walletAddress: string): void {
    const player = this.players.get(walletAddress);
    if (!player || this.eliminatedPlayers.has(walletAddress)) {
      return;
    }

    console.log(`Player ${walletAddress} eliminated from match ${this.matchId}`);
    this.eliminatedPlayers.add(walletAddress);

    const activeWallets = this.getActivePlayerIds();
    player.placement = activeWallets.length + 1;

    // Notify all players via their socket IDs
    const allSocketIds = Array.from(this.walletToSocket.values());
    this.stateSync.syncPlayerEliminated(allSocketIds, player.id);

    // Check for match end
    if (activeWallets.length <= 1) {
      this.endMatch();
    }
  }

  /**
   * End the match
   */
  private async endMatch(): Promise<void> {
    if (this.isMatchComplete) return;

    console.log(`Match ${this.matchId} ending`);
    this.isMatchComplete = true;

    // Set placement for remaining players
    const activeWallets = this.getActivePlayerIds();
    activeWallets.forEach(walletAddress => {
      const player = this.players.get(walletAddress);
      if (player && !player.placement) {
        player.placement = 1; // Winner
      }
    });

    // Create placements array
    const placements = Array.from(this.players.values())
      .sort((a, b) => (a.placement || 999) - (b.placement || 999))
      .map(p => ({
        playerId: p.id,
        placement: p.placement || 999,
      }));

    // Submit results to blockchain if this is a paid match
    if (this.contractService && this.blockchainMatchId !== null && !this.isBotMatch) {
      try {
        console.log(`🔗 Submitting match results to blockchain for match ${this.blockchainMatchId}`);

        // Get all players sorted by placement
        const sortedPlayers = Array.from(this.players.values())
          .sort((a, b) => (a.placement || 999) - (b.placement || 999));

        // Ensure we have exactly 6 players
        if (sortedPlayers.length !== 6) {
          throw new Error(`Invalid player count: ${sortedPlayers.length}. Expected 6.`);
        }

        // Extract wallet addresses and placements
        const playerAddresses: string[] = [];
        const playerPlacements: number[] = [];

        for (const player of sortedPlayers) {
          // Use the actual wallet address (player.address contains the real wallet)
          playerAddresses.push(player.address);
          playerPlacements.push(player.placement || 999);
        }

        // Validate we have real wallet addresses (not bot addresses)
        const hasInvalidAddress = playerAddresses.some(addr =>
          addr.startsWith('0x00000000') || !addr.startsWith('0x')
        );

        if (hasInvalidAddress) {
          throw new Error('Cannot submit results with invalid wallet addresses');
        }

        // Submit to blockchain
        await this.contractService.submitMatchResults(
          this.blockchainMatchId,
          playerAddresses,
          playerPlacements
        );

        console.log(`   ✅ Match results submitted successfully`);

        // Notify players that prizes are claimable
        const allSocketIds = Array.from(this.walletToSocket.values());
        allSocketIds.forEach(socketId => {
          this.io.to(socketId).emit('server_event', {
            type: 'PRIZES_CLAIMABLE',
            data: {
              matchId: this.matchId,
              blockchainMatchId: this.blockchainMatchId,
              message: 'Match results submitted! Winners can claim prizes from the contract.',
            },
          });
        });
      } catch (error: any) {
        console.error(`   ❌ Failed to submit match results:`, error.message);

        // Notify players of failure
        const allSocketIds = Array.from(this.walletToSocket.values());
        allSocketIds.forEach(socketId => {
          this.io.to(socketId).emit('error', {
            type: 'RESULTS_SUBMISSION_FAILED',
            message: `Failed to submit match results to blockchain: ${error.message}`,
          });
        });
      }
    }

    // Notify all players via socket IDs
    const allSocketIds = Array.from(this.walletToSocket.values());
    this.stateSync.syncMatchEnd(allSocketIds, placements);

    // Cleanup
    this.cleanup();
  }

  /**
   * Generate shop for a player (by wallet address)
   */
  private generateShopForPlayer(walletAddress: string): Shop {
    const player = this.players.get(walletAddress);
    if (!player) {
      return { cards: [], rerollCost: REROLL_COST, freeRerolls: 0 };
    }

    const cards = this.shopGenerator.generateShop(player.level, 5);

    return {
      cards,
      rerollCost: REROLL_COST,
      freeRerolls: 0,
    };
  }

  /**
   * Get all active (non-eliminated) player wallet addresses
   */
  private getActivePlayerIds(): string[] {
    return Array.from(this.players.keys()).filter(
      walletAddress => !this.eliminatedPlayers.has(walletAddress)
    );
  }

  /**
   * Get socket IDs for all active players
   */
  private getActivePlayerSocketIds(): string[] {
    const activeWallets = this.getActivePlayerIds();
    const socketIds: string[] = [];

    for (const wallet of activeWallets) {
      const socketId = this.getSocketFromWallet(wallet);
      if (socketId) {
        socketIds.push(socketId);
      }
    }

    return socketIds;
  }

  /**
   * Get all units from a board
   */
  private getAllUnitsFromBoard(board: Board): Unit[] {
    const units: Unit[] = [];
    board.top.forEach(unit => {
      if (unit) units.push(unit);
    });
    board.bottom.forEach(unit => {
      if (unit) units.push(unit);
    });
    return units;
  }

  /**
   * Get board size (number of units)
   */
  private getBoardSize(board: Board): number {
    let count = 0;
    board.top.forEach(unit => {
      if (unit) count++;
    });
    board.bottom.forEach(unit => {
      if (unit) count++;
    });
    return count;
  }

  /**
   * Find unit on board by ID
   */
  private findUnitOnBoard(board: Board, unitId: string): Unit | null {
    for (const unit of board.top) {
      if (unit && unit.id === unitId) return unit;
    }
    for (const unit of board.bottom) {
      if (unit && unit.id === unitId) return unit;
    }
    return null;
  }

  /**
   * Remove unit from board by ID
   */
  private removeUnitFromBoard(board: Board, unitId: string): boolean {
    for (let i = 0; i < board.top.length; i++) {
      if (board.top[i] && board.top[i]!.id === unitId) {
        board.top[i] = null;
        return true;
      }
    }
    for (let i = 0; i < board.bottom.length; i++) {
      if (board.bottom[i] && board.bottom[i]!.id === unitId) {
        board.bottom[i] = null;
        return true;
      }
    }
    return false;
  }

  /**
   * Get wallet address from socket ID
   */
  private getWalletFromSocket(socketId: string): string | null {
    return this.socketToWallet.get(socketId) || null;
  }

  /**
   * Get socket ID from wallet address
   */
  private getSocketFromWallet(walletAddress: string): string | null {
    return this.walletToSocket.get(walletAddress) || null;
  }

  /**
   * Check if player is in this match (by socket ID)
   */
  hasPlayer(socketId: string): boolean {
    const walletAddress = this.socketToWallet.get(socketId);
    return walletAddress ? this.players.has(walletAddress) : false;
  }

  /**
   * Check if player is in this match (by wallet address)
   */
  hasPlayerByWallet(walletAddress: string): boolean {
    return this.players.has(walletAddress);
  }

  /**
   * Update socket mapping for a wallet address (for reconnection)
   */
  updateSocketMapping(walletAddress: string, newSocketId: string): void {
    // Remove old socket mapping if exists
    const oldSocketId = this.walletToSocket.get(walletAddress);
    if (oldSocketId) {
      // Make old socket leave the wallet room
      const oldSocket = this.io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.leave(walletAddress);
        console.log(`Old socket ${oldSocketId} left wallet room ${walletAddress}`);
      }
      this.socketToWallet.delete(oldSocketId);
      console.log(`Removed old socket mapping: ${oldSocketId} → ${walletAddress}`);
    }

    // Make new socket join the wallet room
    const newSocket = this.io.sockets.sockets.get(newSocketId);
    if (newSocket) {
      newSocket.join(walletAddress);
      console.log(`New socket ${newSocketId} joined wallet room ${walletAddress}`);
    }

    // Add new mapping
    this.walletToSocket.set(walletAddress, newSocketId);
    this.socketToWallet.set(newSocketId, walletAddress);
    console.log(`Updated socket mapping in GameRoom: ${walletAddress} → ${newSocketId}`);
  }

  /**
   * Check if match is completed
   */
  isCompleted(): boolean {
    return this.isMatchComplete;
  }

  /**
   * Sync full game state to a reconnecting player (by wallet address)
   */
  syncPlayerState(walletAddress: string): void {
    const player = this.players.get(walletAddress);
    if (!player) {
      console.warn(`Cannot sync state for unknown player wallet: ${walletAddress}`);
      return;
    }

    const socketId = this.getSocketFromWallet(walletAddress);
    if (!socketId) {
      console.warn(`Cannot sync state - no socket for wallet: ${walletAddress}`);
      return;
    }

    console.log(`Syncing full state to wallet ${walletAddress} (socket: ${socketId})`);

    // Build complete game state for this player
    const playerState: PlayerGameState = {
      player,
      board: this.playerBoards.get(walletAddress) || { top: [null, null, null, null], bottom: [null, null, null, null] },
      bench: this.playerBenches.get(walletAddress) || [],
      shop: this.playerShops.get(walletAddress) || { cards: [], rerollCost: REROLL_COST, freeRerolls: 0 },
      items: [], // TODO: Add items when implemented
    };

    // Send MATCH_FOUND event to establish they're in this match
    this.io.to(socketId).emit('server_event', {
      type: 'MATCH_FOUND',
      data: {
        id: this.matchId,
        players: Array.from(this.players.values()),
        entryFee: 0, // TODO: Track entry fee
        prizePool: 0,
        status: 'IN_PROGRESS',
        currentRound: this.roundManager.getCurrentRound(),
      },
    });

    // Sync current round and phase
    this.stateSync.syncRoundStart(
      [socketId],
      this.roundManager.getCurrentRound(),
      this.roundManager.getCurrentPhase(),
      this.roundManager.getTimeRemaining()
    );

    // Sync player's full game state
    const opponents = Array.from(this.players.values()).filter(p => p.id !== walletAddress);
    this.stateSync.syncFullState(
      socketId,
      this.matchId,
      this.roundManager.getCurrentRound(),
      this.roundManager.getCurrentPhase(),
      this.roundManager.getTimeRemaining(),
      playerState,
      opponents
    );

    // Sync shop
    const shop = this.playerShops.get(walletAddress);
    if (shop) {
      this.stateSync.syncShopUpdate(socketId, shop);
    }

    console.log(`✅ State sync complete for wallet ${walletAddress} (socket: ${socketId})`);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.roundManager.cleanup();
    console.log(`GameRoom ${this.matchId} cleaned up`);
  }
}
