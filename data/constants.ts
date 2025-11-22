/**
 * Game Constants for Ronin Rumble
 * Contains all numerical values and game configuration
 */

// Economy Constants
export const ECONOMY = {
  STARTING_GOLD: 3,
  STARTING_HEALTH: 20,
  BASE_GOLD_PER_ROUND: 5,
  WIN_BONUS: 2,
  MAX_INTEREST: 3,
  INTEREST_RATE: 10, // 1 gold per 10 saved
  WIN_STREAK_BONUS: 2,
  WIN_STREAK_THRESHOLD: 2,
  LOSS_STREAK_BONUS: 2,
  LOSS_STREAK_THRESHOLD: 2,
  REROLL_COST: 2,
  XP_BUY_COST: 4,
  XP_BUY_AMOUNT: 4,
} as const;

// Leveling System
export const LEVELING = {
  AUTO_XP_PER_ROUND: 2,
  MAX_LEVEL: 9,
  XP_THRESHOLDS: [0, 2, 6, 10, 20, 36, 56, 80, 100] as const,
  BOARD_SLOTS: [0, 2, 3, 4, 5, 6, 7, 8, 8] as const, // Index = level
} as const;

// Tier Probabilities by Player Level
export const TIER_PROBABILITIES: Record<number, [number, number, number, number, number]> = {
  1: [100, 0, 0, 0, 0],
  2: [100, 0, 0, 0, 0],
  3: [70, 30, 0, 0, 0],
  4: [70, 30, 0, 0, 0],
  5: [40, 40, 20, 0, 0],
  6: [40, 40, 20, 0, 0],
  7: [20, 30, 35, 15, 0],
  8: [20, 30, 35, 15, 0],
  9: [10, 20, 30, 30, 10],
};

// Unit Pool Sizes
export const UNIT_POOL = {
  TIER_1: 45, // 45 copies of each Tier 1 unit
  TIER_2: 30, // 30 copies of each Tier 2 unit
  TIER_3: 20, // 20 copies of each Tier 3 unit
  TIER_4: 15, // 15 copies of each Tier 4 unit
  TIER_5: 10, // 10 copies of each Tier 5 unit
} as const;

// Star Upgrade Multipliers
export const STAR_MULTIPLIERS = {
  1: 1.0,
  2: 1.8,
  3: 3.2,
} as const;

// Copies needed for upgrades
export const UPGRADE_COPIES = {
  TO_2_STAR: 3,
  TO_3_STAR: 9, // Total (3 for 2-star * 3)
} as const;

// Combat Constants
export const COMBAT = {
  MAX_TURNS: 30, // Combat auto-ends after 30 turns
  TURN_DURATION_MS: 500, // 500ms per turn
  ANIMATION_SPEED: 1.0,
} as const;

// Damage Scaling by Round
export const DAMAGE_SCALING = [
  { minRound: 1, maxRound: 4, baseDamage: 2 },
  { minRound: 5, maxRound: 9, baseDamage: 3 },
  { minRound: 10, maxRound: 14, baseDamage: 5 },
  { minRound: 15, maxRound: 20, baseDamage: 7 },
  { minRound: 21, maxRound: 999, baseDamage: 10 }, // Sudden death
] as const;

// Round Structure
export const ROUND_STRUCTURE = {
  PVE_ROUNDS: [1, 2, 3, 9, 15],
  BOSS_ROUNDS: [9, 15],
  MAX_ROUNDS: 30,
} as const;

// PvE Rewards
export const PVE_REWARDS: Record<number, { gold: number; itemType?: string }> = {
  1: { gold: 3, itemType: 'offensive' },
  2: { gold: 3 },
  3: { gold: 4, itemType: 'defensive' },
  9: { gold: 7, itemType: 'choice' }, // Player chooses 1 of 2 items
  15: { gold: 10, itemType: 'rare' },
};

// Board Layout
export const BOARD = {
  TOTAL_SLOTS: 8,
  TOP_ROW_SLOTS: 4,
  BOTTOM_ROW_SLOTS: 4,
  MAX_BENCH_SIZE: 8,
  SHOP_SIZE: 5,
} as const;

