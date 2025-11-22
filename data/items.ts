/**
 * Item Definitions for Ronin Rumble
 * 15 items across 3 categories: Offensive, Defensive, Utility
 */

import { Item } from '@/types/game';

// ============================================
// OFFENSIVE ITEMS
// ============================================

export const DEATHBLADE: Item = {
  id: 'deathblade',
  name: 'Deathblade',
  type: 'offensive',
  description: '+5 ATK, +1 ATK per kill (stacks infinitely)',
  stats: {
    attack: 5,
  },
  effect: 'GAIN_ATK_1_ON_KILL_INFINITE',
};

export const GIANT_SLAYER: Item = {
  id: 'giant_slayer',
  name: 'Giant Slayer',
  type: 'offensive',
  description: '+3 ATK, deals 15% of target max HP as bonus damage',
  stats: {
    attack: 3,
  },
  effect: 'BONUS_DAMAGE_15_PERCENT_MAX_HP',
};

export const INFINITY_EDGE: Item = {
  id: 'infinity_edge',
  name: 'Infinity Edge',
  type: 'offensive',
  description: '+4 ATK, 50% crit chance, 3x crit damage multiplier',
  stats: {
    attack: 4,
  },
  effect: 'CRIT_50_PERCENT_3X_MULTIPLIER',
};

export const BLOODTHIRSTER: Item = {
  id: 'bloodthirster',
  name: 'Bloodthirster',
  type: 'offensive',
  description: '+6 ATK, 35% lifesteal',
  stats: {
    attack: 6,
  },
  effect: 'LIFESTEAL_35_PERCENT',
};

export const LAST_WHISPER: Item = {
  id: 'last_whisper',
  name: 'Last Whisper',
  type: 'offensive',
  description: '+3 ATK, ignores 50% of target armor/damage reduction',
  stats: {
    attack: 3,
  },
  effect: 'IGNORE_ARMOR_50_PERCENT',
};

// ============================================
// DEFENSIVE ITEMS
// ============================================

export const GUARDIAN_ANGEL: Item = {
  id: 'guardian_angel',
  name: 'Guardian Angel',
  type: 'defensive',
  description: 'Revive once with 50% HP upon death',
  stats: {},
  effect: 'REVIVE_50_HP_ONCE',
};

export const THORNMAIL: Item = {
  id: 'thornmail',
  name: 'Thornmail',
  type: 'defensive',
  description: '+5 HP, reflects 3 damage to attackers',
  stats: {
    health: 5,
  },
  effect: 'REFLECT_DAMAGE_3',
};

export const WARMOGS: Item = {
  id: 'warmogs',
  name: "Warmog's Armor",
  type: 'defensive',
  description: '+8 HP, regenerate 2 HP per turn',
  stats: {
    health: 8,
  },
  effect: 'HEAL_SELF_2_PER_TURN',
};

export const FROZEN_HEART: Item = {
  id: 'frozen_heart',
  name: 'Frozen Heart',
  type: 'defensive',
  description: '+6 HP, reduces adjacent enemy attack speed by 30%',
  stats: {
    health: 6,
  },
  effect: 'SLOW_ADJACENT_ENEMIES_30_PERCENT',
};

export const DRAGONS_CLAW: Item = {
  id: 'dragons_claw',
  name: "Dragon's Claw",
  type: 'defensive',
  description: '+4 HP, reduces magic damage taken by 50%',
  stats: {
    health: 4,
  },
  effect: 'MAGIC_RESIST_50_PERCENT',
};

// ============================================
// UTILITY ITEMS
// ============================================

export const ZEPHYR: Item = {
  id: 'zephyr',
  name: 'Zephyr',
  type: 'utility',
  description: 'Banish opposite enemy unit for 2 turns at combat start',
  stats: {},
  effect: 'BANISH_OPPOSITE_2_TURNS',
};

export const COLLECTOR: Item = {
  id: 'collector',
  name: 'The Collector',
  type: 'utility',
  description: '+1 gold per kill',
  stats: {},
  effect: 'GAIN_GOLD_1_ON_KILL',
};

export const SHROUD_OF_STILLNESS: Item = {
  id: 'shroud_of_stillness',
  name: 'Shroud of Stillness',
  type: 'utility',
  description: 'At combat start, prevents adjacent enemies from using abilities for 3 turns',
  stats: {},
  effect: 'SILENCE_ADJACENT_3_TURNS',
};

export const STATIKK_SHIV: Item = {
  id: 'statikk_shiv',
  name: 'Statikk Shiv',
  type: 'utility',
  description: '+2 ATK, every 3rd attack deals 70 magic damage to 3 enemies',
  stats: {
    attack: 2,
  },
  effect: 'CHAIN_LIGHTNING_70_EVERY_3',
};

export const CHALICE: Item = {
  id: 'chalice',
  name: 'Chalice of Power',
  type: 'utility',
  description: 'At combat start, grants adjacent allies +30% attack and ability power',
  stats: {},
  effect: 'BUFF_ADJACENT_30_PERCENT',
};

