import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './game/GameRoom';
import { ClientEvent, ServerEvent } from '../types/game';

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

// Game state
const gameRooms = new Map<string, GameRoom>();
const playerQueue: { socketId: string; entryFee: number }[] = [];

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
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    handleDisconnect(socket);
  });
});

// Event handlers
function handleJoinQueue(socket: any, entryFee: number) {
  playerQueue.push({ socketId: socket.id, entryFee });
  console.log(`Queue: ${playerQueue.length}/6 players`);

  // Check if we have 6 players
  if (playerQueue.length >= 6) {
    const matchPlayers = playerQueue.splice(0, 6);
    const matchId = `match-${Date.now()}`;

    // Create game room
    const gameRoom = new GameRoom(matchId, matchPlayers, io);
    gameRooms.set(matchId, gameRoom);

    // Notify all players
    matchPlayers.forEach(({ socketId }) => {
      io.to(socketId).emit('server_event', {
        type: 'MATCH_FOUND',
        data: {
          id: matchId,
          players: matchPlayers.map((p, i) => ({
            id: p.socketId,
            address: `0x${i}`,
            health: 20,
            gold: 3,
            level: 1,
            xp: 0,
            winStreak: 0,
            loseStreak: 0,
          })),
          entryFee: entryFee,
          prizePool: entryFee * 6,
          status: 'IN_PROGRESS' as const,
          currentRound: 1,
          createdAt: Date.now(),
        },
      } as ServerEvent);
    });

    console.log(`Match created: ${matchId}`);
    gameRoom.start();
  }
}

function handleBuyCard(socket: any, cardIndex: number) {
  // TODO: Implement buy card logic
  console.log(`${socket.id} buying card at index ${cardIndex}`);
}

function handleSellCard(socket: any, unitId: string) {
  // TODO: Implement sell card logic
  console.log(`${socket.id} selling card ${unitId}`);
}

function handlePlaceCard(socket: any, unitId: string, position: number) {
  // TODO: Implement place card logic
  console.log(`${socket.id} placing card ${unitId} at position ${position}`);
}

function handleRerollShop(socket: any) {
  // TODO: Implement reroll shop logic
  console.log(`${socket.id} rerolling shop`);
}

function handleEquipItem(socket: any, itemId: string, unitId: string) {
  // TODO: Implement equip item logic
  console.log(`${socket.id} equipping item ${itemId} to unit ${unitId}`);
}

function handleBuyXP(socket: any) {
  // TODO: Implement buy XP logic
  console.log(`${socket.id} buying XP`);
}

function handleReady(socket: any) {
  // TODO: Implement ready logic
  console.log(`${socket.id} is ready`);
}

function handleDisconnect(socket: any) {
  // Remove from queue if present
  const index = playerQueue.findIndex((p) => p.socketId === socket.id);
  if (index !== -1) {
    playerQueue.splice(index, 1);
    console.log(`Removed ${socket.id} from queue`);
  }

  // TODO: Handle disconnect in active matches
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`🎮 Game server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
});
