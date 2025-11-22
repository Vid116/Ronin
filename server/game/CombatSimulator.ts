import { Unit, Board, CombatEvent } from '../../types/game';

export interface CombatResult {
  winner: 'player' | 'opponent' | 'draw';
  damageDealt: number;
  playerUnitsRemaining: number;
  opponentUnitsRemaining: number;
  combatLog: CombatEvent[];
}

export class CombatSimulator {
  /**
   * Simulate combat between two boards
   */
  simulateCombat(playerBoard: Board, opponentBoard: Board): CombatResult {
    const combatLog: CombatEvent[] = [];

    // Create working copies of units
    const playerUnits = this.getAllUnits(playerBoard);
    const opponentUnits = this.getAllUnits(opponentBoard);

    // Apply start-of-combat abilities
    this.applyStartCombatAbilities(playerUnits, opponentUnits, combatLog, 'player');
    this.applyStartCombatAbilities(opponentUnits, playerUnits, combatLog, 'opponent');

    // Combat simulation (max 100 rounds to prevent infinite loops)
    let round = 0;
    const MAX_COMBAT_ROUNDS = 100;

    while (
      playerUnits.some(u => u.currentHealth && u.currentHealth > 0) &&
      opponentUnits.some(u => u.currentHealth && u.currentHealth > 0) &&
      round < MAX_COMBAT_ROUNDS
    ) {
      round++;

      // Player units attack
      this.processAttacks(playerUnits, opponentUnits, combatLog, 'player');

      // Remove dead opponent units
      const deadOpponents = opponentUnits.filter(u => u.currentHealth && u.currentHealth <= 0);
      deadOpponents.forEach(unit => {
        this.processDeathAbilities(unit, playerUnits, combatLog, 'opponent');
      });

      // Check if opponent eliminated
      if (!opponentUnits.some(u => u.currentHealth && u.currentHealth > 0)) {
        break;
      }

      // Opponent units attack
      this.processAttacks(opponentUnits, playerUnits, combatLog, 'opponent');

      // Remove dead player units
      const deadPlayers = playerUnits.filter(u => u.currentHealth && u.currentHealth <= 0);
      deadPlayers.forEach(unit => {
        this.processDeathAbilities(unit, opponentUnits, combatLog, 'player');
      });
    }

    // Calculate result
    const playerUnitsRemaining = playerUnits.filter(u => u.currentHealth && u.currentHealth > 0).length;
    const opponentUnitsRemaining = opponentUnits.filter(u => u.currentHealth && u.currentHealth > 0).length;

    let winner: 'player' | 'opponent' | 'draw';
    let damageDealt: number;

    if (playerUnitsRemaining > 0 && opponentUnitsRemaining === 0) {
      winner = 'player';
      damageDealt = 0; // Player won, takes no damage
    } else if (opponentUnitsRemaining > 0 && playerUnitsRemaining === 0) {
      winner = 'opponent';
      // Damage = opponent's remaining units + their total stars
      damageDealt = this.calculateDamage(opponentUnits.filter(u => u.currentHealth && u.currentHealth > 0));
    } else {
      winner = 'draw';
      damageDealt = 1; // Minimal damage on draw
    }

    return {
      winner,
      damageDealt,
      playerUnitsRemaining,
      opponentUnitsRemaining,
      combatLog,
    };
  }

  /**
   * Get all units from a board
   */
  private getAllUnits(board: Board): Unit[] {
    const units: Unit[] = [];

    // Add units from top row
    board.top.forEach(unit => {
      if (unit) {
        // Initialize current health
        const unitCopy = { ...unit, currentHealth: unit.currentHealth || unit.health };
        units.push(unitCopy);
      }
    });

    // Add units from bottom row
    board.bottom.forEach(unit => {
      if (unit) {
        const unitCopy = { ...unit, currentHealth: unit.currentHealth || unit.health };
        units.push(unitCopy);
      }
    });

    return units;
  }

