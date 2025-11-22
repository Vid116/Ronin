// Combat Engine Exports
export { simulateCombat, simulateMultipleCombats } from './engine';
export { calculateDamage, calculatePlayerDamage, applyDamage, applyHealing } from './damage';
export { selectTarget, selectTargets, getAliveUnits } from './targeting';
export {
  processAbility,
  processTriggers,
  processStartOfCombatAbilities,
  processOnAttackAbilities,
  processOnHitAbilities,
  processOnDeathAbilities,
  processOnKillAbilities,
} from './abilities';
export { createEvent, logAttack, logAbility, logDeath, getCombatSummary } from './events';

// Type exports
export type {
  CombatUnit,
  CombatState,
  CombatResult,
  AbilityTrigger,
  TargetPriority,
  AbilityEffect,
  ProcessedAbility,
} from './types';
