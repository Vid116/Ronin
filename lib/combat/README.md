# Combat Engine

A standalone, testable combat simulation system for Ronin Rumble.

## Overview

The combat engine is a pure functional system with no dependencies on server or client code. It simulates position-based autobattler combat with abilities, targeting, and comprehensive event logging.

## Architecture

```
/lib/combat/
  engine.ts       # Main combat simulator
  abilities.ts    # Ability processing
  targeting.ts    # Target selection logic
  damage.ts       # Damage calculations
  events.ts       # Combat event logging
  types.ts        # Type definitions
  index.ts        # Public exports
  __tests__/
    combat.test.ts # Unit tests (30 passing)
```

## Core Features

### Position-Based Combat
- **8 Slots**: Units positioned 0-7 (top: 0-3, bottom: 4-7)
- **Simultaneous Activation**: Units at the same position attack simultaneously
- **Sequential Processing**: Positions processed in order 0→7

### Combat Flow
1. **Initialization**: Convert boards to combat units
2. **Start of Combat**: Trigger start-of-combat abilities
3. **Position Loop**: For each position 0-7:
   - Units at position attack simultaneously
   - Process abilities (on_attack, on_hit)
   - Apply damage
   - Handle deaths (on_death, on_kill)
   - Clean up dead units
4. **Determine Winner**: Based on surviving units and total health

### Ability System

**Triggers:**
- `start_of_combat` - Fires at battle start
- `on_attack` - Fires when unit attacks
- `on_hit` - Fires when unit is attacked
- `on_death` - Fires when unit dies
- `on_kill` - Fires when unit kills another
- `end_of_position` - Fires after each position completes

**Effects:**
- `damage` - Deal damage to targets
- `heal` - Restore health to allies
- `buff_attack` - Increase attack stat
- `buff_health` - Increase health stat
- `shield` - Block next damage instance
- `taunt` - Force enemies to target this unit

### Targeting System

**Priority Types:**
- `taunt` - Prioritize taunt units, then random
- `flying` - Prioritize flying units, then random
- `lowest_hp` - Target lowest health unit
- `highest_hp` - Target highest health unit
- `highest_attack` - Target highest attack unit
- `random` - Random target
- `first` - Frontmost unit (lowest position)
- `backline` - Backmost unit (highest position)

### Damage Calculation

```typescript
baseDamage = max(1, attack - defense/2)
defense = buffedHealth / 10
```

**Player Damage** (end of match):
```typescript
damage = ceil((survivorCount + tierSum) * roundMultiplier)
roundMultiplier = min(1.0, 0.5 + round * 0.1)
```

### Star Level Scaling

Units scale linearly with stars:
- 1-star: base stats
- 2-star: 2x stats
- 3-star: 3x stats

## Usage

### Basic Combat Simulation

```typescript
import { simulateCombat } from '@/lib/combat';
import type { Board } from '@/types/game';

const board1: Board = {
  top: [unit1, unit2, null, null],
  bottom: [unit3, null, null, null],
};

const board2: Board = {
  top: [enemyUnit1, null, null, null],
  bottom: [enemyUnit2, enemyUnit3, null, null],
};

const result = simulateCombat(board1, board2, round, seed);

console.log('Winner:', result.winner); // 'player1' | 'player2' | 'draw'
console.log('Damage:', result.damage); // Damage to losing player
console.log('Events:', result.events); // Combat event log
console.log('Survivors:', result.survivingUnits);
```

### Deterministic Results

```typescript
// Same seed produces same results
const seed = 42069;
const result1 = simulateCombat(board1, board2, 1, seed);
const result2 = simulateCombat(board1, board2, 1, seed);

// result1 === result2
```

### Multiple Simulations

```typescript
import { simulateMultipleCombats } from '@/lib/combat';

const stats = simulateMultipleCombats(board1, board2, round, 1000);

console.log(`P1 Wins: ${stats.player1Wins}`);
console.log(`P2 Wins: ${stats.player2Wins}`);
console.log(`Draws: ${stats.draws}`);
console.log(`Avg Damage: ${stats.avgDamage}`);
```

### Event Processing

