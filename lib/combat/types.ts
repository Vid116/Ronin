// Combat Engine Types
import type { Unit, Board, CombatEvent } from '@/types/game';

export type AbilityTrigger =
  | 'on_attack'
  | 'on_hit'
  | 'on_death'
  | 'on_kill'
  | 'start_of_combat'
  | 'end_of_position'
  | 'on_damage_taken'
  | 'on_heal';

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
}

export interface AbilityEffect {
  type: 'damage' | 'heal' | 'buff_attack' | 'buff_health' | 'shield' | 'taunt' | 'summon';
  value: number;
  target: TargetPriority;
  count?: number; // Number of targets
  duration?: number; // For buffs/debuffs
}

export interface ProcessedAbility {
  unitId: string;
  abilityName: string;
  trigger: AbilityTrigger;
  effects: AbilityEffect[];
  targetPriority: TargetPriority;
}
