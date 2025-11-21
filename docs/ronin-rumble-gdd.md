# 🎮 RONIN RUMBLE - Complete Game Design Document

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Core Game Design](#core-game-design)
3. [Combat System](#combat-system)
4. [Units & Economy](#units--economy)
5. [Items & Synergies](#items--synergies)
6. [Monetization](#monetization)
7. [Technical Architecture](#technical-architecture)
8. [Development Plan](#development-plan)

---

## Executive Summary

### 📝 Game Overview
- **Game Type**: Card-based Autobattler
- **Players**: 6-player competitive lobbies
- **Match Duration**: 10-15 minutes
- **Platform**: Web3 (Ronin Chain)
- **Revenue Model**: Skill-based wagering + cosmetics
- **Target**: ETHGlobal Buenos Aires Hackathon

### 🎯 Core Hook
Fast-paced autobattler where players can't counter-build against a single opponent - you face all 5 others throughout the match, requiring versatile strategies.

### 🔗 Blockchain Integration
- **Ronin**: Main game logic, NFTs, wallet integration
- **Flare**: RNG for shop, combat, matchmaking (every 90 seconds)
- **Filecoin**: Store match replays, statistics, AI training data

---

## Core Game Design

### ⏱️ Match Flow
```
Total Duration: 10-15 minutes
Round Length: 30-35 seconds each

Planning Phase: 20 seconds
- Buy/sell units from shop
- Position units on board
- Equip items
- Scout opponents

Combat Phase: 10-15 seconds (automatic)
- Position-based activation
- Fast animations
- Simultaneous attacks

Transition: 2 seconds
- Damage calculation
- Gold awarded
- Next round starts
```

### 🎮 Round Structure
```
Rounds 1-3:   PvE Creeps (items + gold)
Round 4:      First PvP begins
Rounds 5-8:   PvP rounds (rotating opponents)
Round 9:      Boss fight (major items)
Rounds 10-14: PvP rounds
Round 15:     Second Boss
Rounds 16-20: PvP rounds
Round 21+:    Sudden death damage increase
```

### 📊 6-Player Lobby Mechanics
- Players fight different opponents each round
- Can't fight same opponent twice in 3 rounds
- Uses Flare RNG for matchmaking
- Ghost armies if odd number alive
- Last player standing wins

---

## Combat System

### ⚔️ Board Layout
```
Size: 8 slots total
- 4 slots top row
- 4 slots bottom row

Visual Layout:
[1][2][3][4]  ← Top Row
[5][6][7][8]  ← Bottom Row

Activation Order:
Positions 1-2 → 3-4 → 5-6 → 7-8
(Both players' same positions fire simultaneously)
```

### 🎯 Targeting System
```
Default Priority:
1. Direct opposite position
2. Enemy frontline (leftmost unit)
3. Enemy hero (if no units remain)

Special Targeting:
- Taunt: Forces all enemies to attack this unit
- Flying: Ignores taunt, can hit any target
- Pierce: Damages target AND unit behind
- Cleave: Hits target and adjacent units
- Sniper: Always hits enemy backline
```

### 💔 Hero Damage
```
Starting HP: 20 (not 100 for faster games)

Damage Formula:
Rounds 1-4:   2 + surviving enemy units
Rounds 5-9:   3 + surviving enemy units
Rounds 10-14: 5 + surviving enemy units
Rounds 15+:   7 + surviving enemy units

Example: Win with 3 units alive in round 10 = 5 + 3 = 8 damage
```

---

## Units & Economy

### 🎴 Unit System

#### Unit Tiers (20 total units)
```
Tier 1 (1 gold): 5 units
- Stats: 2-3 ATK, 3-5 HP
- Simple abilities
- Early game fodder

Tier 2 (2 gold): 5 units
- Stats: 4-5 ATK, 5-8 HP
- Useful abilities
- Early-mid transition

Tier 3 (3 gold): 5 units
- Stats: 6-8 ATK, 8-12 HP
- Strong abilities
- Mid game core

Tier 4 (4 gold): 3 units
- Stats: 8-10 ATK, 12-18 HP
- Powerful abilities
- Late game threats

Tier 5 (5 gold): 2 units
- Stats: 10-15 ATK, 18-25 HP
- Game-changing abilities
- Match enders
```

#### Star Upgrades
```
⭐   = Base unit
⭐⭐  = 3 copies combined (1.8x stats)
⭐⭐⭐ = 9 copies combined (3.2x stats)

Example: Tier 3 unit (6 ATK, 10 HP)
⭐   = 6 ATK, 10 HP
⭐⭐  = 11 ATK, 18 HP
⭐⭐⭐ = 19 ATK, 32 HP
```

### 💰 Economy System

#### Gold Income
```
Base per round:     5 gold
Win bonus:          2 gold
Interest:           +1 per 10g (max +3 at 30g)
Win streak (2+):    +2 gold
Loss streak (2+):   +2 gold
Creep rounds:       3-10 gold based on performance

Average income: 8-10 gold per round
```

#### Gold Spending
```
Buy unit:       1-5 gold (based on tier)
Reroll shop:    2 gold
Buy XP:         4 gold = 4 XP
Sell unit:      100% refund
```

### 📈 Leveling System
```
Auto XP: 2 per round
Max Level: 9

Level | Slots | Shop Probabilities (T1/T2/T3/T4/T5)
------|-------|-------------------------------------
1-2   | 2-3   | 100/0/0/0/0
3-4   | 4-5   | 70/30/0/0/0
5-6   | 6-7   | 40/40/20/0/0
7-8   | 8     | 20/30/35/15/0
9     | 8     | 10/20/30/30/10
```

### 🛍️ Shop System
```
Shop Size: 5 units offered
Reroll Cost: 2 gold
Shared Pool: All 6 players draw from same pool

Unit Pool Limits:
- Tier 1: 45 copies of each
- Tier 2: 30 copies of each
- Tier 3: 20 copies of each
- Tier 4: 15 copies of each
- Tier 5: 10 copies of each
```

---

## Items & Synergies

### 💎 Item System

#### Rules
```
- 1 item max per unit (simplified for speed)
- Items drop from creep rounds
- Cannot remove item without selling unit
- Items transfer when units upgrade
- 8 total different items (not 20+)
```

#### Item List
```
OFFENSIVE:
- Deathblade: +5 ATK, +1 per kill (stacks)
- Giant Slayer: +3 ATK, deals 15% max HP bonus
- Infinity Edge: +4 ATK, 50% crit, 3x crit damage

DEFENSIVE:
- Guardian Angel: Revive once with 50% HP
- Thornmail: +5 HP, reflects 3 damage
- Warmog's: +8 HP, regenerate 2 HP/round

UTILITY:
- Zephyr: Banish opposite unit for 2 turns
- Collector: +1 gold per kill
```

#### Creep Rounds & Item Drops
```
Round 1:  2 Wolves → 1 offensive item + 3 gold
Round 3:  3 Goblins → 1 defensive item + 4 gold
Round 5:  1 Orc → 1 utility item + 5 gold
Round 9:  1 Golem → 2 items (choose) + 7 gold
Round 15: 1 Dragon → 1 rare item + 10 gold
Round 20: 1 Void Lord → Special item + 15 gold
```

### 🎯 Synergies (2-Piece Only)

#### Class Synergies
```
Warriors (2): All warriors gain +3 Attack
Rangers (2):  Rangers gain +50% attack speed
Tanks (2):    All units gain +5 HP
Mages (2):    Abilities cost -1 mana
Assassins (2): Assassins gain 40% crit chance
```

#### Origin Synergies
```
Samurai (2): Units gain 30% lifesteal
Pixels (2):  +2 gold per win
Axie (2):    All units gain +20% stats
```

---

## Monetization

### 💸 Entry Fee Structure

#### Stake Levels
```
FREE PRACTICE:
- No entry fee, no rewards
- Shows ads between games
- Good for learning

LOW STAKES (2 RON):
Pool: 12 RON
- 1st: 8 RON (4x return)
- 2nd: 2 RON (break even)
- 3rd: 0 RON
- Platform: 2 RON (16%)

MEDIUM STAKES (10 RON):
Pool: 60 RON
- 1st: 40 RON (4x return)
- 2nd: 10 RON (break even)
- 3rd: 5 RON (50% back)
- Platform: 5 RON (8.3%)

HIGH STAKES (50 RON):
Pool: 300 RON
- 1st: 180 RON (3.6x)
- 2nd: 75 RON (1.5x)
- 3rd: 25 RON (0.5x)
- Platform: 20 RON (6.6%)
```

### 🎨 Non-P2W Monetization

#### Battle Pass ($10/month)
```
FREE TRACK:
- Basic card backs
- Simple emotes
- XP boosts (cosmetic only)

PREMIUM TRACK:
- Animated card arts
- Board skins
- Victory animations
- Music packs
- Particle effects
```

#### Direct Purchases
```
Card Skins: $2-5 each
Board Themes: $5-10
Emote Packs: $3
Premium Sub: $10/month (10% rakeback + perks)
```

### 🚫 What We DON'T Sell (No P2W)
```
❌ Extra starting gold
❌ Better shop odds
❌ Stronger units
❌ Extra item drops
❌ More rerolls
❌ Larger bench
❌ Faster XP gain
❌ Any gameplay advantages
```

---

## Technical Architecture

### 🏗️ Tech Stack

#### Frontend
```yaml
Framework: Next.js 14+ (App Router)
Language: TypeScript
Styling: Tailwind CSS + Framer Motion
State: Zustand
Web3: Wagmi v2 + Viem
WebSocket: Socket.io-client
```

#### Backend
```yaml
API: Next.js API Routes
Game Server: Node.js + Socket.io
Database: PostgreSQL (Supabase)
Cache: Redis (Upstash)
File Storage: IPFS (Filecoin)
```

#### Blockchain
```yaml
Ronin: Game contracts, NFTs
Flare: RNG provider
Filecoin: Replay storage
Tools: Hardhat, OpenZeppelin
```

### 📁 Project Structure
```
ronin-rumble/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (game)/
│   │   │   │   ├── lobby/
│   │   │   │   ├── match/[id]/
│   │   │   │   └── replay/[id]/
│   │   │   └── api/
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── Board.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Shop.tsx
│   │   │   │   └── Timer.tsx
│   │   │   └── ui/
│   │   └── hooks/
│   └── game-server/            # WebSocket server
├── packages/
│   ├── contracts/              # Smart contracts
│   └── shared/                 # Shared types
└── package.json
```

### 🎮 Core Game State
```typescript
interface GameState {
  // Match
  matchId: string
  round: number
  phase: 'PLANNING' | 'COMBAT' | 'TRANSITION'
  timeRemaining: number
  
  // Player
  health: number
  gold: number
  level: number
  xp: number
  
  // Board
  board: {
    top: (Card | null)[]    // 4 slots
    bottom: (Card | null)[]  // 4 slots
  }
  
  // Shop & Inventory
  shop: Card[]              // 5 cards
  bench: Card[]            // Units not on board
  items: Item[]            // Unequipped items
  
  // Opponents
  opponents: OpponentState[]
}
```

### 🔌 WebSocket Events
```typescript
// Client → Server
JOIN_QUEUE = 'join_queue'
BUY_CARD = 'buy_card'
SELL_CARD = 'sell_card'
PLACE_CARD = 'place_card'
REROLL_SHOP = 'reroll_shop'
EQUIP_ITEM = 'equip_item'

// Server → Client
MATCH_FOUND = 'match_found'
ROUND_START = 'round_start'
COMBAT_START = 'combat_start'
DAMAGE_DEALT = 'damage_dealt'
PLAYER_ELIMINATED = 'player_eliminated'
MATCH_END = 'match_end'
```

### 💾 Database Schema
```sql
-- Core tables
players (id, wallet_address, rating, stats)
matches (id, entry_fee, status, replay_cid)
match_participants (match_id, player_id, placement, payout)
round_analytics (match_id, round, events)
```

### ⚙️ Smart Contracts

#### Main Game Contract
```solidity
contract RoninRumble {
    struct Match {
        address[6] players;
        uint256 entryFee;
        uint256 prizePool;
        uint8[6] placements;
        bool isComplete;
        uint256 randomSeed;  // From Flare
    }
    
    function joinQueue(uint256 entryFee) external payable;
    function submitMatchResult(uint256 matchId, uint8[6] placements) external;
    function claimRewards(uint256 matchId) external;
}
```

#### Flare RNG Integration
```solidity
contract GameRNG {
    IFlareRandom flareRandom;
    
    function generateShop(uint256 seed, uint8 playerLevel) 
        external view returns (uint8[5] memory);
    
    function calculateCombatRNG(uint256 seed) 
        external view returns (bool crit, bool dodge);
}
```

#### Filecoin Storage Integration
```typescript
class ReplayStorage {
    async saveReplay(matchData: MatchData): Promise<string> {
        // Compress and store on IPFS
        const cid = await web3storage.put(matchData)
        return cid
    }
    
    async getReplay(cid: string): Promise<MatchData> {
        // Retrieve from IPFS
        return await web3storage.get(cid)
    }
}
```

---

## Development Plan

### 🚀 3-Week Sprint Schedule

#### Week 1: Core Infrastructure
```
Day 1-2: Project setup, wallet connection
Day 3-4: Game state, WebSocket server
Day 5-7: UI components, drag-and-drop
```

#### Week 2: Game Logic
```
Day 8-9: Combat engine, abilities
Day 10-11: Smart contracts, Flare RNG
Day 12-14: Synergies, items, economy
```

#### Week 3: Polish & Integration
```
Day 15-16: Filecoin storage, leaderboards
Day 17-18: Animations, sound, polish
Day 19-20: Testing, bug fixes
Day 21: Hackathon submission
```

### 🎯 MVP Features (Must Have)
- [x] 6-player lobbies
- [x] 20 units across 5 tiers
- [x] 8-slot board combat
- [x] Position-based activation
- [x] Shop with Flare RNG
- [x] 8 items dropping from creeps
- [x] 2-piece synergies
- [x] Ronin wallet integration
- [x] Basic animations
- [x] Match replays on Filecoin

### 🏆 Success Metrics
```
Performance:
- 60 FPS during combat
- <100ms action response
- <3s matchmaking

Gameplay:
- 10-15 minute matches
- All 3 blockchains integrated
- Fair, skill-based outcomes
- No P2W elements

User Experience:
- Smooth animations
- Mobile responsive
- Clear UI/UX
- Quick decisions under pressure
```

---

## Key Differentiators

### Why This Game Wins

1. **Fast & Intense**: 10-15 minute matches vs 30-40 typical
2. **Anti-Counter Strategy**: Face all opponents, not just one
3. **Simplified Complexity**: Only 2-piece synergies, 1 item per unit
4. **Perfect for Web3**: Natural wagering, NFT cosmetics, replay storage
5. **Hackathon Ready**: Hits all 3 sponsor requirements perfectly

### Blockchain Integration Value
- **Ronin**: Fast, cheap transactions for gaming
- **Flare**: Verifiable randomness every 90 seconds
- **Filecoin**: Permanent replay storage for analysis

---

## Contact & Resources

### Team
- Developer: Boris
- Target Event: ETHGlobal Buenos Aires
- Timeline: 3 weeks to hackathon

### Resources Needed
- Ronin testnet tokens
- Flare API access
- Filecoin storage quota
- Basic server for WebSocket (can use Vercel)

### Next Steps
1. Set up Next.js project with TypeScript
2. Create basic UI components
3. Implement game state management
4. Build WebSocket server
5. Deploy smart contracts
6. Integrate blockchain features
7. Polish and optimize
8. Create demo video

---

*This document represents the complete game design for Ronin Rumble, a competitive Web3 autobattler designed for the ETHGlobal Buenos Aires hackathon.*
