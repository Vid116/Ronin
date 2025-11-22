/**
 * ROFL Combat Engine - Pure Implementation
 *
 * This is a completely standalone combat simulator with:
 * - NO external dependencies
 * - NO I/O operations
 * - NO side effects
 * - 100% deterministic
 * - Pure functions only
 *
 * Perfect for Oasis ROFL deployment.
 */

import type {
  CombatInput,
  CombatOutput,
  CombatBoard,
  CombatUnit,
  CombatEvent,
} from './types';

/**
 * Internal unit state during combat
 */
interface ActiveUnit extends CombatUnit {
  position: number;
  side: 1 | 2;
  currentHealth: number;
  currentAttack: number;
  isDead: boolean;
}

/**
 * Internal combat state
 */
interface InternalState {
  board1: Map<number, ActiveUnit>;
  board2: Map<number, ActiveUnit>;
  rngIndex: number;
  step: number;
  events: CombatEvent[];
}

/**
 * Linear Congruential Generator for deterministic RNG
 */
function seededRandom(seed: number, index: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);
  const value = (a * (seed + index) + c) % m;
  return value / m;
}

/**
 * Percentage check (0-100)
 */
function randomCheck(seed: number, index: number, chance: number): boolean {
  return seededRandom(seed, index) * 100 < chance;
}

/**
 * Convert input board to active units
 */
function initializeBoard(
  board: CombatBoard,
  side: 1 | 2
): Map<number, ActiveUnit> {
  const activeBoard = new Map<number, ActiveUnit>();

  board.units.forEach((unit, position) => {
    if (unit) {
      const baseHealth = unit.health * unit.stars;
      const baseAttack = unit.attack * unit.stars;

      activeBoard.set(position, {
        ...unit,
        position,
        side,
        currentHealth: baseHealth,
        currentAttack: baseAttack,
        isDead: false,
      });
    }
  });

  return activeBoard;
}

/**
 * Calculate damage (with dodge/crit)
 */
function calculateDamage(
  attacker: ActiveUnit,
  defender: ActiveUnit,
  seed: number,
  rngIndex: { value: number }
): number {
  // Dodge check
  if (defender.dodgeChance && defender.dodgeChance > 0) {
    if (randomCheck(seed, rngIndex.value++, defender.dodgeChance)) {
      return 0; // DODGED!
    }
  }

  // Base damage formula
  const defense = Math.floor(defender.currentHealth / 10);
  let damage = Math.max(1, attacker.currentAttack - Math.floor(defense / 2));

  // Crit check
  if (attacker.critChance && attacker.critChance > 0) {
    if (randomCheck(seed, rngIndex.value++, attacker.critChance)) {
      damage *= 2; // CRIT!
    }
  }

  return damage;
}

/**
 * Apply damage to unit
 */
function applyDamage(unit: ActiveUnit, damage: number): void {
  unit.currentHealth -= damage;
  if (unit.currentHealth <= 0) {
    unit.currentHealth = 0;
    unit.isDead = true;
  }
}

/**
 * Get all alive units from a board
 */
function getAlive(board: Map<number, ActiveUnit>): ActiveUnit[] {
  return Array.from(board.values()).filter(u => !u.isDead);
}

/**
 * Process start-of-combat abilities
 */
function processStartAbilities(
  state: InternalState,
  seed: number,
  rngIndex: { value: number }
): void {
  const allUnits = [
    ...Array.from(state.board1.values()),
    ...Array.from(state.board2.values()),
  ].filter(u => !u.isDead && u.ability.trigger === 'start_of_combat');

  for (const unit of allUnits) {
    // Apply passive stats
    if (unit.ability.effect.includes('dodge')) {
      const match = unit.ability.effect.match(/(\d+)/);
      if (match) {
        unit.dodgeChance = parseInt(match[1]);
      }
    }
    if (unit.ability.effect.includes('crit')) {
      const match = unit.ability.effect.match(/(\d+)/);
      if (match) {
        unit.critChance = parseInt(match[1]);
      }
    }
  }
}

/**
 * Process unit attack at a position
 */
