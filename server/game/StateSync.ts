import { Server as SocketIOServer } from 'socket.io';
import { Player, Shop, Board, Unit, GamePhase, ServerEvent, OpponentState } from '../../types/game';

export interface PlayerGameState {
  player: Player;
  shop: Shop;
  board: Board;
  bench: Unit[];
  readyForCombat: boolean;
}

export class StateSync {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Broadcast event to all players in a match
   */
  broadcastToMatch(playerIds: string[], event: ServerEvent): void {
    playerIds.forEach(playerId => {
      this.io.to(playerId).emit('server_event', event);
    });
  }

  /**
   * Send event to a specific player
   */
  sendToPlayer(playerId: string, event: ServerEvent): void {
    this.io.to(playerId).emit('server_event', event);
  }

  /**
   * Sync round start to all players
   */
  syncRoundStart(playerIds: string[], round: number, phase: GamePhase): void {
    this.broadcastToMatch(playerIds, {
      type: 'ROUND_START',
      data: { round, phase },
    });
  }

  /**
   * Sync shop update to a specific player
   */
  syncShopUpdate(playerId: string, shop: Shop): void {
    this.sendToPlayer(playerId, {
      type: 'SHOP_UPDATE',
      data: shop,
    });
  }

  /**
   * Sync combat start with opponent information
   */
  syncCombatStart(playerId: string, opponent: OpponentState): void {
    this.sendToPlayer(playerId, {
      type: 'COMBAT_START',
      data: { opponent },
    });
  }

  /**
   * Sync combat events (attacks, abilities, etc.)
   */
  syncCombatEvent(
    playerId: string,
    type: 'ATTACK' | 'ABILITY' | 'DEATH' | 'HEAL' | 'BUFF' | 'DEBUFF',
    source: string,
    target: string,
    damage?: number,
    healing?: number,
    description?: string
  ): void {
    this.sendToPlayer(playerId, {
      type: 'COMBAT_EVENT',
      data: {
        timestamp: Date.now(),
        type,
        source,
        target,
        damage,
        healing,
        description: description || `${source} ${type.toLowerCase()} ${target}`,
      },
    });
  }

  /**
   * Sync round end with damage and gold rewards
   */
  syncRoundEnd(playerId: string, damage: number, gold: number): void {
    this.sendToPlayer(playerId, {
      type: 'ROUND_END',
      data: { damage, gold },
    });
  }

  /**
   * Notify all players of an elimination
   */
  syncPlayerEliminated(playerIds: string[], eliminatedPlayerId: string): void {
    this.broadcastToMatch(playerIds, {
      type: 'PLAYER_ELIMINATED',
      data: { playerId: eliminatedPlayerId },
    });
  }

  /**
   * Sync match end with final placements
   */
  syncMatchEnd(playerIds: string[], placements: Array<{ playerId: string; placement: number }>): void {
    this.broadcastToMatch(playerIds, {
      type: 'MATCH_END',
      data: { placements },
    });
  }

  /**
   * Create opponent state snapshot for display
   */
  createOpponentState(player: Player, board: Board, units: Unit[]): OpponentState {
    // Calculate unit statistics
    const unitCount = units.length;
    const avgUnitLevel = unitCount > 0
      ? units.reduce((sum, unit) => sum + unit.stars, 0) / unitCount
      : 0;

    return {
      player,
      board,
      unitCount,
      avgUnitLevel: Math.round(avgUnitLevel * 10) / 10, // Round to 1 decimal
    };
  }

  /**
   * Broadcast full game state update to a player
   */
  syncFullState(
    playerId: string,
    matchId: string,
    round: number,
    phase: GamePhase,
    timeRemaining: number,
    playerState: PlayerGameState,
    opponents: Player[]
  ): void {
    // Note: This is a custom full state sync, not in the ServerEvent union
    // You might want to add this to the ServerEvent type or handle differently
    this.io.to(playerId).emit('state_sync', {
      matchId,
      round,
      phase,
      timeRemaining,
      player: playerState.player,
      shop: playerState.shop,
      board: playerState.board,
      bench: playerState.bench,
      opponents,
      readyForCombat: playerState.readyForCombat,
    });
  }

  /**
   * Sync player stats update (health, gold, level, etc.)
   */
  syncPlayerStats(playerId: string, player: Player): void {
    this.io.to(playerId).emit('player_stats_update', player);
  }

  /**
   * Sync board update to all players (so they can see opponent boards)
   */
  syncBoardUpdate(playerIds: string[], playerId: string, board: Board): void {
    playerIds.forEach(recipientId => {
      if (recipientId !== playerId) {
        this.io.to(recipientId).emit('opponent_board_update', {
          playerId,
          board,
        });
      }
    });
  }

  /**
   * Sync error message to player
   */
  syncError(playerId: string, message: string, code?: string): void {
    this.io.to(playerId).emit('error', {
      message,
      code,
      timestamp: Date.now(),
    });
  }

  /**
   * Sync success message to player
   */
  syncSuccess(playerId: string, message: string): void {
    this.io.to(playerId).emit('success', {
      message,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a socket is connected
   */
  isSocketConnected(socketId: string): boolean {
    const socket = this.io.sockets.sockets.get(socketId);
    return socket !== undefined && socket.connected;
  }

  /**
   * Get all connected sockets
   */
  getConnectedSockets(): string[] {
    return Array.from(this.io.sockets.sockets.keys());
  }

  /**
   * Disconnect a player
   */
  disconnectPlayer(socketId: string): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
    }
  }
}
