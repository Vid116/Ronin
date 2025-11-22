// Combat Engine Usage Examples
import { simulateCombat, simulateMultipleCombats } from './index';
import type { Board, Unit } from '@/types/game';

// Example 1: Basic Combat Simulation
function exampleBasicCombat() {
  // Create units
  const warrior: Unit = {
    id: 'warrior-1',
    name: 'Samurai',
    tier: 2,
    cost: 2,
    attack: 25,
    health: 150,
    stars: 1,
    ability: {
      name: 'Blade Rush',
      description: 'Deal 15 damage to lowest HP enemy',
      trigger: 'onAttack',
      effect: 'damage',
    },
    synergies: ['Warrior', 'Human'],
  };

  const archer: Unit = {
    id: 'archer-1',
    name: 'Ranger',
    tier: 1,
    cost: 1,
    attack: 15,
    health: 80,
    stars: 1,
    ability: {
      name: 'None',
      description: 'No special ability',
      trigger: 'onDeath',
      effect: 'none',
    },
    synergies: ['Ranger', 'Elf'],
  };

  // Create boards
  const player1Board: Board = {
    top: [warrior, null, null, null],
    bottom: [null, null, null, null],
  };

  const player2Board: Board = {
    top: [archer, null, null, null],
    bottom: [null, null, null, null],
  };

  // Simulate combat
  const result = simulateCombat(player1Board, player2Board, 1, 12345);

  console.log('=== Basic Combat Example ===');
  console.log('Winner:', result.winner);
  console.log('Damage to loser:', result.damage);
  console.log('Total events:', result.events.length);
  console.log('\nCombat Log:');
  result.events.forEach(event => {
    console.log(`  [${event.type}] ${event.description}`);
  });

  return result;
}

// Example 2: Full Board Combat
function exampleFullBoardCombat() {
  // Helper to create unit
  const createUnit = (id: string, name: string, attack: number, health: number): Unit => ({
    id,
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
  });

  // Create full boards
  const player1Board: Board = {
    top: [
      createUnit('p1-u1', 'Knight', 20, 120),
      createUnit('p1-u2', 'Mage', 30, 80),
      createUnit('p1-u3', 'Priest', 10, 100),
      createUnit('p1-u4', 'Archer', 25, 70),
    ],
    bottom: [
      createUnit('p1-u5', 'Tank', 15, 200),
      createUnit('p1-u6', 'Rogue', 35, 60),
      createUnit('p1-u7', 'Paladin', 20, 150),
      createUnit('p1-u8', 'Berserker', 40, 90),
    ],
  };

  const player2Board: Board = {
    top: [
      createUnit('p2-u1', 'Warrior', 25, 130),
      createUnit('p2-u2', 'Wizard', 35, 70),
      createUnit('p2-u3', 'Cleric', 12, 110),
      createUnit('p2-u4', 'Ranger', 28, 75),
    ],
    bottom: [
      createUnit('p2-u5', 'Guardian', 18, 180),
      createUnit('p2-u6', 'Assassin', 38, 55),
      createUnit('p2-u7', 'Champion', 22, 140),
      createUnit('p2-u8', 'Barbarian', 42, 95),
    ],
  };

  const result = simulateCombat(player1Board, player2Board, 5, 98765);

  console.log('\n=== Full Board Combat Example ===');
  console.log('Winner:', result.winner);
  console.log('Damage:', result.damage);
  console.log('Surviving units:');
  console.log('  Player 1:', result.survivingUnits.player1.map(u => u.name).join(', ') || 'None');
  console.log('  Player 2:', result.survivingUnits.player2.map(u => u.name).join(', ') || 'None');
  console.log('Total damage dealt:');
  console.log('  Player 1:', result.totalDamageDealt.player1);
  console.log('  Player 2:', result.totalDamageDealt.player2);

  return result;
}

// Example 3: Win Rate Analysis
function exampleWinRateAnalysis() {
  const createUnit = (attack: number, health: number): Unit => ({
    id: `unit-${Math.random()}`,
    name: 'Test Unit',
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
  });

  // Balanced matchup
  const balancedBoard1: Board = {
    top: [createUnit(20, 100), null, null, null],
    bottom: [null, null, null, null],
  };

  const balancedBoard2: Board = {
    top: [createUnit(20, 100), null, null, null],
    bottom: [null, null, null, null],
  };

  const balancedStats = simulateMultipleCombats(balancedBoard1, balancedBoard2, 1, 1000);

  console.log('\n=== Win Rate Analysis ===');
  console.log('Balanced Matchup (1000 simulations):');
  console.log('  Player 1 wins:', balancedStats.player1Wins);
  console.log('  Player 2 wins:', balancedStats.player2Wins);
  console.log('  Draws:', balancedStats.draws);
  console.log('  Win rate P1:', ((balancedStats.player1Wins / 1000) * 100).toFixed(1) + '%');
  console.log('  Avg damage:', balancedStats.avgDamage.toFixed(1));

  // Unbalanced matchup
  const strongBoard: Board = {
    top: [createUnit(50, 200), null, null, null],
    bottom: [null, null, null, null],
  };

  const weakBoard: Board = {
    top: [createUnit(10, 50), null, null, null],
    bottom: [null, null, null, null],
  };

  const unbalancedStats = simulateMultipleCombats(strongBoard, weakBoard, 1, 1000);

  console.log('\nUnbalanced Matchup (Strong vs Weak):');
  console.log('  Strong wins:', unbalancedStats.player1Wins);
  console.log('  Weak wins:', unbalancedStats.player2Wins);
  console.log('  Win rate Strong:', ((unbalancedStats.player1Wins / 1000) * 100).toFixed(1) + '%');
}

