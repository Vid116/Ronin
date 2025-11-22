# Basic Combat System for Ronin Rumble

## Overview

A **simple, fast, and deterministic** combat engine optimized for Oasis ROFL (Runtime Off-chain Logic Framework) deployment. The system emphasizes:

- ✅ **Simplicity** - Easy to understand and compute
- ✅ **Speed** - Single loop execution, early exits
- ✅ **Determinism** - Seeded RNG for verifiable results
- ✅ **Strategic Depth** - Position-based tactics
- ✅ **ROFL-Ready** - Minimal state, verifiable outcomes

---

## Combat Flow

```
1. INITIALIZATION
   ├─ Convert boards to combat units
   ├─ Generate/use combat seed
   └─ Process start-of-combat abilities

2. POSITION LOOP (0 → 7)
   For each position:
   ├─ Both units at position attack simultaneously
   ├─ Process on-attack abilities
   ├─ Calculate damage (with dodge/crit RNG)
   ├─ Apply damage
   ├─ Process on-death abilities if units die
   └─ Early exit if one side eliminated

3. RESOLUTION
   ├─ Determine winner
   ├─ Calculate damage to losing player
   └─ Return combat result with seed for verification
```

---

## Position-Based Activation

**Board Layout:**
```
[0] [1] [2] [3]  ← Top row
[4] [5] [6] [7]  ← Bottom row
```

**Activation Order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7

### Key Rules:
- Units activate in strict position order
- Both players' units at the same position attack simultaneously
- Dead units are skipped
- Each unit attacks once per combat (unless repositioned)

### Strategic Implications:
- **Position 0-1** (Front): Attack first, good for high-damage units
- **Position 6-7** (Back): Attack last, good for support/healers
- **Position 3-4** (Middle): Balanced, safe from most abilities

---

## Ability System

### 4 Basic Triggers (Simplified)

```typescript
type AbilityTrigger =
  | 'start_of_combat'  // Fire once at beginning
  | 'on_attack'        // Fire when this unit attacks
  | 'on_death'         // Fire when this unit dies
  | 'passive';         // Always active (stat modifiers)
```

### Ability Effects

```typescript
type AbilityEffect =
  | 'damage'         // Deal damage to target(s)
  | 'heal'           // Restore health to target(s)
  | 'buff_attack'    // Increase attack stat
  | 'buff_health'    // Increase health stat
  | 'shield'         // Block one attack
  | 'taunt'          // Force enemies to attack this unit
  | 'summon'         // Add new unit to board
  | 'reposition'     // Change unit position (special!)
  | 'dodge'          // Grant dodge chance
  | 'crit'           // Grant crit chance
```

---

## Damage Calculation

### Base Formula:
```typescript
defense = target.health / 10
baseDamage = max(1, attack - defense/2)
```

### With RNG Modifiers:
```typescript
// 1. Dodge Check
if (target.dodgeChance > 0) {
  if (seededRandom() < target.dodgeChance) {
    return 0; // MISS!
  }
}

// 2. Base Damage
let damage = max(1, attack - defense/2)

// 3. Critical Hit
if (attacker.critChance > 0) {
  if (seededRandom() < attacker.critChance) {
    damage *= 2; // CRIT!
  }
}
```

---

## Seeded RNG System

### Why Seeded RNG?
- ✅ **Deterministic** - Same seed = same result
- ✅ **Verifiable** - Anyone can replay combat
- ✅ **Transparent** - Seed visible before combat
- ✅ **ROFL-Compatible** - No blockchain randomness needed

### Seed Generation

```typescript
interface SeedParams {
  blockHash: string;      // Latest block hash
  timestamp: number;      // Unix timestamp
  player1Address: string; // Wallet address
  player2Address: string; // Wallet address
  roundNumber: number;    // Current round
}

const seed = generateCombatSeed(params);
```

### Seed Consumption

```typescript
// Linear Congruential Generator (LCG)
function seededRandom(seed: number, index: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = 2^32;
  return ((a * (seed + index) + c) % m) / m;
}

// Usage in combat:
let rngIndex = 0;
const dodgeRoll = seededRandom(seed, rngIndex++);
const critRoll = seededRandom(seed, rngIndex++);
```

---

## Position-Changing Abilities

**The Special Sauce** - These make strict positioning interesting!

### Examples:

**Backstab** (Assassin):
```typescript
{
  trigger: 'start_of_combat',
  effect: 'reposition to position 7'
  // Moves to enemy backline before combat starts
}
```

