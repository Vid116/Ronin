/**
 * Synergy Definitions for Ronin Rumble
 * 6 faction synergies with 2-piece activation thresholds
 */

import { Synergy } from '@/types/game';

// ============================================
// CLASS SYNERGIES
// ============================================

export const WARRIOR_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Warrior',
  type: 'class',
  requiredCount: 2,
  effect: 'All Warriors gain +3 Attack',
};

export const TANK_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Tank',
  type: 'class',
  requiredCount: 2,
  effect: 'All units gain +5 HP',
};

export const MAGE_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Mage',
  type: 'class',
  requiredCount: 2,
  effect: 'Abilities trigger 1 attack earlier (everyX reduced by 1)',
};

export const ASSASSIN_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Assassin',
  type: 'class',
  requiredCount: 2,
  effect: 'Assassins gain 40% crit chance',
};

export const RANGER_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Ranger',
  type: 'class',
  requiredCount: 2,
  effect: 'Rangers attack 50% faster',
};

export const SUPPORT_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Support',
  type: 'class',
  requiredCount: 2,
  effect: 'At combat start, heal all allies for 3 HP',
};

// ============================================
// ORIGIN SYNERGIES
// ============================================

export const SAMURAI_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Samurai',
  type: 'origin',
  requiredCount: 2,
  effect: 'All Samurai units gain 30% lifesteal',
};

export const PIXELS_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Pixels',
  type: 'origin',
  requiredCount: 2,
  effect: '+2 gold per win',
};

export const AXIE_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Axie',
  type: 'origin',
  requiredCount: 2,
  effect: 'All Axie units gain +20% attack and health',
};

export const MYSTIC_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Mystic',
  type: 'origin',
  requiredCount: 2,
  effect: 'Mystic units gain 30% magic damage reduction',
};

// ============================================
// SPECIAL SYNERGIES (TIER 5 ONLY)
// ============================================

export const DRAGON_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Dragon',
  type: 'origin',
  requiredCount: 1,
  effect: 'Dragon gains immunity to crowd control and +25% damage',
};

export const LEGENDARY_SYNERGY: Omit<Synergy, 'active' | 'currentCount'> = {
  name: 'Legendary',
  type: 'origin',
  requiredCount: 1,
  effect: 'Legendary unit starts combat with full ability charge',
};

// ============================================
// SYNERGY COLLECTIONS
// ============================================

export const CLASS_SYNERGIES = [
  WARRIOR_SYNERGY,
  TANK_SYNERGY,
  MAGE_SYNERGY,
  ASSASSIN_SYNERGY,
  RANGER_SYNERGY,
  SUPPORT_SYNERGY,
] as const;

export const ORIGIN_SYNERGIES = [
  SAMURAI_SYNERGY,
  PIXELS_SYNERGY,
  AXIE_SYNERGY,
  MYSTIC_SYNERGY,
  DRAGON_SYNERGY,
  LEGENDARY_SYNERGY,
] as const;

export const ALL_SYNERGIES = [
  ...CLASS_SYNERGIES,
  ...ORIGIN_SYNERGIES,
] as const;

// ============================================
// SYNERGY BONUSES (for combat calculation)
// ============================================

export interface SynergyBonus {
  name: string;
  attackBonus?: number;
  healthBonus?: number;
  attackSpeedBonus?: number;
  critChanceBonus?: number;
  lifestealBonus?: number;
  magicResistBonus?: number;
  goldPerWin?: number;
  startCombatHeal?: number;
  abilityTriggerReduction?: number;
  ccImmunity?: boolean;
  damageBonus?: number;
  fullAbilityCharge?: boolean;
  percentStatBonus?: number; // For +20% stats like Axie
}

