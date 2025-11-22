/**
 * Unit Definitions for Ronin Rumble
 * 30 units across 5 tiers with complete stats and abilities
 */

import { Unit } from '@/types/game';
import * as Abilities from './abilities';

// ============================================
// TIER 1 UNITS (1 Gold) - 10 Units
// ============================================

export const PIXEL_FARMER: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Pixel Farmer',
  tier: 1,
  cost: 1,
  attack: 2,
  health: 4,
  stars: 1,
  ability: Abilities.HARVEST,
  synergies: ['Pixels', 'Support'],
};

export const RONIN_SCOUT: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Ronin Scout',
  tier: 1,
  cost: 1,
  attack: 3,
  health: 3,
  stars: 1,
  ability: Abilities.QUICK_STRIKE,
  synergies: ['Samurai', 'Warrior'],
};

export const BABY_AXIE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Baby Axie',
  tier: 1,
  cost: 1,
  attack: 2,
  health: 5,
  stars: 1,
  ability: Abilities.TAUNT,
  synergies: ['Axie', 'Tank'],
};

export const SPIRIT_WISP: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Spirit Wisp',
  tier: 1,
  cost: 1,
  attack: 3,
  health: 2,
  stars: 1,
  ability: Abilities.LAST_BREATH,
  synergies: ['Mystic', 'Support'],
};

export const APPRENTICE_MAGE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Apprentice Mage',
  tier: 1,
  cost: 1,
  attack: 2,
  health: 3,
  stars: 1,
  ability: Abilities.SPARK,
  synergies: ['Mystic', 'Mage'],
};

export const SHIELD_BEARER: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Shield Bearer',
  tier: 1,
  cost: 1,
  attack: 1,
  health: 6,
  stars: 1,
  ability: Abilities.SHIELD_WALL,
  synergies: ['Samurai', 'Tank'],
};

export const PIXEL_ARCHER: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Pixel Archer',
  tier: 1,
  cost: 1,
  attack: 3,
  health: 2,
  stars: 1,
  ability: Abilities.LONG_SHOT,
  synergies: ['Pixels', 'Ranger'],
};

export const WILD_PUP: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Wild Pup',
  tier: 1,
  cost: 1,
  attack: 4,
  health: 2,
  stars: 1,
  ability: Abilities.FRENZY,
  synergies: ['Axie', 'Warrior'],
};

export const MERCHANT: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Merchant',
  tier: 1,
  cost: 1,
  attack: 1,
  health: 4,
  stars: 1,
  ability: Abilities.TRADE_OFFER,
  synergies: ['Pixels', 'Support'],
};

export const SHRINE_MAIDEN: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Shrine Maiden',
  tier: 1,
  cost: 1,
  attack: 2,
  health: 3,
  stars: 1,
  ability: Abilities.BLESSING,
  synergies: ['Mystic', 'Support'],
};

// ============================================
// TIER 2 UNITS (2 Gold) - 8 Units
// ============================================

export const SAMURAI_WARRIOR: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Samurai Warrior',
  tier: 2,
  cost: 2,
  attack: 5,
  health: 6,
  stars: 1,
  ability: Abilities.HONOR_STRIKE,
  synergies: ['Samurai', 'Warrior'],
};

export const EVOLVED_AXIE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Evolved Axie',
  tier: 2,
  cost: 2,
  attack: 4,
  health: 7,
  stars: 1,
  ability: Abilities.ADAPTATION,
  synergies: ['Axie', 'Warrior'],
};

export const PIXEL_KNIGHT: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Pixel Knight',
  tier: 2,
  cost: 2,
  attack: 3,
  health: 8,
  stars: 1,
  ability: Abilities.FORTIFY,
  synergies: ['Pixels', 'Tank'],
};

export const WIND_DANCER: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Wind Dancer',
  tier: 2,
  cost: 2,
  attack: 6,
  health: 4,
  stars: 1,
  ability: Abilities.EVASION,
  synergies: ['Mystic', 'Assassin'],
};

export const THUNDER_MAGE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Thunder Mage',
  tier: 2,
  cost: 2,
  attack: 5,
  health: 5,
  stars: 1,
  ability: Abilities.CHAIN_LIGHTNING,
  synergies: ['Mystic', 'Mage'],
};

export const VETERAN_ARCHER: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Veteran Archer',
  tier: 2,
  cost: 2,
  attack: 4,
  health: 5,
  stars: 1,
  ability: Abilities.DOUBLE_SHOT,
  synergies: ['Samurai', 'Ranger'],
};

