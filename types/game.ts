// Game Phase Types
export type GamePhase = 'PLANNING' | 'COMBAT' | 'TRANSITION';

// Unit Types
export interface Unit {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  cost: number;
  attack: number;
  health: number;
  currentHealth?: number;
  stars: 1 | 2 | 3;
  ability: Ability;
  synergies: string[];
  item?: Item;
}

export interface Ability {
  name: string;
  description: string;
  trigger: 'onAttack' | 'onHit' | 'everyX' | 'onDeath' | 'onKill' | 'startCombat' | 'conditional';
  triggerCount?: number;
  effect: string;
}

// Item Types
export interface Item {
  id: string;
  name: string;
  type: 'offensive' | 'defensive' | 'utility';
  description: string;
  stats?: {
    attack?: number;
    health?: number;
  };
  effect: string;
}

// Board Types
export interface Board {
  top: (Unit | null)[];    // 4 slots
  bottom: (Unit | null)[]; // 4 slots
}

// Player Types
export interface Player {
  id: string;
  address: string;
  health: number;
  gold: number;
  level: number;
  xp: number;
  winStreak: number;
  loseStreak: number;
  placement?: number;
}

// Shop Types
export interface Shop {
  cards: Unit[];
  rerollCost: number;
  freeRerolls: number;
}

// Match Types
export interface Match {
  id: string;
  players: Player[];
  entryFee: number;
  prizePool: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  currentRound: number;
  createdAt: number;
}

// Game State Types
export interface GameState {
  // Match Info
  matchId: string;
  round: number;
  phase: GamePhase;
  timeRemaining: number;

  // Player
  player: Player;
  opponents: Player[];
  currentOpponent?: Player;

  // Shop & Board
  shop: Shop;
  board: Board;
  bench: Unit[];
  items: Item[];

  // Stats
  combatLog: CombatEvent[];
}

// Combat Types
export interface CombatEvent {
  timestamp: number;
  type: 'ATTACK' | 'ABILITY' | 'DEATH' | 'HEAL' | 'BUFF' | 'DEBUFF';
  source: string;
  target: string;
  damage?: number;
  healing?: number;
  description: string;
}

// Opponent State (for display)
export interface OpponentState {
  player: Player;
  board: Board;
  unitCount: number;
  avgUnitLevel: number;
}

// WebSocket Event Types
export type ServerEvent =
  | { type: 'MATCH_FOUND'; data: Match }
  | { type: 'ROUND_START'; data: { round: number; phase: GamePhase } }
  | { type: 'SHOP_UPDATE'; data: Shop }
  | { type: 'COMBAT_START'; data: { opponent: OpponentState } }
  | { type: 'COMBAT_EVENT'; data: CombatEvent }
  | { type: 'ROUND_END'; data: { damage: number; gold: number } }
  | { type: 'PLAYER_ELIMINATED'; data: { playerId: string } }
  | { type: 'MATCH_END'; data: { placements: { playerId: string; placement: number }[] } };

export type ClientEvent =
  | { type: 'JOIN_QUEUE'; data: { entryFee: number } }
  | { type: 'BUY_CARD'; data: { cardIndex: number } }
  | { type: 'SELL_CARD'; data: { unitId: string } }
  | { type: 'PLACE_CARD'; data: { unitId: string; position: number } }
  | { type: 'REROLL_SHOP' }
  | { type: 'EQUIP_ITEM'; data: { itemId: string; unitId: string } }
  | { type: 'BUY_XP' }
  | { type: 'READY' };

// Synergy Types
export interface Synergy {
  name: string;
  type: 'class' | 'origin';
  active: boolean;
  currentCount: number;
  requiredCount: number;
  effect: string;
}

// Constants
export const TIER_COLORS: Record<number, string> = {
  1: 'text-gray-400',
  2: 'text-green-400',
  3: 'text-blue-400',
  4: 'text-purple-400',
  5: 'text-yellow-400',
};

export const MAX_BOARD_SIZE = 8;
export const MAX_BENCH_SIZE = 8;
export const STARTING_HEALTH = 20;
export const STARTING_GOLD = 3;
export const SHOP_SIZE = 5;
export const REROLL_COST = 2;
export const XP_BUY_COST = 4;
