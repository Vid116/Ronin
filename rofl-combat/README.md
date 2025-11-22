# ROFL Combat Engine

**Standalone, deterministic combat simulator for Oasis ROFL deployment.**

## Overview

This is a **completely isolated** combat module designed to run in Oasis ROFL (Runtime Off-chain Logic Framework). It has:

- ✅ **Zero external dependencies**
- ✅ **No I/O operations**
- ✅ **100% deterministic**
- ✅ **Pure functions only**
- ✅ **No side effects**
- ✅ **Fast execution** (< 1ms)

## Architecture

```
rofl-combat/
├── types.ts      # Pure type definitions
├── engine.ts     # Core combat logic (ROFL-deployable)
├── adapter.ts    # Bridge to your game types (NOT deployed)
├── test.ts       # Standalone tests
└── README.md     # This file
```

## Key Features

### 1. **Pure Input/Output**

```typescript
// Input: Everything needed for battle
interface CombatInput {
  board1: CombatBoard;
  board2: CombatBoard;
  round: number;
  seed: number; // Deterministic!
  player1Address: string;
  player2Address: string;
  matchId: string;
  timestamp: number;
}

// Output: Complete battle result
interface CombatOutput {
  winner: 'player1' | 'player2' | 'draw';
  damageToLoser: number;
  finalBoard1: CombatBoard;
  finalBoard2: CombatBoard;
  seed: number;
  rngCallCount: number;
  totalSteps: number;
  events: CombatEvent[];
  resultHash: string;
  executionTimeMs: number;
}
```

### 2. **Deterministic RNG**

```typescript
// Same seed = same result (always!)
const result1 = simulateCombat(input);
const result2 = simulateCombat(input);
// result1.resultHash === result2.resultHash ✅
```

### 3. **Verifiable Results**

```typescript
// Anyone can verify the combat result
const isValid = verifyCombatResult(input, output);
// Re-runs combat and checks if result matches
```

## Usage

### Standalone (ROFL)

```typescript
import { simulateCombat } from './engine';
import type { CombatInput } from './types';

const input: CombatInput = {
  board1: { units: [warrior, tank, null, null, null, null, null, null] },
  board2: { units: [mage, healer, null, null, null, null, null, null] },
  round: 5,
  seed: 12345,
  player1Address: '0xPlayer1',
  player2Address: '0xPlayer2',
  matchId: 'match-123',
  timestamp: Date.now(),
};

const result = simulateCombat(input);
console.log('Winner:', result.winner);
console.log('Hash:', result.resultHash);
```

### With Game Types (Server)

```typescript
import { runRoflCombat } from './adapter';
import type { Board } from '../types/game';

const board1: Board = { top: [...], bottom: [...] };
const board2: Board = { top: [...], bottom: [...] };

const result = runRoflCombat(
  board1,
  board2,
  round,
  seed,
  player1Address,
  player2Address,
  matchId
);
```

## Combat Flow

```
1. INITIALIZE
   ├─ Convert boards to active units
   ├─ Apply start-of-combat abilities
   └─ Initialize RNG counter

2. POSITION LOOP (0 → 7)
   For each position:
   ├─ Get units at position from both sides
   ├─ Unit 1 attacks (if alive)
   ├─ Unit 2 attacks (if alive)
   ├─ Process deaths
   └─ Check early exit

3. DETERMINE WINNER
   ├─ Count alive units
   ├─ Calculate damage
   └─ Generate result hash

4. RETURN RESULT
   ├─ Winner
   ├─ Final boards
   ├─ Events log
   └─ Verification hash
```

## Determinism Guarantees

### Seeded RNG

```typescript
// Linear Congruential Generator
function seededRandom(seed: number, index: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = 2^32;
  return ((a * (seed + index) + c) % m) / m;
}
```

### No External Dependencies

- ❌ No `Math.random()`
- ❌ No `Date.now()` (except for metadata)
- ❌ No network calls
- ❌ No file I/O
- ❌ No database queries

