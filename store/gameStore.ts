import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  GameState,
  Board,
  Shop,
  CombatEvent,
  GamePhase,
  STARTING_HEALTH,
  STARTING_GOLD,
  REROLL_COST,
} from '@/types/game';

interface GameStore extends GameState {
  // Simple state setters - server is source of truth
  setMatchId: (matchId: string) => void;
  setPhase: (phase: GamePhase) => void;
  setRound: (round: number) => void;
  setTimeRemaining: (time: number) => void;
  updateShop: (shop: Shop) => void;
  addCombatEvent: (event: CombatEvent) => void;
  updateFromServer: (data: Partial<GameState>) => void;
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

  // Combat visualization
  combatInitialBoards: undefined,
  combatFinalBoards: undefined,
  combatUnitsRemaining: undefined,
};

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    ...initialState,

    // Simple setters - just update state from server
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
    }),

    addCombatEvent: (event: CombatEvent) => set((state) => {
      state.combatLog.push(event);
    }),

    updateFromServer: (data: Partial<GameState>) => set((state) => {
      // Only update fields that are actually defined (not undefined)
      // This prevents partial updates from overwriting existing state with undefined
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined) {
          (state as any)[key] = value;
        }
      });
    }),

    // Reset to initial state
    reset: () => set(initialState),
  }))
);
