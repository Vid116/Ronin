# Game Server Architecture

Complete auto-battler game server implementation for Ronin, a blockchain-based auto-chess game.

## Architecture Overview

The game server is built with a modular architecture, separating concerns into specialized systems:

```
server/
├── index.ts              # WebSocket server & event routing
└── game/
    ├── MatchMaking.ts    # Queue management & match creation
    ├── GameRoom.ts       # Main game room orchestrator
    ├── ShopGenerator.ts  # Tier-based card shop generation
    ├── EconomyManager.ts # Gold, XP, interest, streaks
    ├── RoundManager.ts   # Phase transitions & timing
    ├── StateSync.ts      # Client state synchronization
    └── CombatSimulator.ts # Battle simulation engine
```

## System Components

### 1. MatchMaking.ts
**Manages player queue and match creation**

- Queues players waiting to join a match
- Creates matches when 6 players are available
- Handles player disconnections from queue
- Tracks active matches
- Provides match lookup by player ID

**Key Methods:**
- `addToQueue(socketId, entryFee)` - Add player to queue
- `removeFromQueue(socketId)` - Remove player from queue
- `handleDisconnect(socketId)` - Handle player disconnect
- `getMatchByPlayer(socketId)` - Get active match for player

### 2. GameRoom.ts
**Main game orchestrator - manages entire match lifecycle**

Coordinates all game systems and handles player actions during a match.

**Player Actions:**
- `handleBuyCard(socketId, cardIndex)` - Purchase card from shop
- `handleSellCard(socketId, unitId)` - Sell unit for gold
- `handlePlaceCard(socketId, unitId, position)` - Place unit on board
- `handleRerollShop(socketId)` - Reroll shop (costs 2 gold)
- `handleBuyXP(socketId)` - Buy 4 XP for 4 gold
- `handleReady(socketId)` - Mark player as ready for combat

**Game Flow:**
1. Initialize match with 6 players
2. Start round 1 in planning phase
3. Generate shops for all players
4. Players buy/sell/place cards
5. Transition to combat phase
6. Simulate all battles
7. Apply damage and update streaks
8. Check for eliminations
9. Transition to next round
10. Repeat until 1 player remains

### 3. ShopGenerator.ts
**Generates tier-based card shops**

**Tier Probabilities by Level:**
```
Level 1:  100% T1
Level 3:  75% T1, 25% T2
Level 5:  35% T1, 35% T2, 25% T3, 5% T4
Level 7:  20% T1, 30% T2, 33% T3, 15% T4, 2% T5
Level 9:  10% T1, 15% T2, 30% T3, 30% T4, 13% T5, 2% T6
Level 10: 5% T1, 10% T2, 20% T3, 35% T4, 25% T5, 5% T6
```

**Card Pool:**
- Tier 1: Samurai, Ninja, Monk, Archer (1 gold)
- Tier 2: Ronin, Shrine Maiden, Shinobi (2 gold)
- Tier 3: Oni, Kitsune (3 gold)
- Tier 4: Dragon Samurai, Yokai Hunter (4 gold)
- Tier 5: Shogun, Celestial Dragon (5 gold)
- Tier 6: Susanoo, Amaterasu (6 gold)

**Key Methods:**
- `generateShop(playerLevel, shopSize)` - Generate 5 cards based on level
- `addCardToPool(tier, card)` - Add custom card to pool

### 4. EconomyManager.ts
**Manages all economic systems**

**Gold Income:**
- Base income: 5 gold per round
- Interest: 1 gold per 10 saved (max 5 gold)
- Win streak bonus: 1-5 gold based on streak length
- Lose streak compensation: 1-5 gold based on streak length

**Win/Lose Streak Bonuses:**
```
2-3 streak: +1 gold
4-5 streak: +2 gold
6-7 streak: +3 gold
8-9 streak: +4 gold
10+ streak: +5 gold
```

