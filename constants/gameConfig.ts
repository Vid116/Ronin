// Shared game configuration constants
// Used by both client and server to ensure consistency

export const PHASE_DURATIONS = {
  PLANNING: 30000,    // 30 seconds
  COMBAT: 15000,      // 15 seconds
  TRANSITION: 5000,   // 5 seconds
} as const;

export const PHASE_DURATIONS_SECONDS = {
  PLANNING: 30,
  COMBAT: 15,
  TRANSITION: 5,
} as const;

export const GAME_CONFIG = {
  MAX_BOARD_SIZE: 8,
  MAX_BENCH_SIZE: 8,
  STARTING_HEALTH: 20,
  STARTING_GOLD: 3,
  SHOP_SIZE: 5,
  REROLL_COST: 2,
  XP_BUY_COST: 4,
  BASE_INCOME: 5,
  MAX_INTEREST: 5,
} as const;
