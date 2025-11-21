# 🎴 RONIN RUMBLE - Complete Unit Collection

## Unit Ability Triggers
- **On Attack**: Triggers every time unit attacks
- **On Hit**: Triggers when this unit takes damage
- **Every X**: Triggers every X attacks
- **On Death**: Triggers when unit dies
- **Start of Combat**: Triggers once at battle start
- **Conditional**: Based on HP, position, etc.

---

## ⭐ TIER 1 UNITS (1 Gold) - 10 Units
*Common units that form early game strategies*

### 1. **Pixel Farmer**
```yaml
Cost: 1 Gold
Stats: 2 ATK / 4 HP
Ability: Harvest
Trigger: On Kill
Effect: Gain 1 gold when this unit kills an enemy
Synergies: [Pixels, Support]
Strategy: Economy unit, position to get last hits
```

### 2. **Ronin Scout**
```yaml
Cost: 1 Gold
Stats: 3 ATK / 3 HP
Ability: Quick Strike
Trigger: Start of Combat
Effect: This unit attacks first in its position, ignoring speed
Synergies: [Samurai, Warrior]
Strategy: Good for securing first blood
```

### 3. **Baby Axie**
```yaml
Cost: 1 Gold
Stats: 2 ATK / 5 HP
Ability: Taunt
Trigger: Passive
Effect: All enemies must attack this unit if able
Synergies: [Axie, Tank]
Strategy: Protects valuable units behind it
```

### 4. **Spirit Wisp**
```yaml
Cost: 1 Gold
Stats: 3 ATK / 2 HP
Ability: Last Breath
Trigger: On Death
Effect: Heals adjacent allies for 3 HP
Synergies: [Mystic, Support]
Strategy: Fragile but provides value when dying
```

### 5. **Apprentice Mage**
```yaml
Cost: 1 Gold
Stats: 2 ATK / 3 HP
Ability: Spark
Trigger: Every 2nd Attack
Effect: Next attack deals +3 bonus magic damage
Synergies: [Mystic, Mage]
Strategy: Scales with attack speed buffs
```

### 6. **Shield Bearer**
```yaml
Cost: 1 Gold
Stats: 1 ATK / 6 HP
Ability: Shield Wall
Trigger: When Hit
Effect: Reduce next damage by 1 (stacks up to 3)
Synergies: [Samurai, Tank]
Strategy: Becomes tankier as fight progresses
```

### 7. **Pixel Archer**
```yaml
Cost: 1 Gold
Stats: 3 ATK / 2 HP
Ability: Long Shot
Trigger: Passive
Effect: Can attack from bottom row to top row
Synergies: [Pixels, Ranger]
Strategy: Safe backline damage
```

### 8. **Wild Pup**
```yaml
Cost: 1 Gold
Stats: 4 ATK / 2 HP
Ability: Frenzy
Trigger: First Attack Each Combat
Effect: Attacks twice on first attack
Synergies: [Axie, Warrior]
Strategy: Glass cannon opener
```

### 9. **Merchant**
```yaml
Cost: 1 Gold
Stats: 1 ATK / 4 HP
Ability: Trade Offer
Trigger: End of Round (if survived)
Effect: 30% chance to generate 1 gold
Synergies: [Pixels, Support]
Strategy: Backline economy engine
```

### 10. **Shrine Maiden**
```yaml
Cost: 1 Gold
Stats: 2 ATK / 3 HP
Ability: Blessing
Trigger: Every 3rd Attack
Effect: Random ally gains +2/+2 this combat
Synergies: [Mystic, Support]
Strategy: Buff generator for team
```

---

## ⭐⭐ TIER 2 UNITS (2 Gold) - 8 Units
*Solid mid-tier units with more complex abilities*

### 1. **Samurai Warrior**
```yaml
Cost: 2 Gold
Stats: 5 ATK / 6 HP
Ability: Honor Strike
Trigger: Every 3rd Attack
Effect: Execute enemies below 20% HP
Synergies: [Samurai, Warrior]
Strategy: Finisher unit
```

### 2. **Evolved Axie**
```yaml
Cost: 2 Gold
Stats: 4 ATK / 7 HP
Ability: Adaptation
Trigger: When Hit
Effect: Gains +1 ATK permanently (max +3 per combat)
Synergies: [Axie, Warrior]
Strategy: Gets stronger when focused
```

### 3. **Pixel Knight**
```yaml
Cost: 2 Gold
Stats: 3 ATK / 8 HP
Ability: Fortify
Trigger: Passive
Effect: Taunt + takes 1 less damage from all sources
Synergies: [Pixels, Tank]
Strategy: Premium tank
```

### 4. **Wind Dancer**
```yaml
Cost: 2 Gold
Stats: 6 ATK / 4 HP
Ability: Evasion
Trigger: When Targeted
Effect: 40% chance to dodge attacks
Synergies: [Mystic, Assassin]
Strategy: Annoying to kill
```

