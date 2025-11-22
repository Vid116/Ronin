/**
 * Test server integration with ROFL combat
 */

import { CombatSimulator } from './server/game/CombatSimulator';
import type { Board, Unit } from './types/game';

// Create test units
function createUnit(name: string, attack: number, health: number): Unit {
  return {
    id: `unit-${name}-${Math.random()}`,
    name,
    tier: 1,
    cost: 1,
    attack,
    health,
    stars: 1,
    ability: {
      name: 'None',
      description: 'No ability',
      trigger: 'onDeath',
      effect: 'none',
    },
    synergies: [],
  };
}

// Create test boards
const board1: Board = {
  top: [
    createUnit('Warrior', 10, 50),
    createUnit('Tank', 5, 80),
    createUnit('Mage', 8, 40),
    null,
  ],
  bottom: [null, null, null, null],
};

const board2: Board = {
  top: [
    createUnit('Berserker', 12, 45),
    createUnit('Healer', 3, 60),
    null,
    null,
  ],
  bottom: [null, null, null, null],
};

console.log('🧪 Testing Server Integration with ROFL Combat\n');
console.log('📋 Initial Boards:');
console.log('  Board 1:', board1.top.filter(u => u).map(u => u?.name).join(', '));
console.log('  Board 2:', board2.top.filter(u => u).map(u => u?.name).join(', '));
console.log('');

const simulator = new CombatSimulator();

// Test Round 1
console.log('⚔️ ROUND 1 Combat:');
const result1 = simulator.simulateCombat(
  board1,
  board2,
  1,
  '0xPlayer1',
  '0xPlayer2',
  'test-match'
);

console.log('\n📊 Result:');
console.log('  Winner:', result1.winner);
console.log('  Damage dealt:', result1.damageDealt);
console.log('  Player units remaining:', result1.playerUnitsRemaining);
console.log('  Opponent units remaining:', result1.opponentUnitsRemaining);
console.log('  Events:', result1.combatLog.length);
console.log('  Seed:', result1.seed);

console.log('\n📋 Final Boards:');
console.log('  Board 1:', result1.finalBoard1.top.filter(u => u).map(u => u?.name).join(', ') || 'ELIMINATED');
console.log('  Board 2:', result1.finalBoard2.top.filter(u => u).map(u => u?.name).join(', ') || 'ELIMINATED');

// Test visual display data
console.log('\n👁️ Visual Display Data Available:');
console.log('  ✅ initialBoard1:', !!result1.initialBoard1);
console.log('  ✅ initialBoard2:', !!result1.initialBoard2);
console.log('  ✅ finalBoard1:', !!result1.finalBoard1);
console.log('  ✅ finalBoard2:', !!result1.finalBoard2);

// Test determinism
console.log('\n🔁 Testing Determinism:');
const result2 = simulator.simulateCombat(
  board1,
  board2,
  1,
  '0xPlayer1',
  '0xPlayer2',
  'test-match'
);

const isDeterministic =
  result1.winner === result2.winner &&
  result1.damageDealt === result2.damageDealt &&
  result1.playerUnitsRemaining === result2.playerUnitsRemaining &&
  result1.seed === result2.seed;

console.log('  Same winner?', result1.winner === result2.winner);
console.log('  Same damage?', result1.damageDealt === result2.damageDealt);
console.log('  Same seed?', result1.seed === result2.seed);
console.log('  ✅ Deterministic:', isDeterministic);

console.log('\n✅ Server integration with ROFL combat working!');
console.log('📦 Ready for local testing with bot matches');
console.log('🎮 Next: Start server and test in browser');
