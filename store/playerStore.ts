import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  top3Finishes: number;
  totalGoldEarned: number;
  totalDamageDealt: number;
  favoriteUnit?: string;
}

interface QueueState {
  isQueuing: boolean;
  queueStartTime?: number;
  selectedStake: number;
  playersInQueue: number;
}

interface PlayerStore {
  // Player Info
  address?: string;
  displayName?: string;
  stats: PlayerStats;

  // Queue State
  queue: QueueState;

  // Actions
  setAddress: (address: string) => void;
  setDisplayName: (name: string) => void;
  updateStats: (stats: Partial<PlayerStats>) => void;

  // Queue Actions
  joinQueue: (stake: number) => void;
  leaveQueue: () => void;
  updateQueueCount: (count: number) => void;

  // Reset
  reset: () => void;
}

const initialStats: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  top3Finishes: 0,
  totalGoldEarned: 0,
  totalDamageDealt: 0,
};

const initialQueue: QueueState = {
  isQueuing: false,
  selectedStake: 0,
  playersInQueue: 0,
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      address: undefined,
      displayName: undefined,
      stats: initialStats,
      queue: initialQueue,

      setAddress: (address: string) => set({ address }),

      setDisplayName: (name: string) => set({ displayName: name }),

      updateStats: (newStats: Partial<PlayerStats>) =>
        set((state) => ({
          stats: { ...state.stats, ...newStats },
        })),

      joinQueue: (stake: number) =>
        set({
          queue: {
            isQueuing: true,
            queueStartTime: Date.now(),
            selectedStake: stake,
            playersInQueue: 1,
          },
        }),

      leaveQueue: () =>
        set({
          queue: initialQueue,
        }),

      updateQueueCount: (count: number) =>
        set((state) => ({
          queue: { ...state.queue, playersInQueue: count },
        })),

      reset: () =>
        set({
          address: undefined,
          displayName: undefined,
          stats: initialStats,
          queue: initialQueue,
        }),
    }),
    {
      name: 'ronin-rumble-player',
      partialize: (state) => ({
        address: state.address,
        displayName: state.displayName,
        stats: state.stats,
      }),
    }
  )
);