### 5. **Thunder Mage**
```yaml
Cost: 2 Gold
Stats: 5 ATK / 5 HP
Ability: Chain Lightning
Trigger: Every 2nd Attack
Effect: Damage jumps to nearest enemy (50% damage)
Synergies: [Mystic, Mage]
Strategy: Good vs clustered enemies
```

### 6. **Veteran Archer**
```yaml
Cost: 2 Gold
Stats: 4 ATK / 5 HP
Ability: Double Shot
Trigger: Every Attack
Effect: 30% chance to attack twice
Synergies: [Samurai, Ranger]
Strategy: Consistent DPS
```

### 7. **Crystal Golem**
```yaml
Cost: 2 Gold
Stats: 2 ATK / 10 HP
Ability: Reflect
Trigger: When Hit
Effect: Reflects 2 damage back to attacker
Synergies: [Mystic, Tank]
Strategy: Punishes high attack units
```

### 8. **Shadow Thief**
```yaml
Cost: 2 Gold
Stats: 7 ATK / 3 HP
Ability: Steal
Trigger: On Kill
Effect: Gains +2/+2 permanently
Synergies: [Pixels, Assassin]
Strategy: Snowball unit if protected
```

---

## ⭐⭐⭐ TIER 3 UNITS (3 Gold) - 6 Units
*Strong units that define mid-game compositions*

### 1. **Blade Master**
```yaml
Cost: 3 Gold
Stats: 8 ATK / 10 HP
Ability: Whirlwind
Trigger: Every 3rd Attack
Effect: Hits all adjacent enemies
Synergies: [Samurai, Warrior]
Strategy: Position centrally for maximum cleave
```

### 2. **Ancient Axie**
```yaml
Cost: 3 Gold
Stats: 6 ATK / 12 HP
Ability: Regeneration
Trigger: End of Each Position Activation
Effect: Heals 2 HP
Synergies: [Axie, Tank]
Strategy: Sustain tank
```

### 3. **Pixel Wizard**
```yaml
Cost: 3 Gold
Stats: 7 ATK / 8 HP
Ability: Polymorph
Trigger: Every 2nd Attack
Effect: Transform enemy into 1/1 sheep for 1 turn
Synergies: [Pixels, Mage]
Strategy: Neutralizes big threats
```

### 4. **Night Stalker**
```yaml
Cost: 3 Gold
Stats: 10 ATK / 6 HP
Ability: Assassinate
Trigger: First Attack
Effect: Always crits (2x damage) and ignores taunt
Synergies: [Samurai, Assassin]
Strategy: Backline killer
```

### 5. **Oracle**
```yaml
Cost: 3 Gold
Stats: 5 ATK / 9 HP
Ability: Foresight
Trigger: Start of Combat
Effect: All allies gain +20% dodge for 3 turns
Synergies: [Mystic, Support]
Strategy: Team-wide defensive buff
```

### 6. **Siege Engine**
```yaml
Cost: 3 Gold
Stats: 4 ATK / 14 HP
Ability: Bombardment
Trigger: Every Attack
Effect: Damages target and position behind it
Synergies: [Pixels, Tank]
Strategy: Pierce through formations
```

---

## ⭐⭐⭐⭐ TIER 4 UNITS (4 Gold) - 4 Units
*Elite units with game-changing abilities*

### 1. **Shogun**
```yaml
Cost: 4 Gold
Stats: 9 ATK / 16 HP
Ability: War Cry
Trigger: Start of Combat + Every 3rd Attack
Effect: All allied Warriors gain +3 ATK for 2 turns
Synergies: [Samurai, Warrior, Support]
Strategy: Warrior composition enabler
```

### 2. **Void Axie**
```yaml
Cost: 4 Gold
Stats: 11 ATK / 14 HP
Ability: Life Drain
Trigger: Every Attack
Effect: 50% Lifesteal + heals lowest HP ally for same amount
Synergies: [Axie, Mystic]
Strategy: Team sustain through damage
```

### 3. **Pixel Titan**
```yaml
Cost: 4 Gold
Stats: 8 ATK / 18 HP
Ability: Unstoppable
Trigger: When HP drops below 50%
Effect: Becomes immune to debuffs and gains +5 ATK
Synergies: [Pixels, Tank, Warrior]
Strategy: Stronger when damaged
```

### 4. **Master Assassin**
```yaml
Cost: 4 Gold
Stats: 13 ATK / 8 HP
Ability: Shadow Strike
Trigger: Every 2nd Attack
Effect: Teleports behind furthest enemy and stuns for 1 turn
Synergies: [Samurai, Assassin]
Strategy: Backline disruption
```

---

## ⭐⭐⭐⭐⭐ TIER 5 UNITS (5 Gold) - 2 Units
*Legendary units that can single-handedly win games*