export const CRYSTAL_GOLEM: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Crystal Golem',
  tier: 2,
  cost: 2,
  attack: 2,
  health: 10,
  stars: 1,
  ability: Abilities.REFLECT,
  synergies: ['Mystic', 'Tank'],
};

export const SHADOW_THIEF: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Shadow Thief',
  tier: 2,
  cost: 2,
  attack: 7,
  health: 3,
  stars: 1,
  ability: Abilities.STEAL,
  synergies: ['Pixels', 'Assassin'],
};

// ============================================
// TIER 3 UNITS (3 Gold) - 6 Units
// ============================================

export const BLADE_MASTER: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Blade Master',
  tier: 3,
  cost: 3,
  attack: 8,
  health: 10,
  stars: 1,
  ability: Abilities.WHIRLWIND,
  synergies: ['Samurai', 'Warrior'],
};

export const ANCIENT_AXIE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Ancient Axie',
  tier: 3,
  cost: 3,
  attack: 6,
  health: 12,
  stars: 1,
  ability: Abilities.REGENERATION,
  synergies: ['Axie', 'Tank'],
};

export const PIXEL_WIZARD: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Pixel Wizard',
  tier: 3,
  cost: 3,
  attack: 7,
  health: 8,
  stars: 1,
  ability: Abilities.POLYMORPH,
  synergies: ['Pixels', 'Mage'],
};

export const NIGHT_STALKER: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Night Stalker',
  tier: 3,
  cost: 3,
  attack: 10,
  health: 6,
  stars: 1,
  ability: Abilities.ASSASSINATE,
  synergies: ['Samurai', 'Assassin'],
};

export const ORACLE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Oracle',
  tier: 3,
  cost: 3,
  attack: 5,
  health: 9,
  stars: 1,
  ability: Abilities.FORESIGHT,
  synergies: ['Mystic', 'Support'],
};

export const SIEGE_ENGINE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Siege Engine',
  tier: 3,
  cost: 3,
  attack: 4,
  health: 14,
  stars: 1,
  ability: Abilities.BOMBARDMENT,
  synergies: ['Pixels', 'Tank'],
};

// ============================================
// TIER 4 UNITS (4 Gold) - 4 Units
// ============================================

export const SHOGUN: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Shogun',
  tier: 4,
  cost: 4,
  attack: 9,
  health: 16,
  stars: 1,
  ability: Abilities.WAR_CRY,
  synergies: ['Samurai', 'Warrior', 'Support'],
};

export const VOID_AXIE: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Void Axie',
  tier: 4,
  cost: 4,
  attack: 11,
  health: 14,
  stars: 1,
  ability: Abilities.LIFE_DRAIN,
  synergies: ['Axie', 'Mystic'],
};

export const PIXEL_TITAN: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Pixel Titan',
  tier: 4,
  cost: 4,
  attack: 8,
  health: 18,
  stars: 1,
  ability: Abilities.UNSTOPPABLE,
  synergies: ['Pixels', 'Tank', 'Warrior'],
};

export const MASTER_ASSASSIN: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Master Assassin',
  tier: 4,
  cost: 4,
  attack: 13,
  health: 8,
  stars: 1,
  ability: Abilities.SHADOW_STRIKE,
  synergies: ['Samurai', 'Assassin'],
};

// ============================================
// TIER 5 UNITS (5 Gold) - 2 Units
// ============================================

export const DRAGON_LORD: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'Dragon Lord',
  tier: 5,
  cost: 5,
  attack: 14,
  health: 20,
  stars: 1,
  ability: Abilities.INFERNO,
  synergies: ['Mystic', 'Dragon'],
};

export const ETERNAL_SAMURAI: Omit<Unit, 'id' | 'currentHealth'> = {
  name: 'The Eternal Samurai',
  tier: 5,
  cost: 5,
  attack: 16,
  health: 18,
  stars: 1,
  ability: Abilities.UNDYING_WILL,
  synergies: ['Samurai', 'Legendary'],
};

// ============================================
// UNIT COLLECTIONS
// ============================================

export const TIER_1_UNITS = [
  PIXEL_FARMER,
  RONIN_SCOUT,
  BABY_AXIE,
  SPIRIT_WISP,
  APPRENTICE_MAGE,
  SHIELD_BEARER,
  PIXEL_ARCHER,
  WILD_PUP,
  MERCHANT,
  SHRINE_MAIDEN,
] as const;