  /**
   * Apply start-of-combat abilities
   */
  private applyStartCombatAbilities(
    units: Unit[],
    enemyUnits: Unit[],
    combatLog: CombatEvent[],
    side: 'player' | 'opponent'
  ): void {
    units.forEach(unit => {
      if (unit.ability.trigger === 'startCombat' && unit.currentHealth && unit.currentHealth > 0) {
        // Apply ability effect based on effect string
        const effect = unit.ability.effect;

        if (effect.includes('heal_adjacent')) {
          // Heal adjacent allies
          const healAmount = parseInt(effect.match(/\d+/)?.[0] || '0');
          // Simplified - heal all allies
          units.forEach(ally => {
            if (ally.id !== unit.id && ally.currentHealth) {
              ally.currentHealth = Math.min(ally.health, ally.currentHealth + healAmount);
            }
          });

          combatLog.push({
            timestamp: Date.now(),
            type: 'HEAL',
            source: unit.name,
            target: 'Adjacent allies',
            healing: healAmount,
            description: `${unit.name} heals adjacent allies for ${healAmount} HP`,
          });
        } else if (effect.includes('damage_all')) {
          // Deal damage to all enemies
          const damage = parseInt(effect.match(/\d+/)?.[0] || '0');
          enemyUnits.forEach(enemy => {
            if (enemy.currentHealth) {
              enemy.currentHealth -= damage;
            }
          });

          combatLog.push({
            timestamp: Date.now(),
            type: 'ABILITY',
            source: unit.name,
            target: 'All enemies',
            damage,
            description: `${unit.name} deals ${damage} damage to all enemies`,
          });
        } else if (effect.includes('buff_all')) {
          // Buff all allies (permanent for this combat)
          const attackBonus = parseInt(effect.match(/attack_(\d+)/)?.[1] || '0');
          const healthBonus = parseInt(effect.match(/health_(\d+)/)?.[1] || '0');

          units.forEach(ally => {
            if (ally.currentHealth) {
              ally.attack += attackBonus;
              ally.health += healthBonus;
              ally.currentHealth += healthBonus;
            }
          });

          combatLog.push({
            timestamp: Date.now(),
            type: 'BUFF',
            source: unit.name,
            target: 'All allies',
            description: `${unit.name} grants allies +${attackBonus} attack and +${healthBonus} health`,
          });
        }
      }
    });
  }

  /**
   * Process attacks for a side
   */
  private processAttacks(
    attackers: Unit[],
    defenders: Unit[],
    combatLog: CombatEvent[],
    side: 'player' | 'opponent'
  ): void {
    attackers.forEach(attacker => {
      if (!attacker.currentHealth || attacker.currentHealth <= 0) {
        return; // Dead units don't attack
      }

      // Find alive target
      const target = defenders.find(u => u.currentHealth && u.currentHealth > 0);
      if (!target || !target.currentHealth) {
        return; // No valid targets
      }

      // Calculate damage
      let damage = attacker.attack;

      // Apply on-attack abilities
      if (attacker.ability.trigger === 'onAttack') {
        const effect = attacker.ability.effect;

        if (effect.includes('damage_bonus')) {
          const bonus = parseInt(effect.match(/\d+/)?.[0] || '0');
          damage += bonus;
        } else if (effect.includes('double_damage')) {
          damage *= 2;
        }
      }

      // Deal damage
      target.currentHealth -= damage;

      combatLog.push({
        timestamp: Date.now(),
        type: 'ATTACK',
        source: attacker.name,
        target: target.name,
        damage,
        description: `${attacker.name} attacks ${target.name} for ${damage} damage`,
      });

      // Check for kill and trigger on-kill abilities
      if (target.currentHealth <= 0) {
        combatLog.push({
          timestamp: Date.now(),
          type: 'DEATH',
          source: attacker.name,
          target: target.name,
          description: `${target.name} is defeated`,
        });

        // On-kill abilities
        if (attacker.ability.trigger === 'onKill') {
          const effect = attacker.ability.effect;
          if (effect.includes('stack_attack')) {
            const attackGain = parseInt(effect.match(/\d+/)?.[0] || '0');
            attacker.attack += attackGain;

            combatLog.push({
              timestamp: Date.now(),
              type: 'BUFF',
              source: attacker.name,
              target: attacker.name,
              description: `${attacker.name} gains +${attackGain} attack`,
            });
          }
        }
      }
    });
  }

  /**
   * Process death abilities
   */
  private processDeathAbilities(
    deadUnit: Unit,
    enemyUnits: Unit[],
    combatLog: CombatEvent[],
    side: 'player' | 'opponent'
  ): void {
    if (deadUnit.ability.trigger === 'onDeath') {
      const effect = deadUnit.ability.effect;

      if (effect.includes('damage_random')) {
        const damage = parseInt(effect.match(/\d+/)?.[0] || '0');
        const aliveEnemies = enemyUnits.filter(u => u.currentHealth && u.currentHealth > 0);

        if (aliveEnemies.length > 0) {
          const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          if (target.currentHealth) {
            target.currentHealth -= damage;

            combatLog.push({
              timestamp: Date.now(),
              type: 'ABILITY',
              source: deadUnit.name,
              target: target.name,
              damage,
              description: `${deadUnit.name} deals ${damage} damage to ${target.name} on death`,
            });
          }
        }
      }
    }
  }

  /**
   * Calculate damage dealt to player based on surviving enemy units
   */
  private calculateDamage(survivingUnits: Unit[]): number {
    // Base damage = number of surviving units
    let damage = survivingUnits.length;

    // Add bonus damage based on unit stars
    survivingUnits.forEach(unit => {
      damage += unit.stars - 1; // 1-star = 0 bonus, 2-star = 1 bonus, 3-star = 2 bonus
    });

    return damage;
  }
}
