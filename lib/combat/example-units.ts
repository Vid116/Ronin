// Example Unit Definitions for Basic Combat System
// These demonstrate the simplified ability triggers and effects

import type { Unit } from '@/types/game';

/**
 * Example Tier 1 Units with Basic Abilities
 */

export const WARRIOR: Unit = {
  id: 'warrior_basic',
  name: 'Basic Warrior',
  tier: 1,
  cost: 1,
  attack: 3,
  health: 6,
  stars: 1,
  ability: {
    name: 'First Strike',
    description: 'Deal 2 damage to the enemy frontline at start of combat',
    trigger: 'startCombat',
    effect: 'damage',
  },
  synergies: ['Warrior'],
};

export const TANK: Unit = {
  id: 'tank_basic',
  name: 'Basic Tank',
  tier: 1,
  cost: 1,
  attack: 2,
  health: 8,
  stars: 1,
  ability: {
    name: 'Dodge Training',
    description: 'Passive: 30% chance to dodge attacks',
    trigger: 'startCombat',
    effect: 'grants 30% dodge',
  },
  synergies: ['Tank'],
};

export const ASSASSIN: Unit = {
  id: 'assassin_basic',
  name: 'Basic Assassin',
  tier: 2,
  cost: 2,
  attack: 5,
  health: 4,
  stars: 1,
  ability: {
    name: 'Backstab',
    description: 'At start of combat, move to position 7 (backline)',
    trigger: 'startCombat',
    effect: 'reposition to 7',
  },
  synergies: ['Assassin'],
};

export const BERSERKER: Unit = {
  id: 'berserker_basic',
  name: 'Berserker',
  tier: 2,
  cost: 2,
  attack: 6,
  health: 5,
  stars: 1,
  ability: {
    name: 'Critical Strike',
    description: 'Passive: 40% chance to deal double damage',
    trigger: 'startCombat',
    effect: 'grants 40% crit',
  },
  synergies: ['Warrior'],
};

export const HEALER: Unit = {
  id: 'healer_basic',
  name: 'Basic Healer',
  tier: 2,
  cost: 2,
  attack: 2,
  health: 6,
  stars: 1,
  ability: {
    name: 'Healing Touch',
    description: 'When attacking, heal the weakest ally for 3 HP',
    trigger: 'onAttack',
    effect: 'heal 3',
  },
  synergies: ['Support'],
};

export const GUARDIAN: Unit = {
  id: 'guardian_basic',
  name: 'Guardian',
  tier: 3,
  cost: 3,
  attack: 4,
  health: 12,
  stars: 1,
  ability: {
    name: 'Shield Wall',
    description: 'At start of combat, grant shield to all allies',
    trigger: 'startCombat',
    effect: 'grant shield to allies',
  },
  synergies: ['Tank'],
};

export const NINJA: Unit = {
  id: 'ninja_basic',
  name: 'Ninja',
  tier: 3,
  cost: 3,
  attack: 7,
  health: 5,
  stars: 1,
  ability: {
    name: 'Shadow Step',
    description: 'At start of combat, swap position with the unit at position 0',
    trigger: 'startCombat',
    effect: 'reposition to 0',
  },
  synergies: ['Assassin'],
};

export const MAGE: Unit = {
  id: 'mage_basic',
  name: 'Basic Mage',
  tier: 3,
  cost: 3,
  attack: 8,
  health: 4,
  stars: 1,
  ability: {
    name: 'Fireball',
    description: 'When attacking, deal 4 damage to a random enemy',
    trigger: 'onAttack',
    effect: 'damage 4 to random',
  },
  synergies: ['Mage'],
};

export const BOMBER: Unit = {
  id: 'bomber_basic',
  name: 'Bomber',
  tier: 4,
  cost: 4,
  attack: 3,
  health: 6,
  stars: 1,
  ability: {
    name: 'Explosive Death',
    description: 'When dying, deal 6 damage to all enemies',
    trigger: 'onDeath',
    effect: 'damage 6 to all',
  },
  synergies: ['Mage'],
};

export const CHAMPION: Unit = {
  id: 'champion_basic',
  name: 'Champion',
  tier: 5,
  cost: 5,
  attack: 10,
  health: 15,
  stars: 1,
  ability: {
    name: 'Battle Cry',
    description: 'At start of combat, grant +3 attack to all allies',
    trigger: 'startCombat',
    effect: 'grant +3 attack to allies',
  },
  synergies: ['Warrior'],
};

/**
 * Position-Manipulating Abilities (Your Special Feature!)
 */

export const TELEPORTER: Unit = {
  id: 'teleporter',
  name: 'Teleporter',
  tier: 3,
  cost: 3,
  attack: 5,
  health: 7,
  stars: 1,
  ability: {
    name: 'Blink',
    description: 'When attacking, swap positions with the target',
    trigger: 'onAttack',
    effect: 'swap positions with target',
  },
  synergies: ['Mage'],
};

export const TACTICIAN: Unit = {
  id: 'tactician',
  name: 'Tactician',
  tier: 4,
  cost: 4,
  attack: 6,
  health: 8,
  stars: 1,
  ability: {
    name: 'Tactical Reposition',
    description: 'At start of combat, move all allies forward by 1 position',
    trigger: 'startCombat',
    effect: 'reposition allies forward',
  },
  synergies: ['Support'],
};

/**
 * Collection of all example units
 */
export const EXAMPLE_UNITS = {
  WARRIOR,
  TANK,
  ASSASSIN,
  BERSERKER,
  HEALER,
  GUARDIAN,
  NINJA,
  MAGE,
  BOMBER,
  CHAMPION,
  TELEPORTER,
  TACTICIAN,
};

/**
 * Helper to create a test board
 */
export function createTestBoard(units: (Unit | null)[]): { top: (Unit | null)[]; bottom: (Unit | null)[] } {
  return {
    top: [units[0] || null, units[1] || null, units[2] || null, units[3] || null],
    bottom: [units[4] || null, units[5] || null, units[6] || null, units[7] || null],
  };
}