export const TIER_2_UNITS = [
  SAMURAI_WARRIOR,
  EVOLVED_AXIE,
  PIXEL_KNIGHT,
  WIND_DANCER,
  THUNDER_MAGE,
  VETERAN_ARCHER,
  CRYSTAL_GOLEM,
  SHADOW_THIEF,
] as const;

export const TIER_3_UNITS = [
  BLADE_MASTER,
  ANCIENT_AXIE,
  PIXEL_WIZARD,
  NIGHT_STALKER,
  ORACLE,
  SIEGE_ENGINE,
] as const;

export const TIER_4_UNITS = [
  SHOGUN,
  VOID_AXIE,
  PIXEL_TITAN,
  MASTER_ASSASSIN,
] as const;

export const TIER_5_UNITS = [
  DRAGON_LORD,
  ETERNAL_SAMURAI,
] as const;

export const ALL_UNITS = [
  ...TIER_1_UNITS,
  ...TIER_2_UNITS,
  ...TIER_3_UNITS,
  ...TIER_4_UNITS,
  ...TIER_5_UNITS,
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get units by tier
 */
export function getUnitsByTier(tier: 1 | 2 | 3 | 4 | 5) {
  switch (tier) {
    case 1:
      return TIER_1_UNITS;
    case 2:
      return TIER_2_UNITS;
    case 3:
      return TIER_3_UNITS;
    case 4:
      return TIER_4_UNITS;
    case 5:
      return TIER_5_UNITS;
  }
}

/**
 * Get unit by name
 */
export function getUnitByName(name: string) {
  return ALL_UNITS.find((unit) => unit.name === name);
}

/**
 * Get units by synergy
 */
export function getUnitsBySynergy(synergy: string) {
  return ALL_UNITS.filter((unit) => unit.synergies.includes(synergy));
}

/**
 * Create unit instance with unique ID
 */
export function createUnitInstance(
  unitTemplate: Omit<Unit, 'id' | 'currentHealth'>,
  stars: 1 | 2 | 3 = 1
): Unit {
  const id = `${unitTemplate.name.toLowerCase().replace(/\s/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Calculate stats based on star level
  const multiplier = stars === 1 ? 1 : stars === 2 ? 1.8 : 3.2;
  const attack = Math.round(unitTemplate.attack * multiplier);
  const health = Math.round(unitTemplate.health * multiplier);

  return {
    ...unitTemplate,
    id,
    stars,
    attack,
    health,
    currentHealth: health,
  };
}

/**
 * Get unit pool for shop generation
 */
export function getUnitPool(tier: 1 | 2 | 3 | 4 | 5): Map<string, number> {
  const units = getUnitsByTier(tier);
  const poolSize = tier === 1 ? 45 : tier === 2 ? 30 : tier === 3 ? 20 : tier === 4 ? 15 : 10;

  const pool = new Map<string, number>();
  units.forEach((unit) => {
    pool.set(unit.name, poolSize);
  });

  return pool;
}

/**
 * Calculate sell value for a unit
 */
export function getUnitSellValue(unit: Unit): number {
  const copiesUsed = unit.stars === 1 ? 1 : unit.stars === 2 ? 3 : 9;
  return unit.cost * copiesUsed;
}

/**
 * Check if units can be combined for upgrade
 */
export function canCombineUnits(units: Unit[]): boolean {
  if (units.length < 3) return false;

  const firstUnit = units[0];
  const sameNameAndStars = units.every(
    (u) => u.name === firstUnit.name && u.stars === firstUnit.stars
  );

  return sameNameAndStars && firstUnit.stars < 3;
}

/**
 * Combine three units into upgraded version
 */
export function combineUnits(units: [Unit, Unit, Unit]): Unit {
  const baseUnit = units[0];
  const newStars = (baseUnit.stars + 1) as 2 | 3;

  return createUnitInstance(
    {
      name: baseUnit.name,
      tier: baseUnit.tier,
      cost: baseUnit.cost,
      attack: baseUnit.attack / (baseUnit.stars === 1 ? 1 : 1.8), // Get base stats
      health: baseUnit.health / (baseUnit.stars === 1 ? 1 : 1.8),
      stars: 1, // Will be overridden
      ability: baseUnit.ability,
      synergies: baseUnit.synergies,
    },
    newStars
  );
}