### 1. **Dragon Lord**
```yaml
Cost: 5 Gold
Stats: 14 ATK / 20 HP
Ability: Inferno
Trigger: Every Attack + When Hit
Effect: Attack: Burns target for 3 damage/turn
       When Hit: Damages all enemies for 2
Synergies: [Mystic, Dragon]
Strategy: Massive AOE pressure
Special: Flying (ignores taunt)
```

### 2. **The Eternal Samurai**
```yaml
Cost: 5 Gold
Stats: 16 ATK / 18 HP
Ability: Undying Will
Trigger: On Death (Once per game)
Effect: Revives with 100% HP and +5 ATK, executes enemies below 40% HP
Synergies: [Samurai, Legendary]
Strategy: Must be killed twice
Special: Immune to instant kill effects
```

---

## 📊 Unit Distribution & Strategy

### Tier 1 Strategy (Early Game)
- **Economy**: Pixel Farmer, Merchant
- **Aggro**: Wild Pup, Ronin Scout
- **Defense**: Baby Axie, Shield Bearer
- **Support**: Spirit Wisp, Shrine Maiden

### Tier 2 Strategy (Early-Mid)
- **Upgrade Targets**: Evolved Axie, Shadow Thief (snowball)
- **Solid Tanks**: Pixel Knight, Crystal Golem
- **DPS**: Veteran Archer, Thunder Mage

### Tier 3 Strategy (Mid Game)
- **Power Spikes**: Night Stalker, Blade Master
- **Control**: Pixel Wizard (polymorph)
- **Sustain**: Ancient Axie, Oracle

### Tier 4 Strategy (Late Game)
- **Win Conditions**: Shogun (warrior buff), Void Axie (team healing)
- **Carries**: Master Assassin, Pixel Titan

### Tier 5 Strategy (End Game)
- **Game Enders**: Both units can 1v3 if protected
- **Counter Play**: Must be dealt with immediately

---

## 🎮 Ability Timing Examples

### Combat Round Example:
```
Position 1 Activates:
- Ronin Scout attacks first (Quick Strike)
- Enemy unit attacks
- Both take damage

Position 2 Activates:
- Thunder Mage attacks (1st attack)
- Enemy attacks
- Thunder Mage marked for chain lightning next attack

Position 3 Activates:
- Blade Master attacks (2nd attack this combat)
- Enemy attacks
- Blade Master at 2/3 for Whirlwind

Position 4 Activates:
- Ancient Axie attacks
- Enemy attacks
- Ancient Axie heals 2 HP (Regeneration)
```

---

## ⚖️ Balance Notes

### Power Scaling
- Tier 1: 5-7 total stats, simple abilities
- Tier 2: 10-12 total stats, moderate abilities
- Tier 3: 15-18 total stats, strong abilities
- Tier 4: 23-26 total stats, very strong abilities
- Tier 5: 32-34 total stats, game-ending abilities

### Ability Power Budget
- Tier 1: Worth ~2-3 stats
- Tier 2: Worth ~4-5 stats
- Tier 3: Worth ~6-8 stats
- Tier 4: Worth ~10-12 stats
- Tier 5: Worth ~15+ stats

### Synergy Distribution
- Warriors: 8 units (good early-late)
- Tanks: 7 units (defensive option)
- Assassins: 5 units (high risk/reward)
- Mages: 4 units (ability focused)
- Rangers: 3 units (consistent damage)
- Support: 6 units (team buffs)

---

## 🔧 Implementation Notes

### Ability Trigger System
```typescript
interface UnitAbility {
  name: string
  trigger: 'onAttack' | 'onHit' | 'everyX' | 'onDeath' | 'onKill' | 'startCombat' | 'conditional'
  triggerCount?: number  // For "every X" abilities
  effect: () => void
  description: string
}

class Unit {
  attackCounter: number = 0
  hitCounter: number = 0
  
  processAttack() {
    this.attackCounter++
    if (this.ability.trigger === 'everyX' && 
        this.attackCounter % this.ability.triggerCount === 0) {
      this.ability.effect()
    }
  }
}
```

### Rarity in Shop
```typescript
const TIER_1_POOL = {
  'Pixel Farmer': 45,
  'Ronin Scout': 45,
  'Baby Axie': 45,
  // ... all 10 Tier 1 units
}

// Shop generation weights
function getShopWeights(playerLevel: number) {
  return {
    1: playerLevel <= 2 ? 100 : // Level 1-2: 100% Tier 1
       playerLevel <= 4 ? 70 :  // Level 3-4: 70% Tier 1
       playerLevel <= 6 ? 40 :  // Level 5-6: 40% Tier 1
       20,                       // Level 7+: 20% Tier 1
    // ... etc for other tiers
  }
}
```

---

This unit collection provides variety in playstyles, clear upgrade paths, and interesting decisions at every tier!
