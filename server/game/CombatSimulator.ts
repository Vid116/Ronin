import { Unit, Board, CombatEvent } from '../../types/game';
import { runRoflCombat, getWinnerFromPerspective } from '../../rofl-combat/adapter';
import type { CombatOutput } from '../../rofl-combat/types';

export interface CombatResult {
  winner: 'player' | 'opponent' | 'draw';
  damageDealt: number;
  playerUnitsRemaining: number;
  opponentUnitsRemaining: number;
  combatLog: CombatEvent[];
  seed?: number;

  // Visual state for display
  initialBoard1: Board;
  initialBoard2: Board;
  finalBoard1: Board;
  finalBoard2: Board;
}

export class CombatSimulator {
  /**
   * Simulate combat between two boards using ROFL combat engine
   */
  simulateCombat(
    playerBoard: Board,
    opponentBoard: Board,
    round: number = 1,
    player1Address: string = '0xPlayer1',
    player2Address: string = '0xPlayer2',
    matchId: string = 'local-match'
  ): CombatResult {
    // Use hardcoded seed for now (deterministic testing)
    const seed = 12345 + round;

    console.log(`🎲 Running ROFL combat (seed: ${seed}, round: ${round})`);

    // Run ROFL combat engine
    const roflResult = runRoflCombat(
      playerBoard,
      opponentBoard,
      round,
      seed,
      player1Address,
      player2Address,
      matchId
    );

    // Adapt result to server format
    return this.adaptRoflResult(roflResult, playerBoard, opponentBoard, seed);
  }

  /**
   * Adapter: Convert ROFL result to server format
   */
  private adaptRoflResult(
    roflResult: CombatOutput,
    initialBoard1: Board,
    initialBoard2: Board,
    seed: number
  ): CombatResult {
    // Convert winner
    const winner = getWinnerFromPerspective(roflResult.winner, 'player1');

    // Convert events to combat log
    const combatLog: CombatEvent[] = roflResult.events.map(event => ({
      timestamp: Date.now(),
      type: event.type as any,
      source: event.sourceUnit,
      target: event.targetUnit || '',
      damage: event.value,
      description: event.description,
    }));

    // Count units
    const playerUnitsRemaining = roflResult.finalBoard1.units.filter(u => u !== null).length;
    const opponentUnitsRemaining = roflResult.finalBoard2.units.filter(u => u !== null).length;

    // Convert ROFL boards back to game boards
    const finalBoard1 = this.roflBoardToGameBoard(roflResult.finalBoard1);
    const finalBoard2 = this.roflBoardToGameBoard(roflResult.finalBoard2);

    console.log(`⚔️ ROFL Combat complete (seed: ${seed}):`, {
      winner,
      damage: roflResult.damageToLoser,
      playerUnits: playerUnitsRemaining,
      opponentUnits: opponentUnitsRemaining,
      events: combatLog.length,
      rngCalls: roflResult.rngCallCount,
      steps: roflResult.totalSteps,
      hash: roflResult.resultHash,
      time: roflResult.executionTimeMs + 'ms',
    });

    return {
      winner,
      damageDealt: roflResult.damageToLoser,
      playerUnitsRemaining,
      opponentUnitsRemaining,
      combatLog,
      seed,
      initialBoard1,
      initialBoard2,
      finalBoard1,
      finalBoard2,
    };
  }

  /**
   * Convert ROFL board back to game board
   */
  private roflBoardToGameBoard(roflBoard: any): Board {
    const units = roflBoard.units || [];
    return {
      top: [units[0] || null, units[1] || null, units[2] || null, units[3] || null],
      bottom: [units[4] || null, units[5] || null, units[6] || null, units[7] || null],
    };
  }
}
