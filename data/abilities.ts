/**
 * Ability Definitions for Ronin Rumble
 * Each ability has a unique ID, trigger condition, and effect description
 */

import { Ability } from '@/types/game';

// Tier 1 Abilities
export const HARVEST: Ability = {
  name: 'Harvest',
  description: 'Gain 1 gold when this unit kills an enemy',
  trigger: 'onKill',
  effect: 'GAIN_GOLD_1',
};

export const QUICK_STRIKE: Ability = {
  name: 'Quick Strike',
  description: 'This unit attacks first in its position, ignoring speed',
  trigger: 'startCombat',
  effect: 'ATTACK_FIRST',
};

export const TAUNT: Ability = {
  name: 'Taunt',
  description: 'All enemies must attack this unit if able',
  trigger: 'conditional',
  effect: 'FORCE_TARGETING',
};

export const LAST_BREATH: Ability = {
  name: 'Last Breath',
  description: 'Heals adjacent allies for 3 HP when this unit dies',
  trigger: 'onDeath',
  effect: 'HEAL_ADJACENT_3',
};

export const SPARK: Ability = {
  name: 'Spark',
  description: 'Every 2nd attack deals +3 bonus magic damage',
  trigger: 'everyX',
  triggerCount: 2,
  effect: 'BONUS_DAMAGE_3',
};

export const SHIELD_WALL: Ability = {
  name: 'Shield Wall',
  description: 'Reduce next damage by 1 (stacks up to 3)',
  trigger: 'onHit',
  effect: 'REDUCE_DAMAGE_1_MAX_3',
};

export const LONG_SHOT: Ability = {
  name: 'Long Shot',
  description: 'Can attack from bottom row to top row',
  trigger: 'conditional',
  effect: 'EXTENDED_RANGE',
};

export const FRENZY: Ability = {
  name: 'Frenzy',
  description: 'Attacks twice on first attack',
  trigger: 'startCombat',
  effect: 'DOUBLE_FIRST_ATTACK',
};

export const TRADE_OFFER: Ability = {
  name: 'Trade Offer',
  description: '30% chance to generate 1 gold if survived',
  trigger: 'conditional',
  effect: 'RANDOM_GOLD_30',
};

export const BLESSING: Ability = {
  name: 'Blessing',
  description: 'Every 3rd attack grants random ally +2/+2 this combat',
  trigger: 'everyX',
  triggerCount: 3,
  effect: 'BUFF_RANDOM_ALLY_2_2',
};

// Tier 2 Abilities
export const HONOR_STRIKE: Ability = {
  name: 'Honor Strike',
  description: 'Every 3rd attack executes enemies below 20% HP',
  trigger: 'everyX',
  triggerCount: 3,
  effect: 'EXECUTE_20_PERCENT',
};

export const ADAPTATION: Ability = {
  name: 'Adaptation',
  description: 'Gains +1 ATK permanently when hit (max +3 per combat)',
  trigger: 'onHit',
  effect: 'GAIN_ATK_1_MAX_3',
};

export const FORTIFY: Ability = {
  name: 'Fortify',
  description: 'Taunt + takes 1 less damage from all sources',
  trigger: 'conditional',
  effect: 'TAUNT_DAMAGE_REDUCTION_1',
};

export const EVASION: Ability = {
  name: 'Evasion',
  description: '40% chance to dodge attacks',
  trigger: 'conditional',
  effect: 'DODGE_40',
};

export const CHAIN_LIGHTNING: Ability = {
  name: 'Chain Lightning',
  description: 'Every 2nd attack, damage jumps to nearest enemy (50% damage)',
  trigger: 'everyX',
  triggerCount: 2,
  effect: 'CHAIN_50_PERCENT',
};

export const DOUBLE_SHOT: Ability = {
  name: 'Double Shot',
  description: '30% chance to attack twice',
  trigger: 'onAttack',
  effect: 'MULTI_ATTACK_30',
};

export const REFLECT: Ability = {
  name: 'Reflect',
  description: 'Reflects 2 damage back to attacker when hit',
  trigger: 'onHit',
  effect: 'REFLECT_DAMAGE_2',
};

export const STEAL: Ability = {
  name: 'Steal',
  description: 'Gains +2/+2 permanently on kill',
  trigger: 'onKill',
  effect: 'GAIN_STATS_2_2',
};

