// Ability Processing System
import type { CombatUnit, CombatState, AbilityTrigger, AbilityEffect } from './types';
import { selectTarget, selectTargets, getEnemyBoard, getFriendlyBoard } from './targeting';
import {
  calculateAbilityDamage,
  applyDamage,
  applyHealing,
  applyAttackBuff,
  applyHealthBuff,
} from './damage';
import { logAbility, logBuff, logHeal } from './events';

/**
 * Parse ability description into structured effects
 * This is a simplified parser - in production, abilities would be data-driven
 */
export function parseAbilityEffects(unit: CombatUnit): AbilityEffect[] {
  const ability = unit.ability;
  const effects: AbilityEffect[] = [];

  // Simple parsing based on ability name/description
  // In production, this would be a proper ability database
  const desc = ability.description.toLowerCase();
  const effect = ability.effect.toLowerCase();

  // Damage abilities
  if (desc.includes('deal') || desc.includes('damage')) {
    const damageMatch = desc.match(/(\d+)/);
    const damage = damageMatch ? parseInt(damageMatch[1]) : unit.attack;

    effects.push({
      type: 'damage',
      value: damage,
      target: desc.includes('all') ? 'random' : 'lowest_hp',
      count: desc.includes('all') ? 3 : 1,
    });
  }

  // Healing abilities
  if (desc.includes('heal') || desc.includes('restore')) {
    const healMatch = desc.match(/(\d+)/);
    const healing = healMatch ? parseInt(healMatch[1]) : Math.floor(unit.attack / 2);

    effects.push({
      type: 'heal',
      value: healing,
      target: 'lowest_hp',
      count: 1,
    });
  }

  // Buff abilities
  if (desc.includes('grant') || desc.includes('buff') || desc.includes('increase')) {
    const buffMatch = desc.match(/(\d+)/);
    const buffAmount = buffMatch ? parseInt(buffMatch[1]) : Math.floor(unit.attack / 2);

    if (desc.includes('attack')) {
      effects.push({
        type: 'buff_attack',
        value: buffAmount,
        target: 'random',
        count: 1,
      });
    }

    if (desc.includes('health')) {
      effects.push({
        type: 'buff_health',
        value: buffAmount,
        target: 'random',
        count: 1,
      });
    }
  }

  // Shield abilities
  if (desc.includes('shield')) {
    effects.push({
      type: 'shield',
      value: 1,
      target: 'lowest_hp',
      count: 1,
    });
  }

  // Taunt abilities
  if (desc.includes('taunt')) {
    effects.push({
      type: 'taunt',
      value: 1,
      target: 'first',
      count: 1,
    });
  }

  return effects;
}

/**
 * Process a unit's ability when triggered
 */
export function processAbility(
  unit: CombatUnit,
  trigger: AbilityTrigger,
  state: CombatState,
  triggerTarget?: CombatUnit
): void {
  const ability = unit.ability;

  // Check if ability should trigger
  if (!shouldTriggerAbility(unit, trigger)) {
    return;
  }

  const effects = parseAbilityEffects(unit);

  if (effects.length === 0) {
    return;
  }

  // Get enemy board for targeting
  const enemyBoard = getEnemyBoard(state, unit.side);
  const friendlyBoard = getFriendlyBoard(state, unit.side);

  const targetsHit: CombatUnit[] = [];
  let effectDescription = '';

  // Process each effect
  for (const effect of effects) {
    const targetBoard = effect.type === 'heal' || effect.type === 'buff_attack' || effect.type === 'buff_health'
      ? friendlyBoard
      : enemyBoard;

    // Select targets
    const targets = effect.count && effect.count > 1
      ? selectTargets(unit, targetBoard, effect.target, effect.count, state)
      : [selectTarget(unit, targetBoard, effect.target, state)].filter(Boolean) as CombatUnit[];

    if (targets.length === 0) {
      continue;
    }

    // Apply effects
    for (const target of targets) {
      switch (effect.type) {
        case 'damage': {
          const damage = calculateAbilityDamage(unit, effect.value, 1.0);
          const actualDamage = applyDamage(target, damage);
          unit.damageDealt = (unit.damageDealt || 0) + actualDamage;
          effectDescription = `${actualDamage} damage`;
          break;
        }

        case 'heal': {
          const healing = applyHealing(target, effect.value);
          effectDescription = `${healing} healing`;
          logHeal(state, unit, target, healing);
          break;
        }

        case 'buff_attack': {
          applyAttackBuff(target, effect.value);
          effectDescription = `+${effect.value} attack`;
          logBuff(state, unit, target, 'attack', effect.value);
          break;
        }

        case 'buff_health': {
          applyHealthBuff(target, effect.value);
          effectDescription = `+${effect.value} health`;
          logBuff(state, unit, target, 'health', effect.value);
          break;
        }

        case 'shield': {
          target.hasShield = true;
          effectDescription = 'shield granted';
          logBuff(state, unit, target, 'shield', 1);
          break;
        }

        case 'taunt': {
          target.hasTaunt = true;
          effectDescription = 'taunt granted';
          logBuff(state, unit, target, 'taunt', 1);
          break;
        }
      }

      targetsHit.push(target);
    }
  }

  // Log the ability activation
  if (targetsHit.length > 0) {
    logAbility(state, unit, ability.name, targetsHit, effectDescription);
  }
}

