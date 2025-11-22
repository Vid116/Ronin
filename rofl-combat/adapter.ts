/**
 * ROFL Combat Adapter
 *
 * Converts between your game's types and the standalone ROFL types.
 * This file bridges the gap but is NOT deployed to ROFL.
 */

import type { Board, Unit } from '../types/game';
import type { CombatBoard, CombatUnit, CombatInput, CombatOutput } from './types';
import { simulateCombat } from './engine';

/**
 * Convert game Board to ROFL CombatBoard
 */
export function boardToRoflBoard(board: Board): CombatBoard {
  const units: (CombatUnit | null)[] = [];

  // Top row (positions 0-3)
  board.top.forEach((unit) => {
    units.push(unit ? unitToRoflUnit(unit) : null);
  });

  // Bottom row (positions 4-7)
  board.bottom.forEach((unit) => {
    units.push(unit ? unitToRoflUnit(unit) : null);
  });

  return { units };
}

/**
 * Convert game Unit to ROFL CombatUnit
 */
export function unitToRoflUnit(unit: Unit): CombatUnit {
  // Map ability trigger
  let trigger: 'start_of_combat' | 'on_attack' | 'on_death' | 'passive';
  switch (unit.ability.trigger) {
    case 'startCombat':
      trigger = 'start_of_combat';
      break;
    case 'onAttack':
      trigger = 'on_attack';
      break;
    case 'onDeath':
      trigger = 'on_death';
      break;
    default:
      trigger = 'passive';
  }

  return {
    id: unit.id,
    name: unit.name,
    tier: unit.tier,
    attack: unit.attack,
    health: unit.health,
    stars: unit.stars,
    ability: {
      name: unit.ability.name,
      trigger,
      effect: unit.ability.effect,
    },
  };
}

/**
 * Generate combat seed from blockchain data
 */
export function generateCombatSeed(params: {
  blockHash: string;
  timestamp: number;
  player1Address: string;
  player2Address: string;
  roundNumber: number;
}): number {
  const combined = `${params.blockHash}-${params.timestamp}-${params.player1Address}-${params.player2Address}-${params.roundNumber}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * High-level function: Run combat using game types
 */
export function runRoflCombat(
  board1: Board,
  board2: Board,
  round: number,
  seed: number,
  player1Address: string,
  player2Address: string,
  matchId: string
): CombatOutput {
  const input: CombatInput = {
    board1: boardToRoflBoard(board1),
    board2: boardToRoflBoard(board2),
    round,
    seed,
    player1Address,
    player2Address,
    matchId,
    timestamp: Date.now(),
  };

  return simulateCombat(input);
}

/**
 * Helper: Get winner from perspective
 */
export function getWinnerFromPerspective(
  roflWinner: 'player1' | 'player2' | 'draw',
  perspective: 'player1' | 'player2'
): 'player' | 'opponent' | 'draw' {
  if (roflWinner === 'draw') return 'draw';
  if (roflWinner === perspective) return 'player';
  return 'opponent';
}
