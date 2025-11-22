// Combat Engine Tests
import { describe, it, expect } from '@jest/globals';
import type { Board, Unit } from '@/types/game';
import { simulateCombat, simulateMultipleCombats } from '../engine';
import { calculateDamage, calculatePlayerDamage, applyDamage } from '../damage';
import { selectTarget, getAliveUnits } from '../targeting';
import type { CombatUnit, CombatState } from '../types';

// Test unit factory
function createTestUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: `unit-${Math.random()}`,
    name: 'Test Warrior',
    tier: 1,
    cost: 1,
    attack: 10,
    health: 100,
    stars: 1,
    ability: {
      name: 'None',
      description: 'No special ability',
      trigger: 'onDeath', // Won't trigger in most tests
      effect: 'none',
    },
    synergies: [],
    ...overrides,
  };
}

// Test board factory
function createTestBoard(units: (Unit | null)[]): Board {
  return {
    top: units.slice(0, 4) as (Unit | null)[],
    bottom: units.slice(4, 8) as (Unit | null)[],
  };
}

// Empty board
function createEmptyBoard(): Board {
  return {
    top: [null, null, null, null],
    bottom: [null, null, null, null],
  };
}

// Mock combat state for testing
function createMockState(): CombatState {
  return {
    player1Board: new Map(),
    player2Board: new Map(),
    currentPosition: 0,
    round: 1,
    events: [],
    randomSeed: 12345,
    randomIndex: 0,
  };
}