**Ninja Swap**:
```typescript
{
  trigger: 'start_of_combat',
  effect: 'swap position with ally at position 0'
  // Tactical position swapping
}
```

**Tactical Retreat**:
```typescript
{
  trigger: 'on_death',
  effect: 'move all allies back 1 position'
  // Changes battle flow mid-combat
}
```

### Position Mechanics:
- Units can move mid-combat
- Position determines when they attack next
- Creates dynamic tactical decisions
- Rewards planning and counter-positioning

---

## ROFL Integration

### Combat Result Format

```typescript
interface CombatResult {
  winner: 'player1' | 'player2' | 'draw';
  damage: number;
  events: CombatEvent[];
  survivingUnits: {
    player1: CombatUnit[];
    player2: CombatUnit[];
  };
  totalDamageDealt: {
    player1: number;
    player2: number;
  };
  // For verification
  seed: number;
  randomIndex: number; // Total RNG calls made
}
```

### ROFL Workflow

```typescript
// 1. Server generates seed
const seed = generateCombatSeed({
  blockHash: await getLatestBlockHash(),
  timestamp: Date.now(),
  player1Address: player1.wallet,
  player2Address: player2.wallet,
  roundNumber: currentRound,
});

// 2. Send to Oasis ROFL enclave
const result = await oasisROFL.simulateCombat({
  board1: player1.board,
  board2: player2.board,
  round: currentRound,
  seed,
});

// 3. ROFL returns result + proof
{
  result: CombatResult,
  proof: AttestationProof,
  signature: ROFLSignature,
}

// 4. Anyone can verify
const verified = simulateCombat(board1, board2, round, result.seed);
assert(verified.winner === result.winner);
```

---

## Example Units

### Basic Warrior
```typescript
{
  name: 'Basic Warrior',
  attack: 3,
  health: 6,
  ability: {
    name: 'First Strike',
    trigger: 'start_of_combat',
    effect: 'Deal 2 damage to frontline',
  }
}
```

### Tank with Dodge
```typescript
{
  name: 'Tank',
  attack: 2,
  health: 8,
  ability: {
    name: 'Dodge Training',
    trigger: 'start_of_combat',
    effect: 'Grant self 30% dodge',
  }
}
```

### Berserker with Crit
```typescript
{
  name: 'Berserker',
  attack: 6,
  health: 5,
  ability: {
    name: 'Critical Strike',
    trigger: 'start_of_combat',
    effect: 'Grant self 40% crit',
  }
}
```

### Assassin (Position-Changer)
```typescript
{
  name: 'Assassin',
  attack: 5,
  health: 4,
  ability: {
    name: 'Backstab',
    trigger: 'start_of_combat',
    effect: 'Move to position 7',
  }
}
```

### Bomber (On-Death)
```typescript
{
  name: 'Bomber',
  attack: 3,
  health: 6,
  ability: {
    name: 'Explosive Death',
    trigger: 'on_death',
    effect: 'Deal 6 damage to all enemies',
  }
}
```

---

## Performance Optimizations

### 1. Early Exit
```typescript
// Stop processing if one side eliminated
if (countAlive(board1) === 0 || countAlive(board2) === 0) {
  break;
}
```

### 2. Minimal State
```typescript
// Only track essential data
interface CombatState {
  board1: Map<number, CombatUnit>;
  board2: Map<number, CombatUnit>;
  seed: number;
  events: CombatEvent[]; // For verification only
}
```

### 3. Single Loop
```typescript
// One pass through positions 0-7
for (let pos = 0; pos < 8; pos++) {
  processPosition(pos, state);
}
```

### 4. Fixed Max Iterations
```typescript
// Prevent infinite loops
const MAX_ROUNDS = 100;
if (rounds > MAX_ROUNDS) {
  // Tie-breaker: Total HP
  winner = getTotalHP(board1) > getTotalHP(board2) ? 1 : 2;
}
```

---

## Testing Determinism

### Basic Test
```typescript
const result1 = simulateCombat(board1, board2, round, 12345);
const result2 = simulateCombat(board1, board2, round, 12345);

// Should be identical
expect(result1.winner).toBe(result2.winner);
expect(result1.randomIndex).toBe(result2.randomIndex);
```

### Verification Test
```typescript
// Simulate in ROFL
const original = await rofl.simulateCombat(params);

// Verify locally
const verified = simulateCombat(
  params.board1,
  params.board2,
  params.round,
  original.seed
);

// Must match
assert(verified.winner === original.winner);
```