function processAttack(
  attacker: ActiveUnit,
  enemyBoard: Map<number, ActiveUnit>,
  state: InternalState,
  seed: number,
  rngIndex: { value: number }
): void {
  // Find first alive enemy
  const enemies = getAlive(enemyBoard);
  if (enemies.length === 0) return;

  const target = enemies[0]; // Simple: attack first alive enemy

  // Calculate damage
  const damage = calculateDamage(attacker, target, seed, rngIndex);

  // Apply damage
  applyDamage(target, damage);

  // Log event
  state.events.push({
    step: state.step++,
    position: attacker.position,
    type: 'ATTACK',
    sourceUnit: attacker.id,
    targetUnit: target.id,
    value: damage,
    description: `${attacker.name} attacks ${target.name} for ${damage} damage`,
  });

  // Check death
  if (target.isDead) {
    state.events.push({
      step: state.step++,
      position: target.position,
      type: 'DEATH',
      sourceUnit: target.id,
      description: `${target.name} is defeated`,
    });
  }
}

/**
 * Main combat simulation (pure function)
 */
export function simulateCombat(input: CombatInput): CombatOutput {
  const startTime = Date.now();

  // Initialize state
  const state: InternalState = {
    board1: initializeBoard(input.board1, 1),
    board2: initializeBoard(input.board2, 2),
    rngIndex: 0,
    step: 0,
    events: [],
  };

  const rngIndex = { value: 0 }; // Mutable reference for RNG counter

  // Process start-of-combat abilities
  processStartAbilities(state, input.seed, rngIndex);

  // Main combat loop (position 0-7)
  for (let position = 0; position < 8; position++) {
    const unit1 = state.board1.get(position);
    const unit2 = state.board2.get(position);

    // Both units attack if alive
    if (unit1 && !unit1.isDead) {
      processAttack(unit1, state.board2, state, input.seed, rngIndex);
    }

    if (unit2 && !unit2.isDead) {
      processAttack(unit2, state.board1, state, input.seed, rngIndex);
    }

    // Early exit if one side eliminated
    if (getAlive(state.board1).length === 0 || getAlive(state.board2).length === 0) {
      break;
    }
  }

  // Determine winner
  const alive1 = getAlive(state.board1);
  const alive2 = getAlive(state.board2);

  let winner: 'player1' | 'player2' | 'draw';
  let damageToLoser = 0;

  if (alive1.length > 0 && alive2.length === 0) {
    winner = 'player1';
    // Damage based on surviving units + tier
    damageToLoser = alive1.reduce((sum, u) => sum + 1 + u.tier, 0);
  } else if (alive2.length > 0 && alive1.length === 0) {
    winner = 'player2';
    damageToLoser = alive2.reduce((sum, u) => sum + 1 + u.tier, 0);
  } else {
    winner = 'draw';
    damageToLoser = 1;
  }

  // Create final boards
  const finalBoard1: CombatBoard = {
    units: Array.from({ length: 8 }, (_, i) => {
      const unit = state.board1.get(i);
      return unit && !unit.isDead ? unit : null;
    }),
  };

  const finalBoard2: CombatBoard = {
    units: Array.from({ length: 8 }, (_, i) => {
      const unit = state.board2.get(i);
      return unit && !unit.isDead ? unit : null;
    }),
  };

  // Create result hash (for verification)
  const resultHash = hashCombatResult(
    winner,
    damageToLoser,
    input.seed,
    rngIndex.value,
    state.step
  );

  const executionTimeMs = Date.now() - startTime;

  return {
    winner,
    damageToLoser,
    finalBoard1,
    finalBoard2,
    seed: input.seed,
    rngCallCount: rngIndex.value,
    totalSteps: state.step,
    events: state.events,
    resultHash,
    executionTimeMs,
  };
}

/**
 * Simple hash function for result verification
 */
function hashCombatResult(
  winner: string,
  damage: number,
  seed: number,
  rngCalls: number,
  steps: number
): string {
  const data = `${winner}-${damage}-${seed}-${rngCalls}-${steps}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Verify a combat result by re-running
 */
export function verifyCombatResult(
  input: CombatInput,
  expectedOutput: CombatOutput
): boolean {
  const recomputed = simulateCombat(input);

  return (
    recomputed.winner === expectedOutput.winner &&
    recomputed.damageToLoser === expectedOutput.damageToLoser &&
    recomputed.rngCallCount === expectedOutput.rngCallCount &&
    recomputed.resultHash === expectedOutput.resultHash
  );
}