**XP System:**
- Cost: 4 gold = 4 XP
- Level thresholds:
  - Level 2: 2 XP
  - Level 3: 6 XP
  - Level 4: 10 XP
  - Level 5: 20 XP
  - Level 6: 36 XP
  - Level 7: 56 XP
  - Level 8: 80 XP
  - Level 9: 108 XP
  - Level 10: 140 XP (max)

**Board Size:**
- Fixed at 8 units (all board positions available from start)
- Independent of player level

**Key Methods:**
- `calculateRoundIncome(player)` - Calculate total gold income
- `buyXP(player)` - Purchase XP and check for level up
- `updateStreaks(player, won)` - Update win/lose streaks
- `calculateSellValue(cardCost, stars)` - Calculate unit sell value

### 5. RoundManager.ts
**Manages game phases and timing**

**Phase Durations:**
- Planning: 30 seconds
- Combat: 15 seconds
- Transition: 5 seconds

**Phase Flow:**
```
PLANNING → COMBAT → TRANSITION → (next round)
```

**Opponent Pairing:**
- Carousel algorithm: rotates opponents each round
- Alternative: strength-based matching (MMR)
- Ensures variety and fairness

**Key Methods:**
- `startRound(roundNumber)` - Begin new round
- `forceNextPhase()` - Skip to next phase (when all ready)
- `getRoundState()` - Get current phase and time remaining
- `pairOpponents(playerIds, round)` - Determine opponent pairings

### 6. StateSync.ts
**Synchronizes game state to clients**

Broadcasts game events to players via WebSocket.

**Event Types:**
- `MATCH_FOUND` - Match created, game starting
- `ROUND_START` - New round beginning
- `SHOP_UPDATE` - Shop refreshed
- `COMBAT_START` - Combat phase starting
- `COMBAT_EVENT` - Combat action (attack, ability, death)
- `ROUND_END` - Round complete with damage/gold
- `PLAYER_ELIMINATED` - Player eliminated
- `MATCH_END` - Match complete with placements

**Key Methods:**
- `syncRoundStart(playerIds, round, phase)` - Broadcast round start
- `syncShopUpdate(playerId, shop)` - Send shop to player
- `syncCombatStart(playerId, opponent)` - Start combat with opponent
- `syncCombatEvent(playerId, event)` - Send combat action
- `syncRoundEnd(playerId, damage, gold)` - End round with results

### 7. CombatSimulator.ts
**Simulates battles between boards**

**Combat Flow:**
1. Apply start-of-combat abilities
2. Units attack in order
3. Process on-attack abilities
4. Check for deaths and on-death abilities
5. Process on-kill abilities
6. Repeat until one side eliminated or max rounds
7. Calculate damage based on surviving units

**Ability Triggers:**
- `startCombat` - On combat start (buffs, AOE damage)
- `onAttack` - Each attack (bonus damage, effects)
- `onHit` - When hit by attack
- `onKill` - When killing an enemy
- `onDeath` - When dying
- `everyX` - Every X attacks (periodic abilities)
- `conditional` - Based on conditions (alone, enemy type)

**Damage Calculation:**
- Base damage = number of surviving enemy units
- Bonus damage = sum of (unit.stars - 1) for each survivor
- Example: 3 units (1★, 2★, 3★) = 3 + (0 + 1 + 2) = 6 damage

**Key Methods:**
- `simulateCombat(playerBoard, opponentBoard)` - Run full battle
- Returns: winner, damageDealt, unitsRemaining, combatLog

## Game Flow Example

### Match Creation
```
1. 6 players join queue
2. MatchMaking creates GameRoom
3. GameRoom initializes all systems
4. Players receive MATCH_FOUND event
5. GameRoom.start() begins round 1
```

### Round Flow
```
PLANNING PHASE (30s):
- Players receive income (base + interest + streaks)
- Shops regenerated based on player levels
- Players buy cards, sell units, place on board
- Players can buy XP to level up
- Players mark ready when done

COMBAT PHASE (15s):
- Opponents paired using carousel algorithm
- Combat simulated for each pairing
- Combat events sent to players in real-time
- Results calculated (winner, damage)

TRANSITION PHASE (5s):
- Damage applied to losers
- Streaks updated
- Check for eliminations
- Check for match end (1 player left)
- Prepare for next round
```

