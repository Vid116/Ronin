import { Server as SocketIOServer } from 'socket.io';
import { Player, Board, Unit, Shop, GamePhase } from '../../types/game';
import { ShopGenerator } from './ShopGenerator';
import { EconomyManager } from './EconomyManager';
import { RoundManager } from './RoundManager';
import { StateSync, PlayerGameState } from './StateSync';
import { CombatSimulator } from './CombatSimulator';
import { BotPlayer, createBotPlayers } from './BotPlayer';

interface QueuedPlayer {
  socketId: string;
  entryFee: number;
  isBot?: boolean;
  botName?: string;
}

const REROLL_COST = 2;
const MAX_BENCH_SIZE = 8;

export class GameRoom {
  private matchId: string;
  private io: SocketIOServer;

  // Player management
  private players: Map<string, Player>;
  private playerBoards: Map<string, Board>;
  private playerBenches: Map<string, Unit[]>;
  private playerShops: Map<string, Shop>;
  private playerReadyStatus: Map<string, boolean>;
  private disconnectedPlayers: Set<string>;
  private botPlayers: Map<string, BotPlayer>;
  private isBotMatch: boolean;

  // Game systems
  private shopGenerator: ShopGenerator;
  private economyManager: EconomyManager;
  private roundManager: RoundManager;
  private stateSync: StateSync;
  private combatSimulator: CombatSimulator;

  // Game state
  private isMatchComplete: boolean = false;
  private eliminatedPlayers: Set<string>;

