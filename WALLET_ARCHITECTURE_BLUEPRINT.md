# Wallet-Based Architecture Blueprint

**Status:** ✅ Implemented
**Branch:** `architecture-rebuild`
**Last Updated:** 2025-11-22

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Wallet Authentication Handshake](#2-wallet-authentication-handshake)
3. [Socket-Wallet Mapping Architecture](#3-socket-wallet-mapping-architecture)
4. [Join Bot Match Flow](#4-join-bot-match-flow)
5. [Reconnection Flow](#5-reconnection-flow)
6. [Game Action Flow](#6-game-action-flow)
7. [Phase Transition Flow](#7-phase-transition-flow)
8. [Critical Architectural Patterns](#8-critical-architectural-patterns)
9. [Data Structures Reference](#9-data-structures-reference)
10. [Event Flow Reference](#10-event-flow-reference)
11. [Success Criteria](#11-success-criteria)

---

## 1. System Overview

This is a **server-authoritative multiplayer game architecture** using **wallet addresses as persistent player identity**. The system enables seamless reconnection across page refreshes and socket disconnects.

### Key Principles

- ✅ Server is single source of truth for ALL game state
- ✅ Players identified by wallet address (persistent)
- ✅ Socket IDs are ephemeral and can be remapped
- ✅ Full state sync on reconnection
- ✅ No optimistic updates (client never modifies game state)

---

## 2. Wallet Authentication Handshake

### Flow Diagram

```
[CLIENT] User connects wallet via RainbowKit/wagmi
    ↓
[CLIENT] useSocket() detects connectedAddress
    ↓
[CLIENT] Create socket with auth handshake
    io(SOCKET_URL, {
      auth: { walletAddress: connectedAddress }
    })
    ↓
    ↓ [NETWORK: WebSocket Handshake]
    ↓
[SERVER] io.on('connection', (socket) => {...})
    ↓
[SERVER] Extract wallet from handshake
    const wallet = socket.handshake.auth.walletAddress
    ↓
[SERVER] Validate wallet address
    IF (!wallet || typeof wallet !== 'string'):
      emit('error', { type: 'AUTH_ERROR' })
      socket.disconnect()
      return
    ↓
[SERVER] Store wallet on socket object
    socket.walletAddress = walletAddress
    ↓
[SERVER] Update global socket mapping
    matchMaking.updateSocketMapping(wallet, socket.id)
    ↓
[SERVER] Check for existing active match
    const existingMatch = matchMaking.getMatchByWallet(wallet)
    ↓
    IF (existingMatch):
      → existingMatch.updateSocketMapping(wallet, socket.id)
      → existingMatch.syncPlayerState(wallet)  [RECONNECTION]
    ELSE:
      → Connection ready for matchmaking
```

### Code References

**Client:** `hooks/useSocket.ts:34-44`
**Server:** `server/index.ts:30-59`

---

## 3. Socket-Wallet Mapping Architecture

### Two-Level Mapping System

```
LEVEL 1: MatchMaking (Global)
┌─────────────────────────────────────┐
│  walletToSocket Map                 │
│  "0xABC...123" → "socketId_xyz"    │
│                                      │
│  socketToWallet Map                 │
│  "socketId_xyz" → "0xABC...123"    │
└─────────────────────────────────────┘
Purpose: Find which match a reconnecting wallet belongs to


LEVEL 2: GameRoom (Per-Match)
┌─────────────────────────────────────┐
│  walletToSocket Map                 │
│  "0xABC...123" → "socketId_current"│
│                                      │
│  socketToWallet Map                 │
│  "socketId_current" → "0xABC...123"│
└─────────────────────────────────────┘
Purpose: Convert wallet addresses to socket IDs for event emission
```

### Critical Helper Methods

**File:** `server/game/GameRoom.ts:880-891`

```typescript
// Convert socket ID → wallet address
getWalletFromSocket(socketId: string): string | null

// Convert wallet address → socket ID
getSocketFromWallet(walletAddress: string): string | null
```

**Usage in Action Handlers:**

```typescript
handleBuyCard(socketId: string, cardIndex: number): boolean {
  // 1. Convert incoming socket ID to persistent wallet
  const walletAddress = this.getWalletFromSocket(socketId);

  // 2. Lookup all player data by wallet (persistent)
  const player = this.players.get(walletAddress);
  const shop = this.playerShops.get(walletAddress);
  const bench = this.playerBenches.get(walletAddress);

  // 3. Validate and execute action
  // 4. Broadcast update via socket ID
}
```

---

## 4. Join Bot Match Flow

### Complete Sequence

```
1. [CLIENT] User clicks "Play vs Bots"
    ↓
2. [CLIENT] joinBotMatch(0, undefined) called
    hooks/useSocket.ts:278-280
    ↓
3. [CLIENT] emit('JOIN_BOT_MATCH', { entryFee: 0 })
    ↓
    ↓ [NETWORK]
    ↓
4. [SERVER] socket.on('client_event') receives event
    server/index.ts:62-105
    ↓
5. [SERVER] handleJoinBotMatch(socket, entryFee, transactionHash)
    server/index.ts:119-122
    ↓
6. [MATCHMAKING] createBotMatch(socketId, entryFee, transactionHash)
    server/game/MatchMaking.ts:222-293
    ↓
7. [MATCHMAKING] Build player list
    - 1 Human: { socketId, walletAddress, entryFee, isBot: false }
    - 5 Bots:  { socketId: "bot_matchId_i", isBot: true, botName: "..." }
    ↓
8. [MATCHMAKING] Create GameRoom
    const gameRoom = new GameRoom(matchId, matchPlayers, io)
    activeMatches.set(matchId, gameRoom)
    ↓
9. [GAMEROOM] Constructor processes players
    server/game/GameRoom.ts:75-114
    For each player:
      - Extract wallet: isBot ? socketId : queuedPlayer.walletAddress
      - Create Player object (id = wallet address)
      - Create socket ↔ wallet bidirectional mapping
      - Initialize board, bench, shop, readyStatus
      - IF bot: Create BotPlayer AI instance
    ↓
10. [GAMEROOM] start() called
     server/game/GameRoom.ts:131-148
     - Generate initial shop for all players
     - Send SHOP_UPDATE to each player (via socket ID)
     - Start round 1: roundManager.startRound(1)
    ↓
11. [ROUNDMANAGER] startRound(1)
     - Set currentPhase = 'PLANNING'
     - Call onPhaseChange callback
     - Schedule timeout for COMBAT phase (30s)
    ↓
12. [GAMEROOM] handlePlanningPhase(round)
     server/game/GameRoom.ts:172-205
     - Give players gold (round income)
     - Regenerate shops
     - Broadcast ROUND_START event
     - Execute bot AI turns
    ↓
    ↓ [NETWORK: Server → Client Events]
    ↓
13. [CLIENT] Receives 'server_event' { type: 'MATCH_FOUND' }
     hooks/useSocket.ts:118-136
     - Set matchId in store
     - Find player by wallet address
     - Update store with initial state
     - Show toast: "Match found!"
    ↓
14. [CLIENT] Receives 'server_event' { type: 'ROUND_START' }
     hooks/useSocket.ts:138-152
     - Set round, phase, timeRemaining
     - Show toast: "Round 1 - Planning Phase"
    ↓
15. [CLIENT] Receives 'server_event' { type: 'SHOP_UPDATE' }
     hooks/useSocket.ts:154-157
     - Update shop in store
    ↓
16. [CLIENT] UI renders → User can play!
```

---

## 5. Reconnection Flow

### Trigger: User Refreshes Page Mid-Match

```
1. [CLIENT] Page refresh destroys old socket
    ↓
2. [CLIENT] useSocket() hook re-runs
    - Wallet still connected (wagmi persistence)
    - Create NEW socket with SAME wallet address
    ↓
3. [CLIENT] New socket connects (NEW socket.id generated)
    Old: "abc123" → New: "xyz789"
    ↓
    ↓ [NETWORK: Reconnection Handshake]
    ↓
4. [SERVER] Receives connection with wallet address
    server/index.ts:30-59
    ↓
5. [SERVER] Update global MatchMaking mapping
    matchMaking.updateSocketMapping(wallet, NEW_socketId)
    - Deletes old socketToWallet[oldSocketId]
    - Maps wallet → new socket ID
    ↓
6. [SERVER] Search for active match by wallet
    const existingMatch = matchMaking.getMatchByWallet(wallet)
    ↓
7. [SERVER] IF match found:
    ├─ Update GameRoom socket mapping
    │   existingMatch.updateSocketMapping(wallet, NEW_socketId)
    │
    └─ Sync full game state to client
        existingMatch.syncPlayerState(wallet)
    ↓
8. [GAMEROOM] updateSocketMapping(wallet, newSocketId)
    server/game/GameRoom.ts:895-908
    - Delete old socketToWallet[oldSocketId]
    - Set walletToSocket[wallet] = newSocketId
    - Set socketToWallet[newSocketId] = wallet
    ↓
9. [GAMEROOM] syncPlayerState(wallet)
    server/game/GameRoom.ts:910-990
    ├─ Get current socketId from wallet
    ├─ Build complete state snapshot:
    │   - Player stats (gold, health, level, etc.)
    │   - Board (8 positions)
    │   - Bench (units)
    │   - Shop (cards)
    │   - Match info (round, phase, opponents)
    │
    ├─ Emit MATCH_FOUND (re-establish match context)
    ├─ Emit ROUND_START (sync current round/phase/timer)
    ├─ Emit PLAYER_STATE (full state)
    └─ Emit SHOP_UPDATE (current shop)
    ↓
    ↓ [NETWORK: Full State Sync]
    ↓
10. [CLIENT] Processes reconnection events
     hooks/useSocket.ts:114-230
     - MATCH_FOUND: Restore match context
     - ROUND_START: Restore round/phase/timer
     - SHOP_UPDATE: Restore shop
     - updateFromServer(): Merge all state
    ↓
11. [CLIENT] UI re-renders with complete state
     → User can continue playing exactly where they left off!
```

### Why This Works

- ✅ **Persistent Identity:** Wallet address doesn't change
- ✅ **Server Authority:** All game state lives on server
- ✅ **Full State Sync:** Can't get out of sync
- ✅ **Socket ID Independence:** Player data keyed by wallet

---

## 6. Game Action Flow

### Example: Buy Card

```
USER CLICKS "Buy Card #2"
    ↓
[CLIENT] socket.buyCard(2)
    hooks/useSocket.ts:250-252
    ↓
[CLIENT] emit('client_event', { type: 'BUY_CARD', data: { cardIndex: 2 } })
    ↓
    ↓ [NETWORK]
    ↓
[SERVER] socket.on('client_event') receives event
    server/index.ts:62-105
    ↓
[SERVER] handleBuyCard(socket, 2)
    server/index.ts:124-135
    ↓
[GAMEROOM] handleBuyCard(socketId, cardIndex)
    server/game/GameRoom.ts:403-461

    STEP 1: Convert socket ID → wallet
    ├─ const wallet = this.getWalletFromSocket(socketId)

    STEP 2: Lookup player data by wallet
    ├─ const player = this.players.get(wallet)
    ├─ const shop = this.playerShops.get(wallet)
    └─ const bench = this.playerBenches.get(wallet)

    STEP 3: Server-side validation
    ├─ Phase check: roundManager.isPlanning() ?
    ├─ Card exists: shop.cards[cardIndex] exists ?
    ├─ Gold check: player.gold >= card.cost ?
    └─ Bench space: bench.length < MAX_BENCH_SIZE ?

    STEP 4: IF validation fails:
    ├─ syncError(socketId, "reason")
    └─ return false

    STEP 5: IF validation passes:
    ├─ player.gold -= card.cost
    ├─ bench.push(card)
    └─ shop.cards.splice(cardIndex, 1)

    STEP 6: Broadcast updated state
    ├─ syncShopUpdate(socketId, shop)
    └─ syncSuccess(socketId, `Purchased ${card.name}`)
    ↓
    ↓ [NETWORK: State Update]
    ↓
[CLIENT] Receives 'server_event' { type: 'SHOP_UPDATE' }
    hooks/useSocket.ts:154-157
    ↓
[CLIENT] updateShop(event.data)
    store/gameStore.ts:104-106
    ↓
[CLIENT] UI re-renders with:
    - Updated shop (card removed)
    - Updated gold (cost deducted)
    - Updated bench (card added)
```

### Server Validates EVERYTHING

1. **Authentication:** Socket has valid wallet
2. **Authorization:** Player is in this match
3. **Phase:** Action allowed during PLANNING only
4. **Resources:** Player has enough gold
5. **Capacity:** Bench has space
6. **Availability:** Card exists in shop

**Client does ZERO validation** - just displays what server sends

---

## 7. Phase Transition Flow

### Automatic Progression: PLANNING → COMBAT → TRANSITION

```
ROUND START
    ↓
[ROUNDMANAGER] startRound(N)
    startPlanningPhase()
    ↓
    ↓
PLANNING PHASE (30 seconds)
    ├─ Give players gold (round income)
    ├─ Regenerate all shops
    ├─ Broadcast ROUND_START to all players
    ├─ Execute bot AI turns
    └─ Set 30-second timer
        ↓
        ↓ [Timer expires OR all players ready]
        ↓
COMBAT PHASE (15 seconds)
    ├─ Pair opponents (player → opponent mapping)
    ├─ Run combat simulations for each pairing
    ├─ Broadcast COMBAT_START with opponent info
    ├─ Send COMBAT_EVENT for each action
    ├─ Apply damage to losing players
    ├─ Check for player eliminations
    └─ Set 15-second timer
        ↓
        ↓ [Timer expires]
        ↓
TRANSITION PHASE (5 seconds)
    ├─ Broadcast ROUND_END with damage/results
    ├─ Check for match end condition
    │   ├─ IF only 1 player left: End match
    │   └─ ELSE: Schedule next round
    └─ Set 5-second timer
        ↓
        ↓ [IF match continues]
        ↓
ROUND START (N+1)
    └─ Repeat cycle
```

### Phase Durations

```typescript
PLANNING:   30000ms (30 seconds)
COMBAT:     15000ms (15 seconds)
TRANSITION:  5000ms (5 seconds)
```

---

## 8. Critical Architectural Patterns

### Pattern 1: Server-Authoritative Design

```
CLIENT ROLE:
✓ Display state received from server
✓ Send action requests to server
✗ Never modify game state directly

SERVER ROLE:
✓ Store all game state
✓ Validate all actions
✓ Update state
✓ Broadcast to clients
```

### Pattern 2: Wallet-Based Identity

```
❌ OLD (BROKEN):
players: Map<socketId, Player>
Problem: socketId changes on reconnect

✅ NEW (WORKING):
players: Map<walletAddress, Player>
walletToSocket: Map<wallet, currentSocketId>
Solution: Wallet persists, socket remapped
```

### Pattern 3: Full State Synchronization

```
syncPlayerState(wallet):
  1. Find player by wallet
  2. Build complete state object
  3. Send all data at once
  4. Client replaces entire state

Why: Simpler, more reliable, can't desync
```

### Pattern 4: Event-Driven Updates

```
Server State Change:
  player.gold -= 5
    ↓
  Emit event to client
    ↓
  Client receives event
    ↓
  Client updates local state
    ↓
  UI re-renders
```

---

## 9. Data Structures Reference

### Player Object

```typescript
interface Player {
  id: string;           // Wallet address (persistent!)
  address: string;      // Display address
  health: number;       // 20 starting
  gold: number;         // 3 starting
  level: number;        // 1-9
  xp: number;           // Experience points
  winStreak: number;    // Consecutive wins
  loseStreak: number;   // Consecutive losses
  placement?: number;   // Final ranking (1-6)
}
```

### GameRoom State Maps

```typescript
// All keyed by wallet address (persistent)
private players: Map<string, Player>;
private playerBoards: Map<string, Board>;
private playerBenches: Map<string, Unit[]>;
private playerShops: Map<string, Shop>;
private playerReadyStatus: Map<string, boolean>;

// Socket mapping (ephemeral)
private walletToSocket: Map<string, string>;  // wallet → socketId
private socketToWallet: Map<string, string>;  // socketId → wallet
```

### Socket Handshake

```typescript
socket.handshake.auth: {
  walletAddress: string   // Client sends this in connection
}

socket.walletAddress = string  // Server stores this on socket object
```

---

## 10. Event Flow Reference

### Client → Server Events

```typescript
type ClientEvent =
  | { type: 'JOIN_QUEUE'; data: { entryFee, transactionHash? } }
  | { type: 'JOIN_BOT_MATCH'; data: { entryFee, transactionHash? } }
  | { type: 'BUY_CARD'; data: { cardIndex } }
  | { type: 'SELL_CARD'; data: { unitId } }
  | { type: 'PLACE_CARD'; data: { unitId, position } }
  | { type: 'REROLL_SHOP' }
  | { type: 'BUY_XP' }
  | { type: 'EQUIP_ITEM'; data: { itemId, unitId } }
  | { type: 'READY' }
```

### Server → Client Events

```typescript
type ServerEvent =
  | { type: 'MATCH_FOUND'; data: Match }
  | { type: 'ROUND_START'; data: { round, phase, timeRemaining } }
  | { type: 'SHOP_UPDATE'; data: Shop }
  | { type: 'COMBAT_START'; data: { opponent, timeRemaining } }
  | { type: 'COMBAT_EVENT'; data: CombatEvent }
  | { type: 'ROUND_END'; data: { damage, player } }
  | { type: 'PLAYER_ELIMINATED'; data: { playerId } }
  | { type: 'MATCH_END'; data: { placements } }
```

---

## 11. Success Criteria

The architecture is working correctly when:

- ✅ Wallet connects with auth handshake
- ✅ Socket → wallet mapping created
- ✅ Bot match created with 1 human + 5 bots
- ✅ Initial shops generated and sent
- ✅ Round starts, PLANNING phase begins
- ✅ User can buy/sell/place cards
- ✅ Actions validated server-side
- ✅ State updates broadcast to client
- ✅ Phase transitions happen automatically
- ✅ Combat simulates and applies damage
- ✅ **Page refresh reconnects to same match**
- ✅ **Full state restored on reconnection**
- ✅ Match ends when 1 player remaining
- ✅ Placements calculated and displayed

---

## Architecture Principles Summary

### ✅ DO:
- Use wallet addresses as player identity
- Store all game state on server
- Validate ALL actions server-side
- Broadcast state changes as events
- Use full state sync on reconnection
- Map socket IDs to wallets at both levels

### ❌ DON'T:
- Track players by socket.id (it changes!)
- Duplicate game logic on client
- Use optimistic updates (causes desyncs)
- Trust client-side validation
- Use delta/partial state updates
- Store game state in client beyond UI

---

**Last Updated:** 2025-11-22
**Commits:**
- `7d2b6a8` - Phase 1: Server Foundation
- `59d13f2` - Phases 2 & 3: Client Rebuild
- `5a36f65` - Fix: Remove setSocketEmit

**Status:** ✅ Implementation Complete | Ready for Testing
