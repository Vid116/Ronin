import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MatchMaking } from './game/MatchMaking';
import { ClientEvent } from '../types/game';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Initialize matchmaking system
const matchMaking = new MatchMaking(io);

// Periodic cleanup of completed matches
setInterval(() => {
  matchMaking.cleanup();
}, 60000); // Every 60 seconds

io.on('connection', (socket) => {
  // Extract wallet address from auth handshake
  const walletAddress = socket.handshake.auth.walletAddress as string;

  if (!walletAddress || typeof walletAddress !== 'string') {
    logger.error('Connection rejected - no wallet address provided', { socketId: socket.id });
    socket.emit('error', {
      type: 'AUTH_ERROR',
      message: 'Wallet address required to connect'
    });
    socket.disconnect();
    return;
  }

  logger.connect('New connection established', {
    wallet: walletAddress,
    socketId: socket.id
  });

  // Store wallet address on socket for later use
  (socket as any).walletAddress = walletAddress;

  // Update socket mapping for this wallet
  matchMaking.updateSocketMapping(walletAddress, socket.id);

  // Join socket to wallet address room for event broadcasting
  socket.join(walletAddress);
  logger.state('Socket joined wallet room', {
    wallet: walletAddress,
    socketId: socket.id
  });

  // Check if player has an active match by wallet address
  const existingMatch = matchMaking.getMatchByWallet(walletAddress);
  if (existingMatch) {
    logger.connect('Player reconnected to existing match', {
      wallet: walletAddress,
      socketId: socket.id,
      matchId: existingMatch.matchId
    });
    // Update the socket mapping in the match
    existingMatch.updateSocketMapping(walletAddress, socket.id);
    // Send full match state to re-sync the client
    existingMatch.syncPlayerState(walletAddress);
  }

  // Handle client events
  socket.on('client_event', (event: ClientEvent) => {
    logger.receive(`Received ${event.type}`, {
      wallet: walletAddress,
      socketId: socket.id,
      eventType: event.type,
      data: event.data
    });

    switch (event.type) {
      case 'JOIN_QUEUE':
        handleJoinQueue(socket, event.data.entryFee, event.data.transactionHash);
        break;

      case 'JOIN_BOT_MATCH':
        handleJoinBotMatch(socket, event.data.entryFee, event.data.transactionHash);
        break;

      case 'BUY_CARD':
        handleBuyCard(socket, event.data.cardIndex);
        break;

      case 'SELL_CARD':
        handleSellCard(socket, event.data.unitId);
        break;

      case 'PLACE_CARD':
        handlePlaceCard(socket, event.data.unitId, event.data.position);
        break;

      case 'REROLL_SHOP':
        handleRerollShop(socket);
        break;

      case 'EQUIP_ITEM':
        handleEquipItem(socket, event.data.itemId, event.data.unitId);
        break;

      case 'BUY_XP':
        handleBuyXP(socket);
        break;

      case 'READY':
        handleReady(socket);
        break;

      default:
        logger.error(`Unknown event type: ${(event as any).type}`, {
          wallet: walletAddress,
          socketId: socket.id,
          event
        });
    }
  });

  socket.on('disconnect', () => {
    logger.disconnect('Client disconnected', {
      wallet: walletAddress,
      socketId: socket.id
    });
    handleDisconnect(socket);
  });
});

// Event handlers
async function handleJoinQueue(socket: any, entryFee: number, transactionHash?: string) {
  const walletAddress = socket.walletAddress;
  logger.action('Player joining queue', {
    wallet: walletAddress,
    socketId: socket.id,
    entryFee,
    transactionHash
  });

  try {
    await matchMaking.addToQueue(socket.id, entryFee, transactionHash);
  } catch (error: any) {
    logger.error('Failed to join queue', {
      wallet: walletAddress,
      socketId: socket.id,
      error: error.message
    });
    socket.emit('error', {
      type: 'QUEUE_JOIN_FAILED',
      message: `Failed to join queue: ${error.message}`,
    });
  }
}

