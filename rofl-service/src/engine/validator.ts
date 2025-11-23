/**
 * Combat Input Validator
 *
 * Validates combat input before running simulation to prevent:
 * - Crashes from invalid data
 * - Infinite loops from edge cases
 * - Undefined behavior from corrupted units
 */

import type { CombatInput, CombatUnit, CombatBoard } from './types';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate complete combat input
 */
export function validateCombatInput(input: CombatInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate basic fields
  if (!input) {
    errors.push({
      field: 'input',
      message: 'Combat input is null or undefined',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  // Validate round
  if (typeof input.round !== 'number' || input.round < 1) {
    errors.push({
      field: 'round',
      message: `Invalid round number: ${input.round}. Must be >= 1`,
      severity: 'error',
    });
  }

  if (input.round > 50) {
    warnings.push({
      field: 'round',
      message: `Round ${input.round} is unusually high (> 50)`,
      severity: 'warning',
    });
  }

  // Validate seed
  if (typeof input.seed !== 'number') {
    errors.push({
      field: 'seed',
      message: `Invalid seed: ${input.seed}. Must be a number`,
      severity: 'error',
    });
  }

  // Validate metadata
  if (!input.player1Address || typeof input.player1Address !== 'string') {
    errors.push({
      field: 'player1Address',
      message: 'Player 1 address is missing or invalid',
      severity: 'error',
    });
  }

  if (!input.player2Address || typeof input.player2Address !== 'string') {
    errors.push({
      field: 'player2Address',
      message: 'Player 2 address is missing or invalid',
      severity: 'error',
    });
  }

  if (!input.matchId || typeof input.matchId !== 'string') {
    errors.push({
      field: 'matchId',
      message: 'Match ID is missing or invalid',
      severity: 'error',
    });
  }

  if (typeof input.timestamp !== 'number' || input.timestamp < 0) {
    errors.push({
      field: 'timestamp',
      message: 'Timestamp is missing or invalid',
      severity: 'error',
    });
  }

  // Validate boards
  const board1Validation = validateBoard(input.board1, 'board1');
  errors.push(...board1Validation.errors);
  warnings.push(...board1Validation.warnings);

  const board2Validation = validateBoard(input.board2, 'board2');
  errors.push(...board2Validation.errors);
  warnings.push(...board2Validation.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single board
 */
export function validateBoard(board: CombatBoard, boardName: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!board) {
    errors.push({
      field: boardName,
      message: 'Board is null or undefined',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  if (!board.units || !Array.isArray(board.units)) {
    errors.push({
      field: `${boardName}.units`,
      message: 'Board units is not an array',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  if (board.units.length !== 8) {
    errors.push({
      field: `${boardName}.units`,
      message: `Board must have exactly 8 positions, got ${board.units.length}`,
      severity: 'error',
    });
  }

  // Validate each unit
  const nonNullUnits = board.units.filter((u): u is CombatUnit => u !== null);

  if (nonNullUnits.length === 0) {
    warnings.push({
      field: `${boardName}.units`,
      message: 'Board has no units (empty board)',
      severity: 'warning',
    });
  }

  nonNullUnits.forEach((unit, index) => {
    const unitValidation = validateUnit(unit, `${boardName}.units[${index}]`);
    errors.push(...unitValidation.errors);
    warnings.push(...unitValidation.warnings);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single unit
 */
export function validateUnit(unit: CombatUnit, unitPath: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!unit) {
    errors.push({
      field: unitPath,
      message: 'Unit is null or undefined',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  // Validate required fields
  if (!unit.id || typeof unit.id !== 'string') {
    errors.push({
      field: `${unitPath}.id`,
      message: 'Unit ID is missing or invalid',
      severity: 'error',
    });
  }

  if (!unit.name || typeof unit.name !== 'string') {
    errors.push({
      field: `${unitPath}.name`,
      message: 'Unit name is missing or invalid',
      severity: 'error',
    });
  }

  // Validate tier
  if (![1, 2, 3, 4, 5, 6].includes(unit.tier)) {
    errors.push({
      field: `${unitPath}.tier`,
      message: `Invalid tier: ${unit.tier}. Must be 1-6`,
      severity: 'error',
    });
  }

  // Validate stars
  if (![1, 2, 3].includes(unit.stars)) {
    errors.push({
      field: `${unitPath}.stars`,
      message: `Invalid stars: ${unit.stars}. Must be 1-3`,
      severity: 'error',
    });
  }

  // Validate attack
  if (typeof unit.attack !== 'number') {
    errors.push({
      field: `${unitPath}.attack`,
      message: 'Attack must be a number',
      severity: 'error',
    });
  } else if (unit.attack < 0) {
    errors.push({
      field: `${unitPath}.attack`,
      message: `Attack cannot be negative: ${unit.attack}`,
      severity: 'error',
    });
  } else if (unit.attack === 0) {
    warnings.push({
      field: `${unitPath}.attack`,
      message: 'Unit has 0 attack (will deal minimum 1 damage)',
      severity: 'warning',
    });
  } else if (unit.attack > 1000) {
    warnings.push({
      field: `${unitPath}.attack`,
      message: `Unit has very high attack: ${unit.attack}`,
      severity: 'warning',
    });
  }

  // Validate health
  if (typeof unit.health !== 'number') {
    errors.push({
      field: `${unitPath}.health`,
      message: 'Health must be a number',
      severity: 'error',
    });
  } else if (unit.health < 1) {
    errors.push({
      field: `${unitPath}.health`,
      message: `Health must be at least 1: ${unit.health}`,
      severity: 'error',
    });
  } else if (unit.health > 10000) {
    warnings.push({
      field: `${unitPath}.health`,
      message: `Unit has very high health: ${unit.health}`,
      severity: 'warning',
    });
  }

  // Validate ability
  if (!unit.ability) {
    errors.push({
      field: `${unitPath}.ability`,
      message: 'Unit ability is missing',
      severity: 'error',
    });
  } else {
    if (!unit.ability.name || typeof unit.ability.name !== 'string') {
      errors.push({
        field: `${unitPath}.ability.name`,
        message: 'Ability name is missing or invalid',
        severity: 'error',
      });
    }

    if (!unit.ability.trigger || typeof unit.ability.trigger !== 'string') {
      errors.push({
        field: `${unitPath}.ability.trigger`,
        message: 'Ability trigger is missing or invalid',
        severity: 'error',
      });
    } else if (!['start_of_combat', 'on_attack', 'on_death', 'passive'].includes(unit.ability.trigger)) {
      errors.push({
        field: `${unitPath}.ability.trigger`,
        message: `Invalid ability trigger: ${unit.ability.trigger}`,
        severity: 'error',
      });
    }

    if (!unit.ability.effect || typeof unit.ability.effect !== 'string') {
      errors.push({
        field: `${unitPath}.ability.effect`,
        message: 'Ability effect is missing or invalid',
        severity: 'error',
      });
    }
  }

  // Validate optional stats
  if (unit.dodgeChance !== undefined) {
    if (typeof unit.dodgeChance !== 'number') {
      errors.push({
        field: `${unitPath}.dodgeChance`,
        message: 'Dodge chance must be a number',
        severity: 'error',
      });
    } else if (unit.dodgeChance < 0 || unit.dodgeChance > 100) {
      errors.push({
        field: `${unitPath}.dodgeChance`,
        message: `Dodge chance must be 0-100: ${unit.dodgeChance}`,
        severity: 'error',
      });
    }
  }

  if (unit.critChance !== undefined) {
    if (typeof unit.critChance !== 'number') {
      errors.push({
        field: `${unitPath}.critChance`,
        message: 'Crit chance must be a number',
        severity: 'error',
      });
    } else if (unit.critChance < 0 || unit.critChance > 100) {
      errors.push({
        field: `${unitPath}.critChance`,
        message: `Crit chance must be 0-100: ${unit.critChance}`,
        severity: 'error',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize combat input (fix minor issues)
 */
export function sanitizeCombatInput(input: CombatInput): CombatInput {
  const sanitized: CombatInput = { ...input };

  // Clamp round
  sanitized.round = Math.max(1, Math.floor(input.round));

  // Ensure timestamp is positive
  sanitized.timestamp = Math.max(0, input.timestamp);

  // Sanitize boards
  sanitized.board1 = sanitizeBoard(input.board1);
  sanitized.board2 = sanitizeBoard(input.board2);

  return sanitized;
}

/**
 * Sanitize a board
 */
export function sanitizeBoard(board: CombatBoard): CombatBoard {
  if (!board || !board.units) {
    return { units: Array(8).fill(null) };
  }

  // Ensure exactly 8 positions
  const units = [...board.units];
  while (units.length < 8) {
    units.push(null);
  }
  if (units.length > 8) {
    units.length = 8;
  }

  // Sanitize each unit
  const sanitizedUnits = units.map(unit => unit ? sanitizeUnit(unit) : null);

  return { units: sanitizedUnits };
}

/**
 * Sanitize a unit
 */
export function sanitizeUnit(unit: CombatUnit): CombatUnit {
  return {
    ...unit,
    // Clamp attack to valid range
    attack: Math.max(0, Math.floor(unit.attack)),
    // Clamp health to valid range
    health: Math.max(1, Math.floor(unit.health)),
    // Clamp tier
    tier: Math.max(1, Math.min(6, unit.tier)) as 1 | 2 | 3 | 4 | 5 | 6,
    // Clamp stars
    stars: Math.max(1, Math.min(3, unit.stars)) as 1 | 2 | 3,
    // Clamp optional stats
    dodgeChance: unit.dodgeChance !== undefined
      ? Math.max(0, Math.min(100, unit.dodgeChance))
      : undefined,
    critChance: unit.critChance !== undefined
      ? Math.max(0, Math.min(100, unit.critChance))
      : undefined,
  };
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✓ Validation passed');
  } else {
    lines.push('✗ Validation failed');
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach(err => {
      lines.push(`  - ${err.field}: ${err.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach(warn => {
      lines.push(`  - ${warn.field}: ${warn.message}`);
    });
  }

  return lines.join('\n');
}
