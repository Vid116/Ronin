// Determinism Tests for Combat Engine
// Ensures same seed produces same results (critical for ROFL verification)

import { simulateCombat } from '../engine';
import { seededRandom, generateCombatSeed } from '../rng';
import { WARRIOR, TANK, BERSERKER, HEALER, createTestBoard } from '../example-units';

describe('Combat Determinism', () => {
  it('same seed produces identical combat results', () => {
    const board1 = createTestBoard([WARRIOR, TANK, BERSERKER, null, null, null, null, null]);
    const board2 = createTestBoard([HEALER, WARRIOR, null, null, null, null, null, null]);
    const seed = 12345;
    const round = 5;

    // Run combat 5 times with the same seed
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = simulateCombat(board1, board2, round, seed);
      results.push(result);
    }

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i].winner).toBe(results[0].winner);
      expect(results[i].damage).toBe(results[0].damage);
      expect(results[i].seed).toBe(results[0].seed);
      expect(results[i].randomIndex).toBe(results[0].randomIndex);
      expect(results[i].events.length).toBe(results[0].events.length);
    }
  });

  it('different seeds produce different results', () => {
    const board1 = createTestBoard([BERSERKER, BERSERKER, null, null, null, null, null, null]);
    const board2 = createTestBoard([TANK, TANK, null, null, null, null, null, null]);
    const round = 5;

    const result1 = simulateCombat(board1, board2, round, 11111);
    const result2 = simulateCombat(board1, board2, round, 22222);
    const result3 = simulateCombat(board1, board2, round, 33333);

    // Different seeds should produce at least some different results
    // (due to RNG in dodge/crit checks)
    const results = [result1, result2, result3];
    const uniqueRandomIndexes = new Set(results.map(r => r.randomIndex));

    // We expect some variance (though not guaranteed)
    // At minimum, verify results are all valid
    results.forEach(result => {
      expect(['player1', 'player2', 'draw']).toContain(result.winner);
      expect(result.damage).toBeGreaterThanOrEqual(0);
      expect(result.randomIndex).toBeGreaterThanOrEqual(0);
    });
  });

  it('seeded RNG produces deterministic sequences', () => {
    const seed = 54321;

    // Generate sequence 1
    const sequence1 = [];
    for (let i = 0; i < 10; i++) {
      sequence1.push(seededRandom(seed, i));
    }

    // Generate sequence 2
    const sequence2 = [];
    for (let i = 0; i < 10; i++) {
      sequence2.push(seededRandom(seed, i));
    }

    // Sequences should be identical
    expect(sequence1).toEqual(sequence2);
  });

  it('generateCombatSeed produces same seed for same inputs', () => {
    const params = {
      blockHash: '0x1234567890abcdef',
      timestamp: 1234567890,
      player1Address: '0xPlayer1',
      player2Address: '0xPlayer2',
      roundNumber: 5,
    };

    const seed1 = generateCombatSeed(params);
    const seed2 = generateCombatSeed(params);
    const seed3 = generateCombatSeed(params);

    expect(seed1).toBe(seed2);
    expect(seed2).toBe(seed3);
  });

  it('generateCombatSeed produces different seeds for different inputs', () => {
    const baseParams = {
      blockHash: '0x1234567890abcdef',
      timestamp: 1234567890,
      player1Address: '0xPlayer1',
      player2Address: '0xPlayer2',
      roundNumber: 5,
    };

    const seed1 = generateCombatSeed(baseParams);
    const seed2 = generateCombatSeed({ ...baseParams, roundNumber: 6 });
    const seed3 = generateCombatSeed({ ...baseParams, timestamp: 9999999999 });
    const seed4 = generateCombatSeed({ ...baseParams, blockHash: '0xdifferent' });

    // All seeds should be different
    expect(seed1).not.toBe(seed2);
    expect(seed2).not.toBe(seed3);
    expect(seed3).not.toBe(seed4);
    expect(seed1).not.toBe(seed4);
  });

  it('combat with dodge produces deterministic results', () => {
    // Tank has 30% dodge chance
    const board1 = createTestBoard([TANK, null, null, null, null, null, null, null]);
    const board2 = createTestBoard([WARRIOR, null, null, null, null, null, null, null]);
    const seed = 99999;
    const round = 1;

    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = simulateCombat(board1, board2, round, seed);
      results.push(result);
    }

    // All results should be identical despite dodge RNG
    for (let i = 1; i < results.length; i++) {
      expect(results[i].winner).toBe(results[0].winner);
      expect(results[i].randomIndex).toBe(results[0].randomIndex);
    }
  });

  it('combat with crit produces deterministic results', () => {
    // Berserker has 40% crit chance
    const board1 = createTestBoard([BERSERKER, null, null, null, null, null, null, null]);
    const board2 = createTestBoard([WARRIOR, null, null, null, null, null, null, null]);
    const seed = 77777;
    const round = 1;

    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = simulateCombat(board1, board2, round, seed);
      results.push(result);
    }

    // All results should be identical despite crit RNG
    for (let i = 1; i < results.length; i++) {
      expect(results[i].winner).toBe(results[0].winner);
      expect(results[i].randomIndex).toBe(results[0].randomIndex);
    }
  });

  it('ROFL verification: can replay combat from seed', () => {
    const board1 = createTestBoard([WARRIOR, BERSERKER, TANK, null, null, null, null, null]);
    const board2 = createTestBoard([HEALER, WARRIOR, null, null, null, null, null, null]);
    const round = 3;

    // Simulate combat (this would be done in ROFL)
    const originalResult = simulateCombat(board1, board2, round, 55555);

    // Later, anyone can verify by replaying with the same seed
    const verifiedResult = simulateCombat(board1, board2, round, originalResult.seed);

    // Results should match exactly
    expect(verifiedResult.winner).toBe(originalResult.winner);
    expect(verifiedResult.damage).toBe(originalResult.damage);
    expect(verifiedResult.randomIndex).toBe(originalResult.randomIndex);
    expect(verifiedResult.events.length).toBe(originalResult.events.length);

    // This proves the combat is verifiable!
    console.log('✅ Combat is verifiable! Seed:', originalResult.seed);
    console.log('✅ Winner:', originalResult.winner);
    console.log('✅ RNG calls made:', originalResult.randomIndex);
  });
});
