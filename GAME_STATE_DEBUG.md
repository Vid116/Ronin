# Game State Update Debugging & Fixes

## Problem
UI was not reflecting game state changes (phase transitions, round updates) even though state was updating in the Zustand store.

## Root Causes Identified

### 1. **Incorrect Zustand Store Usage** ❌ CRITICAL
**Location:** `app/match/[id]/page.tsx:25-41`

**Problem:**
```typescript
// OLD - BROKEN
const { round, phase, timeRemaining } = useGameStore();
```

This destructuring pattern doesn't properly subscribe to Zustand state changes. Components won't re-render when state updates.

**Fix:**
```typescript
// NEW - FIXED
const round = useGameStore((state) => state.round);
const phase = useGameStore((state) => state.phase);
const timeRemaining = useGameStore((state) => state.timeRemaining);
```

Each property now uses a proper selector, ensuring the component re-renders when that specific piece of state changes.

### 2. **Client-Side Timer Interference** ⚠️ SUSPECTED
**Location:** `app/match/[id]/page.tsx:70-87`

**Problem:**
The client was running its own countdown timer that decremented `timeRemaining` every second. This could:
- Override server state updates
- Cause race conditions when server sends new phase/time
- Result in UI showing incorrect state

**Fix:**
Temporarily disabled the client-side timer to let the server handle all time updates. This is marked with TODO for future re-implementation with proper server sync.

## Changes Made

### 1. Socket Event Handler (`hooks/useSocket.ts`)
**Added comprehensive logging:**
- Lines 108-112: MATCH_FOUND event logging
- Lines 127-138: ROUND_START event logging with detailed state info
- Lines 146: SHOP_UPDATE event logging
- Lines 151-159: COMBAT_START event logging
- Lines 175-179: ROUND_END event logging

**What to look for in console:**
```
📊 [ROUND_START] Updating state: { round: 2, phase: 'PLANNING', timeRemaining: 30 }
📊 [ROUND_START] Calling setRound with: 2
📊 [ROUND_START] Calling setPhase with: PLANNING
📊 [ROUND_START] Calling setTimeRemaining with: 30
```

### 2. Game Store (`store/gameStore.ts`)
**Added state mutation logging:**
- Lines 404-414: setPhase logging (old phase → new phase)
- Lines 418-423: setRound logging (old round → new round)
- Lines 427-432: setTimeRemaining logging (old time → new time)

**What to look for in console:**
```
🔄 [STORE] setPhase called: { oldPhase: 'PLANNING', newPhase: 'COMBAT' }
✅ [STORE] Phase updated to: COMBAT
```

### 3. Match Page Component (`app/match/[id]/page.tsx`)
**Fixed Zustand subscriptions:**
- Lines 26-40: Changed from destructuring to proper selectors

**Added component re-render logging:**
- Lines 43-49: Logs whenever component receives new state

**Disabled client timer:**
- Lines 70-87: Commented out client-side countdown

**What to look for in console:**
```
🎮 [MATCH PAGE] State updated: { round: 2, phase: 'COMBAT', timeRemaining: 15 }
```

### 4. Timer Component (`components/game/Timer.tsx`)
**Added props logging:**
- Lines 17-22: Logs when Timer receives new props

**What to look for in console:**
```
⏱️ [TIMER COMPONENT] Props updated: { timeRemaining: 30, phase: 'PLANNING' }
```

## How to Test

### 1. Start the game and open browser console

### 2. Join a match (bot match recommended for testing)

### 3. Watch for the complete event flow in console:

**Phase Transition Example:**
```
🔵 Server event received: ROUND_START { round: 1, phase: 'PLANNING', ... }
📊 [ROUND_START] Updating state: { round: 1, phase: 'PLANNING', timeRemaining: 30 }
📊 [ROUND_START] Calling setRound with: 1
🔄 [STORE] setRound called: { oldRound: 1, newRound: 1 }
✅ [STORE] Round updated to: 1
📊 [ROUND_START] Calling setPhase with: PLANNING
🔄 [STORE] setPhase called: { oldPhase: 'PLANNING', newPhase: 'PLANNING' }
✅ [STORE] Phase updated to: PLANNING
📊 [ROUND_START] Calling setTimeRemaining with: 30
🔄 [STORE] setTimeRemaining called: { oldTime: 30, newTime: 30 }
✅ [STORE] Time updated to: 30
🎮 [MATCH PAGE] State updated: { round: 1, phase: 'PLANNING', timeRemaining: 30 }
⏱️ [TIMER COMPONENT] Props updated: { timeRemaining: 30, phase: 'PLANNING' }
```

