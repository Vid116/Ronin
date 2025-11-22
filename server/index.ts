import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MatchMaking } from './game/MatchMaking';
import { ClientEvent } from '../types/game';

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
  console.log(`Client connected: ${socket.id}`);

  // Handle client events
  socket.on('client_event', (event: ClientEvent) => {
    console.log(`Received event from ${socket.id}:`, event.type);

    switch (event.type) {
      case 'JOIN_QUEUE':
        handleJoinQueue(socket, event.data.entryFee);
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
        console.warn(`Unknown event type: ${(event as any).type}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    handleDisconnect(socket);
  });
});

// Event handlers
function handleJoinQueue(socket: any, entryFee: number) {
  console.log(`${socket.id} joining queue with entry fee: ${entryFee}`);
  matchMaking.addToQueue(socket.id, entryFee);
}

function handleBuyCard(socket: any, cardIndex: number) {
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);
  if (!gameRoom) {
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleBuyCard(socket.id, cardIndex);
  if (!success) {
    console.log(`${socket.id} failed to buy card at index ${cardIndex}`);
  }
}

function handleSellCard(socket: any, unitId: string) {
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);
  if (!gameRoom) {
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleSellCard(socket.id, unitId);
  if (!success) {
    console.log(`${socket.id} failed to sell card ${unitId}`);
  }
}

function handlePlaceCard(socket: any, unitId: string, position: number) {
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);
  if (!gameRoom) {
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handlePlaceCard(socket.id, unitId, position);
  if (!success) {
    console.log(`${socket.id} failed to place card ${unitId} at position ${position}`);
  }
}

function handleRerollShop(socket: any) {
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);
  if (!gameRoom) {
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleRerollShop(socket.id);
  if (!success) {
    console.log(`${socket.id} failed to reroll shop`);
  }
}

function handleEquipItem(socket: any, itemId: string, unitId: string) {
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);
  if (!gameRoom) {
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  // TODO: Implement item equipping in GameRoom
  console.log(`${socket.id} equipping item ${itemId} to unit ${unitId}`);
  socket.emit('error', { message: 'Item equipping not yet implemented' });
}

function handleBuyXP(socket: any) {
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);
  if (!gameRoom) {
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  const success = gameRoom.handleBuyXP(socket.id);
  if (!success) {
    console.log(`${socket.id} failed to buy XP`);
  }
}

function handleReady(socket: any) {
  const gameRoom = matchMaking.getMatchByPlayer(socket.id);
  if (!gameRoom) {
    socket.emit('error', { message: 'Not in an active match' });
    return;
  }

  gameRoom.handleReady(socket.id);
  console.log(`${socket.id} is ready`);
}

function handleDisconnect(socket: any) {
  matchMaking.handleDisconnect(socket.id);
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  const status = matchMaking.getQueueStatus();
  console.log(`Queue status: ${status.queueSize} players waiting, ${status.activeMatches} active matches`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
