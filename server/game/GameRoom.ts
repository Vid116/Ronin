import { Server as SocketIOServer } from 'socket.io';
import { Player, Board, Unit, Shop, GamePhase } from '../../types/game';
import { ShopGenerator } from './ShopGenerator';
import { EconomyManager } from './EconomyManager';
import { RoundManager } from './RoundManager';
import { StateSync, PlayerGameState } from './StateSync';
import { CombatSimulator } from './CombatSimulator';
import { BotPlayer, createBotPlayers } from './BotPlayer';
import { ContractService } from '../services/ContractService';
import { ROFLClient, createROFLClient, type ROFLBattleRequest } from '../services/ROFLClient';

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
  private expectedPlayerCount: number;

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

  // ROFL integration for paid matches
  private roflClient: ROFLClient | null;
  private entryFee: number;
  private matchType: 'standard' | 'rofl-test';

  constructor(
    matchId: string,
    queuedPlayers: QueuedPlayer[],
    io: SocketIOServer,
    contractService: ContractService | null = null,
    blockchainMatchId: number | null = null,
    expectedPlayerCount: number = 6
  ) {
    this.matchId = matchId;
    this.io = io;
    this.contractService = contractService;
    this.blockchainMatchId = blockchainMatchId;
    this.expectedPlayerCount = expectedPlayerCount;

    // Store entry fee and match type (use first player's data)
    this.entryFee = queuedPlayers[0]?.entryFee || 0;
    this.matchType = queuedPlayers[0]?.matchType || 'standard';

    // Initialize ROFL client for paid matches OR rofl-test matches
    const shouldUseROFL = this.entryFee > 0 || this.matchType === 'rofl-test';
    this.roflClient = shouldUseROFL ? createROFLClient() : null;

    if (this.roflClient) {
      if (this.matchType === 'rofl-test') {
        console.log(`[ROFL] Match ${matchId} is a ROFL TEST match - ROFL enabled for testing`);
      } else if (this.entryFee > 0) {
        console.log(`[ROFL] Match ${matchId} is a paid match (fee: ${this.entryFee}) - ROFL enabled`);
      }
    }

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
  private async handlePhaseChange(phase: GamePhase, round: number): Promise<void> {
    console.log(`\n🎮 Match ${this.matchId}: Round ${round}, Phase ${phase}`);
    console.log(`👥 Active players: ${this.getActivePlayerIds().length}`);

    if (phase === 'PLANNING') {
      console.log(`➡️ Handling PLANNING phase`);
      this.handlePlanningPhase(round);
    } else if (phase === 'COMBAT') {
      console.log(`➡️ Handling COMBAT phase`);
      await this.handleCombatPhase(round);
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
        // Sync updated player stats (gold changed)
        this.stateSync.syncPlayerStats(socketId, player);
      }
    });

    // Broadcast round start with timer - use wallet addresses for room-based broadcast
    const timeRemaining = this.roundManager.getTimeRemaining();
    const activeWallets = this.getActivePlayerIds();
    this.stateSync.syncRoundStart(activeWallets, round, 'PLANNING', timeRemaining);

    // Reset ready status
    this.playerReadyStatus.forEach((_, walletAddress) => {
      this.playerReadyStatus.set(walletAddress, false);
    });

    // Execute bot turns
    if (this.isBotMatch) {
      this.executeBotTurns(round).then(() => {
        // After all bot turns complete, sync opponent states to human players
        this.syncOpponentStatesToHumanPlayers();
      });
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
        board: this.getAllUnitsFromBoard(this.playerBoards.get(botWallet)!),
        shop: shop.cards
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

    // After bot action, sync opponent states to all human players
    // This ensures human players see bot state changes in real-time
    this.syncOpponentStatesToHumanPlayers(botWallet);
  }

  /**
   * Handle combat phase
   */
  private async handleCombatPhase(round: number): Promise<void> {
    console.log(`⚔️ Starting combat phase for round ${round}`);

    // Pair opponents (uses wallet addresses)
    const activeWallets = this.getActivePlayerIds();
    const pairings = RoundManager.pairOpponents(activeWallets, round);

    console.log(`📡 Running combat for ${activeWallets.length} players`);

    // Run combat for each pairing FIRST (sends COMBAT_START and COMBAT_BOARDS)
    for (const [playerWallet, opponentWallet] of pairings.entries()) {
      try {
        await this.runCombat(playerWallet, opponentWallet);
      } catch (error) {
        console.error(`[COMBAT] Failed to run combat for ${playerWallet} vs ${opponentWallet}:`, error);
        // Continue with other pairings even if one fails
      }
    }

    // Broadcast phase change to ALL players AFTER combat data is sent
    // This ensures combatInitialBoards is available when UI renders
    const timeRemaining = this.roundManager.getTimeRemaining();
    this.stateSync.syncPhaseChange(activeWallets, 'COMBAT', round, timeRemaining);
    console.log(`📡 Broadcast COMBAT phase to ${activeWallets.length} players (after combat data sent)`);
  }

  /**
   * Run combat between two players (by wallet address)
   * For paid matches, routes to ROFL service. For free matches, uses local engine.
   */
  private async runCombat(playerWallet: string, opponentWallet: string): Promise<void> {
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

    // Simulate combat - route to ROFL for paid/rofl-test matches, local for standard free matches
    const currentRound = this.roundManager.getCurrentRound();
    let result;

    if (this.roflClient) {
      // ROFL MATCH: Use ROFL service (paid match or rofl-test match)
      const matchTypeLabel = this.matchType === 'rofl-test' ? 'ROFL test match' : 'paid match';
      console.log(`[ROFL] Computing battle via ROFL for ${matchTypeLabel}`);

      try {
        result = await this.computeBattleViaROFL(
          playerBoard,
          opponentBoard,
          currentRound,
          playerWallet,
          opponentWallet
        );
        console.log(`[ROFL] Battle computed successfully via ROFL`);
      } catch (error) {
        console.error(`[ROFL] Battle computation failed:`, error);
        // For ROFL matches, we MUST use ROFL - if it fails, we cannot continue
        // Notify players and cancel the match
        const errorMessage = this.matchType === 'rofl-test'
          ? 'ROFL test service unavailable. Please try again.'
          : 'Battle service unavailable. Match will be cancelled and refunded.';

        this.io.to(playerSocketId).emit('server_event', {
          type: 'ERROR',
          data: {
            message: errorMessage,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        throw error; // This will stop the match
      }
    } else {
      // STANDARD FREE MATCH: Use local combat simulator
      console.log(`[LOCAL] Computing battle via local engine for standard free match`);
      result = this.combatSimulator.simulateCombat(
        playerBoard,
        opponentBoard,
        currentRound,
        playerWallet,
        opponentWallet,
        this.matchId
      );
    }

    console.log(`📊 Combat Result:`, {
      player: playerWallet.substring(0, 8),
      opponent: opponentWallet.substring(0, 8),
      winner: result.winner,
      playerUnits: result.playerUnitsRemaining,
      opponentUnits: result.opponentUnitsRemaining,
      damage: result.damageDealt,
      seed: result.seed,
    });

    // Send initial boards (for visual display)
    this.io.to(playerSocketId).emit('server_event', {
      type: 'COMBAT_BOARDS',
      data: {
        initialBoard1: result.initialBoard1,
        initialBoard2: result.initialBoard2,
        finalBoard1: result.finalBoard1,
        finalBoard2: result.finalBoard2,
        playerUnitsRemaining: result.playerUnitsRemaining,
        opponentUnitsRemaining: result.opponentUnitsRemaining,
      },
    });

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

    // Broadcast phase change to all players with timeRemaining - use wallet addresses for room-based broadcast
    const activeWallets = this.getActivePlayerIds();
    const timeRemaining = this.roundManager.getTimeRemaining();
    this.stateSync.syncPhaseChange(activeWallets, 'TRANSITION', round, timeRemaining);

    // Check for match end - only end if one or fewer players have HP > 0
    const playersWithHealth = Array.from(this.players.values()).filter(
      p => p.health > 0 && !this.eliminatedPlayers.has(p.id)
    );

    if (playersWithHealth.length <= 1) {
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

    // Sync updated bench and player stats
    this.io.to(socketId).emit('state_sync', {
      bench: this.playerBenches.get(walletAddress),
      player: this.players.get(walletAddress),
      shop: shop,
    });

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

    // Sync updated board, bench, and player stats
    this.io.to(socketId).emit('state_sync', {
      board: this.playerBoards.get(walletAddress),
      bench: this.playerBenches.get(walletAddress),
      player: this.players.get(walletAddress),
    });

    // Broadcast board update to opponents if unit was on board
    if (!isOnBench) {
      const allSocketIds = this.getActivePlayerSocketIds();
      this.stateSync.syncBoardUpdate(allSocketIds, walletAddress, board);
    }

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

    // Sync updated board and bench to player
    const updatedBoard = this.playerBoards.get(walletAddress)!;
    const updatedBench = this.playerBenches.get(walletAddress)!;

    this.io.to(socketId).emit('state_sync', {
      board: updatedBoard,
      bench: updatedBench,
    });

    // Broadcast board update to opponents
    const allSocketIds = this.getActivePlayerSocketIds();
    this.stateSync.syncBoardUpdate(allSocketIds, walletAddress, updatedBoard);

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

    // Sync updated player stats (gold changed)
    this.stateSync.syncPlayerStats(socketId, player);

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
    } else {
      this.stateSync.syncSuccess(socketId, `Bought XP (${result.newXP}/${this.economyManager.getXPForNextLevel(player.level)} XP)`);
    }

    // Sync updated player stats
    this.stateSync.syncPlayerStats(socketId, player);

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

    // Disconnected players remain in the match with their frozen board
    // They cannot take actions but combat continues normally
    // Match only ends when a player's HP reaches 0 through combat damage
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

    // Check for match end - only end if one or fewer players have HP > 0
    const playersWithHealth = Array.from(this.players.values()).filter(
      p => p.health > 0 && !this.eliminatedPlayers.has(p.id)
    );

    if (playersWithHealth.length <= 1) {
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

        // Ensure we have the expected number of players
        if (sortedPlayers.length !== this.expectedPlayerCount) {
          throw new Error(`Invalid player count: ${sortedPlayers.length}. Expected ${this.expectedPlayerCount}.`);
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

        // Verify results were recorded on-chain
        try {
          const matchData = await this.contractService.getMatch(this.blockchainMatchId);
          if (!matchData.finalized) {
            throw new Error('Match was not finalized on-chain after submission');
          }
          console.log(`   ✅ Match finalization verified on-chain`);
        } catch (verifyError: any) {
          console.error(`   ⚠️ Could not verify match finalization:`, verifyError.message);
          // Continue anyway - the submission succeeded
        }

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
   * Get socket IDs for all active human players (excluding bots)
   */
  private getActiveHumanPlayerSocketIds(): string[] {
    const activeWallets = this.getActivePlayerIds();
    const socketIds: string[] = [];

    for (const wallet of activeWallets) {
      // Skip bots
      if (this.botPlayers.has(wallet)) {
        continue;
      }
      const socketId = this.getSocketFromWallet(wallet);
      if (socketId) {
        socketIds.push(socketId);
      }
    }

    return socketIds;
  }

  /**
   * Sync opponent state updates to all human players after bot actions
   */
  private syncOpponentStatesToHumanPlayers(changedPlayerWallet?: string): void {
    const humanSocketIds = this.getActiveHumanPlayerSocketIds();
    if (humanSocketIds.length === 0) return;

    // Build updated opponents list for each human player
    for (const humanSocketId of humanSocketIds) {
      const humanWallet = this.getWalletFromSocket(humanSocketId);
      if (!humanWallet) continue;

      const opponents = Array.from(this.players.values())
        .filter(p => p.id !== humanWallet && !this.eliminatedPlayers.has(p.id))
        .map(opponentPlayer => {
          const opponentWallet = opponentPlayer.id;
          const opponentBoard = this.playerBoards.get(opponentWallet);
          const opponentUnits = opponentBoard ? this.getAllUnitsFromBoard(opponentBoard) : [];
          
          return this.stateSync.createOpponentState(
            opponentPlayer,
            opponentBoard || { top: [null, null, null, null], bottom: [null, null, null, null] },
            opponentUnits
          );
        });

      // Sync updated opponents list
      this.io.to(humanSocketId).emit('state_sync', {
        opponents: opponents,
      });
    }
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
      readyForCombat: this.playerReadyStatus.get(walletAddress) || false,
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
   * Force complete match (dev utility)
   * Immediately ends the match without blockchain submission
   */
  forceComplete(): void {
    if (this.isMatchComplete) return;

    console.log(`🔴 DEV: Force completing match ${this.matchId}`);

    // Stop all timers immediately
    this.roundManager.cleanup();

    // Mark as complete
    this.isMatchComplete = true;

    // Assign placements to all remaining players based on current standings
    const activePlayers = Array.from(this.players.values())
      .filter(p => !this.eliminatedPlayers.has(p.id))
      .sort((a, b) => {
        // Sort by health first, then by level
        if (b.health !== a.health) return b.health - a.health;
        return b.level - a.level;
      });

    // Assign placements to active players
    activePlayers.forEach((player, index) => {
      if (!player.placement) {
        player.placement = index + 1;
      }
    });

    // Create placements array for all players
    const placements = Array.from(this.players.values())
      .sort((a, b) => (a.placement || 999) - (b.placement || 999))
      .map(p => ({
        playerId: p.id,
        placement: p.placement || 999,
      }));

    // Emit to all players
    const allSocketIds = Array.from(this.walletToSocket.values());
    this.stateSync.syncMatchEnd(allSocketIds, placements);

    // Cleanup resources
    this.cleanup();

    console.log(`✅ DEV: Match ${this.matchId} force completed`);
  }

  /**
   * Compute battle via ROFL service (for paid matches)
   */
  private async computeBattleViaROFL(
    playerBoard: Board,
    opponentBoard: Board,
    round: number,
    playerWallet: string,
    opponentWallet: string
  ): Promise<any> {
    if (!this.roflClient) {
      throw new Error('ROFL client not initialized');
    }

    // Generate deterministic seed from match data
    const seed = this.generateBattleSeed(round, playerWallet, opponentWallet);

    // Convert boards to ROFL format
    const roflBoard1 = this.convertBoardToROFL(playerBoard);
    const roflBoard2 = this.convertBoardToROFL(opponentBoard);

    // Create ROFL battle request
    const request: ROFLBattleRequest = {
      matchId: this.matchId,
      round,
      board1: roflBoard1,
      board2: roflBoard2,
      player1Address: playerWallet,
      player2Address: opponentWallet,
      seed,
    };

    // Call ROFL service
    const roflResponse = await this.roflClient.computeBattle(request);

    // Convert ROFL response to local combat result format
    // Transform board formats from ROFL { units: [] } to frontend { top: [], bottom: [] }
    const result = {
      winner: roflResponse.winner === 'player1' ? 'player' : roflResponse.winner === 'player2' ? 'opponent' : 'draw',
      damageDealt: roflResponse.damageToLoser,
      playerUnitsRemaining: this.countUnits(roflResponse.finalBoard1),
      opponentUnitsRemaining: this.countUnits(roflResponse.finalBoard2),
      initialBoard1: this.convertROFLBoardToFrontend(roflBoard1),
      initialBoard2: this.convertROFLBoardToFrontend(roflBoard2),
      finalBoard1: this.convertROFLBoardToFrontend(roflResponse.finalBoard1),
      finalBoard2: this.convertROFLBoardToFrontend(roflResponse.finalBoard2),
      combatLog: roflResponse.events,
      seed: roflResponse.seed,
      roflSignature: roflResponse.signature,
      roflResultHash: roflResponse.resultHash,
    };

    return result;
  }

  /**
   * Generate deterministic battle seed
   */
  private generateBattleSeed(round: number, player1: string, player2: string): number {
    // Create deterministic seed from match data
    const data = `${this.matchId}-${round}-${player1}-${player2}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Convert game Board to ROFL CombatBoard format
   */
  private convertBoardToROFL(board: Board): any {
    const units: any[] = new Array(8).fill(null);

    // Top row (positions 0-3)
    board.top.forEach((unit, index) => {
      if (unit) {
        units[index] = {
          id: unit.id,
          name: unit.name,
          tier: unit.tier,
          attack: unit.attack,
          health: unit.health,
          stars: unit.stars || 1,
          ability: {
            name: unit.ability || 'None',
            trigger: 'passive',
            effect: 'None'
          },
          dodgeChance: 0,
          critChance: 0,
        };
      }
    });

    // Bottom row (positions 4-7)
    board.bottom.forEach((unit, index) => {
      if (unit) {
        units[index + 4] = {
          id: unit.id,
          name: unit.name,
          tier: unit.tier,
          attack: unit.attack,
          health: unit.health,
          stars: unit.stars || 1,
          ability: {
            name: unit.ability || 'None',
            trigger: 'passive',
            effect: 'None'
          },
          dodgeChance: 0,
          critChance: 0,
        };
      }
    });

    return { units };
  }

  /**
   * Convert ROFL CombatBoard format back to game Board format
   */
  private convertROFLBoardToFrontend(roflBoard: any): Board {
    if (!roflBoard || !roflBoard.units) {
      return { top: [null, null, null, null], bottom: [null, null, null, null] };
    }

    return {
      top: roflBoard.units.slice(0, 4),
      bottom: roflBoard.units.slice(4, 8)
    };
  }

  /**
   * Count units in ROFL board
   */
  private countUnits(roflBoard: any): number {
    if (!roflBoard || !roflBoard.units) return 0;
    return roflBoard.units.filter((u: any) => u !== null).length;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.roundManager.cleanup();
    console.log(`GameRoom ${this.matchId} cleaned up`);
  }
}
