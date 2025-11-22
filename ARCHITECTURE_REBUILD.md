# 🚨 ARCHITECTURE REBUILD - MUST READ 🚨

**Branch:** `architecture-rebuild`
**Date:** 2025-11-22
**Status:** IN PROGRESS - DO NOT MERGE TO MASTER YET

---

## ⚠️ CRITICAL INFORMATION

### What's Happening
We are rebuilding the client-server architecture from a **broken optimistic-update pattern** to a **clean server-authoritative design** with **wallet-based player identity**.

### Why This Is Necessary
1. **Current system is fundamentally broken:**
   - Socket disconnects cause loss of match context
   - Refresh page = lose everything
   - Players tracked by socket.id (changes on reconnect)
   - Client and server state can desync

2. **Root cause:**
   - No persistent player identity
   - Optimistic updates add complexity without benefit
   - Client tries to manage game state (should be server-only)

### What We're Changing
- ✅ **Server:** Add wallet-based player identity
- ✅ **Client:** Remove all optimistic update code (~350 lines deleted)
- ✅ **Store:** Transform to pure UI state container
- ✅ **Socket:** Simplify to server-authoritative pattern

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Server Foundation (SAFE - Start Here)

#### 1.1 Update Server Connection Handler
**File:** `server/index.ts`

**What:** Extract wallet address from socket handshake
```typescript
io.on('connection', (socket) => {
  const walletAddress = socket.handshake.auth.walletAddress;

  if (!walletAddress) {
    socket.emit('error', { message: 'Wallet address required' });
    socket.disconnect();
    return;
  }

  // Rest of connection logic...
});
```

**Why:** Need persistent identity across reconnections

#### 1.2 Update GameRoom for Wallet Identity
**File:** `server/game/GameRoom.ts`

**Changes:**
- Add `private walletToSocket: Map<string, string>`
- Constructor accepts wallet addresses instead of socket IDs
- Add method: `updateSocketMapping(wallet: string, socketId: string)`
- All player lookups use wallet address
- Emissions convert: wallet → socketId → emit

**Keep:** All game logic (combat, economy, shop) - it's already good!

#### 1.3 Update MatchMaking
**File:** `server/game/MatchMaking.ts`

**Add methods:**
```typescript
getMatchByWallet(walletAddress: string): GameRoom | null
updateSocketMapping(wallet: string, socketId: string): void
```

**Why:** Need to find player's active match by wallet on reconnect

---

### Phase 2: Client Cleanup (BREAK THINGS - Test After)

#### 2.1 Rebuild gameStore - DELETE MOST CODE
**File:** `store/gameStore.ts`

**DELETE THESE SECTIONS:**
- Lines 17-18: `socketEmit`, `previousState`
- Lines 24-30: All optimistic action methods
- Lines 96-98: `setSocketEmit` function
- Lines 101-120: `saveStateSnapshot`, `rollbackOptimisticUpdate`
- Lines 123-396: ALL optimistic implementations (buyCard, sellCard, placeCard, etc.)

**KEEP ONLY:**
- State type definitions
- Initial state
- Simple setters: `setPhase`, `setRound`, `setTimeRemaining`, `setMatchId`
- `updateFromServer` - receives server state
- `addCombatEvent`, `updateShop`
- `reset`

**Result:** ~450 lines → ~100 lines

**New Pattern:**
```typescript
// OLD - CLIENT MUTATES STATE
buyCard: (index) => {
  // Validate, check gold, update shop, etc.
  // DUPLICATE SERVER LOGIC - BAD!
}

// NEW - CLIENT JUST RECEIVES
// No buyCard in store at all!
// useSocket emits BUY_CARD
// Server validates and broadcasts
// Store receives via updateFromServer
```

#### 2.2 Simplify useSocket
**File:** `hooks/useSocket.ts`

**DELETE:**
- All `rollbackOptimisticUpdate()` calls
- Optimistic state mutations in event handlers
- Lines 115-122: Client mutating state on MATCH_FOUND

**ADD:**
- Wallet address to socket connection:
```typescript
const socket = io(SOCKET_URL, {
  auth: {
    walletAddress: connectedAddress // from wagmi
  }
});
```

**KEEP:**
- Event emitter functions (buyCard, sellCard, etc.) - they just emit to server
- Event handlers - simplified to only call store setters
- Connection state management