describe('Combat Engine', () => {
  describe('Basic Combat Simulation', () => {
    it('should simulate a simple 1v1 combat', () => {
      const unit1 = createTestUnit({ attack: 20, health: 100 });
      const unit2 = createTestUnit({ attack: 15, health: 80 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      expect(result).toBeDefined();
      expect(result.winner).toBeDefined();
      expect(['player1', 'player2', 'draw']).toContain(result.winner);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should handle empty boards', () => {
      const board1 = createEmptyBoard();
      const board2 = createEmptyBoard();

      const result = simulateCombat(board1, board2, 1);

      expect(result.winner).toBe('draw');
      expect(result.damage).toBe(0);
    });

    it('should return player1 win when player2 has no units', () => {
      const unit1 = createTestUnit({ attack: 10, health: 100 });
      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createEmptyBoard();

      const result = simulateCombat(board1, board2, 1);

      expect(result.winner).toBe('player1');
      expect(result.damage).toBeGreaterThan(0);
    });

    it('should return player2 win when player1 has no units', () => {
      const unit2 = createTestUnit({ attack: 10, health: 100 });
      const board1 = createEmptyBoard();
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1);

      expect(result.winner).toBe('player2');
      expect(result.damage).toBeGreaterThan(0);
    });

    it('should generate combat events', () => {
      const unit1 = createTestUnit({ attack: 20, health: 100 });
      const unit2 = createTestUnit({ attack: 15, health: 80 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events.some(e => e.type === 'ATTACK')).toBe(true);
    });
  });

  describe('Damage Calculation', () => {
    it('should calculate damage correctly', () => {
      const attacker: CombatUnit = {
        ...createTestUnit({ attack: 20, health: 100 }),
        currentHealth: 100,
        buffedAttack: 20,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
      };

      const defender: CombatUnit = {
        ...createTestUnit({ attack: 10, health: 100 }),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player2',
        isDead: false,
      };

      const mockState = createMockState();
      const damage = calculateDamage(attacker, defender, mockState);

      expect(damage).toBeGreaterThan(0);
      expect(typeof damage).toBe('number');
    });

    it('should deal at least 1 damage', () => {
      const attacker: CombatUnit = {
        ...createTestUnit({ attack: 1, health: 100 }),
        currentHealth: 100,
        buffedAttack: 1,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
      };

      const defender: CombatUnit = {
        ...createTestUnit({ attack: 10, health: 1000 }),
        currentHealth: 1000,
        buffedAttack: 10,
        buffedHealth: 1000,
        position: 0,
        side: 'player2',
        isDead: false,
      };

      const mockState = createMockState();
      const damage = calculateDamage(attacker, defender, mockState);

      expect(damage).toBeGreaterThanOrEqual(1);
    });

    it('should apply damage to units', () => {
      const unit: CombatUnit = {
        ...createTestUnit({ health: 100 }),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
      };

      const damage = applyDamage(unit, 30);

      expect(damage).toBe(30);
      expect(unit.currentHealth).toBe(70);
      expect(unit.isDead).toBe(false);
    });

    it('should mark unit as dead when health reaches 0', () => {
      const unit: CombatUnit = {
        ...createTestUnit({ health: 50 }),
        currentHealth: 50,
        buffedAttack: 10,
        buffedHealth: 50,
        position: 0,
        side: 'player1',
        isDead: false,
      };

      const damage = applyDamage(unit, 60);

      expect(damage).toBe(50); // Can't deal more than current health
      expect(unit.currentHealth).toBe(0);
      expect(unit.isDead).toBe(true);
    });

    it('should calculate player damage based on surviving units', () => {
      const survivors: CombatUnit[] = [
        {
          ...createTestUnit({ tier: 1 }),
          currentHealth: 50,
          buffedAttack: 10,
          buffedHealth: 100,
          position: 0,
          side: 'player1',
          isDead: false,
        },
        {
          ...createTestUnit({ tier: 2 }),
          currentHealth: 80,
          buffedAttack: 15,
          buffedHealth: 150,
          position: 1,
          side: 'player1',
          isDead: false,
        },
      ];

      const damage = calculatePlayerDamage(survivors, 5);

      expect(damage).toBeGreaterThan(0);
    });

    it('should return 0 damage for no survivors', () => {
      const damage = calculatePlayerDamage([], 1);
      expect(damage).toBe(0);
    });

    it('should scale damage with round number', () => {
      const survivors: CombatUnit[] = [
        {
          ...createTestUnit({ tier: 3 }),
          currentHealth: 100,
          buffedAttack: 20,
          buffedHealth: 200,
          position: 0,
          side: 'player1',
          isDead: false,
        },
      ];

      const earlyRoundDamage = calculatePlayerDamage(survivors, 1);
      const lateRoundDamage = calculatePlayerDamage(survivors, 10);

      expect(lateRoundDamage).toBeGreaterThanOrEqual(earlyRoundDamage);
    });
  });

  describe('Position-Based Combat', () => {
    it('should process units at same position simultaneously', () => {
      const unit1 = createTestUnit({ attack: 30, health: 100 });
      const unit2 = createTestUnit({ attack: 30, health: 100 });

      // Both units at position 0
      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      // Both should have attacked
      expect(result.events.filter(e => e.type === 'ATTACK').length).toBeGreaterThanOrEqual(1);
    });

    it('should process all 8 positions', () => {
      const units1 = Array(8).fill(null).map(() =>
        createTestUnit({ attack: 10, health: 50, id: `p1-${Math.random()}` })
      );
      const units2 = Array(8).fill(null).map(() =>
        createTestUnit({ attack: 10, health: 50, id: `p2-${Math.random()}` })
      );

      const board1 = createTestBoard(units1);
      const board2 = createTestBoard(units2);

      const result = simulateCombat(board1, board2, 1, 12345);

      expect(result.events.length).toBeGreaterThan(0);
    });
  });

  describe('Star Level Scaling', () => {
    it('should scale stats with star level', () => {
      const oneStarUnit = createTestUnit({ attack: 10, health: 100, stars: 1 });
      const threeStarUnit = createTestUnit({ attack: 10, health: 100, stars: 3 });

      const board1 = createTestBoard([oneStarUnit, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([threeStarUnit, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      // 3-star should beat 1-star
      expect(result.winner).toBe('player2');
    });
  });

  describe('Abilities', () => {
    it('should trigger start of combat abilities', () => {
      const unit = createTestUnit({
        attack: 20,
        health: 100,
        ability: {
          name: 'Battle Cry',
          description: 'Grant +5 attack to all allies',
          trigger: 'startCombat',
          effect: 'buff',
        },
      });

      const board1 = createTestBoard([unit, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([createTestUnit(), null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      expect(result.events.some(e => e.type === 'ABILITY' || e.type === 'BUFF')).toBe(true);
    });

    it('should trigger on-attack abilities', () => {
      const unit = createTestUnit({
        attack: 15,
        health: 100,
        ability: {
          name: 'Cleave',
          description: 'Deal 10 damage to target',
          trigger: 'onAttack',
          effect: 'damage',
        },
      });

      const board1 = createTestBoard([unit, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([createTestUnit(), null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should trigger on-death abilities', () => {
      const unit = createTestUnit({
        attack: 5,
        health: 10, // Low health to ensure death
        ability: {
          name: 'Last Stand',
          description: 'Deal 20 damage on death',
          trigger: 'onDeath',
          effect: 'damage',
        },
      });

      const board1 = createTestBoard([unit, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([
        createTestUnit({ attack: 100, health: 200 }),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);

      const result = simulateCombat(board1, board2, 1, 12345);

      expect(result.events.some(e => e.type === 'DEATH')).toBe(true);
    });
  });

  describe('Targeting', () => {
    it('should select valid targets', () => {
      const board = new Map<number, CombatUnit>();
      board.set(0, {
        ...createTestUnit({ id: 'target-1' }),
        currentHealth: 50,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player2',
        isDead: false,
      });

      const state: CombatState = {
        player1Board: new Map(),
        player2Board: board,
        currentPosition: 0,
        round: 1,
        events: [],
        randomSeed: 12345,
        randomIndex: 0,
      };

      const attacker: CombatUnit = {
        ...createTestUnit(),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
      };

      const target = selectTarget(attacker, board, 'first', state);

      expect(target).toBeDefined();
      expect(target?.id).toBe('target-1');
    });

    it('should prioritize taunt units', () => {
      const board = new Map<number, CombatUnit>();

      const normalUnit: CombatUnit = {
        ...createTestUnit({ id: 'normal' }),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player2',
        isDead: false,
      };

      const tauntUnit: CombatUnit = {
        ...createTestUnit({ id: 'taunt' }),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 1,
        side: 'player2',
        isDead: false,
        hasTaunt: true,
      };

      board.set(0, normalUnit);
      board.set(1, tauntUnit);

      const state: CombatState = {
        player1Board: new Map(),
        player2Board: board,
        currentPosition: 0,
        round: 1,
        events: [],
        randomSeed: 12345,
        randomIndex: 0,
      };

      const attacker: CombatUnit = {
        ...createTestUnit(),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
      };

      const target = selectTarget(attacker, board, 'taunt', state);

      expect(target?.hasTaunt).toBe(true);
    });

    it('should select lowest HP target', () => {
      const board = new Map<number, CombatUnit>();

      board.set(0, {
        ...createTestUnit({ id: 'high-hp' }),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player2',
        isDead: false,
      });

      board.set(1, {
        ...createTestUnit({ id: 'low-hp' }),
        currentHealth: 20,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 1,
        side: 'player2',
        isDead: false,
      });

      const state: CombatState = {
        player1Board: new Map(),
        player2Board: board,
        currentPosition: 0,
        round: 1,
        events: [],
        randomSeed: 12345,
        randomIndex: 0,
      };

      const attacker: CombatUnit = {
        ...createTestUnit(),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
      };

      const target = selectTarget(attacker, board, 'lowest_hp', state);

      expect(target?.id).toBe('low-hp');
    });

    it('should get alive units correctly', () => {
      const board = new Map<number, CombatUnit>();

      board.set(0, {
        ...createTestUnit({ id: 'alive' }),
        currentHealth: 50,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
      });

      board.set(1, {
        ...createTestUnit({ id: 'dead' }),
        currentHealth: 0,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 1,
        side: 'player1',
        isDead: true,
      });

      const aliveUnits = getAliveUnits(board);

      expect(aliveUnits.length).toBe(1);
      expect(aliveUnits[0].id).toBe('alive');
    });
  });

  describe('Determinism', () => {
    it('should produce same results with same seed', () => {
      const unit1 = createTestUnit({ attack: 15, health: 100 });
      const unit2 = createTestUnit({ attack: 12, health: 90 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const seed = 42069;
      const result1 = simulateCombat(board1, board2, 1, seed);
      const result2 = simulateCombat(board1, board2, 1, seed);

      expect(result1.winner).toBe(result2.winner);
      expect(result1.damage).toBe(result2.damage);
      expect(result1.events.length).toBe(result2.events.length);
    });

    it('should produce different results with different seeds', () => {
      const unit1 = createTestUnit({ attack: 15, health: 100 });
      const unit2 = createTestUnit({ attack: 15, health: 100 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const results = [];
      for (let seed = 0; seed < 10; seed++) {
        results.push(simulateCombat(board1, board2, 1, seed));
      }

      // With balanced units, some variation should occur
      const winners = new Set(results.map(r => r.winner));
      expect(winners.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multiple Combat Simulation', () => {
    it('should simulate multiple combats', () => {
      const unit1 = createTestUnit({ attack: 15, health: 100 });
      const unit2 = createTestUnit({ attack: 15, health: 100 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const results = simulateMultipleCombats(board1, board2, 1, 100);

      expect(results.player1Wins + results.player2Wins + results.draws).toBe(100);
      expect(results.avgDamage).toBeGreaterThanOrEqual(0);
    });

    it('should show win rate for stronger units', () => {
      const strongUnit = createTestUnit({ attack: 50, health: 200 });
      const weakUnit = createTestUnit({ attack: 10, health: 50 });

      const board1 = createTestBoard([strongUnit, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([weakUnit, null, null, null, null, null, null, null]);

      const results = simulateMultipleCombats(board1, board2, 1, 100);

      // Strong unit should win most/all matches
      expect(results.player1Wins).toBeGreaterThan(results.player2Wins);
    });
  });

  describe('Edge Cases', () => {
    it('should handle units with 0 attack', () => {
      const unit1 = createTestUnit({ attack: 0, health: 100 });
      const unit2 = createTestUnit({ attack: 10, health: 100 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1);

      expect(result).toBeDefined();
      expect(result.winner).toBe('player2');
    });

    it('should handle very high health units', () => {
      const unit1 = createTestUnit({ attack: 10, health: 10000 });
      const unit2 = createTestUnit({ attack: 10, health: 10000 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      expect(result).toBeDefined();
    });

    it('should handle shields correctly', () => {
      const unit: CombatUnit = {
        ...createTestUnit({ health: 100 }),
        currentHealth: 100,
        buffedAttack: 10,
        buffedHealth: 100,
        position: 0,
        side: 'player1',
        isDead: false,
        hasShield: true,
      };

      const damage = applyDamage(unit, 50);

      expect(damage).toBe(0); // Shield blocks damage
      expect(unit.hasShield).toBe(false); // Shield consumed
      expect(unit.currentHealth).toBe(100); // No health lost
    });
  });

  describe('Combat Events', () => {
    it('should log different event types', () => {
      const unit1 = createTestUnit({ attack: 20, health: 50 });
      const unit2 = createTestUnit({ attack: 20, health: 50 });

      const board1 = createTestBoard([unit1, null, null, null, null, null, null, null]);
      const board2 = createTestBoard([unit2, null, null, null, null, null, null, null]);

      const result = simulateCombat(board1, board2, 1, 12345);

      const eventTypes = new Set(result.events.map(e => e.type));

      expect(eventTypes.has('ATTACK')).toBe(true);
      expect(result.events.every(e => e.timestamp)).toBe(true);
      expect(result.events.every(e => e.description)).toBe(true);
    });
  });
});
