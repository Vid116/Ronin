/**
 * Structured Ability Registry
 *
 * This registry defines ALL abilities in the game using a structured, data-driven format.
 * All abilities MUST be JSON-serializable for ROFL compatibility.
 *
 * Design Principles:
 * - No functions, only data
 * - Fully deterministic
 * - Type-safe with discriminated unions
 * - Single source of truth
 */

// ===== TYPE DEFINITIONS =====

export type TriggerType =
  | 'start_of_combat'
  | 'on_attack'
  | 'on_death'
  | 'on_hit'
  | 'on_kill'
  | 'every_x'
  | 'conditional';

export type TargetSide = 'enemy' | 'ally' | 'self';

export type TargetPriority =
  | 'lowest_hp'
  | 'highest_hp'
  | 'random'
  | 'first'
  | 'all'
  | 'adjacent'
  | 'self';

export type StatType = 'attack' | 'health' | 'dodge' | 'crit';

export interface TargetConfig {
  side: TargetSide;
  priority: TargetPriority;
  count: number; // Number of targets to affect
}

// Discriminated union for type-safe effects
export type AbilityEffect =
  | { type: 'damage'; value: number; target: TargetConfig }
  | { type: 'heal'; value: number; target: TargetConfig }
  | { type: 'buff_stat'; stat: StatType; value: number; duration?: number; target: TargetConfig }
  | { type: 'debuff_stat'; stat: StatType; value: number; duration?: number; target: TargetConfig }
  | { type: 'shield'; target: TargetConfig }
  | { type: 'taunt'; target: TargetConfig }
  | { type: 'execute'; hpThreshold: number; target: TargetConfig } // Kill if HP below threshold %
  | { type: 'lifesteal'; percent: number; target: TargetConfig }
  | { type: 'reflect'; damage: number; target: TargetConfig };

export interface TriggerConfig {
  type: TriggerType;
  count?: number; // For every_x triggers
  condition?: string; // For conditional triggers (not implemented yet)
}

export interface StructuredAbility {
  id: string; // Unique identifier matching the effect string
  name: string; // Display name
  description: string; // Human-readable description for UI
  trigger: TriggerConfig;
  effects: AbilityEffect[];
  serializable: true; // Marker to ensure JSON compatibility
}

// ===== ABILITY REGISTRY =====

/**
 * Central registry of all abilities
 * Maps ability ID to structured ability definition
 */
