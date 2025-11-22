import { GamePhase } from '../../types/game';

// Phase durations in milliseconds
const PLANNING_PHASE_DURATION = 30000; // 30 seconds
const COMBAT_PHASE_DURATION = 15000;   // 15 seconds
const TRANSITION_PHASE_DURATION = 5000; // 5 seconds

export interface RoundState {
  round: number;
  phase: GamePhase;
  timeRemaining: number;
  phaseStartTime: number;
}

export class RoundManager {
  private currentRound: number = 0;
  private currentPhase: GamePhase = 'PLANNING';
  private phaseStartTime: number = 0;
  private phaseTimer: NodeJS.Timeout | null = null;
  private onPhaseChange?: (phase: GamePhase, round: number) => void;
  private onRoundEnd?: (round: number) => void;

  /**
   * Start a new round
   */
  startRound(roundNumber: number): void {
    this.currentRound = roundNumber;
    this.startPlanningPhase();
  }

  /**
   * Start the planning phase
   */
  private startPlanningPhase(): void {
    this.currentPhase = 'PLANNING';
    this.phaseStartTime = Date.now();

    console.log(`Round ${this.currentRound}: Planning phase started (${PLANNING_PHASE_DURATION / 1000}s)`);

    // Notify listeners
    if (this.onPhaseChange) {
      this.onPhaseChange('PLANNING', this.currentRound);
    }

    // Schedule combat phase
    this.phaseTimer = setTimeout(() => {
      this.startCombatPhase();
    }, PLANNING_PHASE_DURATION);
  }

  /**
   * Start the combat phase
   */
  private startCombatPhase(): void {
    this.currentPhase = 'COMBAT';
    this.phaseStartTime = Date.now();

    console.log(`Round ${this.currentRound}: Combat phase started (${COMBAT_PHASE_DURATION / 1000}s)`);

    // Notify listeners
    if (this.onPhaseChange) {
      this.onPhaseChange('COMBAT', this.currentRound);
    }

    // Schedule transition phase
    this.phaseTimer = setTimeout(() => {
      this.startTransitionPhase();
    }, COMBAT_PHASE_DURATION);
  }

  /**
   * Start the transition phase
   */
  private startTransitionPhase(): void {
    this.currentPhase = 'TRANSITION';
    this.phaseStartTime = Date.now();

    console.log(`Round ${this.currentRound}: Transition phase started (${TRANSITION_PHASE_DURATION / 1000}s)`);

    // Notify listeners
    if (this.onPhaseChange) {
      this.onPhaseChange('TRANSITION', this.currentRound);
    }

    // Notify round end
    if (this.onRoundEnd) {
      this.onRoundEnd(this.currentRound);
    }

    // Don't auto-start next round - let GameRoom control that
    this.phaseTimer = null;
  }

  /**
   * Force transition to next phase (e.g., all players ready)
   */
  forceNextPhase(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    switch (this.currentPhase) {
      case 'PLANNING':
        this.startCombatPhase();
        break;
      case 'COMBAT':
        this.startTransitionPhase();
        break;
      case 'TRANSITION':
        // Can't force beyond transition
        break;
    }
  }

  /**
   * Get current round state
   */
  getRoundState(): RoundState {
    const timeRemaining = this.getTimeRemaining();

    return {
      round: this.currentRound,
      phase: this.currentPhase,
      timeRemaining,
      phaseStartTime: this.phaseStartTime,
    };
  }

  /**
   * Get time remaining in current phase (in milliseconds)
   */
  getTimeRemaining(): number {
    if (!this.phaseStartTime) return 0;

    const elapsed = Date.now() - this.phaseStartTime;
    const phaseDuration = this.getPhaseDuration(this.currentPhase);
    const remaining = Math.max(0, phaseDuration - elapsed);

    return remaining;
  }

  /**
   * Get duration of a specific phase
   */
  getPhaseDuration(phase: GamePhase): number {
    switch (phase) {
      case 'PLANNING':
        return PLANNING_PHASE_DURATION;
      case 'COMBAT':
        return COMBAT_PHASE_DURATION;
      case 'TRANSITION':
        return TRANSITION_PHASE_DURATION;
      default:
        return 0;
    }
  }

  /**
   * Get current round number
   */
  getCurrentRound(): number {
    return this.currentRound;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  /**
   * Check if currently in planning phase
   */
  isPlanning(): boolean {
    return this.currentPhase === 'PLANNING';
  }

  /**
   * Check if currently in combat phase
   */
  isCombat(): boolean {
    return this.currentPhase === 'COMBAT';
  }

  /**
   * Check if currently in transition phase
   */
  isTransition(): boolean {
    return this.currentPhase === 'TRANSITION';
  }

  /**
   * Set phase change callback
   */
  setOnPhaseChange(callback: (phase: GamePhase, round: number) => void): void {
    this.onPhaseChange = callback;
  }

  /**
   * Set round end callback
   */
  setOnRoundEnd(callback: (round: number) => void): void {
    this.onRoundEnd = callback;
  }

  /**
   * Clean up timers
   */
  cleanup(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  /**
   * Determine opponent pairing for the round
   * Uses a "carousel" algorithm to ensure variety
   */
  static pairOpponents(playerIds: string[], round: number): Map<string, string> {
    const pairings = new Map<string, string>();
    const numPlayers = playerIds.length;

    if (numPlayers < 2) {
      return pairings;
    }

    // Use round number to offset pairing
    for (let i = 0; i < numPlayers; i++) {
      const opponentIndex = (i + round) % numPlayers;

      // Don't pair player with themselves
      if (opponentIndex === i) {
        // Pair with next player instead
        const nextOpponentIndex = (i + 1) % numPlayers;
        pairings.set(playerIds[i], playerIds[nextOpponentIndex]);
      } else {
        pairings.set(playerIds[i], playerIds[opponentIndex]);
      }
    }

    return pairings;
  }

  /**
   * Alternative pairing: match by similar strength (MMR-based)
   */
  static pairByStrength(players: Array<{ id: string; health: number; level: number }>): Map<string, string> {
    const pairings = new Map<string, string>();

    // Sort players by strength (health + level)
    const sortedPlayers = [...players].sort((a, b) => {
      const strengthA = a.health + (a.level * 2);
      const strengthB = b.health + (b.level * 2);
      return strengthB - strengthA;
    });

    // Pair adjacent players in strength ranking
    for (let i = 0; i < sortedPlayers.length; i++) {
      const opponentIndex = i % 2 === 0 ? i + 1 : i - 1;

      if (opponentIndex < sortedPlayers.length) {
        pairings.set(sortedPlayers[i].id, sortedPlayers[opponentIndex].id);
      } else {
        // Odd number of players - pair last with first
        pairings.set(sortedPlayers[i].id, sortedPlayers[0].id);
      }
    }

    return pairings;
  }

  /**
   * Ghost round detection (for odd number of players)
   */
  static needsGhostOpponent(numPlayers: number): boolean {
    return numPlayers % 2 !== 0;
  }
}
