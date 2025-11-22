import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerEvent, ClientEvent } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const updateFromServer = useGameStore((state) => state.updateFromServer);
  const setPhase = useGameStore((state) => state.setPhase);
  const setRound = useGameStore((state) => state.setRound);
  const setTimeRemaining = useGameStore((state) => state.setTimeRemaining);
  const updateShop = useGameStore((state) => state.updateShop);
  const addCombatEvent = useGameStore((state) => state.addCombatEvent);
  const setMatchId = useGameStore((state) => state.setMatchId);
  const rollbackOptimisticUpdate = useGameStore((state) => state.rollbackOptimisticUpdate);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      console.log('Socket connected:', socket.id);
      toast.success('Connected to game server');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server forcibly disconnected, manual reconnection needed
        toast.error('Disconnected from server');
      } else {
        // Automatic reconnection will happen
        toast('Connection lost, reconnecting...', { icon: '🔄' });
      }
    });

    socket.on('connect_error', (err) => {
      reconnectAttemptsRef.current++;
      setError(err.message);
      console.error('Socket connection error:', err);

      if (reconnectAttemptsRef.current >= 5) {
        toast.error('Failed to connect to game server. Please refresh.');
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      toast.success('Reconnected to game server');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect');
      toast.error('Could not reconnect to server');
    });

    // Game events
    socket.on('server_event', (event: ServerEvent) => {
      handleServerEvent(event);
    });

    // Error handling
    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      if (error.type === 'GAME_ERROR') {
        toast.error(error.message);
        // Rollback any optimistic updates if error occurred
        rollbackOptimisticUpdate();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleServerEvent = useCallback((event: ServerEvent) => {
    console.log('Server event:', event.type, event.data);

    switch (event.type) {
      case 'MATCH_FOUND':
        setMatchId(event.data.id);
        updateFromServer({
          opponents: event.data.players.filter(p => p.id !== socketRef.current?.id),
          player: event.data.players.find(p => p.id === socketRef.current?.id) || useGameStore.getState().player,
        });
        toast.success('Match found! Get ready to battle!', { duration: 3000 });
        break;

      case 'ROUND_START':
        setRound(event.data.round);
        setPhase(event.data.phase);
        setTimeRemaining(20); // Reset timer for planning phase
        toast(`Round ${event.data.round} - Planning Phase`, { icon: '⚡' });
        break;

      case 'SHOP_UPDATE':
        updateShop(event.data);
        break;

      case 'COMBAT_START':
        setPhase('COMBAT');
        setTimeRemaining(10); // Combat phase duration
        updateFromServer({ currentOpponent: event.data.opponent.player });
        toast('Combat starting!', { icon: '⚔️' });
        break;

      case 'COMBAT_EVENT':
        addCombatEvent(event.data);

        // Show toast for significant events
        if (event.data.type === 'DEATH') {
          toast.error(`${event.data.source} was defeated!`);
        }
        break;

      case 'ROUND_END':
        setPhase('TRANSITION');

        // Update player state
        const currentPlayer = useGameStore.getState().player;
        updateFromServer({
          player: {
            ...currentPlayer,
            gold: currentPlayer.gold + event.data.gold,
            health: currentPlayer.health - event.data.damage,
          },
        });

        if (event.data.damage > 0) {
          toast.error(`You took ${event.data.damage} damage!`, { duration: 3000 });
        } else {
          toast.success('Victory! No damage taken', { duration: 3000 });
        }

        if (event.data.gold > 0) {
          toast(`+${event.data.gold} gold`, { icon: '💰', duration: 2000 });
        }
        break;

      case 'PLAYER_ELIMINATED':
        toast.error('A player has been eliminated!', { icon: '💀' });
        break;

      case 'MATCH_END':
        const myPlacement = event.data.placements.find(
          (p) => p.playerId === socketRef.current?.id
        );

        if (myPlacement) {
          if (myPlacement.placement === 1) {
            toast.success('Victory Royale! You are the champion!', {
              duration: 5000,
              icon: '🏆'
            });
          } else if (myPlacement.placement <= 3) {
            toast.success(`Top ${myPlacement.placement}! Great job!`, {
              duration: 4000,
              icon: '🥉'
            });
          } else {
            toast(`Finished #${myPlacement.placement}`, {
              duration: 3000,
              icon: '🎮'
            });
          }
        }
        break;
    }
  }, [setMatchId, setPhase, setRound, setTimeRemaining, updateShop, addCombatEvent, updateFromServer, rollbackOptimisticUpdate]);

  const emit = useCallback((event: ClientEvent) => {
    if (!socketRef.current?.connected) {
      toast.error('Not connected to server');
      return false;
    }

    console.log('Emitting event:', event.type);
    socketRef.current.emit('client_event', event);
    return true;
  }, []);

  // Specific event emitters for better type safety and ease of use
  const joinQueue = useCallback((entryFee: number) => {
    return emit({ type: 'JOIN_QUEUE', data: { entryFee } });
  }, [emit]);

  const buyCard = useCallback((cardIndex: number) => {
    return emit({ type: 'BUY_CARD', data: { cardIndex } });
  }, [emit]);

  const sellCard = useCallback((unitId: string) => {
    return emit({ type: 'SELL_CARD', data: { unitId } });
  }, [emit]);

  const placeCard = useCallback((unitId: string, position: number) => {
    return emit({ type: 'PLACE_CARD', data: { unitId, position } });
  }, [emit]);

  const rerollShop = useCallback(() => {
    return emit({ type: 'REROLL_SHOP' });
  }, [emit]);

  const buyXP = useCallback(() => {
    return emit({ type: 'BUY_XP' });
  }, [emit]);

  const equipItem = useCallback((itemId: string, unitId: string) => {
    return emit({ type: 'EQUIP_ITEM', data: { itemId, unitId } });
  }, [emit]);

  const ready = useCallback(() => {
    return emit({ type: 'READY' });
  }, [emit]);

  return {
    isConnected,
    error,
    socket: socketRef.current,

    // Generic emit
    emit,

    // Specific emitters
    joinQueue,
    buyCard,
    sellCard,
    placeCard,
    rerollShop,
    buyXP,
    equipItem,
    ready,
  };
}
