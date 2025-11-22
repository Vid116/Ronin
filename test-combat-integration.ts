// Quick test to verify combat integration works
import { CombatSimulator } from './server/game/CombatSimulator';
import type { Board, Unit } from './types/game';

// Create test unit
function createUnit(name: string, attack: number, health: number): Unit {
  return {
    id: `unit-${name}`,
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
    null,
    null,
  ],
  bottom: [null, null, null, null],
};

const board2: Board = {
  top: [
    createUnit('Mage', 8, 40),
    null,
    null,
    null,
  ],
  bottom: [null, null, null, null],
};

console.log('🧪 Testing Combat Integration...\n');

const simulator = new CombatSimulator();

// Test Round 1
console.log('⚔️ ROUND 1:');
const result1 = simulator.simulateCombat(board1, board2, 1);
console.log('  Winner:', result1.winner);
console.log('  Damage:', result1.damageDealt);
console.log('  Seed:', result1.seed);
console.log('  Events:', result1.combatLog.length);

// Test Round 2 (should have different seed)
console.log('\n⚔️ ROUND 2:');
const result2 = simulator.simulateCombat(board1, board2, 2);
console.log('  Winner:', result2.winner);
console.log('  Damage:', result2.damageDealt);
console.log('  Seed:', result2.seed);
console.log('  Events:', result2.combatLog.length);

// Test determinism
console.log('\n🔁 DETERMINISM TEST:');
const result3 = simulator.simulateCombat(board1, board2, 1);
console.log('  Same seed as Round 1?', result1.seed === result3.seed);
console.log('  Same winner?', result1.winner === result3.winner);
console.log('  Same damage?', result1.damageDealt === result3.damageDealt);

if (result1.seed === result3.seed && result1.winner === result3.winner) {
  console.log('\n✅ Combat integration working! Deterministic results confirmed.');
} else {
  console.log('\n❌ Problem: Results not deterministic!');
}
