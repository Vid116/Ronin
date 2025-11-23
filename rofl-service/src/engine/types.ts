/**
 * ROFL Combat Module - Pure Types
 *
 * This module is completely standalone and has NO external dependencies.
 * It can run in Oasis ROFL (Trusted Execution Environment) independently.
 */

/**
 * Minimal Unit definition for combat
 * Only includes what's needed for battle simulation
 */
export interface CombatUnit {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  attack: number;
  health: number;
  stars: 1 | 2 | 3;

  // Ability (simplified)
  ability: {
    name: string;
    trigger: 'start_of_combat' | 'on_attack' | 'on_death' | 'passive';
    effect: string; // Simple string description
  };

  // Optional stats
  dodgeChance?: number; // 0-100
  critChance?: number;  // 0-100
}

/**
 * Board representation (8 positions: 0-7)
 */
export interface CombatBoard {
  units: (CombatUnit | null)[]; // Array of 8 positions
}

/**
 * Combat input - everything needed to run a battle
 */
export interface CombatInput {
  board1: CombatBoard;
  board2: CombatBoard;
  round: number;
  seed: number; // Deterministic seed

  // Metadata for verification
  player1Address: string;
  player2Address: string;
  matchId: string;
  timestamp: number;
}

/**
 * Combat event for replay/verification
 */
export interface CombatEvent {
  step: number; // Sequential step number
  position: number; // Position 0-7
  type: 'ATTACK' | 'ABILITY' | 'DEATH' | 'DAMAGE' | 'HEAL' | 'BUFF';
  sourceUnit: string; // Unit ID
  targetUnit?: string; // Unit ID
  value?: number; // Damage/healing amount
  description: string;
}

/**
 * Combat output - complete battle result
 */
export interface CombatOutput {
  // Result
  winner: 'player1' | 'player2' | 'draw';
  damageToLoser: number;

  // Final state
  finalBoard1: CombatBoard;
  finalBoard2: CombatBoard;

  // Verification data
  seed: number;
  rngCallCount: number;
  totalSteps: number;
  events: CombatEvent[];

  // Hash for quick verification
  resultHash: string;

  // Metadata
  executionTimeMs: number;
}

/**
 * ROFL-specific wrapper
 */
export interface ROFLCombatRequest {
  input: CombatInput;

  // Optional: request verification proof
  generateProof?: boolean;
}

export interface ROFLCombatResponse {
  output: CombatOutput;

  // ROFL attestation (if requested)
  attestation?: {
    signature: string;
    timestamp: number;
    enclaveId: string;
  };
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  message?: string;
}
