// Target Selection Logic
import type { CombatUnit, CombatState, TargetPriority } from './types';
import { isAlive } from './damage';

/**
 * Get all alive units from a board
 */
export function getAliveUnits(board: Map<number, CombatUnit>): CombatUnit[] {
  return Array.from(board.values()).filter(isAlive);
}

/**
 * Generate a pseudo-random number based on state
 * Simple LCG (Linear Congruential Generator)
 */
function nextRandom(state: CombatState): number {
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);

  state.randomSeed = (a * state.randomSeed + c) % m;
  state.randomIndex++;

  return state.randomSeed / m;
}

/**
 * Select a random unit from the array
 */
function selectRandomUnit(units: CombatUnit[], state: CombatState): CombatUnit | null {
  if (units.length === 0) return null;
  const index = Math.floor(nextRandom(state) * units.length);
  return units[index];
}

/**
 * Select target based on priority
 */
export function selectTarget(
  attacker: CombatUnit,
  enemyBoard: Map<number, CombatUnit>,
  priority: TargetPriority,
  state: CombatState
): CombatUnit | null {
  const aliveEnemies = getAliveUnits(enemyBoard);

  if (aliveEnemies.length === 0) {
    return null;
  }

  switch (priority) {
    case 'taunt':
      return selectTauntTarget(aliveEnemies, state);

    case 'flying':
      return selectFlyingTarget(aliveEnemies, state);

    case 'lowest_hp':
      return selectLowestHp(aliveEnemies);

    case 'highest_hp':
      return selectHighestHp(aliveEnemies);

    case 'highest_attack':
      return selectHighestAttack(aliveEnemies);

    case 'random':
      return selectRandomUnit(aliveEnemies, state);

    case 'first':
      return selectFirst(aliveEnemies);

    case 'backline':
      return selectBackline(aliveEnemies, state);

    default:
      return selectFirst(aliveEnemies);
  }
}

/**
 * Select multiple targets
 */
export function selectTargets(
  attacker: CombatUnit,
  enemyBoard: Map<number, CombatUnit>,
  priority: TargetPriority,
  count: number,
  state: CombatState
): CombatUnit[] {
  const targets: CombatUnit[] = [];
  const aliveEnemies = getAliveUnits(enemyBoard);

  if (aliveEnemies.length === 0) {
    return targets;
  }

  // For multiple targets, use different logic based on priority
  switch (priority) {
    case 'lowest_hp':
      return selectLowestHpMultiple(aliveEnemies, count);

    case 'highest_attack':
      return selectHighestAttackMultiple(aliveEnemies, count);

    case 'random':
      return selectRandomMultiple(aliveEnemies, count, state);

    default:
      // Default: select first N units
      return aliveEnemies.slice(0, count);
  }
}

/**
 * Taunt targeting: prioritize taunt units, otherwise random
 */
function selectTauntTarget(units: CombatUnit[], state: CombatState): CombatUnit | null {
  const tauntUnits = units.filter(u => u.hasTaunt);
  if (tauntUnits.length > 0) {
    return selectRandomUnit(tauntUnits, state);
  }
  return selectRandomUnit(units, state);
}

/**
 * Flying targeting: prioritize flying units, otherwise random
 */
function selectFlyingTarget(units: CombatUnit[], state: CombatState): CombatUnit | null {
  const flyingUnits = units.filter(u => u.hasFlying);
  if (flyingUnits.length > 0) {
    return selectRandomUnit(flyingUnits, state);
  }
  return selectRandomUnit(units, state);
}

/**
 * Select unit with lowest current HP
 */
function selectLowestHp(units: CombatUnit[]): CombatUnit | null {
  if (units.length === 0) return null;
  return units.reduce((lowest, unit) =>
    unit.currentHealth < lowest.currentHealth ? unit : lowest
  );
}

/**
 * Select unit with highest current HP
 */
function selectHighestHp(units: CombatUnit[]): CombatUnit | null {
  if (units.length === 0) return null;
  return units.reduce((highest, unit) =>
    unit.currentHealth > highest.currentHealth ? unit : highest
  );
}

/**
 * Select unit with highest attack
 */
function selectHighestAttack(units: CombatUnit[]): CombatUnit | null {
  if (units.length === 0) return null;
  return units.reduce((highest, unit) =>
    unit.buffedAttack > highest.buffedAttack ? unit : highest
  );
}

/**
 * Select first unit (by position)
 */
function selectFirst(units: CombatUnit[]): CombatUnit | null {
  if (units.length === 0) return null;
  return units.reduce((first, unit) =>
    unit.position < first.position ? unit : first
  );
}

/**
 * Select backline unit (highest position)
 */
function selectBackline(units: CombatUnit[], state: CombatState): CombatUnit | null {
  if (units.length === 0) return null;

  // Get units in positions 4-7 (backline)
  const backlineUnits = units.filter(u => u.position >= 4);

  if (backlineUnits.length > 0) {
    return selectRandomUnit(backlineUnits, state);
  }

  // If no backline units, target any unit
  return selectRandomUnit(units, state);
}

/**
 * Select multiple units with lowest HP
 */
function selectLowestHpMultiple(units: CombatUnit[], count: number): CombatUnit[] {
  return [...units]
    .sort((a, b) => a.currentHealth - b.currentHealth)
    .slice(0, count);
}

/**
 * Select multiple units with highest attack
 */
function selectHighestAttackMultiple(units: CombatUnit[], count: number): CombatUnit[] {
  return [...units]
    .sort((a, b) => b.buffedAttack - a.buffedAttack)
    .slice(0, count);
}

/**
 * Select multiple random units (no duplicates)
 */
function selectRandomMultiple(
  units: CombatUnit[],
  count: number,
  state: CombatState
): CombatUnit[] {
  const selected: CombatUnit[] = [];
  const available = [...units];

  const maxCount = Math.min(count, available.length);

  for (let i = 0; i < maxCount; i++) {
    const index = Math.floor(nextRandom(state) * available.length);
    selected.push(available[index]);
    available.splice(index, 1);
  }

  return selected;
}

/**
 * Get opposite board for targeting
 */
export function getEnemyBoard(
  state: CombatState,
  side: 'player1' | 'player2'
): Map<number, CombatUnit> {
  return side === 'player1' ? state.player2Board : state.player1Board;
}

/**
 * Get friendly board for self-targeting abilities
 */
export function getFriendlyBoard(
  state: CombatState,
  side: 'player1' | 'player2'
): Map<number, CombatUnit> {
  return side === 'player1' ? state.player1Board : state.player2Board;
}
