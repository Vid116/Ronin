# Current Work: Dev Force End Match Feature

**Status:** In Progress (Paused for Confirmation)
**Date:** 2025-11-22
**Branch:** architecture-rebuild

---

## Overview

Adding a developer utility button to forcefully end any active match. This is essential for testing and development to avoid getting stuck in matches.

---

## Problem Being Solved

During development and testing, you can get stuck in a match that:
- Never completes (bugs in game logic)
- Takes too long to finish naturally
- Has no other players (waiting indefinitely)
- Needs to be reset for testing

Without a force-end mechanism, the only solution is to restart the server or manually delete data.

---

## Solution Design

### User Requirements (Confirmed)
1. **Location:** Button in BOTH match page and lobby
2. **Behavior:** Force end the ENTIRE match (all players kicked)
3. **Scope:** Development/testing tool (not for production)

### Technical Approach

**Flow:**
```
User clicks "Force End Match" button
  ↓
Client emits DEV_FORCE_END_MATCH event
  ↓
Server receives event
  ↓
Server finds the match by player's socketId
  ↓
Server marks match as completed
  ↓
Server emits MATCH_END event to all players in match
  ↓
All clients receive MATCH_END
  ↓
Clients clear matchId and redirect to lobby
  ↓
Server cleans up match from activeMatches
```

---

## Implementation Progress

### ✅ Completed

**1. Event Type Definition** (`types/game.ts`)
- Added `DEV_FORCE_END_MATCH` to `ClientEvent` union type
- No data payload needed (just the event itself)

```typescript
export type ClientEvent =
  | { type: 'JOIN_QUEUE'; data: { entryFee: number; transactionHash?: string } }
  // ... other events ...
  | { type: 'DEV_FORCE_END_MATCH' };
```

---

### 🚧 In Progress / Pending

**2. Server Handler** (`server/index.ts`)

**Location:** Add case in the `client_event` switch statement (around line 116)

**Implementation Plan:**
```typescript
case 'DEV_FORCE_END_MATCH':
  handleForceEndMatch(socket);
  break;
```

**Handler Function:**
```typescript
function handleForceEndMatch(socket: any) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Force end failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    return;
  }

  logger.action('DEV: Force ending match', {
    wallet: walletAddress,
    socketId: socket.id,
    matchId: gameRoom.matchId
  });

  // Force complete the match
  gameRoom.forceComplete();
}
```

**Questions:**
1. ❓ Does `GameRoom` have a `forceComplete()` method, or do I need to create it?
2. ❓ Should I check for a specific environment variable (like `NODE_ENV === 'development'`) before allowing this?
3. ❓ Should there be any additional cleanup needed?

---

**3. GameRoom Force Complete Method** (`server/game/GameRoom.ts`)

**Need to Add:**
```typescript
public forceComplete(): void {
  logger.match('Force completing match', { matchId: this.matchId });

  // Mark as completed
  this.completed = true;

  // Emit match end to all players
  const placements = this.players.map((player, index) => ({
    playerId: player.socketId,
    placement: index + 1
  }));

  this.io.emit('server_event', {
    type: 'MATCH_END',
    data: { placements }
  });

  // Stop any timers
  this.cleanup();
}
```

**Questions:**
1. ❓ Is there a `cleanup()` method in GameRoom, or should I call something else?
2. ❓ Should I stop round timers explicitly?
3. ❓ Are there any other resources (intervals, timeouts) that need cleanup?

---

**4. Socket Hook** (`hooks/useSocket.ts`)

**Need to Add:**
```typescript
const forceEndMatch = (): boolean => {
  if (!socket || !socket.connected) {
    return false;
  }

  socket.emit('client_event', {
    type: 'DEV_FORCE_END_MATCH'
  });

  return true;
};

// Add to return object
return {
  // ... existing exports
  forceEndMatch,
};
```

**Questions:**
1. ❓ Should this show a confirmation dialog first?
2. ❓ Should it show a toast notification when clicked?

---

**5. Match Page Button** (`app/match/[id]/page.tsx`)

**Need to Add:**
```tsx
{process.env.NODE_ENV === 'development' && (
  <button
    onClick={() => {
      if (confirm('Force end this match? All players will be kicked.')) {
        socket.forceEndMatch();
        toast.success('Match force ended');
      }
    }}
    className="absolute top-4 right-4 bg-red-600 hover:bg-red-700
               text-white px-4 py-2 rounded text-sm font-semibold
               shadow-lg z-50"
  >
    Force End Match (DEV)
  </button>
)}
```

