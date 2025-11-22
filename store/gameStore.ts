import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  GameState,
  Unit,
  Board,
  Shop,
  CombatEvent,
  GamePhase,
  STARTING_HEALTH,
  STARTING_GOLD,
  REROLL_COST,
  XP_BUY_COST,
} from '@/types/game';

interface GameStore extends GameState {
  // Socket.io instance reference (set from useSocket hook)
  socketEmit?: (eventType: string, ...args: any[]) => boolean;

  // Optimistic update state
  previousState?: Partial<GameState>;

  // Actions with optimistic updates
  buyCard: (index: number) => void;
  sellCard: (unitId: string) => void;
  placeCard: (unitId: string, position: number) => void;
  rerollShop: () => void;
  buyXP: () => void;
  equipItem: (itemId: string, unitId: string) => void;

  // Socket integration
  setSocketEmit: (emitFn: (eventType: string, ...args: any[]) => boolean) => void;

  // Match Actions
  setMatchId: (matchId: string) => void;
  setPhase: (phase: GamePhase) => void;
  setRound: (round: number) => void;
  setTimeRemaining: (time: number) => void;
  updateShop: (shop: Shop) => void;
  addCombatEvent: (event: CombatEvent) => void;
  updateFromServer: (data: Partial<GameState>) => void;

  // Optimistic update rollback
  rollbackOptimisticUpdate: () => void;
  saveStateSnapshot: () => void;

  // Utility
  reset: () => void;
}

const initialBoard: Board = {
  top: [null, null, null, null],
  bottom: [null, null, null, null],
};