```typescript
import { getCombatSummary } from '@/lib/combat';

const result = simulateCombat(board1, board2, round);

// Get summary
const summary = getCombatSummary(result.events);

// Filter events by type
const attacks = result.events.filter(e => e.type === 'ATTACK');
const abilities = result.events.filter(e => e.type === 'ABILITY');
const deaths = result.events.filter(e => e.type === 'DEATH');
```

## API Reference

### Main Functions

#### `simulateCombat(board1, board2, round, seed?)`
Simulates a complete combat between two boards.

**Parameters:**
- `board1: Board` - Player 1's board
- `board2: Board` - Player 2's board
- `round: number` - Current game round (affects damage scaling)
- `seed?: number` - Optional RNG seed for determinism

**Returns:** `CombatResult`
```typescript
{
  winner: 'player1' | 'player2' | 'draw',
  damage: number,
  events: CombatEvent[],
  survivingUnits: {
    player1: CombatUnit[],
    player2: CombatUnit[]
  },
  totalDamageDealt: {
    player1: number,
    player2: number
  }
}
```

#### `simulateMultipleCombats(board1, board2, round, iterations)`
Run multiple simulations for statistical analysis.

**Returns:**
```typescript
{
  player1Wins: number,
  player2Wins: number,
  draws: number,
  avgDamage: number
}
```

### Utility Functions

#### `calculateDamage(attacker, defender)`
Calculate damage from one unit to another.

#### `calculatePlayerDamage(survivors, round)`
Calculate end-of-match damage to player.

#### `selectTarget(attacker, enemyBoard, priority, state)`
Select a target based on priority.

#### `selectTargets(attacker, enemyBoard, priority, count, state)`
Select multiple targets.

#### `getAliveUnits(board)`
Get all alive units from a board.

## Combat Events

All combat actions are logged as events:

```typescript
type CombatEvent = {
  timestamp: number;
  type: 'ATTACK' | 'ABILITY' | 'DEATH' | 'HEAL' | 'BUFF' | 'DEBUFF';
  source: string;      // Unit ID that caused the event
  target: string;      // Unit ID affected by the event
  damage?: number;     // Damage dealt
  healing?: number;    // Healing done
  description: string; // Human-readable description
};
```

## Testing

Run the test suite:

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

**Test Coverage:**
- Basic combat simulation
- Damage calculation
- Position-based combat
- Star level scaling
- Ability system
- Targeting system
- Determinism
- Edge cases
- Event logging

All 30 tests passing.

## Integration

### Server Integration

```typescript
import { simulateCombat } from '@/lib/combat';

// In game room during combat phase
async function runCombat(p1: Player, p2: Player) {
  const result = simulateCombat(
    p1.board,
    p2.board,
    this.currentRound,
    generateSeed()
  );

  // Apply damage to players
  if (result.winner === 'player1') {
    p2.health -= result.damage;
  } else if (result.winner === 'player2') {
    p1.health -= result.damage;
  }

  // Broadcast events to clients for animation
  this.broadcast('combat_result', {
    winner: result.winner,
    events: result.events,
    damage: result.damage,
  });
}
```

### ROFL Integration

The engine is designed to be portable to Rust for ROFL verification:

```rust
pub fn simulate_combat(
    board1: Board,
    board2: Board,
    round: u32,
    seed: [u8; 32],
) -> CombatResult {
    // Same logic as TypeScript version
    // Generates cryptographic proof
}
```

## Design Principles

1. **Pure Functions**: No side effects, deterministic output
2. **Type Safety**: Full TypeScript typing
3. **No Dependencies**: Standalone, portable code
4. **Testable**: Comprehensive unit test coverage
5. **Deterministic**: Same inputs = same outputs (with seed)
6. **Event-Driven**: Complete combat log for replay
7. **Scalable**: Efficient algorithms, early exit conditions

## Performance

- Average combat: <5ms
- 1000 simulations: ~3s
- Event generation: minimal overhead
- Memory: efficient with Maps and early cleanup

## Future Enhancements

Potential additions for production:
- [ ] Critical hits system
- [ ] Dodge/miss mechanics
- [ ] Status effects (stun, poison, etc.)
- [ ] Area-of-effect abilities
- [ ] Multi-target abilities
- [ ] Ability cooldowns
- [ ] Unit transformations
- [ ] Battle replay system
- [ ] Combat statistics tracking