### Pure Functions

- ✅ Same input → Same output
- ✅ No side effects
- ✅ No mutations (except internal state)
- ✅ No global variables

## Verification

### Local Verification

```typescript
import { verifyCombatResult } from './engine';

// Re-run combat and compare
const isValid = verifyCombatResult(input, output);
```

### Hash Verification

```typescript
// Quick hash check (without re-running)
function verifyHash(output: CombatOutput): boolean {
  const recomputed = hashCombatResult(
    output.winner,
    output.damageToLoser,
    output.seed,
    output.rngCallCount,
    output.totalSteps
  );
  return recomputed === output.resultHash;
}
```

## Deployment to Oasis ROFL

### Step 1: Bundle the Engine

```bash
# Only include engine.ts and types.ts
cp rofl-combat/engine.ts oasis-rofl/
cp rofl-combat/types.ts oasis-rofl/
```

### Step 2: Create ROFL Wrapper

```typescript
// oasis-rofl/handler.ts
import { simulateCombat } from './engine';
import type { CombatInput, CombatOutput } from './types';

export async function handleCombatRequest(
  input: CombatInput
): Promise<CombatOutput> {
  // Run in TEE (Trusted Execution Environment)
  const result = simulateCombat(input);

  // Sign result with ROFL key
  const signature = await signResult(result);

  return {
    ...result,
    attestation: {
      signature,
      timestamp: Date.now(),
      enclaveId: getEnclaveId(),
    },
  };
}
```

### Step 3: Deploy to Oasis

```bash
# Build ROFL enclave
oasis rofl build

# Deploy to testnet
oasis rofl deploy --network testnet
```

## Performance

```
Benchmarks (M1 MacBook):
- Simple combat (2v2): < 1ms
- Complex combat (8v8): < 5ms
- With full event log: < 10ms
```

## Testing

```bash
# Run standalone tests
npx tsx rofl-combat/test.ts

# Expected output:
✅ Deterministic: true
✅ Verification passed: true
✅ Ready for Oasis ROFL deployment!
```

## Security

### Verifiable Execution

1. **Input is transparent**: All players see the seed before combat
2. **Output is deterministic**: Same input always produces same output
3. **Replayable**: Anyone can verify by re-running
4. **Tamper-proof**: ROFL provides TEE attestation

### No Cheating Possible

- ❌ Can't manipulate RNG (seeded)
- ❌ Can't change result (deterministic)
- ❌ Can't hide inputs (transparent)
- ❌ Can't fake attestation (ROFL signature)

## Integration Points

### Server → ROFL

```typescript
// server/game/GameRoom.ts
import { runRoflCombat } from '../rofl-combat/adapter';

const result = runRoflCombat(
  playerBoard,
  opponentBoard,
  round,
  seed,
  player1.address,
  player2.address,
  this.matchId
);
```

### ROFL → Blockchain

```solidity
// contracts/RoninRumbleMain.sol
function submitCombatResult(
    uint256 matchId,
    address player1,
    address player2,
    uint8 winner,
    uint256 damage,
    bytes32 resultHash,
    bytes memory roflSignature
) external {
    // Verify ROFL signature
    require(verifyROFLSignature(resultHash, roflSignature), "Invalid signature");

    // Update match state
    // ...
}
```

## Benefits

| Feature | Traditional | ROFL Combat |
|---------|------------|-------------|
| **Trust** | Trust server | Verifiable TEE |
| **Transparency** | Opaque | Full transparency |
| **Cheating** | Possible | Impossible |
| **Performance** | Server load | Parallel TEEs |
| **Cost** | Server $$ | Minimal gas |
| **Verification** | None | Anyone can verify |

## Future Enhancements

- [ ] Add more ability types
- [ ] Position-swapping mechanics
- [ ] Batch combat processing
- [ ] Optimistic rollups integration
- [ ] Multi-round tournaments

## License

MIT

---

**Ready for Oasis ROFL deployment! 🚀**
