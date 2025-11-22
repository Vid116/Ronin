// Combat Engine Types
import type { Unit, Board, CombatEvent } from '@/types/game';

// Simplified to 4 basic triggers for basic combat
export type AbilityTrigger =
  | 'start_of_combat'  // Fire once at beginning
  | 'on_attack'        // Fire when this unit attacks
  | 'on_death'         // Fire when this unit dies
  | 'passive';         // Always active (stat modifiers)

export type TargetPriority =
  | 'taunt'
  | 'flying'
  | 'lowest_hp'
  | 'highest_hp'
  | 'highest_attack'
  | 'random'
  | 'first'
  | 'backline';

export interface CombatUnit extends Unit {
  currentHealth: number;
  position: number;
  side: 'player1' | 'player2';
  buffedAttack: number;
  buffedHealth: number;
  hasTaunt?: boolean;
  hasFlying?: boolean;
  hasShield?: boolean;
  isDead?: boolean;
  attackCount?: number;
  damageDealt?: number;
  damageTaken?: number;
  dodgeChance?: number; // Percentage (0-100)
  critChance?: number; // Percentage (0-100)
}

export interface CombatState {
  player1Board: Map<number, CombatUnit>;
  player2Board: Map<number, CombatUnit>;
  currentPosition: number;
  round: number;
  events: CombatEvent[];
  randomSeed: number;
  randomIndex: number;
}

export interface CombatResult {
  winner: 'player1' | 'player2' | 'draw';
  damage: number;
  events: CombatEvent[];
  survivingUnits: {
    player1: CombatUnit[];
    player2: CombatUnit[];
  };
  totalDamageDealt: {
    player1: number;
    player2: number;
  };
  // For ROFL verification
  seed: number;
  randomIndex: number; // Total RNG calls made
}

export interface AbilityEffect {
  type: 'damage' | 'heal' | 'buff_attack' | 'buff_health' | 'shield' | 'taunt' | 'summon' | 'reposition' | 'dodge' | 'crit';
  value: number;
  target: TargetPriority;
  count?: number; // Number of targets
  duration?: number; // For buffs/debuffs
  newPosition?: number; // For reposition effects
}

export interface ProcessedAbility {
  unitId: string;
  abilityName: string;
  trigger: AbilityTrigger;
  effects: AbilityEffect[];
  targetPriority: TargetPriority;
}
