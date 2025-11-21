import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerEvent, ClientEvent } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFromServer = useGameStore((state) => state.updateFromServer);
  const setPhase = useGameStore((state) => state.setPhase);
  const setRound = useGameStore((state) => state.setRound);
  const updateShop = useGameStore((state) => state.updateShop);
  const addCombatEvent = useGameStore((state) => state.addCombatEvent);
  const setMatchId = useGameStore((state) => state.setMatchId);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      setError(err.message);
      console.error('Socket connection error:', err);
    });

    // Game events
    socket.on('server_event', (event: ServerEvent) => {
      handleServerEvent(event);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleServerEvent = (event: ServerEvent) => {
    switch (event.type) {
      case 'MATCH_FOUND':
        setMatchId(event.data.id);
        toast.success('Match found! 🎮');
        break;

      case 'ROUND_START':
        setRound(event.data.round);
        setPhase(event.data.phase);
        break;

      case 'SHOP_UPDATE':
        updateShop(event.data);
        break;

      case 'COMBAT_START':
        setPhase('COMBAT');
        updateFromServer({ currentOpponent: event.data.opponent.player });
        break;

      case 'COMBAT_EVENT':
        addCombatEvent(event.data);
        break;

      case 'ROUND_END':
        updateFromServer({
          player: {
            ...useGameStore.getState().player,
            gold: useGameStore.getState().player.gold + event.data.gold,
          },
        });
        if (event.data.damage > 0) {
          toast.error(`You took ${event.data.damage} damage!`);
        }
        break;

      case 'PLAYER_ELIMINATED':
        toast.error('A player was eliminated!');
        break;

      case 'MATCH_END':
        const myPlacement = event.data.placements.find(
          (p) => p.playerId === useGameStore.getState().player.id
        );
        if (myPlacement) {
          if (myPlacement.placement === 1) {
            toast.success('🏆 Victory! You won!');
          } else if (myPlacement.placement <= 3) {
            toast.success(`🥉 Top ${myPlacement.placement}!`);
          } else {
            toast.error(`Finished #${myPlacement.placement}`);
          }
        }
        break;
    }
  };

  const emit = (event: ClientEvent) => {
    if (!socketRef.current?.connected) {
      toast.error('Not connected to server');
      return;
    }
    socketRef.current.emit('client_event', event);
  };

  return {
    isConnected,
    error,
    emit,
    socket: socketRef.current,
  };
}
