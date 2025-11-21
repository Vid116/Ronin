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
  // Actions
  buyCard: (index: number) => void;
  sellCard: (unitId: string) => void;
  placeCard: (unitId: string, position: number) => void;
  rerollShop: () => void;
  buyXP: () => void;
  equipItem: (itemId: string, unitId: string) => void;

  // Match Actions
  setMatchId: (matchId: string) => void;
  setPhase: (phase: GamePhase) => void;
  setRound: (round: number) => void;
  setTimeRemaining: (time: number) => void;
  updateShop: (shop: Shop) => void;
  addCombatEvent: (event: CombatEvent) => void;
  updateFromServer: (data: Partial<GameState>) => void;

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
  timeRemaining: 20,

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

    // Buy card from shop
    buyCard: (index: number) => set((state) => {
      const card = state.shop.cards[index];
      if (!card || state.player.gold < card.cost) return;

      // Deduct gold
      state.player.gold -= card.cost;

      // Add to bench
      state.bench.push(card);

      // Remove from shop
      state.shop.cards.splice(index, 1);
    }),

    // Sell card (from board or bench)
    sellCard: (unitId: string) => set((state) => {
      // Find and remove from board
      for (let i = 0; i < 4; i++) {
        if (state.board.top[i]?.id === unitId) {
          const unit = state.board.top[i]!;
          state.player.gold += unit.cost;
          state.board.top[i] = null;
          return;
        }
        if (state.board.bottom[i]?.id === unitId) {
          const unit = state.board.bottom[i]!;
          state.player.gold += unit.cost;
          state.board.bottom[i] = null;
          return;
        }
      }

      // Find and remove from bench
      const benchIndex = state.bench.findIndex(u => u.id === unitId);
      if (benchIndex !== -1) {
        const unit = state.bench[benchIndex];
        state.player.gold += unit.cost;
        state.bench.splice(benchIndex, 1);
      }
    }),

    // Place card on board
    placeCard: (unitId: string, position: number) => set((state) => {
      // Find the unit (could be on board or bench)
      let unit: Unit | null = null;

      // Remove from current position
      for (let i = 0; i < 4; i++) {
        if (state.board.top[i]?.id === unitId) {
          unit = state.board.top[i];
          state.board.top[i] = null;
        }
        if (state.board.bottom[i]?.id === unitId) {
          unit = state.board.bottom[i];
          state.board.bottom[i] = null;
        }
      }

      // Check bench
      const benchIndex = state.bench.findIndex(u => u.id === unitId);
      if (benchIndex !== -1) {
        unit = state.bench[benchIndex];
        state.bench.splice(benchIndex, 1);
      }

      if (!unit) return;

      // Place at new position
      if (position < 4) {
        // Top row
        const existing = state.board.top[position];
        if (existing) state.bench.push(existing);
        state.board.top[position] = unit;
      } else {
        // Bottom row
        const existing = state.board.bottom[position - 4];
        if (existing) state.bench.push(existing);
        state.board.bottom[position - 4] = unit;
      }
    }),

    // Reroll shop
    rerollShop: () => set((state) => {
      if (state.shop.freeRerolls > 0) {
        state.shop.freeRerolls--;
      } else if (state.player.gold >= state.shop.rerollCost) {
        state.player.gold -= state.shop.rerollCost;
      } else {
        return; // Not enough gold
      }
      // Server will send new shop
    }),

    // Buy XP
    buyXP: () => set((state) => {
      if (state.player.gold >= XP_BUY_COST) {
        state.player.gold -= XP_BUY_COST;
        state.player.xp += 4;

        // Check for level up (2 XP per level, so level 9 = 18 XP total)
        const xpForNextLevel = state.player.level * 2;
        if (state.player.xp >= xpForNextLevel) {
          state.player.level++;
          state.player.xp -= xpForNextLevel;
        }
      }
    }),

    // Equip item
    equipItem: (itemId: string, unitId: string) => set((state) => {
      const item = state.items.find(i => i.id === itemId);
      if (!item) return;

      // Find unit on board
      for (let i = 0; i < 4; i++) {
        if (state.board.top[i]?.id === unitId) {
          state.board.top[i]!.item = item;
          state.items = state.items.filter(i => i.id !== itemId);
          return;
        }
        if (state.board.bottom[i]?.id === unitId) {
          state.board.bottom[i]!.item = item;
          state.items = state.items.filter(i => i.id !== itemId);
          return;
        }
      }
    }),

    // Match state updates
    setMatchId: (matchId: string) => set((state) => {
      state.matchId = matchId;
    }),

    setPhase: (phase: GamePhase) => set((state) => {
      state.phase = phase;
    }),

    setRound: (round: number) => set((state) => {
      state.round = round;
    }),

    setTimeRemaining: (time: number) => set((state) => {
      state.timeRemaining = time;
    }),

    updateShop: (shop: Shop) => set((state) => {
      state.shop = shop;
    }),

    addCombatEvent: (event: CombatEvent) => set((state) => {
      state.combatLog.push(event);
    }),

    updateFromServer: (data: Partial<GameState>) => set((state) => {
      Object.assign(state, data);
    }),

    // Reset to initial state
    reset: () => set(initialState),
  }))
);