export const SYNERGY_BONUSES: Record<string, SynergyBonus> = {
  Warrior: {
    name: 'Warrior',
    attackBonus: 3,
  },
  Tank: {
    name: 'Tank',
    healthBonus: 5,
  },
  Mage: {
    name: 'Mage',
    abilityTriggerReduction: 1,
  },
  Assassin: {
    name: 'Assassin',
    critChanceBonus: 40,
  },
  Ranger: {
    name: 'Ranger',
    attackSpeedBonus: 50,
  },
  Support: {
    name: 'Support',
    startCombatHeal: 3,
  },
  Samurai: {
    name: 'Samurai',
    lifestealBonus: 30,
  },
  Pixels: {
    name: 'Pixels',
    goldPerWin: 2,
  },
  Axie: {
    name: 'Axie',
    percentStatBonus: 20,
  },
  Mystic: {
    name: 'Mystic',
    magicResistBonus: 30,
  },
  Dragon: {
    name: 'Dragon',
    ccImmunity: true,
    damageBonus: 25,
  },
  Legendary: {
    name: 'Legendary',
    fullAbilityCharge: true,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get synergy by name
 */
export function getSynergyByName(name: string) {
  return ALL_SYNERGIES.find((synergy) => synergy.name === name);
}

/**
 * Get synergies by type
 */
export function getSynergiesByType(type: 'class' | 'origin') {
  return ALL_SYNERGIES.filter((synergy) => synergy.type === type);
}

/**
 * Calculate active synergies from unit list
 */
export function calculateActiveSynergies(unitSynergies: string[]): Synergy[] {
  const synergyCounts = new Map<string, number>();

  // Count occurrences of each synergy
  unitSynergies.forEach((synergy) => {
    synergyCounts.set(synergy, (synergyCounts.get(synergy) || 0) + 1);
  });

  // Check which synergies are active
  const activeSynergies: Synergy[] = [];

  ALL_SYNERGIES.forEach((synergyTemplate) => {
    const count = synergyCounts.get(synergyTemplate.name) || 0;
    const isActive = count >= synergyTemplate.requiredCount;

    activeSynergies.push({
      ...synergyTemplate,
      currentCount: count,
      active: isActive,
    });
  });

  return activeSynergies.filter((s) => s.currentCount > 0); // Only return synergies with units
}

/**
 * Get all active synergy bonuses
 */
export function getActiveSynergyBonuses(synergies: Synergy[]): SynergyBonus[] {
  return synergies
    .filter((s) => s.active)
    .map((s) => SYNERGY_BONUSES[s.name])
    .filter((b) => b !== undefined);
}

/**
 * Check if unit has specific synergy
 */
export function unitHasSynergy(unitSynergies: string[], synergyName: string): boolean {
  return unitSynergies.includes(synergyName);
}

/**
 * Apply synergy bonuses to unit stats
 */
export function applySynergyBonuses(
  baseAttack: number,
  baseHealth: number,
  unitSynergies: string[],
  activeBonuses: SynergyBonus[]
): { attack: number; health: number; bonusStats: string[] } {
  let attack = baseAttack;
  let health = baseHealth;
  const bonusStats: string[] = [];

  activeBonuses.forEach((bonus) => {
    // Warrior: +3 ATK
    if (bonus.name === 'Warrior' && unitHasSynergy(unitSynergies, 'Warrior')) {
      attack += bonus.attackBonus || 0;
      bonusStats.push('Warrior +3 ATK');
    }

    // Tank: +5 HP to all
    if (bonus.name === 'Tank') {
      health += bonus.healthBonus || 0;
      bonusStats.push('Tank +5 HP');
    }

    // Axie: +20% stats
    if (bonus.name === 'Axie' && unitHasSynergy(unitSynergies, 'Axie')) {
      const atkBonus = Math.round(baseAttack * 0.2);
      const hpBonus = Math.round(baseHealth * 0.2);
      attack += atkBonus;
      health += hpBonus;
      bonusStats.push('Axie +20%');
    }
  });

  return { attack, health, bonusStats };
}

/**
 * Get synergy description with icons
 */
export function getSynergyDisplay(synergy: Synergy): string {
  const icon = synergy.type === 'class' ? '⚔️' : '🌟';
  const status = synergy.active ? '✓' : '✗';
  return `${status} ${icon} ${synergy.name} (${synergy.currentCount}/${synergy.requiredCount})`;
}

/**
 * Get synergy color based on activation
 */
export function getSynergyColor(synergy: Synergy): string {
  if (synergy.active) {
    return 'text-green-400';
  } else if (synergy.currentCount > 0) {
    return 'text-yellow-400';
  } else {
    return 'text-gray-400';
  }
}

/**
 * Get recommended synergies for unit
 */
export function getRecommendedSynergies(unitSynergies: string[]): string[] {
  return unitSynergies.filter((synergy) => {
    const synergyData = getSynergyByName(synergy);
    return synergyData !== undefined;
  });
}

/**
 * Calculate synergy score for team composition
 */
export function calculateSynergyScore(synergies: Synergy[]): number {
  let score = 0;

  synergies.forEach((synergy) => {
    if (synergy.active) {
      score += 10; // Active synergy worth 10 points
    } else if (synergy.currentCount === synergy.requiredCount - 1) {
      score += 3; // Close to activation worth 3 points
    }
  });

  return score;
}

/**
 * Get synergy suggestions (which units to add)
 */
export function getSynergySuggestions(
  currentSynergies: Synergy[]
): Array<{ synergy: string; needed: number }> {
  const suggestions: Array<{ synergy: string; needed: number }> = [];

  currentSynergies.forEach((synergy) => {
    if (!synergy.active && synergy.currentCount > 0) {
      suggestions.push({
        synergy: synergy.name,
        needed: synergy.requiredCount - synergy.currentCount,
      });
    }
  });

  // Sort by closest to activation
  return suggestions.sort((a, b) => a.needed - b.needed);
}