const initialState: GameState = {
  matchId: '',
  round: 1,
  phase: 'PLANNING',
  timeRemaining: 30,

  player: {
    id: '',
    address: '',
    health: STARTING_HEALTH,
    gold: STARTING_GOLD,
    level: 1,
    xp: 0,
    winStreak: 0,
    loseStreak: 0,
  },

  opponents: [],
  currentOpponent: undefined,

  shop: {
    cards: [],
    rerollCost: REROLL_COST,
    freeRerolls: 0,
  },

  board: initialBoard,
  bench: [],
  items: [],
  combatLog: [],
};

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...initialState,

    socketEmit: undefined,
    previousState: undefined,

    // Set socket emit function
    setSocketEmit: (emitFn) => set((state) => {
      state.socketEmit = emitFn;
    }),

    // Save current state for rollback
    saveStateSnapshot: () => set((state) => {
      state.previousState = {
        player: { ...state.player },
        shop: { ...state.shop, cards: [...state.shop.cards] },
        board: {
          top: [...state.board.top],
          bottom: [...state.board.bottom],
        },
        bench: [...state.bench],
        items: [...state.items],
      };
    }),

    // Rollback to previous state
    rollbackOptimisticUpdate: () => set((state) => {
      if (state.previousState) {
        Object.assign(state, state.previousState);
        state.previousState = undefined;
      }
    }),

    // Buy card from shop with optimistic update
    buyCard: (index: number) => {
      const state = get();
      const card = state.shop.cards[index];

      if (!card || state.player.gold < card.cost) {
        return;
      }

      // Save state for potential rollback
      get().saveStateSnapshot();

      // Optimistic update
      set((draft) => {
        // Deduct gold
        draft.player.gold -= card.cost;

        // Add to bench
        draft.bench.push(card);

        // Remove from shop
        draft.shop.cards.splice(index, 1);
      });

      // Send to server
      const socketEmit = get().socketEmit;
      if (socketEmit) {
        const success = socketEmit('BUY_CARD', { cardIndex: index });
        if (!success) {
          // Rollback if emit failed
          get().rollbackOptimisticUpdate();
        }
      }
    },

    // Sell card (from board or bench) with optimistic update
    sellCard: (unitId: string) => {
      const state = get();

      // Find the unit
      let foundUnit: Unit | null = null;
      let location: 'board' | 'bench' | null = null;

      // Check board
      for (let i = 0; i < 4; i++) {
        if (state.board.top[i]?.id === unitId) {
          foundUnit = state.board.top[i];
          location = 'board';
          break;
        }
        if (state.board.bottom[i]?.id === unitId) {
          foundUnit = state.board.bottom[i];
          location = 'board';
          break;
        }
      }

      // Check bench
      if (!foundUnit) {
        const benchUnit = state.bench.find(u => u.id === unitId);
        if (benchUnit) {
          foundUnit = benchUnit;
          location = 'bench';
        }
      }

      if (!foundUnit) return;

      // Save state for potential rollback
      get().saveStateSnapshot();

      // Optimistic update
      set((draft) => {
        // Add gold
        draft.player.gold += foundUnit.cost;

        // Remove from board or bench
        if (location === 'board') {
          for (let i = 0; i < 4; i++) {
            if (draft.board.top[i]?.id === unitId) {
              draft.board.top[i] = null;
              return;
            }
            if (draft.board.bottom[i]?.id === unitId) {
              draft.board.bottom[i] = null;
              return;
            }
          }
        } else if (location === 'bench') {
          const benchIndex = draft.bench.findIndex(u => u.id === unitId);
          if (benchIndex !== -1) {
            draft.bench.splice(benchIndex, 1);
          }
        }
      });

      // Send to server
      const socketEmit = get().socketEmit;
      if (socketEmit) {
        const success = socketEmit('SELL_CARD', { unitId });
        if (!success) {
          get().rollbackOptimisticUpdate();
        }
      }
    },

    // Place card on board with optimistic update
    placeCard: (unitId: string, position: number) => {
      const state = get();

      // Find the unit (could be on board or bench)
      let unit: Unit | null = null;

      // Check board
      for (let i = 0; i < 4; i++) {
        if (state.board.top[i]?.id === unitId) {
          unit = state.board.top[i];
          break;
        }
        if (state.board.bottom[i]?.id === unitId) {
          unit = state.board.bottom[i];
          break;
        }
      }

      // Check bench
      const benchUnit = state.bench.find(u => u.id === unitId);
      if (benchUnit) {
        unit = benchUnit;
      }

      if (!unit) return;

      // Save state for potential rollback
      get().saveStateSnapshot();

      // Optimistic update
      set((draft) => {
        // Remove from current position
        for (let i = 0; i < 4; i++) {
          if (draft.board.top[i]?.id === unitId) {
            draft.board.top[i] = null;
          }
          if (draft.board.bottom[i]?.id === unitId) {
            draft.board.bottom[i] = null;
          }
        }

        // Remove from bench
        const benchIndex = draft.bench.findIndex(u => u.id === unitId);
        if (benchIndex !== -1) {
          draft.bench.splice(benchIndex, 1);
        }

        // Place at new position
        if (position < 4) {
          // Top row
          const existing = draft.board.top[position];
          if (existing) draft.bench.push(existing);
          draft.board.top[position] = unit;
        } else {
          // Bottom row
          const existing = draft.board.bottom[position - 4];
          if (existing) draft.bench.push(existing);
          draft.board.bottom[position - 4] = unit;
        }
      });

      // Send to server
      const socketEmit = get().socketEmit;
      if (socketEmit) {
        const success = socketEmit('PLACE_CARD', { unitId, position });
        if (!success) {
          get().rollbackOptimisticUpdate();
        }
      }
    },

    // Reroll shop
    rerollShop: () => {
      const state = get();

      const canReroll = state.shop.freeRerolls > 0 || state.player.gold >= state.shop.rerollCost;
      if (!canReroll) return;

      // Save state for potential rollback
      get().saveStateSnapshot();

      // Optimistic update - deduct cost
      set((draft) => {
        if (draft.shop.freeRerolls > 0) {
          draft.shop.freeRerolls--;
        } else {
          draft.player.gold -= draft.shop.rerollCost;
        }
      });

      // Server will send new shop via SHOP_UPDATE event
      const socketEmit = get().socketEmit;
      if (socketEmit) {
        const success = socketEmit('REROLL_SHOP');
        if (!success) {
          get().rollbackOptimisticUpdate();
        }
      }
    },

    // Buy XP
    buyXP: () => {
      const state = get();

      if (state.player.gold < XP_BUY_COST) return;

      // Save state for potential rollback
      get().saveStateSnapshot();

      // Optimistic update
      set((draft) => {
        draft.player.gold -= XP_BUY_COST;
        draft.player.xp += 4;

        // Check for level up (2 XP per level, so level 9 = 18 XP total)
        const xpForNextLevel = draft.player.level * 2;
        if (draft.player.xp >= xpForNextLevel) {
          draft.player.level++;
          draft.player.xp -= xpForNextLevel;
        }
      });

      // Send to server
      const socketEmit = get().socketEmit;
      if (socketEmit) {
        const success = socketEmit('BUY_XP');
        if (!success) {
          get().rollbackOptimisticUpdate();
        }
      }
    },

    // Equip item
    equipItem: (itemId: string, unitId: string) => {
      const state = get();
      const item = state.items.find(i => i.id === itemId);

      if (!item) return;

      // Save state for potential rollback
      get().saveStateSnapshot();

      // Optimistic update
      set((draft) => {
        // Find unit on board
        for (let i = 0; i < 4; i++) {
          if (draft.board.top[i]?.id === unitId) {
            draft.board.top[i]!.item = item;
            draft.items = draft.items.filter(i => i.id !== itemId);
            return;
          }
          if (draft.board.bottom[i]?.id === unitId) {
            draft.board.bottom[i]!.item = item;
            draft.items = draft.items.filter(i => i.id !== itemId);
            return;
          }
        }
      });

      // Send to server
      const socketEmit = get().socketEmit;
      if (socketEmit) {
        const success = socketEmit('EQUIP_ITEM', { itemId, unitId });
        if (!success) {
          get().rollbackOptimisticUpdate();
        }
      }
    },

    // Match state updates
    setMatchId: (matchId: string) => set((state) => {
      state.matchId = matchId;
    }),

    setPhase: (phase: GamePhase) => set((state) => {
      console.log('🔄 [STORE] setPhase called:', {
        oldPhase: state.phase,
        newPhase: phase
      });
      state.phase = phase;

      // Clear combat log when entering planning phase
      if (phase === 'PLANNING') {
        state.combatLog = [];
      }
      console.log('✅ [STORE] Phase updated to:', state.phase);
    }),

    setRound: (round: number) => set((state) => {
      console.log('🔄 [STORE] setRound called:', {
        oldRound: state.round,
        newRound: round
      });
      state.round = round;
      console.log('✅ [STORE] Round updated to:', state.round);
    }),

    setTimeRemaining: (time: number) => set((state) => {
      console.log('🔄 [STORE] setTimeRemaining called:', {
        oldTime: state.timeRemaining,
        newTime: time
      });
      state.timeRemaining = time;
      console.log('✅ [STORE] Time updated to:', state.timeRemaining);
    }),

    updateShop: (shop: Shop) => set((state) => {
      state.shop = shop;
      // Clear previous state since server confirmed
      state.previousState = undefined;
    }),

    addCombatEvent: (event: CombatEvent) => set((state) => {
      state.combatLog.push(event);
    }),

    updateFromServer: (data: Partial<GameState>) => set((state) => {
      Object.assign(state, data);
      // Clear previous state since server confirmed
      state.previousState = undefined;
    }),

    // Reset to initial state
    reset: () => set(initialState),
  }))
);