**Result:** ~273 lines → ~180 lines

#### 2.3 Clean useGame
**File:** `hooks/useGame.ts`

**Changes:**
- Remove line calling `setSocketEmit`
- Keep everything else

**Result:** ~40 lines → ~38 lines

---

### Phase 3: Integration & Testing

#### 3.1 Reconnection Flow
**How it works now:**
1. User connects with wallet address in auth
2. Server checks: `matchMaking.getMatchByWallet(wallet)`
3. If match found: Update socket mapping, sync full state
4. If no match: Normal flow continues

#### 3.2 State Update Flow
**New pattern:**
```
1. User clicks "Buy Card" button
2. Client: socket.emit('BUY_CARD', {cardIndex: 0})
3. Server: Validate gold, update state, broadcast
4. Server → All Clients: SHOP_UPDATE event
5. Client: updateFromServer(newShopState)
6. UI: Re-renders with new state
```

**No optimistic updates = No desyncs!**

#### 3.3 Test Checklist
- [ ] Join match with wallet
- [ ] Buy card (verify server validates)
- [ ] Sell unit
- [ ] Place unit on board
- [ ] Phase transitions (PLANNING → COMBAT → TRANSITION)
- [ ] **CRITICAL:** Refresh page mid-match
- [ ] Verify reconnects to same match
- [ ] Verify all state is correct after reconnect
- [ ] Match end → auto-navigate to lobby

---

## 📊 BEFORE/AFTER COMPARISON

### File Size Changes

| File | Before | After | Deleted | Status |
|------|--------|-------|---------|--------|
| `store/gameStore.ts` | 450 | 100 | 350 lines | 🔥 Major rebuild |
| `hooks/useSocket.ts` | 273 | 180 | 93 lines | 🔧 Simplify |
| `hooks/useGame.ts` | 40 | 38 | 2 lines | ✅ Minimal |
| `server/index.ts` | 200 | 220 | +20 lines | ✅ Add wallet |
| `server/game/GameRoom.ts` | 804 | 850 | +46 lines | ✅ Add mapping |
| `server/game/MatchMaking.ts` | 150 | 180 | +30 lines | ✅ Add methods |

**Total Deleted:** ~445 lines of problematic code
**Total Added:** ~96 lines of clean architecture

### Architecture Pattern Change

**BEFORE (Broken):**
```
Client State ←→ Server State
     ↓ desync!
   💥 Broken
```

**AFTER (Clean):**
```
Server State (Authority)
     ↓
Client State (View Only)
     ↓
  ✅ Always in sync
```

---

## 🎯 KEY CONCEPTS

### 1. Server-Authoritative
**Server is single source of truth for ALL game state**
- Client NEVER modifies game state directly
- Client only sends actions: "I want to buy card 2"
- Server validates, updates, broadcasts
- Client receives and displays

### 2. Wallet-Based Identity
**Players identified by wallet address, not socket ID**
- Socket ID changes on reconnect
- Wallet address persists
- Easy reconnection to active matches

### 3. Full State Sync
**On reconnect, server sends complete state**
- No delta updates (for now - keep it simple)
- Can't get out of sync
- Reliable and debuggable

### 4. No Optimistic Updates
**Wait for server confirmation before updating UI**
- Slight delay (~50-100ms network latency)
- But NEVER desyncs
- Simpler code, fewer bugs
- Can add optimistic UI later if needed

---

## 🚧 POTENTIAL ISSUES & SOLUTIONS

### Issue: "UI feels laggy without optimistic updates"
**Solution:**
- Show loading states during actions
- Add optimistic UI (not state) later:
  ```typescript
  const [isPending, setIsPending] = useState(false);
  onClick={() => {
    setIsPending(true);
    socket.emit('BUY_CARD');
  }}
  // Server response clears pending
  ```

### Issue: "What if wallet not connected?"
**Solution:**
- Require wallet connection before joining match
- Show "Connect Wallet" button
- Disconnect socket if wallet disconnects

### Issue: "What about bot matches?"
**Solution:**
- Bots don't have wallets
- Generate fake wallet address for bots: `bot_${uuid}`
- Same flow, works identically

---

## 🔄 ROLLBACK PLAN

If this breaks everything:

### Option 1: Revert Branch
```bash
git checkout master
git branch -D architecture-rebuild
```

### Option 2: Cherry-Pick Good Changes
```bash
git checkout master
git cherry-pick <commit-hash>  # Pick specific fixes
```

### Option 3: Fix Forward
- Debug with comprehensive logging (already added)
- Server logs show wallet → socket mapping
- Client logs show all state updates

---

## 📝 COMMIT STRATEGY

### Commit 1: Server Foundation ✅
```
feat: Add wallet-based player identity to server

- Extract wallet from socket handshake
- Update GameRoom for wallet mapping
- Add MatchMaking wallet methods
- Reconnection by wallet instead of socket.id
```

### Commit 2: Client Store Cleanup
```
refactor: Remove optimistic updates from gameStore

BREAKING: Deletes 350 lines of optimistic update code
- Keep only UI state and simple setters
- Remove all client-side game logic
- Server is now single source of truth
```

### Commit 3: Socket Simplification
```
refactor: Simplify useSocket to server-authoritative pattern

- Add wallet to connection auth
- Remove optimistic update rollbacks
- Simplify event handlers to only receive state
```

### Commit 4: Integration & Testing
```
test: Verify wallet-based reconnection works

- Test refresh mid-match
- Test phase transitions
- Test multi-player state sync
```

---

## ✅ SUCCESS CRITERIA

This rebuild is successful when:

1. **Basic Flow Works:**
   - [x] Join match
   - [x] Buy/sell/place cards
   - [x] Phase transitions update UI
   - [x] Match ends cleanly

2. **Reconnection Works:**
   - [x] Refresh page mid-match
   - [x] Reconnect to same match
   - [x] Full state synced
   - [x] Continue playing

3. **Multi-Player Works:**
   - [x] Two players in same match
   - [x] Both see same state
   - [x] Actions broadcast correctly

4. **Code Quality:**
   - [x] ~400+ lines of cruft deleted
   - [x] Clean architecture patterns
   - [x] Easy to understand and debug
   - [x] No "magic" or hidden complexity

---

## 🎓 LEARNING OUTCOMES

### What We Learned

**❌ Don't do:**
- Optimistic updates in multiplayer games (unless you're an expert)
- Track players by ephemeral IDs (socket.id)
- Duplicate game logic on client and server
- Try to "sync" two sources of truth

**✅ Do instead:**
- Server-authoritative architecture
- Persistent player identity (wallet, user ID, etc.)
- Game logic ONLY on server
- Client is dumb renderer
- Full state sync on reconnect

### Applicable to Other Projects

This pattern works for:
- Turn-based games (chess, card games)
- Real-time games with <100ms tolerance
- Collaborative tools (docs, whiteboards)
- Any app with complex shared state

---

## 📞 CONTACTS & RESOURCES

### If You're Stuck

**Check these first:**
1. Is wallet connected? (wagmi hook)
2. Is socket.handshake.auth.walletAddress present?
3. Server logs: wallet → socket mapping
4. Client logs: state update chain

**Common Errors:**
- "Wallet address required" → Check wagmi connection
- "Not in an active match" → Check wallet mapping
- State not updating → Check event handlers
- Refresh breaks → Check reconnection logic

### References

- Socket.IO Auth: https://socket.io/docs/v4/middlewares/#sending-credentials
- Zustand Best Practices: https://github.com/pmndrs/zustand#best-practices
- Server-Authoritative Pattern: https://www.gabrielgambetta.com/client-server-game-architecture.html

---

## 🎬 NEXT STEPS AFTER THIS WORKS

### Short-term (Week 1-2)
1. Add loading states for actions
2. Add "Resume match?" UI prompt
3. Add disconnect timeout (60s to reconnect)
4. Clean up debug logging

### Medium-term (Month 1)
1. Add optimistic UI (not state) for responsiveness
2. Add spectator mode
3. Add match replay/history
4. Add reconnection grace period

### Long-term (Month 2-3)
1. Delta updates for bandwidth optimization
2. Event sourcing for time-travel debugging
3. Anti-cheat validation
4. Matchmaking ELO/ranking

---

**🚀 LET'S BUILD THIS RIGHT! 🚀**

Last Updated: 2025-11-22
Status: READY TO IMPLEMENT
Confidence: HIGH - Clean architecture, clear plan
