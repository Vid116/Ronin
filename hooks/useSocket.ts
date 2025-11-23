import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';
import { ServerEvent, ClientEvent } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import { usePlayerStore } from '@/store/playerStore';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const { address: connectedAddress } = useAccount();
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

  useEffect(() => {
    // Don't connect if no wallet is connected
    if (!connectedAddress) {
      console.log('⏸️ No wallet connected, not initializing socket');
      return;
    }

    console.log(`🔗 Initializing socket with wallet: ${connectedAddress}`);

    // Initialize socket connection with wallet address in auth
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
      auth: {
        walletAddress: connectedAddress,
      },
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      console.log('Socket connected:', socket.id, 'for wallet:', connectedAddress);
      // Removed: toast.success('Connected to game server');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server forcibly disconnected, manual reconnection needed
        // Only show toast for critical disconnects
        toast.error('Disconnected from server');
      }
      // Removed: toast('Connection lost, reconnecting...', { icon: '🔄' });
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
      // Removed: toast.success('Reconnected to game server');
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

    // Full state sync (for reconnections and partial updates)
    socket.on('state_sync', (data: any) => {
      console.log('📊 State sync received:', data);
      // Only pass through fields that are actually defined in the data
      // This prevents partial updates from setting fields to undefined
      const updateData: Partial<any> = {};
      if (data.matchId !== undefined) updateData.matchId = data.matchId;
      if (data.round !== undefined) updateData.round = data.round;
      if (data.phase !== undefined) updateData.phase = data.phase;
      if (data.timeRemaining !== undefined) updateData.timeRemaining = data.timeRemaining;
      if (data.player !== undefined) updateData.player = data.player;
      if (data.shop !== undefined) updateData.shop = data.shop;
      if (data.board !== undefined) updateData.board = data.board;
      if (data.bench !== undefined) updateData.bench = data.bench;
      if (data.opponents !== undefined) updateData.opponents = data.opponents;

      updateFromServer(updateData);
    });

    // Player stats updates
    socket.on('player_stats_update', (player: any) => {
      console.log('📊 Player stats update:', player);
      updateFromServer({ player });
    });

    // Opponent board updates
    socket.on('opponent_board_update', (data: any) => {
      console.log('📊 Opponent board update:', data);
      // Update opponent in opponents array
      const currentOpponents = useGameStore.getState().opponents;
      const updatedOpponents = currentOpponents.map(opp =>
        opp.id === data.playerId ? { ...opp, board: data.board } : opp
      );
      updateFromServer({ opponents: updatedOpponents });
    });

    // Success messages
    socket.on('success', (data: any) => {
      console.log('✅ Success message:', data.message);
      toast.success(data.message);
    });

    // Error handling
    socket.on('error', (error: any) => {
      console.error('Socket error:', error);

      // Handle match creation failures
      if (error.type === 'MATCH_CREATION_FAILED') {
        console.error('❌ Match creation failed:', error.message, error.details);
        toast.error(error.message, { duration: 5000 });

        // Clear queue state so user can try again
        usePlayerStore.getState().leaveQueue();
        return;
      }

      // Handle other error types
      if (error.type === 'GAME_ERROR' || error.type === 'AUTH_ERROR') {
        toast.error(error.message);
      }
    });

    return () => {
      console.log('🔌 Disconnecting socket for wallet:', connectedAddress);
      socket.disconnect();
    };
  }, [connectedAddress]); // Reconnect when wallet changes

  const handleServerEvent = useCallback((event: ServerEvent) => {
    console.log('🔵 Server event received:', event.type, event.data);

    switch (event.type) {
      case 'MATCH_FOUND':
        console.log('📊 [MATCH_FOUND] Setting initial state:', {
          round: event.data.currentRound || 1,
          phase: 'PLANNING',
          timeRemaining: 30
        });
        setMatchId(event.data.id);
        // Initialize game state with match data
        // Find our player by wallet address (server uses wallet as player.id)
        const myPlayer = event.data.players.find(p => p.address === connectedAddress);
        updateFromServer({
          opponents: event.data.players.filter(p => p.address !== connectedAddress),
          player: myPlayer || useGameStore.getState().player,
          round: event.data.currentRound || 1,
          phase: 'PLANNING',
          timeRemaining: 30, // Set initial timer for planning phase
        });
        // Removed annoying toast
        break;

      case 'AWAITING_PAYMENT':
        console.log('📊 [AWAITING_PAYMENT] Payment required:', event.data);
        // Store pending payment info in game store for lobby to display
        useGameStore.setState({
          pendingPayment: {
            blockchainMatchId: event.data.blockchainMatchId,
            entryFee: event.data.entryFee,
            deadline: event.data.deadline,
          }
        });
        toast('Payment required to join match', { icon: '💰', duration: 5000 });
        break;

      case 'PAYMENT_CONFIRMED':
        console.log('📊 [PAYMENT_CONFIRMED] Payment confirmed:', event.data);
        // Removed: toast(`${event.data.playersReady}/${event.data.totalPlayers} players ready`, { icon: '✓' });
        break;

      case 'ALL_PAYMENTS_CONFIRMED':
        console.log('📊 [ALL_PAYMENTS_CONFIRMED] All payments confirmed');
        // Clear pending payment
        useGameStore.setState({ pendingPayment: null });
        // Removed: toast.success('All players ready! Match starting...', { duration: 3000 });
        break;

      case 'MATCH_CANCELLED':
        console.log('📊 [MATCH_CANCELLED] Match cancelled:', event.data.reason);
        // Clear pending payment
        useGameStore.setState({ pendingPayment: null });
        toast.error(event.data.reason, { duration: 5000 });
        break;

      case 'ROUND_START':
        console.log('📊 [ROUND_START] Updating state:', {
          round: event.data.round,
          phase: event.data.phase,
          timeRemaining: Math.ceil(event.data.timeRemaining / 1000)
        });
        setRound(event.data.round);
        setPhase(event.data.phase);
        // Use server-provided timeRemaining (converted from ms to seconds)
        setTimeRemaining(Math.ceil(event.data.timeRemaining / 1000));

        const phaseLabel = event.data.phase === 'PLANNING' ? 'Planning Phase' :
                          event.data.phase === 'COMBAT' ? 'Combat Phase' : 'Transition';
        toast(`Round ${event.data.round} - ${phaseLabel}`, { icon: '⚡' });
        break;

      case 'SHOP_UPDATE':
        console.log('📊 [SHOP_UPDATE] Updating shop');
        updateShop(event.data);
        break;

      case 'COMBAT_START':
        console.log('📊 [COMBAT_START] Updating state:', {
          phase: 'COMBAT',
          timeRemaining: Math.ceil(event.data.timeRemaining / 1000)
        });
        setPhase('COMBAT');
        // Use server-provided timeRemaining (converted from ms to seconds)
        setTimeRemaining(Math.ceil(event.data.timeRemaining / 1000));
        updateFromServer({ currentOpponent: event.data.opponent.player });
        toast('Combat starting!', { icon: '⚔️' });
        break;

      case 'COMBAT_EVENT':
        console.log('📊 [COMBAT_EVENT] Adding combat event:', event.data.type);
        addCombatEvent(event.data);

        // Removed annoying death toasts - combat log shows this info
        break;

      case 'COMBAT_BOARDS':
        console.log('📊 [COMBAT_BOARDS] Received combat boards:', {
          playerUnitsRemaining: event.data.playerUnitsRemaining,
          opponentUnitsRemaining: event.data.opponentUnitsRemaining
        });
        updateFromServer({
          combatInitialBoards: {
            player: event.data.initialBoard1,
            opponent: event.data.initialBoard2,
          },
          combatFinalBoards: {
            player: event.data.finalBoard1,
            opponent: event.data.finalBoard2,
          },
          combatUnitsRemaining: {
            player: event.data.playerUnitsRemaining,
            opponent: event.data.opponentUnitsRemaining,
          }
        });
        break;

      case 'ROUND_END':
        console.log('📊 [ROUND_END] Updating state:', {
          phase: 'TRANSITION',
          damage: event.data.damage
        });
        setPhase('TRANSITION');

        // Use server's authoritative player state
        updateFromServer({
          player: event.data.player,
        });

        // Removed annoying damage toasts - player can see their health bar
        break;

      case 'PLAYER_ELIMINATED':
        // Removed annoying elimination toast - opponent list shows this
        break;

      case 'MATCH_END':
        // Clear matchId to indicate match is over
        setMatchId('');

        // Find our placement by wallet address
        const myPlacement = event.data.placements.find(
          (p) => p.playerId === connectedAddress
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
  }, [connectedAddress, setMatchId, setPhase, setRound, setTimeRemaining, updateShop, addCombatEvent, updateFromServer]);

  const emit = useCallback((eventType: string, data?: any) => {
    if (!socketRef.current?.connected) {
      console.error('❌ Cannot emit - not connected to server');
      toast.error('Not connected to server');
      return false;
    }

    const event: ClientEvent = { type: eventType as any, data };
    console.log('🟢 Emitting event:', event.type, event.data);
    socketRef.current.emit('client_event', event);
    return true;
  }, []);

  // Specific event emitters for better type safety and ease of use
  const joinQueue = useCallback((entryFee: number, transactionHash?: string, matchType?: 'standard' | 'rofl-test') => {
    return emit('JOIN_QUEUE', { entryFee, transactionHash, matchType });
  }, [emit]);

  const buyCard = useCallback((cardIndex: number) => {
    return emit('BUY_CARD', { cardIndex });
  }, [emit]);

  const sellCard = useCallback((unitId: string) => {
    return emit('SELL_CARD', { unitId });
  }, [emit]);

  const placeCard = useCallback((unitId: string, position: number) => {
    return emit('PLACE_CARD', { unitId, position });
  }, [emit]);

  const rerollShop = useCallback(() => {
    return emit('REROLL_SHOP');
  }, [emit]);

  const buyXP = useCallback(() => {
    return emit('BUY_XP');
  }, [emit]);

  const equipItem = useCallback((itemId: string, unitId: string) => {
    return emit('EQUIP_ITEM', { itemId, unitId });
  }, [emit]);

  const ready = useCallback(() => {
    return emit('READY');
  }, [emit]);

  const joinBotMatch = useCallback((entryFee: number, transactionHash?: string) => {
    return emit('JOIN_BOT_MATCH', { entryFee, transactionHash });
  }, [emit]);

  const forceEndMatch = useCallback(() => {
    return emit('DEV_FORCE_END_MATCH');
  }, [emit]);

  const submitPayment = useCallback((blockchainMatchId: number, transactionHash: string) => {
    return emit('SUBMIT_PAYMENT', { blockchainMatchId, transactionHash });
  }, [emit]);

  return {
    isConnected,
    error,
    socket: socketRef.current,

    // Generic emit
    emit,

    // Specific emitters
    joinQueue,
    joinBotMatch,
    submitPayment,
    buyCard,
    sellCard,
    placeCard,
    rerollShop,
    buyXP,
    equipItem,
    ready,
    forceEndMatch,
  };
}