### 4. Verify UI Updates

**Check that the UI actually changes:**
- ✅ Timer component shows correct phase label
- ✅ Timer countdown displays correct number
- ✅ Round number updates in UI
- ✅ Phase-specific UI elements appear (shop in PLANNING, combat log in COMBAT, etc.)

### 5. Monitor Phase Transitions

Watch for transitions from PLANNING → COMBAT → TRANSITION → PLANNING:
- Server should emit ROUND_START for PLANNING
- Server should emit COMBAT_START for COMBAT
- Server should emit ROUND_END for TRANSITION

## Debugging Checklist

If state still doesn't update:

### ✅ Check 1: Are server events being received?
Look for: `🔵 Server event received:`
- ❌ If missing: Socket connection issue
- ✅ If present: Events are reaching client

### ✅ Check 2: Are store functions being called?
Look for: `📊 [ROUND_START] Calling setPhase with:`
- ❌ If missing: Event handler not firing
- ✅ If present: Event handler working

### ✅ Check 3: Is store actually updating?
Look for: `🔄 [STORE] setPhase called:` and `✅ [STORE] Phase updated to:`
- ❌ If missing: Store mutation broken
- ✅ If present: Store is updating

### ✅ Check 4: Is component receiving updates?
Look for: `🎮 [MATCH PAGE] State updated:`
- ❌ If missing: Zustand subscription broken (shouldn't happen with fixed selectors)
- ✅ If present: Component is re-rendering

### ✅ Check 5: Are Timer props updating?
Look for: `⏱️ [TIMER COMPONENT] Props updated:`
- ❌ If missing: Props not being passed correctly
- ✅ If present: Full chain working!

## Expected Behavior After Fixes

### ✅ What Should Work Now:
1. **Phase transitions visible** - UI changes when phase changes
2. **Round updates visible** - Round number increments in UI
3. **Timer syncs with server** - Time comes from server events
4. **Component re-renders on state change** - Zustand selectors trigger updates
5. **Complete logging chain** - Can trace state flow from server → store → UI

### ⚠️ Known Changes:
1. **No client-side countdown** - Timer only updates when server sends events
2. **More console logs** - Detailed debugging output (can be removed later)

## Cleanup After Verification

Once you confirm everything works:

1. Remove debug console.log statements from:
   - `hooks/useSocket.ts` (lines 108-179)
   - `store/gameStore.ts` (lines 404-432)
   - `app/match/[id]/page.tsx` (lines 43-49)
   - `components/game/Timer.tsx` (lines 17-22)

2. Re-implement client-side timer with proper sync:
   ```typescript
   // Only start client countdown after receiving server update
   // Reset on phase/round change
   // Don't let it override server values
   ```

3. Consider adding server time sync mechanism for smoother countdown

## Files Modified

1. `hooks/useSocket.ts` - Added event logging
2. `store/gameStore.ts` - Added state mutation logging
3. `app/match/[id]/page.tsx` - Fixed Zustand selectors, disabled client timer, added logging
4. `components/game/Timer.tsx` - Added props logging

## Quick Reference: Console Log Legend

| Icon | Source | Meaning |
|------|--------|---------|
| 🔵 | Socket | Server event received |
| 📊 | Socket Handler | Processing event, calling store |
| 🔄 | Store | State mutation starting |
| ✅ | Store | State mutation complete |
| 🎮 | Match Page | Component re-rendered with new state |
| ⏱️ | Timer Component | Timer received new props |

---

**Created:** 2025-11-22
**Status:** Fixes applied, ready for testing
**Next Steps:** Test in development, verify fixes work, clean up debug logs
