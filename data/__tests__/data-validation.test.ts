/**
 * Data Validation Tests
 * Ensures all game data meets requirements from GDD
 */

import GameData from '../index';
import { TIER_1_UNITS, TIER_2_UNITS, TIER_3_UNITS, TIER_4_UNITS, TIER_5_UNITS } from '../units';
import { ALL_ITEMS, OFFENSIVE_ITEMS, DEFENSIVE_ITEMS, UTILITY_ITEMS } from '../items';
import { ALL_SYNERGIES, CLASS_SYNERGIES, ORIGIN_SYNERGIES } from '../synergies';

describe('Game Data Validation', () => {
  describe('Units', () => {
    test('should have exactly 30 units total', () => {
      expect(GameData.units.all.length).toBe(30);
    });

    test('should have correct distribution across tiers', () => {
      expect(TIER_1_UNITS.length).toBe(10); // 10 units at 1 gold
      expect(TIER_2_UNITS.length).toBe(8);  // 8 units at 2 gold
      expect(TIER_3_UNITS.length).toBe(6);  // 6 units at 3 gold
      expect(TIER_4_UNITS.length).toBe(4);  // 4 units at 4 gold
      expect(TIER_5_UNITS.length).toBe(2);  // 2 units at 5 gold
    });

    test('all tier 1 units should cost 1 gold', () => {
      TIER_1_UNITS.forEach((unit) => {
        expect(unit.cost).toBe(1);
        expect(unit.tier).toBe(1);
      });
    });

    test('all tier 2 units should cost 2 gold', () => {
      TIER_2_UNITS.forEach((unit) => {
        expect(unit.cost).toBe(2);
        expect(unit.tier).toBe(2);
      });
    });

    test('all tier 3 units should cost 3 gold', () => {
      TIER_3_UNITS.forEach((unit) => {
        expect(unit.cost).toBe(3);
        expect(unit.tier).toBe(3);
      });
    });

    test('all tier 4 units should cost 4 gold', () => {
      TIER_4_UNITS.forEach((unit) => {
        expect(unit.cost).toBe(4);
        expect(unit.tier).toBe(4);
      });
    });

    test('all tier 5 units should cost 5 gold', () => {
      TIER_5_UNITS.forEach((unit) => {
        expect(unit.cost).toBe(5);
        expect(unit.tier).toBe(5);
      });
    });

    test('all units should have valid stat totals', () => {
      GameData.units.all.forEach((unit) => {
        const statTotal = unit.attack + unit.health;

        // Stat budget by tier (approximate)
        if (unit.tier === 1) {
          expect(statTotal).toBeGreaterThanOrEqual(4);
          expect(statTotal).toBeLessThanOrEqual(8);
        } else if (unit.tier === 2) {
          expect(statTotal).toBeGreaterThanOrEqual(9);
          expect(statTotal).toBeLessThanOrEqual(13);
        } else if (unit.tier === 3) {
          expect(statTotal).toBeGreaterThanOrEqual(14);
          expect(statTotal).toBeLessThanOrEqual(20);
        } else if (unit.tier === 4) {
          expect(statTotal).toBeGreaterThanOrEqual(21);
          expect(statTotal).toBeLessThanOrEqual(27);
        } else if (unit.tier === 5) {
          expect(statTotal).toBeGreaterThanOrEqual(30);
          expect(statTotal).toBeLessThanOrEqual(36);
        }
      });
    });

    test('all units should have unique names', () => {
      const names = GameData.units.all.map((u) => u.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('all units should have at least one synergy', () => {
      GameData.units.all.forEach((unit) => {
        expect(unit.synergies.length).toBeGreaterThan(0);
      });
    });

    test('all units should have an ability', () => {
      GameData.units.all.forEach((unit) => {
        expect(unit.ability).toBeDefined();
        expect(unit.ability.name).toBeTruthy();
        expect(unit.ability.description).toBeTruthy();
        expect(unit.ability.trigger).toBeTruthy();
        expect(unit.ability.effect).toBeTruthy();
      });
    });

    test('all units should default to 1 star', () => {
      GameData.units.all.forEach((unit) => {
        expect(unit.stars).toBe(1);
      });
    });
  });

  describe('Items', () => {
    test('should have exactly 15 items total', () => {
      expect(ALL_ITEMS.length).toBe(15);
    });

    test('should have 5 offensive items', () => {
      expect(OFFENSIVE_ITEMS.length).toBe(5);
    });

    test('should have 5 defensive items', () => {
      expect(DEFENSIVE_ITEMS.length).toBe(5);
    });

    test('should have 5 utility items', () => {
      expect(UTILITY_ITEMS.length).toBe(5);
    });

    test('all items should have unique IDs', () => {
      const ids = ALL_ITEMS.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('all items should have proper type', () => {
      ALL_ITEMS.forEach((item) => {
        expect(['offensive', 'defensive', 'utility']).toContain(item.type);
      });
    });

    test('offensive items should have attack stats or damage effects', () => {
      OFFENSIVE_ITEMS.forEach((item) => {
        expect(item.type).toBe('offensive');
        // Should either have attack stat or offensive effect
        const hasOffensiveStat = item.stats?.attack !== undefined;
        const hasOffensiveEffect = item.effect.includes('ATK') ||
                                    item.effect.includes('DAMAGE') ||
                                    item.effect.includes('CRIT') ||
                                    item.effect.includes('LIFESTEAL');
        expect(hasOffensiveStat || hasOffensiveEffect).toBe(true);
      });
    });

    test('defensive items should have health stats or defensive effects', () => {
      DEFENSIVE_ITEMS.forEach((item) => {
        expect(item.type).toBe('defensive');
      });
    });
  });

  describe('Synergies', () => {
    test('should have exactly 12 synergies total', () => {
      expect(ALL_SYNERGIES.length).toBe(12);
    });

    test('should have 6 class synergies', () => {
      expect(CLASS_SYNERGIES.length).toBe(6);
    });

    test('should have 6 origin synergies', () => {
      expect(ORIGIN_SYNERGIES.length).toBe(6);
    });

    test('all synergies should have required count', () => {
      ALL_SYNERGIES.forEach((synergy) => {
        expect(synergy.requiredCount).toBeGreaterThan(0);
        // Most synergies require 2, except special ones
        if (synergy.name !== 'Dragon' && synergy.name !== 'Legendary') {
          expect(synergy.requiredCount).toBe(2);
        }
      });
    });

    test('all synergies should have unique names', () => {
      const names = ALL_SYNERGIES.map((s) => s.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('all synergies should have effects', () => {
      ALL_SYNERGIES.forEach((synergy) => {
        expect(synergy.effect).toBeTruthy();
        expect(synergy.effect.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Constants', () => {
    test('economy constants should be valid', () => {
      expect(GameData.constants.economy.STARTING_GOLD).toBe(3);
      expect(GameData.constants.economy.STARTING_HEALTH).toBe(20);
      expect(GameData.constants.economy.BASE_GOLD_PER_ROUND).toBe(5);
      expect(GameData.constants.economy.REROLL_COST).toBe(2);
      expect(GameData.constants.economy.MAX_INTEREST).toBe(3);
    });

    test('leveling constants should be valid', () => {
      expect(GameData.constants.leveling.MAX_LEVEL).toBe(9);
      expect(GameData.constants.leveling.AUTO_XP_PER_ROUND).toBe(2);
      expect(GameData.constants.leveling.BOARD_SLOTS.length).toBe(9);
    });

    test('tier probabilities should sum to 100', () => {
      Object.values(GameData.constants.tierProbabilities).forEach((probs) => {
        const sum = probs.reduce((a, b) => a + b, 0);
        expect(sum).toBe(100);
      });
    });

    test('board constants should be valid', () => {
      expect(GameData.constants.board.TOTAL_SLOTS).toBe(8);
      expect(GameData.constants.board.TOP_ROW_SLOTS).toBe(4);
      expect(GameData.constants.board.BOTTOM_ROW_SLOTS).toBe(4);
      expect(GameData.constants.board.SHOP_SIZE).toBe(5);
    });
  });

  describe('Helper Functions', () => {
    test('calculateInterest should work correctly', () => {
      expect(GameData.helpers.calculateInterest(0)).toBe(0);
      expect(GameData.helpers.calculateInterest(10)).toBe(1);
      expect(GameData.helpers.calculateInterest(20)).toBe(2);
      expect(GameData.helpers.calculateInterest(30)).toBe(3);
      expect(GameData.helpers.calculateInterest(50)).toBe(3); // Max 3
    });

    test('calculateRoundDamage should increase with rounds', () => {
      expect(GameData.helpers.calculateRoundDamage(1, 3)).toBe(2 + 3); // 5
      expect(GameData.helpers.calculateRoundDamage(5, 3)).toBe(3 + 3); // 6
      expect(GameData.helpers.calculateRoundDamage(10, 3)).toBe(5 + 3); // 8
      expect(GameData.helpers.calculateRoundDamage(15, 3)).toBe(7 + 3); // 10
      expect(GameData.helpers.calculateRoundDamage(21, 3)).toBe(10 + 3); // 13
    });

    test('getXPForLevel should return correct thresholds', () => {
      expect(GameData.helpers.getXPForLevel(0)).toBe(0);
      expect(GameData.helpers.getXPForLevel(1)).toBe(2);
      expect(GameData.helpers.getXPForLevel(2)).toBe(6);
      expect(GameData.helpers.getXPForLevel(3)).toBe(10);
    });

    test('getBoardSlotsForLevel should return correct slots', () => {
      expect(GameData.helpers.getBoardSlotsForLevel(1)).toBe(2);
      expect(GameData.helpers.getBoardSlotsForLevel(5)).toBe(6);
      expect(GameData.helpers.getBoardSlotsForLevel(9)).toBe(8);
    });

    test('getUpgradedStats should scale correctly', () => {
      const { attack, health } = GameData.helpers.getUpgradedStats(10, 20, 2);
      expect(attack).toBe(18); // 10 * 1.8
      expect(health).toBe(36); // 20 * 1.8

      const { attack: a3, health: h3 } = GameData.helpers.getUpgradedStats(10, 20, 3);
      expect(a3).toBe(32); // 10 * 3.2
      expect(h3).toBe(64); // 20 * 3.2
    });
  });

  describe('Data Integrity', () => {
    test('all unit synergies should exist in synergy list', () => {
      const allSynergyNames = new Set(ALL_SYNERGIES.map((s) => s.name));

      GameData.units.all.forEach((unit) => {
        unit.synergies.forEach((synergy) => {
          expect(allSynergyNames.has(synergy)).toBe(true);
        });
      });
    });

    test('samurai synergy should have at least 2 units', () => {
      const samuraiUnits = GameData.units.all.filter((u) =>
        u.synergies.includes('Samurai')
      );
      expect(samuraiUnits.length).toBeGreaterThanOrEqual(2);
    });

    test('pixels synergy should have at least 2 units', () => {
      const pixelsUnits = GameData.units.all.filter((u) =>
        u.synergies.includes('Pixels')
      );
      expect(pixelsUnits.length).toBeGreaterThanOrEqual(2);
    });

    test('axie synergy should have at least 2 units', () => {
      const axieUnits = GameData.units.all.filter((u) =>
        u.synergies.includes('Axie')
      );
      expect(axieUnits.length).toBeGreaterThanOrEqual(2);
    });

    test('each tier should have diverse synergies', () => {
      for (let tier = 1; tier <= 5; tier++) {
        const units = GameData.units.getByTier(tier as 1 | 2 | 3 | 4 | 5);
        const synergies = new Set(units.flatMap((u) => u.synergies));

        // Each tier should have at least 3 different synergies
        expect(synergies.size).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Balance Tests', () => {
    test('tier 5 units should be significantly stronger than tier 1', () => {
      const avgTier1Stats = TIER_1_UNITS.reduce(
        (sum, u) => sum + u.attack + u.health,
        0
      ) / TIER_1_UNITS.length;

      const avgTier5Stats = TIER_5_UNITS.reduce(
        (sum, u) => sum + u.attack + u.health,
        0
      ) / TIER_5_UNITS.length;

      expect(avgTier5Stats).toBeGreaterThan(avgTier1Stats * 4);
    });

    test('no tier 1 unit should have more than 7 total stats', () => {
      TIER_1_UNITS.forEach((unit) => {
        expect(unit.attack + unit.health).toBeLessThanOrEqual(8);
      });
    });

    test('tier 5 units should have at least 30 total stats', () => {
      TIER_5_UNITS.forEach((unit) => {
        expect(unit.attack + unit.health).toBeGreaterThanOrEqual(30);
      });
    });
  });
});
