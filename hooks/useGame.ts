import { useAccount, useBalance } from 'wagmi';
import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { useSocket } from './useSocket';

export function useGame() {
  const { address, isConnected, isConnecting } = useAccount();
  const { data: balance } = useBalance({ address });

  const setAddress = usePlayerStore((state) => state.setAddress);
  const playerAddress = usePlayerStore((state) => state.address);
  const stats = usePlayerStore((state) => state.stats);

  const matchId = useGameStore((state) => state.matchId);
  const round = useGameStore((state) => state.round);
  const phase = useGameStore((state) => state.phase);

  // Get socket functions
  const socket = useSocket();

  // Sync wallet address to player store
  useEffect(() => {
    if (address && address !== playerAddress) {
      setAddress(address);
    }
  }, [address, playerAddress, setAddress]);

  return {
    // Wallet Info
    address,
    isConnected,
    isConnecting,
    balance: balance?.formatted,
    balanceSymbol: balance?.symbol,

    // Player Info
    stats,

    // Game State
    matchId,
    round,
    phase,
    isInMatch: !!matchId,

    // Socket functions
    socket,
  };
}