### Player Actions (Planning Phase Only)
```typescript
// Buy card from shop
client.emit('client_event', {
  type: 'BUY_CARD',
  data: { cardIndex: 2 }
});

// Sell unit for gold
client.emit('client_event', {
  type: 'SELL_CARD',
  data: { unitId: 'samurai-123' }
});

// Place unit on board (positions 0-7)
client.emit('client_event', {
  type: 'PLACE_CARD',
  data: { unitId: 'samurai-123', position: 4 }
});

// Reroll shop (2 gold)
client.emit('client_event', {
  type: 'REROLL_SHOP'
});

// Buy XP (4 gold for 4 XP)
client.emit('client_event', {
  type: 'BUY_XP'
});

// Mark ready (skip to combat if all ready)
client.emit('client_event', {
  type: 'READY'
});
```

## Configuration

### Constants
```typescript
// Economy
BASE_GOLD_PER_ROUND = 5
INTEREST_RATE = 10 (1 gold per 10 saved)
MAX_INTEREST = 5
XP_BUY_COST = 4
REROLL_COST = 2

// Game Settings
PLAYERS_PER_MATCH = 6
STARTING_HEALTH = 20
STARTING_GOLD = 3
MAX_BENCH_SIZE = 8
SHOP_SIZE = 5

// Phase Timings
PLANNING_DURATION = 30000ms
COMBAT_DURATION = 15000ms
TRANSITION_DURATION = 5000ms
```

## Error Handling

All player actions validate:
- Player exists in match
- Current phase allows action
- Player has sufficient resources
- Action is valid (valid indices, positions, etc.)

Errors sent via StateSync:
```typescript
stateSync.syncError(playerId, 'Not enough gold')
stateSync.syncSuccess(playerId, 'Purchased Samurai')
```

## Disconnection Handling

- Players disconnecting from queue: removed immediately
- Players disconnecting from match: 60 second grace period
- After grace period: player eliminated
- Match continues with remaining players

## Match Completion

Match ends when:
- Only 1 player remains (winner)
- All players eliminated (rare edge case)

Final placements:
1. Surviving player = 1st place
2. Last eliminated = 2nd place
3. Second-to-last eliminated = 3rd place
... and so on

## Performance Considerations

- Combat simulation is synchronous but fast (<10ms typical)
- State sync sends targeted events (not full state)
- Periodic cleanup removes completed matches
- Board size limited by player level (prevents large boards)

## Extensibility

Easy to extend:
- Add new cards: Add to CARD_POOL in ShopGenerator
- Add new abilities: Extend CombatSimulator trigger handling
- Add new game modes: Create new RoundManager variants
- Add items: Extend GameRoom with item handling
- Add synergies: Process in CombatSimulator before combat

## Testing

Manual test flow:
1. Start server: `npm run server`
2. Open 6 browser tabs
3. All join queue with same entry fee
4. Match automatically created
5. Test buying, selling, placing cards
6. Wait for combat and verify results
7. Continue until match end

## Future Enhancements

- [ ] Item system (equip items to units)
- [ ] Synergy system (bonuses for matching types)
- [ ] Unit combining (3 copies → 2-star, 9 copies → 3-star)
- [ ] Ghost rounds (PvE rounds every 3-4 rounds)
- [ ] Reconnection system (rejoin disconnected match)
- [ ] Spectator mode
- [ ] Replay system
- [ ] MMR/ranking system
- [ ] Tournament modes

## File Sizes

- GameRoom.ts: ~700 lines (main orchestrator)
- CombatSimulator.ts: ~250 lines (battle engine)
- EconomyManager.ts: ~200 lines (economy logic)
- ShopGenerator.ts: ~300 lines (card pool + generation)
- RoundManager.ts: ~250 lines (phase timing)
- StateSync.ts: ~200 lines (event broadcasting)
- MatchMaking.ts: ~150 lines (queue system)

**Total: ~2,050 lines of game server logic**
