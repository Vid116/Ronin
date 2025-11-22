# Ronin Rumble - Game Data Layer

Complete data definitions for all game content including units, abilities, items, synergies, and constants.

## Structure

```
/data/
  ├── constants.ts   # Game constants (economy, leveling, combat)
  ├── abilities.ts   # 40+ ability definitions
  ├── units.ts       # 30 units across 5 tiers
  ├── items.ts       # 15 items (offensive, defensive, utility)
  ├── synergies.ts   # 12 faction synergies
  ├── index.ts       # Central exports
  └── README.md      # This file
```

## Usage

### Import Everything

```typescript
import GameData from '@/data';

// Access units
const tier1Units = GameData.units.byTier[1];
const dragonLord = GameData.units.getByName('Dragon Lord');

// Access items
const allItems = GameData.items.all;
const itemDrop = GameData.items.getDropForRound(9);

// Access synergies
const synergies = GameData.synergies.calculateActive(unitSynergies);

// Access constants
const goldPerRound = GameData.constants.economy.BASE_GOLD_PER_ROUND;
```

### Import Specific Modules

```typescript
import { TIER_1_UNITS, createUnitInstance } from '@/data/units';
import { ALL_ITEMS, getItemById } from '@/data/items';
import { calculateActiveSynergies } from '@/data/synergies';
import { ECONOMY, calculateInterest } from '@/data/constants';
```

## Units (30 Total)

### Tier 1 (10 units, 1 gold each)
- Pixel Farmer - Economy (Harvest: +1g on kill)
- Ronin Scout - First strike
- Baby Axie - Taunt tank
- Spirit Wisp - Death heal
- Apprentice Mage - Spark damage
- Shield Bearer - Damage reduction
- Pixel Archer - Long range
- Wild Pup - Double attack opener
- Merchant - Gold generation
- Shrine Maiden - Buff allies

### Tier 2 (8 units, 2 gold each)
- Samurai Warrior - Execute low HP
- Evolved Axie - Gain ATK when hit
- Pixel Knight - Taunt + damage reduction
- Wind Dancer - 40% dodge
- Thunder Mage - Chain lightning
- Veteran Archer - 30% double shot
- Crystal Golem - Reflect damage
- Shadow Thief - Gain stats on kill

### Tier 3 (6 units, 3 gold each)
- Blade Master - AOE cleave
- Ancient Axie - Regeneration
- Pixel Wizard - Polymorph enemy
- Night Stalker - Guaranteed crit
- Oracle - Team dodge buff
- Siege Engine - Pierce damage

### Tier 4 (4 units, 4 gold each)
- Shogun - Buff Warriors
- Void Axie - Lifesteal + heal ally
- Pixel Titan - Rage mode at 50% HP
- Master Assassin - Teleport + stun

### Tier 5 (2 units, 5 gold each)
- Dragon Lord - AOE burn + damage
- The Eternal Samurai - Revive with full HP

## Abilities (40+ Total)

### Trigger Types
- `onAttack` - Every time unit attacks
- `onHit` - When unit takes damage
- `everyX` - Every X attacks (2nd, 3rd, etc.)
- `onDeath` - When unit dies
- `onKill` - When unit kills enemy
- `startCombat` - Once at battle start
- `conditional` - Based on HP, position, etc.

### Examples

```typescript
// Simple ability
const HARVEST: Ability = {
  name: 'Harvest',
  description: 'Gain 1 gold when this unit kills an enemy',
  trigger: 'onKill',
  effect: 'GAIN_GOLD_1',
};

// Every X ability
const WHIRLWIND: Ability = {
  name: 'Whirlwind',
  description: 'Every 3rd attack hits all adjacent enemies',
  trigger: 'everyX',
  triggerCount: 3,
  effect: 'CLEAVE_ADJACENT',
};
```

## Items (15 Total)

### Offensive (5 items)
- **Deathblade**: +5 ATK, +1 per kill (infinite stacks)
- **Giant Slayer**: +3 ATK, deals 15% max HP bonus
- **Infinity Edge**: +4 ATK, 50% crit, 3x crit damage
- **Bloodthirster**: +6 ATK, 35% lifesteal
- **Last Whisper**: +3 ATK, ignore 50% armor

