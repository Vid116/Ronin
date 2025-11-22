import { Server as SocketIOServer } from 'socket.io';
import { ServerEvent } from '../../types/game';

interface QueuedPlayer {
  socketId: string;
  entryFee: number;
}

export class GameRoom {
  private matchId: string;
  private players: QueuedPlayer[];
  private io: SocketIOServer;
  private currentRound: number = 1;
  private roundTimer: NodeJS.Timeout | null = null;

  constructor(matchId: string, players: QueuedPlayer[], io: SocketIOServer) {
    this.matchId = matchId;
    this.players = players;
    this.io = io;

    console.log(`GameRoom created: ${matchId} with ${players.length} players`);
  }

  start() {
    console.log(`Starting match ${this.matchId}`);
    this.startRound();
  }

  private startRound() {
    console.log(`Round ${this.currentRound} starting`);

    // Broadcast round start
    this.broadcast({
      type: 'ROUND_START',
      data: {
        round: this.currentRound,
        phase: 'PLANNING',
      },
    });

    // TODO: Generate shop for each player
    // TODO: Start planning phase timer

    // Simulate round progression
    this.roundTimer = setTimeout(() => {
      this.startCombat();
    }, 20000); // 20 second planning phase
  }

  private startCombat() {
    console.log(`Round ${this.currentRound} combat starting`);

    this.broadcast({
      type: 'COMBAT_START',
      data: {
        opponent: {
          player: {
            id: 'opponent-1',
            address: '0xOpponent',
            health: 20,
            gold: 5,
            level: 2,
            xp: 0,
            winStreak: 0,
            loseStreak: 0,
          },
          board: {
            top: [null, null, null, null],
            bottom: [null, null, null, null],
          },
          unitCount: 0,
          avgUnitLevel: 1,
        },
      },
    });

    // TODO: Simulate combat
    // TODO: Calculate damage

    // End round after combat
    setTimeout(() => {
      this.endRound();
    }, 10000); // 10 second combat phase
  }

  private endRound() {
    console.log(`Round ${this.currentRound} ending`);

    // Broadcast round end
    this.broadcast({
      type: 'ROUND_END',
      data: {
        damage: 2,
        gold: 5,
      },
    });

    // Check for match end
    if (this.currentRound >= 20) {
      this.endMatch();
    } else {
      this.currentRound++;
      setTimeout(() => this.startRound(), 2000); // 2 second transition
    }
  }

  private endMatch() {
    console.log(`Match ${this.matchId} ending`);

    // TODO: Calculate final placements
    this.broadcast({
      type: 'MATCH_END',
      data: {
        placements: this.players.map((p, i) => ({
          playerId: p.socketId,
          placement: i + 1,
        })),
      },
    });

    // Cleanup
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
  }

  private broadcast(event: ServerEvent) {
    this.players.forEach(({ socketId }) => {
      this.io.to(socketId).emit('server_event', event);
    });
  }

  cleanup() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
  }
}