/**
 * Check if ability should trigger based on trigger type
 */
function shouldTriggerAbility(unit: CombatUnit, trigger: AbilityTrigger): boolean {
  const ability = unit.ability;

  // Map game.ts trigger names to combat trigger names
  const triggerMap: Record<string, AbilityTrigger[]> = {
    'onAttack': ['on_attack'],
    'onHit': ['on_hit'],
    'onDeath': ['on_death'],
    'onKill': ['on_kill'],
    'startCombat': ['start_of_combat'],
    'everyX': ['on_attack'], // Handle everyX as on_attack with counter
    'conditional': ['on_attack', 'on_hit'], // Conditionals can trigger on various events
  };

  const validTriggers = triggerMap[ability.trigger] || [];

  if (!validTriggers.includes(trigger)) {
    return false;
  }

  // Handle everyX triggers (e.g., every 3rd attack)
  if (ability.trigger === 'everyX' && ability.triggerCount) {
    unit.attackCount = (unit.attackCount || 0) + 1;
    if (unit.attackCount % ability.triggerCount !== 0) {
      return false;
    }
  }

  return true;
}

/**
 * Process all units' abilities for a specific trigger
 */
export function processTriggers(
  trigger: AbilityTrigger,
  state: CombatState,
  triggerUnit?: CombatUnit,
  targetUnit?: CombatUnit
): void {
  // Collect all units that might have abilities to trigger
  const allUnits = [
    ...Array.from(state.player1Board.values()),
    ...Array.from(state.player2Board.values()),
  ];

  // Process abilities in order of position
  const sortedUnits = allUnits
    .filter(u => !u.isDead)
    .sort((a, b) => a.position - b.position);

  for (const unit of sortedUnits) {
    processAbility(unit, trigger, state, targetUnit);
  }
}

/**
 * Process start of combat abilities
 */
export function processStartOfCombatAbilities(state: CombatState): void {
  processTriggers('start_of_combat', state);
}

/**
 * Process end of position abilities
 */
export function processEndOfPositionAbilities(state: CombatState): void {
  processTriggers('end_of_position', state);
}

/**
 * Process on-attack abilities
 */
export function processOnAttackAbilities(state: CombatState, attacker: CombatUnit): void {
  processAbility(attacker, 'on_attack', state);
}

/**
 * Process on-hit abilities (when being attacked)
 */
export function processOnHitAbilities(
  state: CombatState,
  defender: CombatUnit,
  attacker: CombatUnit
): void {
  processAbility(defender, 'on_hit', state, attacker);
}

/**
 * Process on-death abilities
 */
export function processOnDeathAbilities(
  state: CombatState,
  deadUnit: CombatUnit,
  killer?: CombatUnit
): void {
  processAbility(deadUnit, 'on_death', state, killer);
}

/**
 * Process on-kill abilities
 */
export function processOnKillAbilities(
  state: CombatState,
  killer: CombatUnit,
  victim: CombatUnit
): void {
  processAbility(killer, 'on_kill', state, victim);
}