export const ABILITY_REGISTRY: Record<string, StructuredAbility> = {

  // ==== DODGE & CRIT (Currently Working) ====

  'DODGE_40': {
    id: 'DODGE_40',
    name: 'Evasion',
    description: '40% chance to dodge attacks',
    trigger: { type: 'start_of_combat' },
    effects: [{
      type: 'buff_stat',
      stat: 'dodge',
      value: 40,
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  'CRIT_50_MULTIPLIER_3X': {
    id: 'CRIT_50_MULTIPLIER_3X',
    name: 'Infinity Edge',
    description: '50% crit chance, 3x crit damage',
    trigger: { type: 'start_of_combat' },
    effects: [{
      type: 'buff_stat',
      stat: 'crit',
      value: 50,
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  // ==== TIER 1 ABILITIES ====

  'HEAL_ADJACENT_3': {
    id: 'HEAL_ADJACENT_3',
    name: 'Last Breath',
    description: 'Heals adjacent allies for 3 HP when this unit dies',
    trigger: { type: 'on_death' },
    effects: [{
      type: 'heal',
      value: 3,
      target: { side: 'ally', priority: 'adjacent', count: 2 },
    }],
    serializable: true,
  },

  'BONUS_DAMAGE_3': {
    id: 'BONUS_DAMAGE_3',
    name: 'Spark',
    description: 'Every 2nd attack deals +3 bonus damage',
    trigger: { type: 'every_x', count: 2 },
    effects: [{
      type: 'damage',
      value: 3,
      target: { side: 'enemy', priority: 'lowest_hp', count: 1 },
    }],
    serializable: true,
  },

  'FORCE_TARGETING': {
    id: 'FORCE_TARGETING',
    name: 'Taunt',
    description: 'All enemies must attack this unit if able',
    trigger: { type: 'start_of_combat' },
    effects: [{
      type: 'taunt',
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  // ==== TIER 2 ABILITIES ====

  'EXECUTE_20_PERCENT': {
    id: 'EXECUTE_20_PERCENT',
    name: 'Honor Strike',
    description: 'Every 3rd attack executes enemies below 20% HP',
    trigger: { type: 'every_x', count: 3 },
    effects: [{
      type: 'execute',
      hpThreshold: 20,
      target: { side: 'enemy', priority: 'lowest_hp', count: 1 },
    }],
    serializable: true,
  },

  'GAIN_ATK_1_MAX_3': {
    id: 'GAIN_ATK_1_MAX_3',
    name: 'Adaptation',
    description: 'Gains +1 ATK permanently when hit (max +3 per combat)',
    trigger: { type: 'on_hit' },
    effects: [{
      type: 'buff_stat',
      stat: 'attack',
      value: 1,
      duration: -1, // Permanent for combat
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  'REFLECT_DAMAGE_2': {
    id: 'REFLECT_DAMAGE_2',
    name: 'Reflect',
    description: 'Reflects 2 damage back to attacker when hit',
    trigger: { type: 'on_hit' },
    effects: [{
      type: 'reflect',
      damage: 2,
      target: { side: 'enemy', priority: 'first', count: 1 },
    }],
    serializable: true,
  },

  'REFLECT_DAMAGE_3': {
    id: 'REFLECT_DAMAGE_3',
    name: 'Thornmail',
    description: 'Reflects 3 damage when hit',
    trigger: { type: 'on_hit' },
    effects: [{
      type: 'reflect',
      damage: 3,
      target: { side: 'enemy', priority: 'first', count: 1 },
    }],
    serializable: true,
  },

  'GAIN_STATS_2_2': {
    id: 'GAIN_STATS_2_2',
    name: 'Steal',
    description: 'Gains +2/+2 permanently on kill',
    trigger: { type: 'on_kill' },
    effects: [
      {
        type: 'buff_stat',
        stat: 'attack',
        value: 2,
        duration: -1,
        target: { side: 'self', priority: 'self', count: 1 },
      },
      {
        type: 'buff_stat',
        stat: 'health',
        value: 2,
        duration: -1,
        target: { side: 'self', priority: 'self', count: 1 },
      },
    ],
    serializable: true,
  },

  // ==== TIER 3+ ABILITIES ====

  'HEAL_SELF_2': {
    id: 'HEAL_SELF_2',
    name: 'Regeneration',
    description: 'Heals 2 HP after each attack',
    trigger: { type: 'on_attack' },
    effects: [{
      type: 'heal',
      value: 2,
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  'LIFESTEAL_50_HEAL_ALLY': {
    id: 'LIFESTEAL_50_HEAL_ALLY',
    name: 'Life Drain',
    description: '50% Lifesteal + heals lowest HP ally for same amount',
    trigger: { type: 'on_attack' },
    effects: [
      {
        type: 'lifesteal',
        percent: 50,
        target: { side: 'self', priority: 'self', count: 1 },
      },
      {
        type: 'heal',
        value: 0, // Will be calculated based on damage dealt
        target: { side: 'ally', priority: 'lowest_hp', count: 1 },
      },
    ],
    serializable: true,
  },

  'REVIVE_50_HP_ONCE': {
    id: 'REVIVE_50_HP_ONCE',
    name: 'Guardian Angel',
    description: 'Revive once with 50% HP',
    trigger: { type: 'on_death' },
    effects: [{
      type: 'heal',
      value: 999, // Special value indicating revival
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  // ==== SHOP CARD POOL ABILITIES ====
  // These map to the abilities currently used in ShopGenerator CARD_POOL

  'damage_bonus_1': {
    id: 'damage_bonus_1',
    name: 'Swift Strike',
    description: 'Attacks deal 1 bonus damage',
    trigger: { type: 'on_attack' },
    effects: [{
      type: 'damage',
      value: 1,
      target: { side: 'enemy', priority: 'lowest_hp', count: 1 },
    }],
    serializable: true,
  },

  'double_damage_first': {
    id: 'double_damage_first',
    name: 'Backstab',
    description: 'First attack deals double damage',
    trigger: { type: 'on_attack' },
    effects: [{
      type: 'buff_stat',
      stat: 'attack',
      value: 100, // 100% attack bonus = double
      duration: 1, // Only first attack
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  'heal_2': {
    id: 'heal_2',
    name: 'Meditation',
    description: 'Heal 2 HP every 3 attacks',
    trigger: { type: 'every_x', count: 3 },
    effects: [{
      type: 'heal',
      value: 2,
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  'heal_adjacent_3': {
    id: 'heal_adjacent_3',
    name: 'Blessing',
    description: 'Heals adjacent allies for 3 HP on combat start',
    trigger: { type: 'start_of_combat' },
    effects: [{
      type: 'heal',
      value: 3,
      target: { side: 'ally', priority: 'adjacent', count: 2 },
    }],
    serializable: true,
  },

  'damage_random_5': {
    id: 'damage_random_5',
    name: 'Shadow Strike',
    description: 'Deal 5 damage to random enemy on death',
    trigger: { type: 'on_death' },
    effects: [{
      type: 'damage',
      value: 5,
      target: { side: 'enemy', priority: 'random', count: 1 },
    }],
    serializable: true,
  },

  'stack_attack_2': {
    id: 'stack_attack_2',
    name: 'Rampage',
    description: '+2 attack on each kill',
    trigger: { type: 'on_kill' },
    effects: [{
      type: 'buff_stat',
      stat: 'attack',
      value: 2,
      duration: -1, // Permanent
      target: { side: 'self', priority: 'self', count: 1 },
    }],
    serializable: true,
  },

  'damage_random_multi_5': {
    id: 'damage_random_multi_5',
    name: 'Fox Fire',
    description: 'Deal 5 damage to 3 random enemies on combat start',
    trigger: { type: 'start_of_combat' },
    effects: [{
      type: 'damage',
      value: 5,
      target: { side: 'enemy', priority: 'random', count: 3 },
    }],
    serializable: true,
  },

  'damage_all_10': {
    id: 'damage_all_10',
    name: 'Dragon Fury',
    description: 'Every 2 attacks deal 10 damage to all enemies',
    trigger: { type: 'every_x', count: 2 },
    effects: [{
      type: 'damage',
      value: 10,
      target: { side: 'enemy', priority: 'all', count: 8 },
    }],
    serializable: true,
  },

  'buff_all_attack_3_health_5': {
    id: 'buff_all_attack_3_health_5',
    name: 'Commander',
    description: 'All allies gain +3 attack and +5 health',
    trigger: { type: 'start_of_combat' },
    effects: [
      {
        type: 'buff_stat',
        stat: 'attack',
        value: 3,
        duration: -1,
        target: { side: 'ally', priority: 'all', count: 8 },
      },
      {
        type: 'buff_stat',
        stat: 'health',
        value: 5,
        duration: -1,
        target: { side: 'ally', priority: 'all', count: 8 },
      },
    ],
    serializable: true,
  },

  'damage_all_8': {
    id: 'damage_all_8',
    name: 'Divine Breath',
    description: 'On attack, deal 8 damage to all enemies',
    trigger: { type: 'on_attack' },
    effects: [{
      type: 'damage',
      value: 8,
      target: { side: 'enemy', priority: 'all', count: 8 },
    }],
    serializable: true,
  },

  'damage_all_20_buff_attack_10': {
    id: 'damage_all_20_buff_attack_10',
    name: 'Storm God',
    description: 'On combat start, deal 20 damage to all enemies and gain 10 attack',
    trigger: { type: 'start_of_combat' },
    effects: [
      {
        type: 'damage',
        value: 20,
        target: { side: 'enemy', priority: 'all', count: 8 },
      },
      {
        type: 'buff_stat',
        stat: 'attack',
        value: 10,
        duration: -1,
        target: { side: 'self', priority: 'self', count: 1 },
      },
    ],
    serializable: true,
  },

  'heal_all_10': {
    id: 'heal_all_10',
    name: 'Sun Goddess',
    description: 'Heal all allies for 10 HP every 2 attacks',
    trigger: { type: 'every_x', count: 2 },
    effects: [{
      type: 'heal',
      value: 10,
      target: { side: 'ally', priority: 'all', count: 8 },
    }],
    serializable: true,
  },
};

// ===== HELPER FUNCTIONS =====

/**
 * Get ability by ID
 */
export function getAbility(abilityId: string): StructuredAbility | undefined {
  return ABILITY_REGISTRY[abilityId];
}

/**
 * Validate ability is properly structured
 */
export function validateAbility(ability: StructuredAbility): string[] {
  const errors: string[] = [];

  // Check serializability
  try {
    JSON.parse(JSON.stringify(ability));
  } catch {
    errors.push(`Ability ${ability.id} is not JSON-serializable`);
  }

  // Check effects
  for (const effect of ability.effects) {
    // Type-specific validation
    if (effect.type === 'buff_stat' || effect.type === 'debuff_stat') {
      if (!effect.stat) {
        errors.push(`${effect.type} effect must specify stat`);
      }
    }

    if (effect.type === 'execute') {
      if (!effect.hpThreshold || effect.hpThreshold < 0 || effect.hpThreshold > 100) {
        errors.push(`execute effect must have hpThreshold between 0-100`);
      }
    }

    if (effect.type === 'lifesteal') {
      if (!effect.percent || effect.percent < 0 || effect.percent > 100) {
        errors.push(`lifesteal effect must have percent between 0-100`);
      }
    }

    // Target validation
    if (effect.target.count < 1) {
      errors.push(`Target count must be >= 1`);
    }

    if (effect.target.count > 8) {
      errors.push(`Target count cannot exceed 8 (max board size)`);
    }
  }

  // Trigger validation
  if (ability.trigger.type === 'every_x' && !ability.trigger.count) {
    errors.push(`every_x trigger must specify count`);
  }

  return errors;
}

/**
 * Validate all abilities in registry
 */
export function validateRegistry(): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const [id, ability] of Object.entries(ABILITY_REGISTRY)) {
    const abilityErrors = validateAbility(ability);
    if (abilityErrors.length > 0) {
      errors[id] = abilityErrors;
    }
  }

  return errors;
}

/**
 * Get all ability IDs
 */
export function getAllAbilityIds(): string[] {
  return Object.keys(ABILITY_REGISTRY);
}

/**
 * Check if ability exists
 */
export function hasAbility(abilityId: string): boolean {
  return abilityId in ABILITY_REGISTRY;
}
