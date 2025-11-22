# Ronin Rumble - Data Layer Quick Reference

## Import Patterns

```typescript
// Import everything
import GameData from '@/data';

// Import specific modules
import { TIER_1_UNITS, createUnitInstance } from '@/data/units';
import { ALL_ITEMS, getItemById } from '@/data/items';
import { calculateActiveSynergies } from '@/data/synergies';
import { ECONOMY, calculateInterest } from '@/data/constants';
```

## Common Operations

### Get Units
```typescript
// All units
const allUnits = GameData.units.all; // 30 units

// By tier
const tier1 = GameData.units.byTier[1]; // 10 units
const tier5 = GameData.units.byTier[5]; // 2 units

// By name
const dragon = GameData.units.getByName('Dragon Lord');

// By synergy
const warriors = GameData.units.getBySynergy('Warrior');
```

### Create Unit Instances
```typescript
import { createUnitInstance, RONIN_SCOUT } from '@/data/units';

// 1-star
const unit = createUnitInstance(RONIN_SCOUT);

// 2-star (1.8x stats)
const twoStar = createUnitInstance(RONIN_SCOUT, 2);

// 3-star (3.2x stats)
const threeStar = createUnitInstance(RONIN_SCOUT, 3);
```

### Get Items
```typescript
// All items
const allItems = GameData.items.all; // 15 items

// By type
const offensive = GameData.items.byType.offensive; // 5 items
const defensive = GameData.items.byType.defensive; // 5 items
const utility = GameData.items.byType.utility; // 5 items

// By ID
const deathblade = GameData.items.getById('deathblade');

// PvE drops
const round1Drop = GameData.items.getDropForRound(1); // Offensive
const round9Drop = GameData.items.getDropForRound(9); // [item1, item2] choice
```

### Calculate Synergies
```typescript
import { calculateActiveSynergies } from '@/data/synergies';

// Get all unit synergies from board
const unitSynergies = board.flat()
  .filter(u => u !== null)
  .flatMap(u => u.synergies);

// Calculate active synergies
const synergies = calculateActiveSynergies(unitSynergies);

// Filter only active
const active = synergies.filter(s => s.active);
```

### Economy Calculations
```typescript
import { calculateInterest, calculateRoundDamage } from '@/data/constants';

// Interest
const interest = calculateInterest(25); // 2 gold (25/10 = 2, max 3)

// Damage
const damage = calculateRoundDamage(10, 3); // 8 (5 + 3 surviving units)
```

## Constants Quick Access

```typescript
// Economy
GameData.constants.economy.STARTING_GOLD; // 3
GameData.constants.economy.BASE_GOLD_PER_ROUND; // 5
GameData.constants.economy.REROLL_COST; // 2
GameData.constants.economy.MAX_INTEREST; // 3

// Leveling
GameData.constants.leveling.MAX_LEVEL; // 9
GameData.constants.leveling.AUTO_XP_PER_ROUND; // 2

// Board
GameData.constants.board.TOTAL_SLOTS; // 8
GameData.constants.board.SHOP_SIZE; // 5

// Combat
GameData.constants.combat.MAX_TURNS; // 30
```

## Helper Functions

```typescript
// Interest calculation
calculateInterest(gold: number): number

// Round damage
calculateRoundDamage(round: number, survivingUnits: number): number

// XP for level
getXPForLevel(level: number): number

// Board slots for level
getBoardSlotsForLevel(level: number): number

// Upgraded stats
getUpgradedStats(baseAttack, baseHealth, stars): { attack, health }
```

## Unit Upgrade Logic

```typescript
import { combineUnits } from '@/data/units';

// Combine 3 same units
const [unit1, unit2, unit3] = bench.filter(u => u.name === 'Ronin Scout');
const upgraded = combineUnits([unit1, unit2, unit3]);

// upgraded.stars === 2 (if original was 1-star)
// upgraded.attack === original.attack * 1.8
```

## Shop Generation

```typescript
import { generateShop } from '@/data/examples';

// Generate shop based on player level
const shop = generateShop(5);
// Returns 5 units with tier probabilities: 40/40/20/0/0
```

## Income Calculation

```typescript
import { calculatePlayerIncome } from '@/data/examples';

const { total, breakdown } = calculatePlayerIncome(
  25,    // current gold
  true,  // is win
  3,     // win streak
  0      // lose streak
);

// breakdown:
// {
//   base: 5,
//   interest: 2,
//   winBonus: 2,
//   streakBonus: 2
// }
// total: 11
```

## Synergy Application

```typescript
import { applySynergyBonuses, getActiveSynergyBonuses } from '@/data/synergies';

const activeBonuses = getActiveSynergyBonuses(activeSynergies);
const { attack, health, bonusStats } = applySynergyBonuses(
  unit.attack,
  unit.health,
  unit.synergies,
  activeBonuses
);

// bonusStats: ['Warrior +3 ATK', 'Tank +5 HP']
```

## All 30 Units At a Glance

### Tier 1 (1g)
1. Pixel Farmer (2/4) - +1g on kill
2. Ronin Scout (3/3) - First strike
3. Baby Axie (2/5) - Taunt
4. Spirit Wisp (3/2) - Heal adjacent on death
5. Apprentice Mage (2/3) - Spark every 2nd
6. Shield Bearer (1/6) - Reduce damage
7. Pixel Archer (3/2) - Long range
8. Wild Pup (4/2) - Double first attack
9. Merchant (1/4) - 30% +1g
10. Shrine Maiden (2/3) - Buff ally every 3rd