### Defensive (5 items)
- **Guardian Angel**: Revive once with 50% HP
- **Thornmail**: +5 HP, reflects 3 damage
- **Warmog's Armor**: +8 HP, regen 2 HP/turn
- **Frozen Heart**: +6 HP, slow adjacent enemies 30%
- **Dragon's Claw**: +4 HP, 50% magic resist

### Utility (5 items)
- **Zephyr**: Banish opposite unit for 2 turns
- **The Collector**: +1 gold per kill
- **Shroud of Stillness**: Silence adjacent 3 turns
- **Statikk Shiv**: +2 ATK, chain lightning every 3rd
- **Chalice of Power**: Buff adjacent allies 30%

### Item Drops by Round

```typescript
Round 1:  Offensive item (Deathblade, Bloodthirster, Last Whisper)
Round 3:  Defensive item (Guardian Angel, Thornmail, Warmog's)
Round 5:  Utility item (Zephyr, Collector, Statikk Shiv)
Round 9:  Choice of 2 items (rare pool)
Round 15: Rare item (Infinity Edge, Guardian Angel, Giant Slayer, Chalice)
```

## Synergies (12 Total)

### Class Synergies (2-piece)
- **Warrior**: All Warriors +3 ATK
- **Tank**: All units +5 HP
- **Mage**: Abilities trigger 1 attack earlier
- **Assassin**: Assassins +40% crit
- **Ranger**: Rangers +50% attack speed
- **Support**: Heal all allies 3 HP at start

### Origin Synergies (2-piece)
- **Samurai**: Samurai units +30% lifesteal
- **Pixels**: +2 gold per win
- **Axie**: Axie units +20% stats
- **Mystic**: Mystic units +30% magic resist

### Special Synergies (1-piece)
- **Dragon**: CC immunity + 25% damage
- **Legendary**: Start with full ability charge

### Usage

```typescript
import { calculateActiveSynergies, applySynergyBonuses } from '@/data/synergies';

// Get all synergies from board
const unitSynergies = board.flat()
  .filter(u => u !== null)
  .flatMap(u => u.synergies);

// Calculate which are active
const activeSynergies = calculateActiveSynergies(unitSynergies);

// Apply bonuses to unit
const { attack, health } = applySynergyBonuses(
  unit.attack,
  unit.health,
  unit.synergies,
  activeSynergies
);
```

## Constants

### Economy
```typescript
ECONOMY.STARTING_GOLD = 3
ECONOMY.BASE_GOLD_PER_ROUND = 5
ECONOMY.WIN_BONUS = 2
ECONOMY.MAX_INTEREST = 3 (1g per 10 saved)
ECONOMY.REROLL_COST = 2
ECONOMY.XP_BUY_COST = 4
```

### Leveling
```typescript
LEVELING.AUTO_XP_PER_ROUND = 2
LEVELING.MAX_LEVEL = 9
LEVELING.BOARD_SLOTS = [0, 2, 3, 4, 5, 6, 7, 8, 8]
```

### Tier Probabilities
```typescript
Level 1-2: 100/0/0/0/0  (100% Tier 1)
Level 3-4: 70/30/0/0/0
Level 5-6: 40/40/20/0/0
Level 7-8: 20/30/35/15/0
Level 9:   10/20/30/30/10
```

### Star Upgrades
```typescript
1-star = 1.0x stats
2-star = 1.8x stats (3 copies)
3-star = 3.2x stats (9 copies)
```

### Combat
```typescript
COMBAT.MAX_TURNS = 30
COMBAT.TURN_DURATION_MS = 500
```

### Damage Scaling
```typescript
Rounds 1-4:   2 + surviving units
Rounds 5-9:   3 + surviving units
Rounds 10-14: 5 + surviving units
Rounds 15+:   7 + surviving units
Rounds 21+:   10 + surviving units (sudden death)
```

