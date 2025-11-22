import { Player } from '../../types/game';

// Economic constants
const BASE_GOLD_PER_ROUND = 5;
const INTEREST_RATE = 10; // 1 gold per 10 saved
const MAX_INTEREST = 5;
const XP_BUY_COST = 4; // 4 gold = 4 XP
const XP_PER_PURCHASE = 4;

// Level up thresholds
const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,   // Level 1 starts at 0 XP
  2: 2,   // Need 2 XP to reach level 2
  3: 6,   // Need 6 XP total to reach level 3
  4: 10,  // Need 10 XP total to reach level 4
  5: 20,  // Need 20 XP total to reach level 5
  6: 36,  // Need 36 XP total to reach level 6
  7: 56,  // Need 56 XP total to reach level 7
  8: 80,  // Need 80 XP total to reach level 8
  9: 108, // Need 108 XP total to reach level 9
  10: 140, // Need 140 XP total to reach level 10 (max)
};

// Win/lose streak bonuses
const STREAK_BONUSES: Record<number, number> = {
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 3,
  7: 3,
  8: 4,
  9: 4,
  10: 5, // Max bonus
};

export class EconomyManager {
  /**
   * Calculate gold income for a player at the start of a round
   */
  calculateRoundIncome(player: Player): number {
    let income = BASE_GOLD_PER_ROUND;

    // Add interest (1 gold per 10 saved, max 5)
    const interest = Math.min(Math.floor(player.gold / INTEREST_RATE), MAX_INTEREST);
    income += interest;

    // Add win streak bonus
    if (player.winStreak >= 2) {
      const streakBonus = STREAK_BONUSES[Math.min(player.winStreak, 10)] || 0;
      income += streakBonus;
    }

    // Add lose streak compensation
    if (player.loseStreak >= 2) {
      const streakBonus = STREAK_BONUSES[Math.min(player.loseStreak, 10)] || 0;
      income += streakBonus;
    }

    return income;
  }

  /**
   * Calculate interest on current gold
   */
  calculateInterest(currentGold: number): number {
    return Math.min(Math.floor(currentGold / INTEREST_RATE), MAX_INTEREST);
  }

  /**
   * Calculate win streak bonus
   */
  calculateWinStreakBonus(winStreak: number): number {
    if (winStreak < 2) return 0;
    return STREAK_BONUSES[Math.min(winStreak, 10)] || 0;
  }

  /**
   * Calculate lose streak compensation
   */
  calculateLoseStreakBonus(loseStreak: number): number {
    if (loseStreak < 2) return 0;
    return STREAK_BONUSES[Math.min(loseStreak, 10)] || 0;
  }

  /**
   * Buy XP for a player
   */
  buyXP(player: Player): { success: boolean; newGold: number; newXP: number; leveledUp: boolean; newLevel: number } {
    // Check if player has enough gold
    if (player.gold < XP_BUY_COST) {
      return {
        success: false,
        newGold: player.gold,
        newXP: player.xp,
        leveledUp: false,
        newLevel: player.level,
      };
    }

    // Deduct gold and add XP
    const newGold = player.gold - XP_BUY_COST;
    const newXP = player.xp + XP_PER_PURCHASE;

    // Check if player leveled up
    const levelUpResult = this.checkLevelUp(player.level, newXP);

    return {
      success: true,
      newGold,
      newXP,
      leveledUp: levelUpResult.leveledUp,
      newLevel: levelUpResult.newLevel,
    };
  }

  /**
   * Check if player should level up based on XP
   */
  checkLevelUp(currentLevel: number, currentXP: number): { leveledUp: boolean; newLevel: number } {
    // Max level is 10
    if (currentLevel >= 10) {
      return { leveledUp: false, newLevel: currentLevel };
    }

    // Check if XP meets threshold for next level
    const nextLevel = currentLevel + 1;
    const threshold = LEVEL_THRESHOLDS[nextLevel];

    if (currentXP >= threshold) {
      // Check if they can level up multiple times (unlikely but handle it)
      let newLevel = currentLevel;
      while (newLevel < 10 && currentXP >= LEVEL_THRESHOLDS[newLevel + 1]) {
        newLevel++;
      }
      return { leveledUp: true, newLevel };
    }

    return { leveledUp: false, newLevel: currentLevel };
  }

  /**
   * Get XP needed for next level
   */
  getXPForNextLevel(currentLevel: number): number {
    if (currentLevel >= 10) return 0;
    return LEVEL_THRESHOLDS[currentLevel + 1];
  }

  /**
   * Get XP progress to next level
   */
  getXPProgress(currentLevel: number, currentXP: number): { current: number; required: number; percentage: number } {
    if (currentLevel >= 10) {
      return { current: currentXP, required: currentXP, percentage: 100 };
    }

    const currentThreshold = LEVEL_THRESHOLDS[currentLevel];
    const nextThreshold = LEVEL_THRESHOLDS[currentLevel + 1];
    const required = nextThreshold - currentThreshold;
    const current = currentXP - currentThreshold;
    const percentage = Math.floor((current / required) * 100);

    return { current, required, percentage };
  }

  /**
   * Update streaks after a combat result
   */
  updateStreaks(player: Player, won: boolean): { winStreak: number; loseStreak: number } {
    if (won) {
      return {
        winStreak: player.winStreak + 1,
        loseStreak: 0,
      };
    } else {
      return {
        winStreak: 0,
        loseStreak: player.loseStreak + 1,
      };
    }
  }

  /**
   * Get max board size for a player level
   */
  getMaxBoardSize(level: number): number {
    return level; // Max units = player level
  }

  /**
   * Calculate sell value of a card
   */
  calculateSellValue(cardCost: number, stars: number): number {
    // Base sell value is card cost
    let sellValue = cardCost;

    // 2-star units sell for 3x base cost
    if (stars === 2) {
      sellValue = cardCost * 3;
    }
    // 3-star units sell for 9x base cost
    else if (stars === 3) {
      sellValue = cardCost * 9;
    }

    return sellValue;
  }

  /**
   * Get cost breakdown for display
   */
  getIncomeBreakdown(player: Player): {
    baseIncome: number;
    interest: number;
    winStreakBonus: number;
    loseStreakBonus: number;
    total: number;
  } {
    const baseIncome = BASE_GOLD_PER_ROUND;
    const interest = this.calculateInterest(player.gold);
    const winStreakBonus = this.calculateWinStreakBonus(player.winStreak);
    const loseStreakBonus = this.calculateLoseStreakBonus(player.loseStreak);

    return {
      baseIncome,
      interest,
      winStreakBonus,
      loseStreakBonus,
      total: baseIncome + interest + winStreakBonus + loseStreakBonus,
    };
  }

  /**
   * Constants accessors
   */
  getConstants() {
    return {
      BASE_GOLD_PER_ROUND,
      INTEREST_RATE,
      MAX_INTEREST,
      XP_BUY_COST,
      XP_PER_PURCHASE,
      LEVEL_THRESHOLDS,
      STREAK_BONUSES,
    };
  }
}
