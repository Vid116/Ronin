/**
 * Central export file for all game data
 * Provides easy access to units, abilities, items, synergies, and constants
 */

// Export all constants
export * from './constants';

// Export all units
export * from './units';

// Export all items
export * from './items';

// Note: Not re-exporting abilities and synergies here due to naming conflicts
// Import them directly from './abilities' or './synergies' if needed

// Re-export commonly used collections for convenience
import {
  ALL_UNITS,
  TIER_1_UNITS,
  TIER_2_UNITS,
  TIER_3_UNITS,
  TIER_4_UNITS,
  TIER_5_UNITS,
  createUnitInstance,
  getUnitByName,
  getUnitsByTier,
  getUnitsBySynergy,
} from './units';

import {
  ALL_ITEMS,
  OFFENSIVE_ITEMS,
  DEFENSIVE_ITEMS,
  UTILITY_ITEMS,
  getItemById,
  getItemsByType,
  getItemDropForRound,
  getRandomItem,
} from './items';

import {
  ALL_SYNERGIES,
  CLASS_SYNERGIES,
  ORIGIN_SYNERGIES,
  SYNERGY_BONUSES,
  calculateActiveSynergies,
  getActiveSynergyBonuses,
  applySynergyBonuses,
} from './synergies';

import {
  ECONOMY,
  LEVELING,
  TIER_PROBABILITIES,
  UNIT_POOL,
  COMBAT,
  BOARD,
  TIMING,
  calculateInterest,
  calculateRoundDamage,
  getXPForLevel,
  getBoardSlotsForLevel,
  getUpgradedStats,
} from './constants';

export const GameData = {
  // Units
  units: {
    all: ALL_UNITS,
    byTier: {
      1: TIER_1_UNITS,
      2: TIER_2_UNITS,
      3: TIER_3_UNITS,
      4: TIER_4_UNITS,
      5: TIER_5_UNITS,
    },
    getByName: getUnitByName,
    getByTier: getUnitsByTier,
    getBySynergy: getUnitsBySynergy,
    createInstance: createUnitInstance,
  },

  // Items
  items: {
    all: ALL_ITEMS,
    byType: {
      offensive: OFFENSIVE_ITEMS,
      defensive: DEFENSIVE_ITEMS,
      utility: UTILITY_ITEMS,
    },
    getById: getItemById,
    getByType: getItemsByType,
    getDropForRound: getItemDropForRound,
    getRandom: getRandomItem,
  },

  // Synergies
  synergies: {
    all: ALL_SYNERGIES,
    byType: {
      class: CLASS_SYNERGIES,
      origin: ORIGIN_SYNERGIES,
    },
    bonuses: SYNERGY_BONUSES,
    calculateActive: calculateActiveSynergies,
    getActiveBonuses: getActiveSynergyBonuses,
    applyBonuses: applySynergyBonuses,
  },

  // Constants
  constants: {
    economy: ECONOMY,
    leveling: LEVELING,
    tierProbabilities: TIER_PROBABILITIES,
    unitPool: UNIT_POOL,
    combat: COMBAT,
    board: BOARD,
    timing: TIMING,
  },

  // Helper functions
  helpers: {
    calculateInterest,
    calculateRoundDamage,
    getXPForLevel,
    getBoardSlotsForLevel,
    getUpgradedStats,
  },
} as const;

// Export default GameData object
export default GameData;