async function handleJoinBotMatch(socket: any, entryFee: number, transactionHash?: string) {
  const walletAddress = socket.walletAddress;
  logger.action('Player creating bot match', {
    wallet: walletAddress,
    socketId: socket.id,
    entryFee,
    transactionHash
  });

  try {
    await matchMaking.createBotMatch(socket.id, entryFee, transactionHash);
  } catch (error: any) {
    logger.error('Failed to create bot match', {
      wallet: walletAddress,
      socketId: socket.id,
      error: error.message
    });
    socket.emit('error', {
      type: 'BOT_MATCH_CREATION_FAILED',
      message: `Failed to create bot match: ${error.message}`,
    });
  }
}

function handleBuyCard(socket: any, cardIndex: number) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Buy card failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleBuyCard(socket.id, cardIndex);
  if (!success) {
    logger.action('Buy card failed - validation error', {
      wallet: walletAddress,
      socketId: socket.id,
      cardIndex,
      matchId: gameRoom.matchId
    });
  }
}

function handleSellCard(socket: any, unitId: string) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Sell card failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleSellCard(socket.id, unitId);
  if (!success) {
    logger.action('Sell card failed - validation error', {
      wallet: walletAddress,
      socketId: socket.id,
      unitId,
      matchId: gameRoom.matchId
    });
  }
}

function handlePlaceCard(socket: any, unitId: string, position: number) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Place card failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handlePlaceCard(socket.id, unitId, position);
  if (!success) {
    logger.action('Place card failed - validation error', {
      wallet: walletAddress,
      socketId: socket.id,
      unitId,
      position,
      matchId: gameRoom.matchId
    });
  }
}

function handleRerollShop(socket: any) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Reroll shop failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleRerollShop(socket.id);
  if (!success) {
    logger.action('Reroll shop failed - validation error', {
      wallet: walletAddress,
      socketId: socket.id,
      matchId: gameRoom.matchId
    });
  }
}

function handleEquipItem(socket: any, itemId: string, unitId: string) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Equip item failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  // TODO: Implement item equipping in GameRoom
  logger.action('Equip item - not yet implemented', {
    wallet: walletAddress,
    socketId: socket.id,
    itemId,
    unitId,
    matchId: gameRoom.matchId
  });
  socket.emit('error', { message: 'Item equipping not yet implemented' });
}

function handleBuyXP(socket: any) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Buy XP failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleBuyXP(socket.id);
  if (!success) {
    logger.action('Buy XP failed - validation error', {
      wallet: walletAddress,
      socketId: socket.id,
      matchId: gameRoom.matchId
    });
  }
}

function handleReady(socket: any) {
  const walletAddress = socket.walletAddress;
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);

  if (!gameRoom) {
    logger.error('Ready failed - not in active match', {
      wallet: walletAddress,
      socketId: socket.id
    });
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  gameRoom.handleReady(socket.id);
  logger.action('Player ready', {
    wallet: walletAddress,
    socketId: socket.id,
    matchId: gameRoom.matchId
  });
}

function handleDisconnect(socket: any) {
  const walletAddress = socket.walletAddress;
  if (walletAddress) {
    logger.disconnect('Wallet disconnected', {
      wallet: walletAddress,
      socketId: socket.id
    });
    matchMaking.handleDisconnect(socket.id);
  } else {
    // Fallback for connections without wallet (shouldn't happen)
    logger.error('Socket disconnected without wallet address', {
      socketId: socket.id
    });
    matchMaking.handleDisconnect(socket.id);
  }
}

// Start server
httpServer.listen(PORT, () => {
  logger.info('Game server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });

  const status = matchMaking.getQueueStatus();
  logger.info('Server status', {
    queueSize: status.queueSize,
    activeMatches: status.activeMatches
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received - shutting down gracefully', {});
  httpServer.close(() => {
    logger.info('HTTP server closed', {});
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received - shutting down gracefully', {});
  httpServer.close(() => {
    logger.info('HTTP server closed', {});
    process.exit(0);
  });
});
