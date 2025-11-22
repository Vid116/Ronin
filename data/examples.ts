/**
 * Examples and usage patterns for the Ronin Rumble data layer
 * This file demonstrates how to use the game data in practice
 */

import GameData from './index';
import { Unit } from '@/types/game';
import { calculateActiveSynergies, applySynergyBonuses } from './synergies';
import { createUnitInstance, combineUnits } from './units';
import { getItemDropForRound } from './items';
import { calculateInterest, calculateRoundDamage, getXPForLevel } from './constants';

// ============================================
// EXAMPLE 1: Generate Shop Based on Player Level
// ============================================

export function generateShop(playerLevel: number): Unit[] {
  const shop: Unit[] = [];
  const probabilities = GameData.constants.tierProbabilities[playerLevel];

  for (let i = 0; i < 5; i++) {
    // Roll tier based on probabilities
    const roll = Math.random() * 100;
    let tier: 1 | 2 | 3 | 4 | 5 = 1;

    let cumulative = 0;
    for (let t = 0; t < probabilities.length; t++) {
      cumulative += probabilities[t];
      if (roll < cumulative) {
        tier = (t + 1) as 1 | 2 | 3 | 4 | 5;
        break;
      }
    }

    // Get random unit from tier
    const unitsInTier = GameData.units.getByTier(tier);
    const randomUnit = unitsInTier[Math.floor(Math.random() * unitsInTier.length)];

    // Create instance with unique ID
    shop.push(createUnitInstance(randomUnit));
  }

  return shop;
}

// Example usage:
// const shop = generateShop(5); // Level 5 shop
// console.log(shop); // 5 units with proper probabilities

// ============================================
// EXAMPLE 2: Calculate Player Income
// ============================================

export function calculatePlayerIncome(
  gold: number,
  isWin: boolean,
  winStreak: number,
  loseStreak: number
): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {
    base: GameData.constants.economy.BASE_GOLD_PER_ROUND,
    interest: calculateInterest(gold),
    winBonus: 0,
    streakBonus: 0,
  };

  if (isWin) {
    breakdown.winBonus = GameData.constants.economy.WIN_BONUS;
    if (winStreak >= GameData.constants.economy.WIN_STREAK_THRESHOLD) {
      breakdown.streakBonus = GameData.constants.economy.WIN_STREAK_BONUS;
    }
  } else {
    if (loseStreak >= GameData.constants.economy.LOSS_STREAK_THRESHOLD) {
      breakdown.streakBonus = GameData.constants.economy.LOSS_STREAK_BONUS;
    }
  }

  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  return { total, breakdown };
}

// Example usage:
// const income = calculatePlayerIncome(25, true, 3, 0);
// console.log(income.total); // e.g., 5 + 2 (interest) + 2 (win) + 2 (streak) = 11

// ============================================
// EXAMPLE 3: Calculate Active Synergies from Board
// ============================================

export function calculateBoardSynergies(board: (Unit | null)[][]) {
  // Flatten board and get all synergies
  const units = board.flat().filter((u): u is Unit => u !== null);
  const allSynergies = units.flatMap((u) => u.synergies);

  // Calculate which synergies are active
  const activeSynergies = calculateActiveSynergies(allSynergies);

  // Get only active ones
  const activeOnly = activeSynergies.filter((s) => s.active);

  return {
    all: activeSynergies,
    active: activeOnly,
    count: activeOnly.length,
  };
}

// Example usage:
// const board = [[samurai1, samurai2], [null, null]];
// const synergies = calculateBoardSynergies(board);
// console.log(synergies.active); // [{ name: 'Samurai', active: true, ... }]

// ============================================
// EXAMPLE 4: Apply All Bonuses to Unit
// ============================================

export function calculateUnitStatsWithBonuses(
  unit: Unit,
  activeSynergies: ReturnType<typeof calculateActiveSynergies>
) {
  const bonuses = GameData.synergies.getActiveBonuses(activeSynergies);
  const { attack, health, bonusStats } = applySynergyBonuses(
    unit.attack,
    unit.health,
    unit.synergies,
    bonuses
  );

  return {
    baseAttack: unit.attack,
    baseHealth: unit.health,
    finalAttack: attack,
    finalHealth: health,
    bonusStats,
  };
}

