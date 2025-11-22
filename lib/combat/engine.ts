// Main Combat Engine
import type { Board, Unit } from '@/types/game';
import type { CombatUnit, CombatState, CombatResult } from './types';
import { selectTarget, getEnemyBoard, getAliveUnits } from './targeting';
import { calculateDamage, applyDamage, calculatePlayerDamage, isAlive } from './damage';
import { logAttack, logDeath } from './events';
import {
  processStartOfCombatAbilities,
  processOnAttackAbilities,
  processOnDeathAbilities,
} from './abilities';

/**
 * Convert a Board to a Map of CombatUnits
 */
function boardToCombatUnits(
  board: Board,
  side: 'player1' | 'player2'
): Map<number, CombatUnit> {
  const combatBoard = new Map<number, CombatUnit>();

  // Process top row (positions 0-3)
  board.top.forEach((unit, index) => {
    if (unit) {
      const combatUnit = unitToCombatUnit(unit, index, side);
      combatBoard.set(index, combatUnit);
    }
  });

  // Process bottom row (positions 4-7)
  board.bottom.forEach((unit, index) => {
    if (unit) {
      const combatUnit = unitToCombatUnit(unit, index + 4, side);
      combatBoard.set(index + 4, combatUnit);
    }
  });

  return combatBoard;
}

/**
 * Convert a Unit to a CombatUnit
 */
function unitToCombatUnit(
  unit: Unit,
  position: number,
  side: 'player1' | 'player2'
): CombatUnit {
  const baseHealth = unit.health * unit.stars; // 3-star units have 3x health
  const baseAttack = unit.attack * unit.stars; // 3-star units have 3x attack

  return {
    ...unit,
    position,
    side,
    currentHealth: unit.currentHealth || baseHealth,
    buffedAttack: baseAttack,
    buffedHealth: baseHealth,
    isDead: false,
    attackCount: 0,
    damageDealt: 0,
    damageTaken: 0,
  };
}

/**
 * Initialize combat state
 */
function initializeCombatState(
  board1: Board,
  board2: Board,
  round: number,
  seed?: number
): CombatState {
  return {
    player1Board: boardToCombatUnits(board1, 'player1'),
    player2Board: boardToCombatUnits(board2, 'player2'),
    currentPosition: 0,
    round,
    events: [],
    randomSeed: seed || Math.floor(Math.random() * 1000000),
    randomIndex: 0,
  };
}

/**
 * Process a single unit's attack
 */
function processUnitAttack(unit: CombatUnit, state: CombatState): void {
  // Skip if unit is dead
  if (!isAlive(unit)) {
    return;
  }

  // Process on-attack abilities
  processOnAttackAbilities(state, unit);

  // Select target
  const enemyBoard = getEnemyBoard(state, unit.side);
  const target = selectTarget(unit, enemyBoard, 'taunt', state);

  if (!target) {
    return; // No valid targets
  }

  // Calculate and apply damage (with dodge/crit RNG)
  const damage = calculateDamage(unit, target, state);

  // Apply damage
  const actualDamage = applyDamage(target, damage);

  // Track damage dealt
  unit.damageDealt = (unit.damageDealt || 0) + actualDamage;

  // Log attack
  logAttack(state, unit, target, actualDamage);

  // Check if target died
  if (target.isDead) {
    handleUnitDeath(target, unit, state);
  }
}

/**
 * Handle unit death
 * Simplified: only process on-death abilities
 */
function handleUnitDeath(
  deadUnit: CombatUnit,
  killer: CombatUnit | undefined,
  state: CombatState
): void {
  // Log death
  logDeath(state, deadUnit, killer);

  // Process on-death abilities
  processOnDeathAbilities(state, deadUnit, killer);
}

/**
 * Process a single position slot
 */
function processPosition(position: number, state: CombatState): void {
  state.currentPosition = position;

  // Get units at this position
  const p1Unit = state.player1Board.get(position);
  const p2Unit = state.player2Board.get(position);

  // Simultaneous activation - both units attack if present
  if (p1Unit && isAlive(p1Unit)) {
    processUnitAttack(p1Unit, state);
  }

  if (p2Unit && isAlive(p2Unit)) {
    processUnitAttack(p2Unit, state);
  }

  // Clean up dead units after position
  cleanupDeadUnits(state);
}

/**
 * Remove dead units from boards
 */