## Helper Functions

### Constants
```typescript
calculateInterest(gold: number): number
calculateRoundDamage(round: number, survivingUnits: number): number
getXPForLevel(level: number): number
getBoardSlotsForLevel(level: number): number
getUpgradedStats(baseAttack, baseHealth, stars): { attack, health }
```

### Units
```typescript
createUnitInstance(template, stars): Unit
getUnitByName(name: string): Unit
getUnitsByTier(tier: 1-5): Unit[]
getUnitsBySynergy(synergy: string): Unit[]
canCombineUnits(units: Unit[]): boolean
combineUnits(units: [Unit, Unit, Unit]): Unit
```

### Items
```typescript
getItemById(id: string): Item
getItemsByType(type): Item[]
getItemDropForRound(round: number): Item | Item[]
getRandomItem(type?): Item
```

### Synergies
```typescript
calculateActiveSynergies(synergies: string[]): Synergy[]
getActiveSynergyBonuses(synergies: Synergy[]): SynergyBonus[]
applySynergyBonuses(attack, health, unitSynergies, bonuses): { attack, health, bonusStats }
getSynergySuggestions(synergies: Synergy[]): { synergy, needed }[]
```

## Unit Pool

```typescript
TIER_1: 45 copies per unit (450 total)
TIER_2: 30 copies per unit (240 total)
TIER_3: 20 copies per unit (120 total)
TIER_4: 15 copies per unit (60 total)
TIER_5: 10 copies per unit (20 total)
```

## Example: Creating a Shop

```typescript
import GameData from '@/data';

function generateShop(playerLevel: number): Unit[] {
  const shop: Unit[] = [];
  const probabilities = GameData.constants.tierProbabilities[playerLevel];

  for (let i = 0; i < 5; i++) {
    // Roll tier based on probabilities
    const tier = rollTier(probabilities);

    // Get random unit from tier
    const units = GameData.units.getByTier(tier);
    const randomUnit = units[Math.floor(Math.random() * units.length)];

    // Create instance
    shop.push(GameData.units.createInstance(randomUnit));
  }

  return shop;
}
```

## Example: Combat Damage

```typescript
import { calculateRoundDamage } from '@/data/constants';

function calculatePlayerDamage(round: number, enemyBoard: Unit[]) {
  const survivingUnits = enemyBoard.filter(u => u.currentHealth > 0).length;
  return calculateRoundDamage(round, survivingUnits);
}

// Round 10, enemy has 3 units alive
const damage = calculatePlayerDamage(10, enemyBoard); // 5 + 3 = 8 damage
```

## Type Safety

All data is fully typed using TypeScript interfaces from `@/types/game.ts`:

- `Unit`: Complete unit with stats, ability, synergies
- `Ability`: Ability with trigger and effect
- `Item`: Item with type, stats, effect
- `Synergy`: Synergy with requirements and effects

## Testing

```typescript
import GameData from '@/data';

// Verify unit counts
console.log(GameData.units.byTier[1].length); // 10
console.log(GameData.units.byTier[2].length); // 8
console.log(GameData.units.byTier[3].length); // 6
console.log(GameData.units.byTier[4].length); // 4
console.log(GameData.units.byTier[5].length); // 2
console.log(GameData.units.all.length);       // 30

// Verify items
console.log(GameData.items.byType.offensive.length);  // 5
console.log(GameData.items.byType.defensive.length);  // 5
console.log(GameData.items.byType.utility.length);    // 5
console.log(GameData.items.all.length);               // 15

// Verify synergies
console.log(GameData.synergies.byType.class.length);  // 6
console.log(GameData.synergies.byType.origin.length); // 6
console.log(GameData.synergies.all.length);           // 12
```

## Notes

- All units balanced according to tier power budget
- Abilities use effect strings (to be processed by combat engine)
- Items can only equip 1 per unit (simplified system)
- Synergies require exactly 2 pieces to activate (except special)
- Star upgrades use fixed multipliers (1.8x for 2-star, 3.2x for 3-star)
- Unit pool is shared across all players in lobby