**Questions:**
1. ❓ Should this be positioned top-right, or somewhere else?
2. ❓ Should it have a different color/style to make it more obvious it's a dev tool?
3. ❓ Confirmation dialog - yes or no?

---

**6. Lobby Page Button** (`app/lobby/page.tsx`)

**Need to Add:**
```tsx
{process.env.NODE_ENV === 'development' && matchId && (
  <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded">
    <p className="text-red-400 text-sm mb-2">
      You are currently in a match: {matchId}
    </p>
    <button
      onClick={() => {
        if (confirm('Force end your active match?')) {
          socket.forceEndMatch();
          toast.success('Match force ended');
        }
      }}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2
                 rounded text-sm font-semibold"
    >
      Force End Active Match (DEV)
    </button>
  </div>
)}
```

**Questions:**
1. ❓ Should this be at the top or bottom of the lobby?
2. ❓ Should it be more or less prominent?

---

## Technical Questions & Uncertainties

### 1. GameRoom API
- **Unknown:** What methods exist in GameRoom for ending/cleanup?
- **Need to check:**
  - Is there a `cleanup()` method?
  - Is there a `completed` property?
  - How are timers managed?
  - How to properly emit to all players in a match?

### 2. Match End Event Handling
- **Client-side:** Does the client already listen for `MATCH_END` events?
- **Unknown:** What happens client-side when MATCH_END is received?
- **Need to verify:** Does it auto-redirect to lobby, or do I need to add that?

### 3. Environment Safety
- **Question:** Should I check `NODE_ENV === 'development'` on the server too?
- **Security:** Could this be abused if accidentally left in production?
- **Solution:** Maybe require an environment variable like `ENABLE_DEV_COMMANDS=true`?

### 4. Cleanup Edge Cases
- **Bot matches:** Are there bot timers/intervals that need stopping?
- **Blockchain:** If it's a paid match, should I warn before force ending?
- **Queue:** Should force-end also remove from queue if somehow queued?

---

## Dependencies

### Files to Modify
1. ✅ `types/game.ts` - Add event type
2. ⏳ `server/index.ts` - Add event handler
3. ⏳ `server/game/GameRoom.ts` - Add forceComplete() method (maybe)
4. ⏳ `hooks/useSocket.ts` - Add forceEndMatch() function
5. ⏳ `app/match/[id]/page.tsx` - Add button
6. ⏳ `app/lobby/page.tsx` - Add button

### Potential New Dependencies
- None (using existing toast, socket, react hooks)

---

## Testing Plan

Once implemented, test:

1. **Free Bot Match:**
   - Start a free bot match
   - Click force end button
   - Verify: Redirected to lobby, match cleaned up

2. **Paid Bot Match:**
   - Start a paid bot match
   - Force end before completion
   - Verify: No blockchain submission errors

3. **PvP Match (if possible with 2 tabs):**
   - Start match with 2 clients
   - Force end from one client
   - Verify: Both clients kicked to lobby

4. **From Lobby:**
   - Be in an active match
   - Go back to lobby (refresh/back button)
   - Click force end button
   - Verify: Match ends, button disappears

5. **Multiple Force Ends:**
   - Try force ending when not in a match
   - Verify: Graceful error handling

---

## Next Steps (After Questions Answered)

1. Investigate GameRoom class to understand cleanup methods
2. Implement server handler
3. Add forceComplete() method if needed
4. Implement socket hook function
5. Add UI buttons with appropriate styling
6. Test thoroughly
7. Commit changes

---

## Notes

- This is a **development-only feature**
- Should be clearly marked as DEV in UI
- Consider adding to .env.example: `ENABLE_DEV_COMMANDS=true`
- May want to add other dev commands in future (reset match, skip phase, etc.)
- Could create a dedicated DevTools component/panel later

---

## Related Files

- Previous work: Payment flow fix (app/lobby/page.tsx)
- Logging infrastructure (server/utils/logger.ts, utils/logger.ts)
- Wallet architecture (WALLET_ARCHITECTURE_BLUEPRINT.md)