### Tier 2 (2g)
1. Samurai Warrior (5/6) - Execute <20%
2. Evolved Axie (4/7) - +ATK when hit
3. Pixel Knight (3/8) - Taunt + reduce 1
4. Wind Dancer (6/4) - 40% dodge
5. Thunder Mage (5/5) - Chain lightning
6. Veteran Archer (4/5) - 30% double shot
7. Crystal Golem (2/10) - Reflect 2
8. Shadow Thief (7/3) - +2/+2 on kill

### Tier 3 (3g)
1. Blade Master (8/10) - AOE adjacent
2. Ancient Axie (6/12) - Regen 2
3. Pixel Wizard (7/8) - Polymorph
4. Night Stalker (10/6) - Crit + ignore taunt
5. Oracle (5/9) - Team +20% dodge
6. Siege Engine (4/14) - Pierce

### Tier 4 (4g)
1. Shogun (9/16) - Buff Warriors +3
2. Void Axie (11/14) - Lifesteal + heal
3. Pixel Titan (8/18) - Rage at 50%
4. Master Assassin (13/8) - Teleport stun

### Tier 5 (5g)
1. Dragon Lord (14/20) - Burn + AOE
2. Eternal Samurai (16/18) - Revive full

## All 15 Items At a Glance

### Offensive
1. Deathblade (+5 ATK, +1/kill)
2. Giant Slayer (+3 ATK, 15% max HP)
3. Infinity Edge (+4 ATK, 50% crit 3x)
4. Bloodthirster (+6 ATK, 35% lifesteal)
5. Last Whisper (+3 ATK, ignore 50% armor)

### Defensive
1. Guardian Angel (Revive 50%)
2. Thornmail (+5 HP, reflect 3)
3. Warmog's (+8 HP, regen 2)
4. Frozen Heart (+6 HP, slow 30%)
5. Dragon's Claw (+4 HP, 50% magic resist)

### Utility
1. Zephyr (Banish 2 turns)
2. Collector (+1g/kill)
3. Shroud (Silence 3 turns)
4. Statikk (+2 ATK, chain)
5. Chalice (Buff adjacent 30%)

## All 12 Synergies At a Glance

### Class (2-piece)
1. Warrior - Warriors +3 ATK
2. Tank - All +5 HP
3. Mage - Abilities -1 trigger
4. Assassin - Assassins +40% crit
5. Ranger - Rangers +50% speed
6. Support - Heal all 3 at start

### Origin (2-piece)
1. Samurai - Samurai +30% lifesteal
2. Pixels - +2g per win
3. Axie - Axie +20% stats
4. Mystic - Mystic +30% magic resist

### Special (1-piece)
1. Dragon - CC immune +25% damage
2. Legendary - Full ability charge

## Tier Probabilities

| Level | T1  | T2  | T3  | T4  | T5  |
|-------|-----|-----|-----|-----|-----|
| 1-2   | 100 | 0   | 0   | 0   | 0   |
| 3-4   | 70  | 30  | 0   | 0   | 0   |
| 5-6   | 40  | 40  | 20  | 0   | 0   |
| 7-8   | 20  | 30  | 35  | 15  | 0   |
| 9     | 10  | 20  | 30  | 30  | 10  |

## Star Upgrade Multipliers

| Stars | Copies | ATK Mult | HP Mult |
|-------|--------|----------|---------|
| 1     | 1      | 1.0x     | 1.0x    |
| 2     | 3      | 1.8x     | 1.8x    |
| 3     | 9      | 3.2x     | 3.2x    |

## Damage by Round

| Rounds  | Base | +Units | Example (3 alive) |
|---------|------|--------|-------------------|
| 1-4     | 2    | +3     | 5                 |
| 5-9     | 3    | +3     | 6                 |
| 10-14   | 5    | +3     | 8                 |
| 15-20   | 7    | +3     | 10                |
| 21+     | 10   | +3     | 13                |

## XP Requirements

| Level | XP Needed | Cumulative | Rounds to Auto-Level |
|-------|-----------|------------|----------------------|
| 1→2   | 2         | 2          | 1                    |
| 2→3   | 4         | 6          | 3                    |
| 3→4   | 4         | 10         | 5                    |
| 4→5   | 10        | 20         | 10                   |
| 5→6   | 16        | 36         | 18                   |
| 6→7   | 20        | 56         | 28                   |
| 7→8   | 24        | 80         | 40                   |
| 8→9   | 20        | 100        | 50                   |

## Board Slots by Level

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|-------|---|---|---|---|---|---|---|---|---|
| Slots | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 8 | 8 |

## Quick Validation

```typescript
import { validateGameData } from '@/data/examples';

const validation = validateGameData();
// {
//   units: { total: 30, expected: 30, valid: true },
//   items: { total: 15, expected: 15, valid: true },
//   synergies: { total: 12, expected: 12, valid: true },
//   tierDistribution: { tier1: 10, tier2: 8, ... }
// }
```

## File Locations

```
C:\Ronin\data\
├── constants.ts   - All game constants
├── abilities.ts   - Ability definitions
├── units.ts       - Unit definitions
├── items.ts       - Item definitions
├── synergies.ts   - Synergy definitions
├── index.ts       - Central exports
└── examples.ts    - Usage examples
```

## Type Imports

```typescript
import { Unit, Ability, Item, Synergy } from '@/types/game';
```

## Ready to Use

All data is production-ready and validated:
- 30 units balanced across 5 tiers
- 15 items with clear effects
- 12 synergies with 2-piece activation
- Complete economy system
- Fully typed and tested