// Example usage:
// const stats = calculateUnitStatsWithBonuses(samuraiUnit, activeSynergies);
// console.log(stats.finalAttack); // Base + bonuses

// ============================================
// EXAMPLE 5: Upgrade Units (Combine 3 into 2-star)
// ============================================

export function attemptUnitUpgrade(bench: Unit[]): {
  success: boolean;
  upgradedUnit?: Unit;
  remainingBench: Unit[];
} {
  // Group units by name and stars
  const unitGroups = new Map<string, Unit[]>();

  bench.forEach((unit) => {
    const key = `${unit.name}_${unit.stars}`;
    if (!unitGroups.has(key)) {
      unitGroups.set(key, []);
    }
    unitGroups.get(key)!.push(unit);
  });

  // Find first group with 3+ units
  for (const [_, units] of unitGroups) {
    if (units.length >= 3 && units[0].stars < 3) {
      const [unit1, unit2, unit3, ...rest] = units;
      const upgradedUnit = combineUnits([unit1, unit2, unit3]);

      // Remove used units from bench
      const remainingBench = bench.filter(
        (u) => u.id !== unit1.id && u.id !== unit2.id && u.id !== unit3.id
      );

      return {
        success: true,
        upgradedUnit,
        remainingBench: [...remainingBench, upgradedUnit],
      };
    }
  }

  return {
    success: false,
    remainingBench: bench,
  };
}

// Example usage:
// const { success, upgradedUnit } = attemptUnitUpgrade(bench);
// if (success) console.log(`Upgraded to ${upgradedUnit.stars} star!`);

// ============================================
// EXAMPLE 6: Get Item for PvE Round
// ============================================

export function handlePvERound(round: number): {
  gold: number;
  items: any[];
  isChoice: boolean;
} {
  const drops = getItemDropForRound(round);

  if (!drops) {
    return { gold: 0, items: [], isChoice: false };
  }

  const pveRewards = GameData.constants.economy;
  const gold = round === 1 ? 3 : round === 3 ? 4 : round === 9 ? 7 : round === 15 ? 10 : 0;

  // Round 9 gives choice between 2 items
  if (round === 9 && Array.isArray(drops)) {
    return {
      gold,
      items: drops,
      isChoice: true,
    };
  }

  return {
    gold,
    items: Array.isArray(drops) ? drops : [drops],
    isChoice: false,
  };
}

// Example usage:
// const reward = handlePvERound(9);
// if (reward.isChoice) console.log('Choose 1 of 2 items!');

// ============================================
// EXAMPLE 7: Calculate Combat Damage
// ============================================

export function calculateCombatOutcome(
  round: number,
  winnerBoard: Unit[],
  loserHealth: number
): {
  damage: number;
  newHealth: number;
  isEliminated: boolean;
} {
  const survivingUnits = winnerBoard.filter((u) => u.currentHealth! > 0).length;
  const damage = calculateRoundDamage(round, survivingUnits);
  const newHealth = Math.max(0, loserHealth - damage);

  return {
    damage,
    newHealth,
    isEliminated: newHealth <= 0,
  };
}

// Example usage:
// const outcome = calculateCombatOutcome(10, enemyBoard, playerHealth);
// console.log(`Player takes ${outcome.damage} damage`);

// ============================================
// EXAMPLE 8: Check Level Up Progress
// ============================================

export function checkLevelUp(currentXP: number, currentLevel: number): {
  canLevelUp: boolean;
  xpNeeded: number;
  newLevel?: number;
  newBoardSize?: number;
} {
  const xpForNext = getXPForLevel(currentLevel);

  if (currentXP >= xpForNext && currentLevel < GameData.constants.leveling.MAX_LEVEL) {
    const newLevel = currentLevel + 1;
    return {
      canLevelUp: true,
      xpNeeded: 0,
      newLevel,
      newBoardSize: GameData.helpers.getBoardSlotsForLevel(newLevel),
    };
  }

  return {
    canLevelUp: false,
    xpNeeded: xpForNext - currentXP,
  };
}

// Example usage:
// const { canLevelUp, newLevel } = checkLevelUp(20, 4);
// if (canLevelUp) console.log(`Level up to ${newLevel}!`);

// ============================================
// EXAMPLE 9: Get Synergy Suggestions
// ============================================

