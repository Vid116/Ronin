import { PlayerState, Card, ShopCard } from '../../types/game';

/**
 * Bot Player AI - Makes random decisions for testing
 */
export class BotPlayer {
  private playerId: string;
  private difficulty: 'easy' | 'medium' | 'hard';

  constructor(playerId: string, difficulty: 'easy' | 'medium' | 'hard' = 'easy') {
    this.playerId = playerId;
    this.difficulty = difficulty;
  }

  /**
   * Bot makes shopping decisions
   */
  makeShopDecisions(player: PlayerState, shopCards: ShopCard[]): {
    cardsToBuy: number[];
    cardsToSell: number[];
  } {
    const cardsToBuy: number[] = [];
    const cardsToSell: number[] = [];

    // Calculate available slots
    const currentCards = player.bench.filter(card => card !== null).length;
    const maxCards = 8; // Assuming max bench size

    // Sell random cards if bench is getting full (20% chance per card)
    if (currentCards >= 6) {
      player.bench.forEach((card, index) => {
        if (card && Math.random() < 0.2) {
          cardsToSell.push(index);
        }
      });
    }

    // Buy random cards if we have gold and space
    let availableSlots = maxCards - currentCards + cardsToSell.length;

    shopCards.forEach((shopCard, index) => {
      if (availableSlots > 0 && player.gold >= shopCard.cost) {
        // Random purchase chance based on difficulty
        const purchaseChance = this.difficulty === 'easy' ? 0.3 :
                              this.difficulty === 'medium' ? 0.5 : 0.7;

        if (Math.random() < purchaseChance) {
          cardsToBuy.push(index);
          availableSlots--;
        }
      }
    });

    return { cardsToBuy, cardsToSell };
  }

  /**
   * Bot positions cards on the board
   */
  positionCards(player: PlayerState): {
    benchIndex: number;
    boardIndex: number;
  }[] {
    const moves: { benchIndex: number; boardIndex: number }[] = [];

    // Find empty board slots
    const emptyBoardSlots: number[] = [];
    for (let i = 0; i < 7; i++) {
      if (!player.board[i]) {
        emptyBoardSlots.push(i);
      }
    }

    // Move cards from bench to board randomly
    player.bench.forEach((card, benchIndex) => {
      if (card && emptyBoardSlots.length > 0 && Math.random() < 0.6) {
        const boardIndex = emptyBoardSlots.shift()!;
        moves.push({ benchIndex, boardIndex });
      }
    });

    return moves;
  }

  /**
   * Bot decides whether to reroll the shop
   */
  shouldReroll(player: PlayerState, round: number): boolean {
    // Don't reroll if we can't afford it
    if (player.gold < 2) return false;

    // Early game: reroll less
    if (round <= 3) return Math.random() < 0.1;

    // Mid game: reroll moderately
    if (round <= 6) return Math.random() < 0.3;

    // Late game: reroll more
    return Math.random() < 0.5;
  }

  /**
   * Bot decides whether to level up
   */
  shouldLevelUp(player: PlayerState, round: number): boolean {
    const levelUpCost = 4;

    // Can't afford
    if (player.gold < levelUpCost) return false;

    // Don't level past 10
    if (player.level >= 10) return false;

    // Level up based on round and difficulty
    if (this.difficulty === 'hard') {
      // Aggressive leveling
      if (round >= 2 && player.level < 5) return Math.random() < 0.4;
      if (round >= 4 && player.level < 8) return Math.random() < 0.3;
    } else if (this.difficulty === 'medium') {
      // Moderate leveling
      if (round >= 3 && player.level < 5) return Math.random() < 0.3;
      if (round >= 5 && player.level < 8) return Math.random() < 0.2;
    } else {
      // Conservative leveling
      if (round >= 4 && player.level < 5) return Math.random() < 0.2;
      if (round >= 6 && player.level < 8) return Math.random() < 0.15;
    }

    return false;
  }

  /**
   * Generate a random bot name
   */
  static generateBotName(): string {
    const prefixes = [
      'Bot', 'AI', 'Robo', 'Cyber', 'Pixel', 'Digital',
      'Virtual', 'Auto', 'Mecha', 'Tech'
    ];

    const suffixes = [
      'Warrior', 'Master', 'King', 'Lord', 'Knight', 'Sage',
      'Hunter', 'Fighter', 'Champion', 'Legend'
    ];

    const numbers = Math.floor(Math.random() * 9000) + 1000;

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return `${prefix}${suffix}${numbers}`;
  }

  /**
   * Execute bot's turn
   */
  async executeTurn(
    player: PlayerState,
    shopCards: ShopCard[],
    round: number,
    onAction: (action: string, data: any) => void
  ): Promise<void> {
    // Small delay to simulate thinking
    await this.delay(500 + Math.random() * 1000);

    // Decide on reroll
    if (this.shouldReroll(player, round)) {
      onAction('reroll', {});
      await this.delay(300);
    }

    // Decide on level up
    if (this.shouldLevelUp(player, round)) {
      onAction('levelUp', {});
      await this.delay(300);
    }

    // Make shop decisions
    const { cardsToBuy, cardsToSell } = this.makeShopDecisions(player, shopCards);

    // Sell cards
    for (const benchIndex of cardsToSell) {
      onAction('sellCard', { benchIndex });
      await this.delay(200);
    }

    // Buy cards
    for (const shopIndex of cardsToBuy) {
      onAction('buyCard', { shopIndex });
      await this.delay(300);
    }

    // Position cards
    const moves = this.positionCards(player);
    for (const move of moves) {
      onAction('moveCard', move);
      await this.delay(200);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create bot players for a match
 */
export function createBotPlayers(count: number, difficulty: 'easy' | 'medium' | 'hard' = 'easy'): {
  id: string;
  name: string;
  isBot: boolean;
  bot: BotPlayer;
}[] {
  const bots = [];

  for (let i = 0; i < count; i++) {
    const botId = `bot_${Date.now()}_${i}`;
    bots.push({
      id: botId,
      name: BotPlayer.generateBotName(),
      isBot: true,
      bot: new BotPlayer(botId, difficulty)
    });
  }

  return bots;
}