// Synergy Thresholds
export const SYNERGY_THRESHOLDS = {
  WARRIOR: 2,
  MYSTIC: 2,
  BEAST: 2,
  CONSTRUCT: 2,
  SHADOW: 2,
  NATURE: 2,
  SAMURAI: 2,
  PIXELS: 2,
  AXIE: 2,
  TANK: 2,
  ASSASSIN: 2,
  MAGE: 2,
  RANGER: 2,
  SUPPORT: 2,
} as const;

// Matchmaking
export const MATCHMAKING = {
  MIN_PLAYERS: 6,
  MAX_PLAYERS: 6,
  QUEUE_TIMEOUT_MS: 120000, // 2 minutes
  CANNOT_FACE_SAME_OPPONENT_WITHIN: 3, // rounds
} as const;

// Timing
export const TIMING = {
  PLANNING_PHASE_MS: 20000, // 20 seconds
  COMBAT_PHASE_MAX_MS: 15000, // 15 seconds max
  TRANSITION_PHASE_MS: 2000, // 2 seconds
  ROUND_TOTAL_MS: 37000, // Total round time ~37s
} as const;

// Entry Fees (in RON)
export const ENTRY_FEES = {
  FREE: 0,
  LOW: 0.001,
  MEDIUM: 0.005,
  HIGH: 0.01,
} as const;

// Prize Distribution (percentages)
export const PRIZE_DISTRIBUTION = {
  FREE: [0, 0, 0, 0, 0, 0],
  LOW: [66.67, 16.67, 0, 0, 0, 0], // 1st: 8 RON, 2nd: 2 RON, platform: 2 RON
  MEDIUM: [66.67, 16.67, 8.33, 0, 0, 0], // 1st: 40, 2nd: 10, 3rd: 5, platform: 5
  HIGH: [60, 25, 8.33, 0, 0, 0], // 1st: 180, 2nd: 75, 3rd: 25, platform: 20
} as const;

// Combat Mechanics
export const CRIT_CHANCE = 0.2; // 20% base crit
export const CRIT_MULTIPLIER = 2.0; // 2x damage
export const DODGE_CHANCE = 0; // 0% base dodge
export const LIFESTEAL = 0; // 0% base lifesteal

// Ability Counters
export const ABILITY_COUNTERS = {
  MAX_STACKS: 10, // Maximum stacks for any stackable ability
  BURN_DURATION: 3, // Turns burn lasts
  STUN_DURATION: 1, // Turns stun lasts
  SHEEP_DURATION: 1, // Turns polymorph lasts
} as const;

// Helper function to calculate interest
export function calculateInterest(gold: number): number {
  return Math.min(
    Math.floor(gold / ECONOMY.INTEREST_RATE),
    ECONOMY.MAX_INTEREST
  );
}

// Helper function to calculate damage
export function calculateRoundDamage(round: number, survivingUnits: number): number {
  const scaling = DAMAGE_SCALING.find(
    (s) => round >= s.minRound && round <= s.maxRound
  );
  return (scaling?.baseDamage || 10) + survivingUnits;
}

// Helper function to get XP needed for next level
export function getXPForLevel(level: number): number {
  return level >= LEVELING.MAX_LEVEL
    ? 999
    : LEVELING.XP_THRESHOLDS[level];
}

// Helper function to get board slots for level
export function getBoardSlotsForLevel(level: number): number {
  return LEVELING.BOARD_SLOTS[Math.min(level, LEVELING.MAX_LEVEL)];
}

// Helper function to calculate unit sell value
export function getSellValue(tier: number, stars: number): number {
  const baseCost = tier;
  const copiesUsed = stars === 1 ? 1 : stars === 2 ? 3 : 9;
  return baseCost * copiesUsed;
}

// Helper function to upgrade unit stats
export function getUpgradedStats(
  baseAttack: number,
  baseHealth: number,
  stars: 1 | 2 | 3
): { attack: number; health: number } {
  const multiplier = STAR_MULTIPLIERS[stars];
  return {
    attack: Math.round(baseAttack * multiplier),
    health: Math.round(baseHealth * multiplier),
  };
}