export function getSynergySuggestions(board: (Unit | null)[][]) {
  const { all: synergies } = calculateBoardSynergies(board);

  // Find synergies that are close to activation (need 1 more)
  const suggestions = synergies
    .filter((s) => !s.active && s.currentCount > 0)
    .map((s) => ({
      synergy: s.name,
      current: s.currentCount,
      needed: s.requiredCount - s.currentCount,
      effect: s.effect,
    }))
    .sort((a, b) => a.needed - b.needed);

  return suggestions;
}

// Example usage:
// const suggestions = getSynergySuggestions(board);
// console.log('Need 1 more Warrior for synergy!');

// ============================================
// EXAMPLE 10: Full Game State Example
// ============================================

export function createInitialGameState() {
  return {
    round: 1,
    phase: 'PLANNING' as const,
    player: {
      id: 'player_1',
      address: '0x123...',
      health: GameData.constants.economy.STARTING_HEALTH,
      gold: GameData.constants.economy.STARTING_GOLD,
      level: 1,
      xp: 0,
      winStreak: 0,
      loseStreak: 0,
    },
    shop: generateShop(1),
    board: {
      top: [null, null, null, null],
      bottom: [null, null, null, null],
    },
    bench: [],
    items: [],
  };
}

// ============================================
// EXAMPLE 11: Data Validation
// ============================================

export function validateGameData() {
  const validation = {
    units: {
      total: GameData.units.all.length,
      expected: 30,
      valid: GameData.units.all.length === 30,
    },
    items: {
      total: GameData.items.all.length,
      expected: 15,
      valid: GameData.items.all.length === 15,
    },
    synergies: {
      total: GameData.synergies.all.length,
      expected: 12,
      valid: GameData.synergies.all.length === 12,
    },
    tierDistribution: {
      tier1: GameData.units.byTier[1].length,
      tier2: GameData.units.byTier[2].length,
      tier3: GameData.units.byTier[3].length,
      tier4: GameData.units.byTier[4].length,
      tier5: GameData.units.byTier[5].length,
      valid:
        GameData.units.byTier[1].length === 10 &&
        GameData.units.byTier[2].length === 8 &&
        GameData.units.byTier[3].length === 6 &&
        GameData.units.byTier[4].length === 4 &&
        GameData.units.byTier[5].length === 2,
    },
  };

  return validation;
}

// Run validation
if (require.main === module) {
  const validation = validateGameData();
  console.log('Game Data Validation:', JSON.stringify(validation, null, 2));
}

// ============================================
// EXAMPLE 12: Shop Pool Management
// ============================================

export class ShopPool {
  private pools: Map<number, Map<string, number>> = new Map();

  constructor() {
    // Initialize pools for all tiers
    for (let tier = 1; tier <= 5; tier++) {
      this.pools.set(tier, this.createPoolForTier(tier as 1 | 2 | 3 | 4 | 5));
    }
  }

  private createPoolForTier(tier: 1 | 2 | 3 | 4 | 5): Map<string, number> {
    const pool = new Map<string, number>();
    const units = GameData.units.getByTier(tier);
    const poolSize =
      tier === 1 ? 45 : tier === 2 ? 30 : tier === 3 ? 20 : tier === 4 ? 15 : 10;

    units.forEach((unit) => {
      pool.set(unit.name, poolSize);
    });

    return pool;
  }

  drawUnit(tier: number, unitName: string): boolean {
    const pool = this.pools.get(tier);
    if (!pool) return false;

    const count = pool.get(unitName) || 0;
    if (count > 0) {
      pool.set(unitName, count - 1);
      return true;
    }

    return false;
  }

  returnUnit(tier: number, unitName: string): void {
    const pool = this.pools.get(tier);
    if (pool) {
      const count = pool.get(unitName) || 0;
      pool.set(unitName, count + 1);
    }
  }

  getAvailableCount(tier: number, unitName: string): number {
    const pool = this.pools.get(tier);
    return pool?.get(unitName) || 0;
  }
}

// Export all examples
export const Examples = {
  generateShop,
  calculatePlayerIncome,
  calculateBoardSynergies,
  calculateUnitStatsWithBonuses,
  attemptUnitUpgrade,
  handlePvERound,
  calculateCombatOutcome,
  checkLevelUp,
  getSynergySuggestions,
  createInitialGameState,
  validateGameData,
  ShopPool,
};

export default Examples;
