// Deterministic Seeded RNG for Combat
// Uses Linear Congruential Generator (LCG) for reproducible randomness

/**
 * Parameters for seed generation
 */
export interface SeedParams {
  blockHash: string;
  timestamp: number;
  player1Address: string;
  player2Address: string;
  roundNumber: number;
}

/**
 * Generate a deterministic seed from combat parameters
 * This seed will be visible to players before combat starts
 */
export function generateCombatSeed(params: SeedParams): number {
  const combined = `${params.blockHash}-${params.timestamp}-${params.player1Address}-${params.player2Address}-${params.roundNumber}`;
  return hashString(combined);
}

/**
 * Simple string hash function
 * Converts a string to a number deterministically
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Linear Congruential Generator (LCG)
 * Returns a number between 0 and 1
 *
 * @param seed - The base seed
 * @param index - The iteration index (increments for each random call)
 * @returns A pseudo-random number between 0 and 1
 */
export function seededRandom(seed: number, index: number): number {
  // LCG parameters (same as used in java.util.Random)
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);

  const value = (a * (seed + index) + c) % m;
  return value / m;
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function seededRandomInt(seed: number, index: number, min: number, max: number): number {
  const random = seededRandom(seed, index);
  return Math.floor(random * (max - min + 1)) + min;
}

/**
 * Roll a percentage check (0-100)
 * Returns true if the roll succeeds
 *
 * @param seed - The base seed
 * @param index - The iteration index
 * @param chance - Chance percentage (0-100)
 * @returns true if the roll succeeds
 */
export function seededPercentageCheck(seed: number, index: number, chance: number): boolean {
  const roll = seededRandom(seed, index) * 100;
  return roll < chance;
}

/**
 * Select a random index from an array
 */
export function seededSelectIndex(seed: number, index: number, arrayLength: number): number {
  const random = seededRandom(seed, index);
  return Math.floor(random * arrayLength);
}

/**
 * Shuffle an array deterministically
 * Fisher-Yates shuffle with seeded random
 */
export function seededShuffle<T>(seed: number, array: T[]): T[] {
  const result = [...array];
  let rngIndex = 0;

  for (let i = result.length - 1; i > 0; i--) {
    const j = seededRandomInt(seed, rngIndex++, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * RNG State for tracking multiple random calls
 */
export class SeededRNG {
  private seed: number;
  private index: number;

  constructor(seed: number) {
    this.seed = seed;
    this.index = 0;
  }

  /**
   * Get next random number (0-1)
   */
  next(): number {
    const value = seededRandom(this.seed, this.index);
    this.index++;
    return value;
  }

  /**
   * Get next random integer
   */
  nextInt(min: number, max: number): number {
    const value = seededRandomInt(this.seed, this.index, min, max);
    this.index++;
    return value;
  }

  /**
   * Percentage check (0-100)
   */
  check(chance: number): boolean {
    const value = seededPercentageCheck(this.seed, this.index, chance);
    this.index++;
    return value;
  }

  /**
   * Select random index
   */
  selectIndex(arrayLength: number): number {
    const value = seededSelectIndex(this.seed, this.index, arrayLength);
    this.index++;
    return value;
  }

  /**
   * Reset the RNG to initial state
   */
  reset(): void {
    this.index = 0;
  }

  /**
   * Get current seed and index (for debugging)
   */
  getState(): { seed: number; index: number } {
    return { seed: this.seed, index: this.index };
  }
}