// Tier 3 Abilities
export const WHIRLWIND: Ability = {
  name: 'Whirlwind',
  description: 'Every 3rd attack hits all adjacent enemies',
  trigger: 'everyX',
  triggerCount: 3,
  effect: 'CLEAVE_ADJACENT',
};

export const REGENERATION: Ability = {
  name: 'Regeneration',
  description: 'Heals 2 HP after each position activation',
  trigger: 'conditional',
  effect: 'HEAL_SELF_2',
};

export const POLYMORPH: Ability = {
  name: 'Polymorph',
  description: 'Every 2nd attack transforms enemy into 1/1 sheep for 1 turn',
  trigger: 'everyX',
  triggerCount: 2,
  effect: 'TRANSFORM_SHEEP_1',
};

export const ASSASSINATE: Ability = {
  name: 'Assassinate',
  description: 'First attack always crits (2x damage) and ignores taunt',
  trigger: 'startCombat',
  effect: 'GUARANTEED_CRIT_IGNORE_TAUNT',
};

export const FORESIGHT: Ability = {
  name: 'Foresight',
  description: 'All allies gain +20% dodge for 3 turns at combat start',
  trigger: 'startCombat',
  effect: 'TEAM_DODGE_20_3_TURNS',
};

export const BOMBARDMENT: Ability = {
  name: 'Bombardment',
  description: 'Every attack damages target and position behind it',
  trigger: 'onAttack',
  effect: 'PIERCE_DAMAGE',
};

// Tier 4 Abilities
export const WAR_CRY: Ability = {
  name: 'War Cry',
  description: 'Start of combat + every 3rd attack: All Warriors gain +3 ATK for 2 turns',
  trigger: 'everyX',
  triggerCount: 3,
  effect: 'BUFF_WARRIORS_3_ATK_2_TURNS',
};

export const LIFE_DRAIN: Ability = {
  name: 'Life Drain',
  description: '50% Lifesteal + heals lowest HP ally for same amount',
  trigger: 'onAttack',
  effect: 'LIFESTEAL_50_HEAL_ALLY',
};

export const UNSTOPPABLE: Ability = {
  name: 'Unstoppable',
  description: 'When HP drops below 50%: Immune to debuffs + gain +5 ATK',
  trigger: 'conditional',
  effect: 'RAGE_MODE_50_PERCENT',
};

export const SHADOW_STRIKE: Ability = {
  name: 'Shadow Strike',
  description: 'Every 2nd attack teleports behind furthest enemy and stuns for 1 turn',
  trigger: 'everyX',
  triggerCount: 2,
  effect: 'TELEPORT_STUN_1',
};

// Tier 5 Abilities
export const INFERNO: Ability = {
  name: 'Inferno',
  description: 'On attack: Burns target for 3 damage/turn. When hit: Damages all enemies for 2',
  trigger: 'onAttack',
  effect: 'BURN_3_AOE_WHEN_HIT_2',
};

export const UNDYING_WILL: Ability = {
  name: 'Undying Will',
  description: 'On death (once): Revive with 100% HP + 5 ATK, execute enemies below 40% HP',
  trigger: 'onDeath',
  effect: 'REVIVE_FULL_HP_EXECUTE_40',
};

// Special Abilities (Items grant these)
export const DEATHBLADE_ABILITY: Ability = {
  name: 'Deathblade',
  description: '+5 ATK, +1 per kill (stacks)',
  trigger: 'onKill',
  effect: 'GAIN_ATK_1_INFINITE',
};

export const GIANT_SLAYER_ABILITY: Ability = {
  name: 'Giant Slayer',
  description: '+3 ATK, deals 15% max HP bonus damage',
  trigger: 'onAttack',
  effect: 'BONUS_PERCENT_MAX_HP_15',
};

export const INFINITY_EDGE_ABILITY: Ability = {
  name: 'Infinity Edge',
  description: '+4 ATK, 50% crit chance, 3x crit damage',
  trigger: 'conditional',
  effect: 'CRIT_50_MULTIPLIER_3X',
};

export const GUARDIAN_ANGEL_ABILITY: Ability = {
  name: 'Guardian Angel',
  description: 'Revive once with 50% HP',
  trigger: 'onDeath',
  effect: 'REVIVE_50_HP_ONCE',
};

export const THORNMAIL_ABILITY: Ability = {
  name: 'Thornmail',
  description: '+5 HP, reflects 3 damage when hit',
  trigger: 'onHit',
  effect: 'REFLECT_DAMAGE_3',
};