// ============================================
// ITEM COLLECTIONS
// ============================================

export const OFFENSIVE_ITEMS = [
  DEATHBLADE,
  GIANT_SLAYER,
  INFINITY_EDGE,
  BLOODTHIRSTER,
  LAST_WHISPER,
] as const;

export const DEFENSIVE_ITEMS = [
  GUARDIAN_ANGEL,
  THORNMAIL,
  WARMOGS,
  FROZEN_HEART,
  DRAGONS_CLAW,
] as const;

export const UTILITY_ITEMS = [
  ZEPHYR,
  COLLECTOR,
  SHROUD_OF_STILLNESS,
  STATIKK_SHIV,
  CHALICE,
] as const;

export const ALL_ITEMS = [
  ...OFFENSIVE_ITEMS,
  ...DEFENSIVE_ITEMS,
  ...UTILITY_ITEMS,
] as const;

// ============================================
// PVE ROUND ITEM DROPS
// ============================================

export const ROUND_1_DROPS = [DEATHBLADE, BLOODTHIRSTER, LAST_WHISPER] as const;
export const ROUND_3_DROPS = [GUARDIAN_ANGEL, THORNMAIL, WARMOGS] as const;
export const ROUND_5_DROPS = [ZEPHYR, COLLECTOR, STATIKK_SHIV] as const;

// Round 9: Player chooses 1 of 2 random items
export const ROUND_9_POOL = [
  GIANT_SLAYER,
  INFINITY_EDGE,
  FROZEN_HEART,
  DRAGONS_CLAW,
  SHROUD_OF_STILLNESS,
  CHALICE,
] as const;

// Round 15: Rare/powerful items
export const ROUND_15_DROPS = [
  INFINITY_EDGE,
  GUARDIAN_ANGEL,
  GIANT_SLAYER,
  CHALICE,
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get items by type
 */
export function getItemsByType(type: 'offensive' | 'defensive' | 'utility'): readonly Item[] {
  switch (type) {
    case 'offensive':
      return OFFENSIVE_ITEMS;
    case 'defensive':
      return DEFENSIVE_ITEMS;
    case 'utility':
      return UTILITY_ITEMS;
  }
}

/**
 * Get item by ID
 */
export function getItemById(id: string): Item | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/**
 * Get item drop for specific PvE round
 */
export function getItemDropForRound(round: number): Item | Item[] | null {
  switch (round) {
    case 1:
      return ROUND_1_DROPS[Math.floor(Math.random() * ROUND_1_DROPS.length)];
    case 3:
      return ROUND_3_DROPS[Math.floor(Math.random() * ROUND_3_DROPS.length)];
    case 5:
      return ROUND_5_DROPS[Math.floor(Math.random() * ROUND_5_DROPS.length)];
    case 9:
      // Return 2 random items for player to choose
      const shuffled = [...ROUND_9_POOL].sort(() => Math.random() - 0.5);
      return [shuffled[0], shuffled[1]];
    case 15:
      return ROUND_15_DROPS[Math.floor(Math.random() * ROUND_15_DROPS.length)];
    default:
      return null;
  }
}

/**
 * Get random item of specific type
 */
export function getRandomItem(type?: 'offensive' | 'defensive' | 'utility'): Item {
  if (type) {
    const items = getItemsByType(type);
    return items[Math.floor(Math.random() * items.length)];
  }
  return ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
}

/**
 * Check if item can be equipped on unit (1 item max per unit)
 */
export function canEquipItem(hasItem: boolean): boolean {
  return !hasItem;
}

/**
 * Get item stats as text
 */
export function getItemStatsText(item: Item): string {
  const parts: string[] = [];

  if (item.stats?.attack) {
    parts.push(`+${item.stats.attack} ATK`);
  }

  if (item.stats?.health) {
    parts.push(`+${item.stats.health} HP`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No stat bonuses';
}

/**
 * Get item rarity tier (for display purposes)
 */
export function getItemRarity(item: Item): 'common' | 'rare' | 'epic' {
  // Rare items (powerful effects, no stats OR high stats)
  const rareItems = [INFINITY_EDGE.id, GUARDIAN_ANGEL.id, ZEPHYR.id, CHALICE.id];
  if (rareItems.includes(item.id)) return 'epic';

  // Items with good stats
  const goodItems = [
    GIANT_SLAYER.id,
    BLOODTHIRSTER.id,
    WARMOGS.id,
    FROZEN_HEART.id,
    DRAGONS_CLAW.id,
  ];
  if (goodItems.includes(item.id)) return 'rare';

  return 'common';
}

/**
 * Get item color based on rarity
 */
export function getItemColor(item: Item): string {
  const rarity = getItemRarity(item);
  switch (rarity) {
    case 'epic':
      return 'text-purple-400';
    case 'rare':
      return 'text-blue-400';
    case 'common':
      return 'text-gray-400';
  }
}

/**
 * Create item instance with unique tracking
 */
export function createItemInstance(itemTemplate: Item): Item & { instanceId: string } {
  return {
    ...itemTemplate,
    instanceId: `${itemTemplate.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}