---

## Strategic Depth

Despite simplicity, the system offers tactical depth:

### 1. Position Meta-Game
- Front positions attack first (aggro units)
- Back positions attack last (support units)
- Counter-positioning based on enemy board

### 2. Ability Timing
```
Position 2: "Deal damage to position 5 before they attack"
Position 5: "Heal allies after taking damage"
```

### 3. Sacrifice Plays
```
Position 0: Weak unit with "On Death: Buff allies"
Position 1: Carry unit benefits from buff
```

### 4. Formation Control
```
Assassin moves to position 7 (backline)
Guardian at position 0 has taunt (protects backline)
```

### 5. Synergy Chains
```
Position 0: Samurai buffs next Samurai
Position 1: Samurai buffs next Samurai
Position 2: Samurai gets +4 attack total
```

---

## Files

### Core Engine
- `lib/combat/engine.ts` - Main combat simulator
- `lib/combat/types.ts` - Type definitions
- `lib/combat/rng.ts` - Seeded RNG system

### Systems
- `lib/combat/damage.ts` - Damage calculation with dodge/crit
- `lib/combat/targeting.ts` - Target selection
- `lib/combat/abilities.ts` - Ability processing
- `lib/combat/events.ts` - Event logging

### Examples & Tests
- `lib/combat/example-units.ts` - Example unit definitions
- `lib/combat/__tests__/determinism.test.ts` - Determinism tests

---

## Usage Example

```typescript
import { simulateCombat } from './lib/combat/engine';
import { generateCombatSeed } from './lib/combat/rng';
import { WARRIOR, TANK, createTestBoard } from './lib/combat/example-units';

// Create boards
const board1 = createTestBoard([WARRIOR, TANK, null, null, null, null, null, null]);
const board2 = createTestBoard([WARRIOR, WARRIOR, null, null, null, null, null, null]);

// Generate seed
const seed = generateCombatSeed({
  blockHash: '0xabc123',
  timestamp: Date.now(),
  player1Address: '0xPlayer1',
  player2Address: '0xPlayer2',
  roundNumber: 5,
});

// Simulate combat
const result = simulateCombat(board1, board2, 5, seed);

console.log('Winner:', result.winner);
console.log('Damage:', result.damage);
console.log('Seed:', result.seed);
console.log('RNG calls:', result.randomIndex);

// Anyone can verify by replaying with the same seed
const verified = simulateCombat(board1, board2, 5, result.seed);
assert(verified.winner === result.winner); // ✅
```

---

## Next Steps

### Phase 1: Testing ✅
- [x] Create determinism tests
- [x] Verify seeded RNG works
- [x] Test position-changing abilities

### Phase 2: Integration
- [ ] Integrate with server GameRoom
- [ ] Add seed generation from blockchain
- [ ] Update client to display seed before combat

### Phase 3: ROFL Deployment
- [ ] Create ROFL-compatible module
- [ ] Test on Oasis testnet
- [ ] Add verification endpoints
- [ ] Benchmark performance

### Phase 4: Content
- [ ] Design 30+ units with varied abilities
- [ ] Balance testing with different compositions
- [ ] Add position-manipulating abilities
- [ ] Create synergy bonuses that affect combat

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Strict position order** | Simple, predictable, fast to compute |
| **4 ability triggers only** | Reduced complexity, easier to verify |
| **Seeded RNG** | Deterministic, verifiable, ROFL-compatible |
| **No speed stat** | Position determines order, one less variable |
| **Single attack per unit** | Fast combat (under 1 second) |
| **Position-changing abilities** | Strategic depth without stat complexity |
| **Early exit** | Optimize common cases (quick wins) |
| **Event logging** | Enables verification and replay |

---

## Benefits

✅ **For Players:**
- Clear, understandable combat
- Visible seed before battle (transparency)
- Can verify results independently
- Strategic positioning matters

✅ **For Developers:**
- Simple to implement
- Fast to execute
- Easy to test
- Verifiable outcomes

✅ **For ROFL:**
- Minimal state size
- Deterministic execution
- No external randomness needed
- Efficient verification

---

## Summary

This basic combat system provides:
- **Simplicity** over complexity
- **Speed** over feature-bloat
- **Determinism** over unpredictability
- **Tactics** through positioning
- **Verification** through seeded RNG

Perfect for Oasis ROFL deployment! 🚀
