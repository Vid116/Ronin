// Damage Calculation System
import type { CombatUnit, CombatState } from './types';
import { seededPercentageCheck } from './rng';

/**
 * Calculate base damage from attacker to defender
 * Formula: max(1, attack - defense/2)
 * Now includes dodge and crit with seeded RNG
 */
export function calculateDamage(
  attacker: CombatUnit,
  defender: CombatUnit,
  state: CombatState
): number {
  // Check for dodge first
  if (defender.dodgeChance && defender.dodgeChance > 0) {
    const dodged = seededPercentageCheck(state.randomSeed, state.randomIndex++, defender.dodgeChance);
    if (dodged) {
      return 0; // MISS!
    }
  }

  const attack = attacker.buffedAttack;
  const defense = Math.floor(defender.buffedHealth / 10); // Defense = 10% of max health

  // Base damage: attack minus half of defense
  let baseDamage = Math.max(1, attack - Math.floor(defense / 2));

  // Check for critical hit
  if (attacker.critChance && attacker.critChance > 0) {
    const crit = seededPercentageCheck(state.randomSeed, state.randomIndex++, attacker.critChance);
    if (crit) {
      baseDamage *= 2; // CRIT! Double damage
    }
  }

  return baseDamage;
}

/**
 * Calculate ability damage (typically scales with attack)
 */
export function calculateAbilityDamage(
  caster: CombatUnit,
  baseDamage: number,
  scalingFactor: number = 1.0
): number {
  return Math.floor(baseDamage + (caster.buffedAttack * scalingFactor));
}

/**
 * Apply damage to a unit
 * Returns actual damage dealt (considering shields, etc.)
 */
export function applyDamage(unit: CombatUnit, damage: number): number {
  // Shield absorbs one hit completely
  if (unit.hasShield) {
    unit.hasShield = false;
    return 0;
  }

  const actualDamage = Math.min(damage, unit.currentHealth);
  unit.currentHealth -= actualDamage;
  unit.damageTaken = (unit.damageTaken || 0) + actualDamage;

  // Mark as dead if health reaches 0
  if (unit.currentHealth <= 0) {
    unit.currentHealth = 0;
    unit.isDead = true;
  }

  return actualDamage;
}

/**
 * Apply healing to a unit
 * Returns actual healing done (can't overheal)
 */
export function applyHealing(unit: CombatUnit, healing: number): number {
  const maxHealth = unit.buffedHealth;
  const actualHealing = Math.min(healing, maxHealth - unit.currentHealth);
  unit.currentHealth += actualHealing;
  return actualHealing;
}

/**
 * Apply attack buff to a unit
 */
export function applyAttackBuff(unit: CombatUnit, amount: number): void {
  unit.buffedAttack += amount;
}

/**
 * Apply health buff to a unit
 */
export function applyHealthBuff(unit: CombatUnit, amount: number): void {
  unit.buffedHealth += amount;
  unit.currentHealth += amount; // Also increase current health
}

/**
 * Calculate end-of-match damage to player
 * Based on surviving enemy units and round number
 */
export function calculatePlayerDamage(
  survivingUnits: CombatUnit[],
  round: number
): number {
  if (survivingUnits.length === 0) {
    return 0;
  }

  // Base damage = number of surviving units + sum of their tiers
  const baseDamage = survivingUnits.reduce((total, unit) => {
    return total + 1 + unit.tier;
  }, 0);

  // Scale with round (early rounds deal less damage)
  const roundMultiplier = Math.min(1.0, 0.5 + (round * 0.1));

  return Math.ceil(baseDamage * roundMultiplier);
}

/**
 * Check if a unit is still alive
 */
export function isAlive(unit: CombatUnit): boolean {
  return !unit.isDead && unit.currentHealth > 0;
}

/**
 * Get remaining health percentage
 */
export function getHealthPercentage(unit: CombatUnit): number {
  return (unit.currentHealth / unit.buffedHealth) * 100;
}