function cleanupDeadUnits(state: CombatState): void {
  // Remove dead units from player 1 board
  for (const [position, unit] of state.player1Board.entries()) {
    if (unit.isDead) {
      state.player1Board.delete(position);
    }
  }

  // Remove dead units from player 2 board
  for (const [position, unit] of state.player2Board.entries()) {
    if (unit.isDead) {
      state.player2Board.delete(position);
    }
  }
}

/**
 * Determine combat winner
 */
function determineWinner(state: CombatState): 'player1' | 'player2' | 'draw' {
  const p1Alive = getAliveUnits(state.player1Board);
  const p2Alive = getAliveUnits(state.player2Board);

  if (p1Alive.length > 0 && p2Alive.length === 0) {
    return 'player1';
  }

  if (p2Alive.length > 0 && p1Alive.length === 0) {
    return 'player2';
  }

  if (p1Alive.length === 0 && p2Alive.length === 0) {
    return 'draw';
  }

  // If both have units, compare total health
  const p1Health = p1Alive.reduce((sum, u) => sum + u.currentHealth, 0);
  const p2Health = p2Alive.reduce((sum, u) => sum + u.currentHealth, 0);

  if (p1Health > p2Health) {
    return 'player1';
  } else if (p2Health > p1Health) {
    return 'player2';
  }

  return 'draw';
}

/**
 * Calculate total damage dealt by each side
 */
function calculateTotalDamage(state: CombatState): {
  player1: number;
  player2: number;
} {
  const p1Damage = Array.from(state.player1Board.values())
    .reduce((sum, u) => sum + (u.damageDealt || 0), 0);

  const p2Damage = Array.from(state.player2Board.values())
    .reduce((sum, u) => sum + (u.damageDealt || 0), 0);

  return {
    player1: p1Damage,
    player2: p2Damage,
  };
}

/**
 * Main combat simulation function
 *
 * @param board1 - Player 1's board
 * @param board2 - Player 2's board
 * @param round - Current round number (affects damage scaling)
 * @param seed - Optional random seed for deterministic results
 * @returns Combat result with winner, damage, and events
 */
export function simulateCombat(
  board1: Board,
  board2: Board,
  round: number,
  seed?: number
): CombatResult {
  // Initialize combat state
  const state = initializeCombatState(board1, board2, round, seed);

  // Process start of combat abilities
  processStartOfCombatAbilities(state);

  // Process each position (0-7)
  for (let position = 0; position < 8; position++) {
    processPosition(position, state);

    // Early exit if one side is eliminated
    const p1Alive = getAliveUnits(state.player1Board);
    const p2Alive = getAliveUnits(state.player2Board);

    if (p1Alive.length === 0 || p2Alive.length === 0) {
      break;
    }
  }

  // Determine winner
  const winner = determineWinner(state);

  // Calculate damage to losing player
  let damage = 0;
  if (winner === 'player1') {
    const survivingUnits = getAliveUnits(state.player1Board);
    damage = calculatePlayerDamage(survivingUnits, round);
  } else if (winner === 'player2') {
    const survivingUnits = getAliveUnits(state.player2Board);
    damage = calculatePlayerDamage(survivingUnits, round);
  }

  // Get surviving units
  const survivingUnits = {
    player1: getAliveUnits(state.player1Board),
    player2: getAliveUnits(state.player2Board),
  };

  // Get total damage dealt
  const totalDamageDealt = calculateTotalDamage(state);

  return {
    winner,
    damage,
    events: state.events,
    survivingUnits,
    totalDamageDealt,
    seed: state.randomSeed,
    randomIndex: state.randomIndex,
  };
}

/**
 * Simulate multiple combats (for testing/balancing)
 */
export function simulateMultipleCombats(
  board1: Board,
  board2: Board,
  round: number,
  iterations: number
): {
  player1Wins: number;
  player2Wins: number;
  draws: number;
  avgDamage: number;
} {
  let player1Wins = 0;
  let player2Wins = 0;
  let draws = 0;
  let totalDamage = 0;

  for (let i = 0; i < iterations; i++) {
    const result = simulateCombat(board1, board2, round, i);

    if (result.winner === 'player1') {
      player1Wins++;
    } else if (result.winner === 'player2') {
      player2Wins++;
    } else {
      draws++;
    }

    totalDamage += result.damage;
  }

  return {
    player1Wins,
    player2Wins,
    draws,
    avgDamage: totalDamage / iterations,
  };
}
