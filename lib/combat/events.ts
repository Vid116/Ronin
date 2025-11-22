// Combat Event Logging
import type { CombatEvent } from '@/types/game';
import type { CombatUnit, CombatState } from './types';

/**
 * Creates a combat event and adds it to the state
 */
export function createEvent(
  state: CombatState,
  type: CombatEvent['type'],
  source: string,
  target: string,
  data: Partial<CombatEvent>
): void {
  const event: CombatEvent = {
    timestamp: Date.now(),
    type,
    source,
    target,
    description: data.description || '',
    ...data,
  };

  state.events.push(event);
}

/**
 * Log an attack event
 */
export function logAttack(
  state: CombatState,
  attacker: CombatUnit,
  defender: CombatUnit,
  damage: number
): void {
  createEvent(state, 'ATTACK', attacker.id, defender.id, {
    damage,
    description: `${attacker.name} attacks ${defender.name} for ${damage} damage`,
  });
}

/**
 * Log an ability activation
 */
export function logAbility(
  state: CombatState,
  unit: CombatUnit,
  abilityName: string,
  targets: CombatUnit[],
  effect: string
): void {
  const targetNames = targets.map(t => t.name).join(', ');
  createEvent(state, 'ABILITY', unit.id, targets[0]?.id || '', {
    description: `${unit.name} uses ${abilityName}${targets.length > 0 ? ` on ${targetNames}` : ''}: ${effect}`,
  });
}

/**
 * Log a death event
 */
export function logDeath(
  state: CombatState,
  unit: CombatUnit,
  killer?: CombatUnit
): void {
  createEvent(state, 'DEATH', unit.id, '', {
    description: killer
      ? `${unit.name} was slain by ${killer.name}`
      : `${unit.name} was slain`,
  });
}

/**
 * Log a heal event
 */
export function logHeal(
  state: CombatState,
  healer: CombatUnit,
  target: CombatUnit,
  amount: number
): void {
  createEvent(state, 'HEAL', healer.id, target.id, {
    healing: amount,
    description: `${healer.name} heals ${target.name} for ${amount} HP`,
  });
}

/**
 * Log a buff event
 */
export function logBuff(
  state: CombatState,
  source: CombatUnit,
  target: CombatUnit,
  buffType: string,
  amount: number
): void {
  createEvent(state, 'BUFF', source.id, target.id, {
    description: `${source.name} grants ${target.name} +${amount} ${buffType}`,
  });
}

/**
 * Log a debuff event
 */
export function logDebuff(
  state: CombatState,
  source: CombatUnit,
  target: CombatUnit,
  debuffType: string,
  amount: number
): void {
  createEvent(state, 'DEBUFF', source.id, target.id, {
    description: `${source.name} reduces ${target.name}'s ${debuffType} by ${amount}`,
  });
}

/**
 * Get a summary of combat events
 */
export function getCombatSummary(events: CombatEvent[]): string {
  const attackCount = events.filter(e => e.type === 'ATTACK').length;
  const abilityCount = events.filter(e => e.type === 'ABILITY').length;
  const deathCount = events.filter(e => e.type === 'DEATH').length;

  return `Combat: ${attackCount} attacks, ${abilityCount} abilities, ${deathCount} deaths`;
}