export const WARMOGS_ABILITY: Ability = {
  name: "Warmog's Armor",
  description: '+8 HP, regenerate 2 HP per turn',
  trigger: 'conditional',
  effect: 'HEAL_SELF_2_PER_TURN',
};

export const ZEPHYR_ABILITY: Ability = {
  name: 'Zephyr',
  description: 'Banish opposite unit for 2 turns at combat start',
  trigger: 'startCombat',
  effect: 'BANISH_OPPOSITE_2_TURNS',
};

export const COLLECTOR_ABILITY: Ability = {
  name: 'The Collector',
  description: '+1 gold per kill',
  trigger: 'onKill',
  effect: 'GAIN_GOLD_1',
};

// Synergy Abilities
export const WARRIOR_SYNERGY: Ability = {
  name: 'Warrior Synergy',
  description: 'All warriors gain +3 Attack',
  trigger: 'conditional',
  effect: 'BUFF_WARRIORS_3_ATK',
};

export const RANGER_SYNERGY: Ability = {
  name: 'Ranger Synergy',
  description: 'Rangers gain +50% attack speed',
  trigger: 'conditional',
  effect: 'BUFF_RANGERS_SPEED_50',
};

export const TANK_SYNERGY: Ability = {
  name: 'Tank Synergy',
  description: 'All units gain +5 HP',
  trigger: 'conditional',
  effect: 'BUFF_ALL_5_HP',
};

export const MAGE_SYNERGY: Ability = {
  name: 'Mage Synergy',
  description: 'Abilities cost -1 mana',
  trigger: 'conditional',
  effect: 'REDUCE_ABILITY_COST_1',
};

export const ASSASSIN_SYNERGY: Ability = {
  name: 'Assassin Synergy',
  description: 'Assassins gain 40% crit chance',
  trigger: 'conditional',
  effect: 'BUFF_ASSASSINS_CRIT_40',
};

export const SAMURAI_SYNERGY: Ability = {
  name: 'Samurai Synergy',
  description: 'Units gain 30% lifesteal',
  trigger: 'conditional',
  effect: 'BUFF_ALL_LIFESTEAL_30',
};

export const PIXELS_SYNERGY: Ability = {
  name: 'Pixels Synergy',
  description: '+2 gold per win',
  trigger: 'conditional',
  effect: 'GOLD_ON_WIN_2',
};

export const AXIE_SYNERGY: Ability = {
  name: 'Axie Synergy',
  description: 'All units gain +20% stats',
  trigger: 'conditional',
  effect: 'BUFF_ALL_STATS_20_PERCENT',
};

// Export all abilities for easy access
export const ALL_ABILITIES = {
  // Tier 1
  HARVEST,
  QUICK_STRIKE,
  TAUNT,
  LAST_BREATH,
  SPARK,
  SHIELD_WALL,
  LONG_SHOT,
  FRENZY,
  TRADE_OFFER,
  BLESSING,
  // Tier 2
  HONOR_STRIKE,
  ADAPTATION,
  FORTIFY,
  EVASION,
  CHAIN_LIGHTNING,
  DOUBLE_SHOT,
  REFLECT,
  STEAL,
  // Tier 3
  WHIRLWIND,
  REGENERATION,
  POLYMORPH,
  ASSASSINATE,
  FORESIGHT,
  BOMBARDMENT,
  // Tier 4
  WAR_CRY,
  LIFE_DRAIN,
  UNSTOPPABLE,
  SHADOW_STRIKE,
  // Tier 5
  INFERNO,
  UNDYING_WILL,
  // Item Abilities
  DEATHBLADE_ABILITY,
  GIANT_SLAYER_ABILITY,
  INFINITY_EDGE_ABILITY,
  GUARDIAN_ANGEL_ABILITY,
  THORNMAIL_ABILITY,
  WARMOGS_ABILITY,
  ZEPHYR_ABILITY,
  COLLECTOR_ABILITY,
  // Synergy Abilities
  WARRIOR_SYNERGY,
  RANGER_SYNERGY,
  TANK_SYNERGY,
  MAGE_SYNERGY,
  ASSASSIN_SYNERGY,
  SAMURAI_SYNERGY,
  PIXELS_SYNERGY,
  AXIE_SYNERGY,
} as const;

export type AbilityKey = keyof typeof ALL_ABILITIES;