// Example 4: Star Level Comparison
function exampleStarLevelComparison() {
  const createStarredUnit = (stars: 1 | 2 | 3): Unit => ({
    id: `unit-${stars}-star`,
    name: `${stars}-Star Unit`,
    tier: 1,
    cost: 1,
    attack: 10,
    health: 100,
    stars,
    ability: {
      name: 'None',
      description: 'No ability',
      trigger: 'onDeath',
      effect: 'none',
    },
    synergies: [],
  });

  const oneStarBoard: Board = {
    top: [createStarredUnit(1), null, null, null],
    bottom: [null, null, null, null],
  };

  const twoStarBoard: Board = {
    top: [createStarredUnit(2), null, null, null],
    bottom: [null, null, null, null],
  };

  const threeStarBoard: Board = {
    top: [createStarredUnit(3), null, null, null],
    bottom: [null, null, null, null],
  };

  console.log('\n=== Star Level Comparison ===');

  const result12 = simulateCombat(oneStarBoard, twoStarBoard, 1, 12345);
  console.log('1-star vs 2-star:', result12.winner);

  const result23 = simulateCombat(twoStarBoard, threeStarBoard, 1, 12345);
  console.log('2-star vs 3-star:', result23.winner);

  const result13 = simulateCombat(oneStarBoard, threeStarBoard, 1, 12345);
  console.log('1-star vs 3-star:', result13.winner);
}

// Example 5: Ability Showcase
function exampleAbilityShowcase() {
  const damageDealer: Unit = {
    id: 'dd-1',
    name: 'Damage Dealer',
    tier: 2,
    cost: 2,
    attack: 20,
    health: 100,
    stars: 1,
    ability: {
      name: 'Fireball',
      description: 'Deal 30 damage to lowest HP enemy',
      trigger: 'onAttack',
      effect: 'damage',
    },
    synergies: ['Mage'],
  };

  const healer: Unit = {
    id: 'healer-1',
    name: 'Healer',
    tier: 2,
    cost: 2,
    attack: 10,
    health: 120,
    stars: 1,
    ability: {
      name: 'Heal',
      description: 'Heal ally for 20 HP',
      trigger: 'startCombat',
      effect: 'heal',
    },
    synergies: ['Cleric'],
  };

  const buffer: Unit = {
    id: 'buffer-1',
    name: 'Buffer',
    tier: 2,
    cost: 2,
    attack: 15,
    health: 110,
    stars: 1,
    ability: {
      name: 'Battle Cry',
      description: 'Grant +10 attack to allies',
      trigger: 'startCombat',
      effect: 'buff',
    },
    synergies: ['Support'],
  };

  const player1Board: Board = {
    top: [damageDealer, healer, buffer, null],
    bottom: [null, null, null, null],
  };

  const player2Board: Board = {
    top: [
      { ...damageDealer, id: 'dd-2' },
      null,
      null,
      null,
    ],
    bottom: [null, null, null, null],
  };

  const result = simulateCombat(player1Board, player2Board, 1, 54321);

  console.log('\n=== Ability Showcase ===');
  console.log('Winner:', result.winner);
  console.log('\nAbility activations:');
  result.events
    .filter(e => e.type === 'ABILITY' || e.type === 'HEAL' || e.type === 'BUFF')
    .forEach(event => {
      console.log(`  ${event.description}`);
    });
}

// Run all examples
export function runAllExamples() {
  exampleBasicCombat();
  exampleFullBoardCombat();
  exampleWinRateAnalysis();
  exampleStarLevelComparison();
  exampleAbilityShowcase();

  console.log('\n=== All Examples Complete ===');
}

// Export for use in other files
export {
  exampleBasicCombat,
  exampleFullBoardCombat,
  exampleWinRateAnalysis,
  exampleStarLevelComparison,
  exampleAbilityShowcase,
};