  constructor(matchId: string, queuedPlayers: QueuedPlayer[], io: SocketIOServer) {
    this.matchId = matchId;
    this.io = io;

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
    this.isBotMatch = queuedPlayers.some(qp => qp.isBot);

    // Create player objects
    queuedPlayers.forEach((qp, index) => {
      const player: Player = {
        id: qp.socketId,
        address: `0x${index.toString().padStart(40, '0')}`,
        health: 20,
        gold: 3,
        level: 1,
        xp: 0,
        winStreak: 0,
        loseStreak: 0,
      };

      this.players.set(qp.socketId, player);

      // Initialize empty board
      this.playerBoards.set(qp.socketId, {
        top: [null, null, null, null],
        bottom: [null, null, null, null],
      });

      // Initialize empty bench
      this.playerBenches.set(qp.socketId, []);

      // Initialize ready status
      this.playerReadyStatus.set(qp.socketId, false);

      // If this is a bot, create the bot AI
      if (qp.isBot) {
        this.botPlayers.set(qp.socketId, new BotPlayer(qp.socketId, 'easy'));
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
    this.players.forEach((player, playerId) => {
      const shop = this.generateShopForPlayer(playerId);
      this.playerShops.set(playerId, shop);
      this.stateSync.syncShopUpdate(playerId, shop);
    });

    // Start round 1
    this.roundManager.startRound(1);
  }

  /**
   * Handle phase changes
   */
  private handlePhaseChange(phase: GamePhase, round: number): void {
    console.log(`Match ${this.matchId}: Round ${round}, Phase ${phase}`);

    if (phase === 'PLANNING') {
      this.handlePlanningPhase(round);
    } else if (phase === 'COMBAT') {
      this.handleCombatPhase(round);
    } else if (phase === 'TRANSITION') {
      this.handleTransitionPhase(round);
    }
  }

  /**
   * Handle planning phase
   */
  private handlePlanningPhase(round: number): void {
    // Give players gold at start of round
    this.players.forEach((player, playerId) => {
      if (this.eliminatedPlayers.has(playerId)) return;

      const income = this.economyManager.calculateRoundIncome(player);
      player.gold += income;

      // Regenerate shop
      const shop = this.generateShopForPlayer(playerId);
      this.playerShops.set(playerId, shop);

      // Sync to player
      this.stateSync.syncShopUpdate(playerId, shop);
    });

    // Broadcast round start
    this.stateSync.syncRoundStart(this.getActivePlayerIds(), round, 'PLANNING');

    // Reset ready status
    this.playerReadyStatus.forEach((_, playerId) => {
      this.playerReadyStatus.set(playerId, false);
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
    for (const [botId, bot] of this.botPlayers.entries()) {
      if (this.eliminatedPlayers.has(botId)) continue;

      const player = this.players.get(botId);
      const shop = this.playerShops.get(botId);

      if (!player || !shop) continue;

      // Convert shop to format bot expects
      const shopCards = shop.cards.map((card, index) => ({
        ...card,
        index
      }));

      // Create a player state for the bot
      const playerState = {
        ...player,
        bench: this.playerBenches.get(botId) || [],
        board: this.getAllUnitsFromBoard(this.playerBoards.get(botId)!)
      };

      // Execute bot turn with action callbacks
      await bot.executeTurn(playerState, shopCards, round, (action, data) => {
        this.handleBotAction(botId, action, data);
      });

      // Mark bot as ready
      this.playerReadyStatus.set(botId, true);
    }
  }

  /**
   * Handle bot action
   */
  private handleBotAction(botId: string, action: string, data: any): void {
    switch (action) {
      case 'reroll':
        this.handleRerollShop(botId);
        break;
      case 'levelUp':
        this.handleBuyXP(botId);
        break;
      case 'buyCard':
        this.handleBuyCard(botId, data.shopIndex);
        break;
      case 'sellCard':
        const bench = this.playerBenches.get(botId);
        if (bench && bench[data.benchIndex]) {
          this.handleSellCard(botId, bench[data.benchIndex].id);
        }
        break;
      case 'moveCard':
        const moveBench = this.playerBenches.get(botId);
        if (moveBench && moveBench[data.benchIndex]) {
          this.handlePlaceCard(botId, moveBench[data.benchIndex].id, data.boardIndex);
        }
        break;
    }
  }

  /**
   * Handle combat phase
   */
  private handleCombatPhase(round: number): void {
    // Pair opponents
    const activePlayerIds = this.getActivePlayerIds();
    const pairings = RoundManager.pairOpponents(activePlayerIds, round);

    // Run combat for each pairing
    pairings.forEach((opponentId, playerId) => {
      this.runCombat(playerId, opponentId);
    });
  }

  /**
   * Run combat between two players
   */
  private runCombat(playerId: string, opponentId: string): void {
    const player = this.players.get(playerId);
    const opponent = this.players.get(opponentId);
    const playerBoard = this.playerBoards.get(playerId);
    const opponentBoard = this.playerBoards.get(opponentId);

    if (!player || !opponent || !playerBoard || !opponentBoard) {
      console.error(`Missing player data for combat: ${playerId} vs ${opponentId}`);
      return;
    }

    // Notify combat start
    const opponentState = this.stateSync.createOpponentState(
      opponent,
      opponentBoard,
      this.getAllUnitsFromBoard(opponentBoard)
    );
    this.stateSync.syncCombatStart(playerId, opponentState);

    // Simulate combat
    const result = this.combatSimulator.simulateCombat(playerBoard, opponentBoard);

    // Send combat events to player
    result.combatLog.forEach(event => {
      this.stateSync.syncCombatEvent(
        playerId,
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

      // Notify player of damage
      this.stateSync.syncRoundEnd(playerId, result.damageDealt, 0);

      // Check for elimination
      if (player.health <= 0) {
        this.eliminatePlayer(playerId);
      }
    } else if (result.winner === 'player') {
      // Player won
      const streaks = this.economyManager.updateStreaks(player, true);
      player.winStreak = streaks.winStreak;
      player.loseStreak = streaks.loseStreak;

      // No damage
      this.stateSync.syncRoundEnd(playerId, 0, 0);
    } else {
      // Draw - minimal damage
      player.health -= 1;
      this.stateSync.syncRoundEnd(playerId, 1, 0);
    }
  }

  /**
   * Handle transition phase
   */
  private handleTransitionPhase(round: number): void {
    // Check for match end
    const activePlayers = this.getActivePlayerIds();

    if (activePlayers.length <= 1) {
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
    const player = this.players.get(socketId);
    const shop = this.playerShops.get(socketId);
    const bench = this.playerBenches.get(socketId);

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
    const player = this.players.get(socketId);
    const bench = this.playerBenches.get(socketId);
    const board = this.playerBoards.get(socketId);

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
    const player = this.players.get(socketId);
    const bench = this.playerBenches.get(socketId);
    const board = this.playerBoards.get(socketId);

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
    const player = this.players.get(socketId);
    const shop = this.playerShops.get(socketId);

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
    const newShop = this.generateShopForPlayer(socketId);
    this.playerShops.set(socketId, newShop);
    this.stateSync.syncShopUpdate(socketId, newShop);

    return true;
  }

  /**
   * Handle buy XP
   */
  handleBuyXP(socketId: string): boolean {
    const player = this.players.get(socketId);

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
    this.playerReadyStatus.set(socketId, true);

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
    this.disconnectedPlayers.add(socketId);
    console.log(`Player ${socketId} disconnected from match ${this.matchId}`);

    // Could add reconnection logic here
    // For now, eliminate disconnected players after a timeout
    setTimeout(() => {
      if (this.disconnectedPlayers.has(socketId)) {
        this.eliminatePlayer(socketId);
      }
    }, 60000); // 60 second grace period
  }

  /**
   * Eliminate a player
   */
  private eliminatePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || this.eliminatedPlayers.has(playerId)) {
      return;
    }

    console.log(`Player ${playerId} eliminated from match ${this.matchId}`);
    this.eliminatedPlayers.add(playerId);

    const activePlayers = this.getActivePlayerIds();
    player.placement = activePlayers.length + 1;

    // Notify all players
    this.stateSync.syncPlayerEliminated(Array.from(this.players.keys()), playerId);

    // Check for match end
    if (activePlayers.length <= 1) {
      this.endMatch();
    }
  }

  /**
   * End the match
   */
  private endMatch(): void {
    if (this.isMatchComplete) return;

    console.log(`Match ${this.matchId} ending`);
    this.isMatchComplete = true;

    // Set placement for remaining players
    const activePlayers = this.getActivePlayerIds();
    activePlayers.forEach(playerId => {
      const player = this.players.get(playerId);
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

    // Notify all players
    this.stateSync.syncMatchEnd(Array.from(this.players.keys()), placements);

    // Cleanup
    this.cleanup();
  }

  /**
   * Generate shop for a player
   */
  private generateShopForPlayer(playerId: string): Shop {
    const player = this.players.get(playerId);
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
   * Get all active (non-eliminated) player IDs
   */
  private getActivePlayerIds(): string[] {
    return Array.from(this.players.keys()).filter(
      id => !this.eliminatedPlayers.has(id)
    );
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
   * Check if player is in this match
   */
  hasPlayer(socketId: string): boolean {
    return this.players.has(socketId);
  }

  /**
   * Check if match is completed
   */
  isCompleted(): boolean {
    return this.isMatchComplete;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.roundManager.cleanup();
    console.log(`GameRoom ${this.matchId} cleaned up`);
  }
}
