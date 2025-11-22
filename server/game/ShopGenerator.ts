import { Unit } from '../../types/game';

// Tier probabilities by player level
const TIER_PROBABILITIES: Record<number, Record<number, number>> = {
  1: { 1: 1.00, 2: 0.00, 3: 0.00, 4: 0.00, 5: 0.00, 6: 0.00 },
  2: { 1: 1.00, 2: 0.00, 3: 0.00, 4: 0.00, 5: 0.00, 6: 0.00 },
  3: { 1: 0.75, 2: 0.25, 3: 0.00, 4: 0.00, 5: 0.00, 6: 0.00 },
  4: { 1: 0.55, 2: 0.30, 3: 0.15, 4: 0.00, 5: 0.00, 6: 0.00 },
  5: { 1: 0.35, 2: 0.35, 3: 0.25, 4: 0.05, 5: 0.00, 6: 0.00 },
  6: { 1: 0.25, 2: 0.35, 3: 0.30, 4: 0.10, 5: 0.00, 6: 0.00 },
  7: { 1: 0.20, 2: 0.30, 3: 0.33, 4: 0.15, 5: 0.02, 6: 0.00 },
  8: { 1: 0.15, 2: 0.25, 3: 0.35, 4: 0.20, 5: 0.05, 6: 0.00 },
  9: { 1: 0.10, 2: 0.15, 3: 0.30, 4: 0.30, 5: 0.13, 6: 0.02 },
  10: { 1: 0.05, 2: 0.10, 3: 0.20, 4: 0.35, 5: 0.25, 6: 0.05 },
};

// Card pool - simplified version with core units
const CARD_POOL: Record<number, Unit[]> = {
  1: [
    {
      id: 'samurai-1',
      name: 'Samurai',
      tier: 1,
      cost: 1,
      attack: 3,
      health: 6,
      stars: 1,
      ability: {
        name: 'Swift Strike',
        description: 'Attacks deal 1 bonus damage',
        trigger: 'onAttack',
        effect: 'damage_bonus_1',
      },
      synergies: ['Warrior', 'Human'],
    },
    {
      id: 'ninja-1',
      name: 'Ninja',
      tier: 1,
      cost: 1,
      attack: 4,
      health: 4,
      stars: 1,
      ability: {
        name: 'Backstab',
        description: 'First attack deals double damage',
        trigger: 'onAttack',
        triggerCount: 1,
        effect: 'double_damage_first',
      },
      synergies: ['Assassin', 'Human'],
    },
    {
      id: 'monk-1',
      name: 'Monk',
      tier: 1,
      cost: 1,
      attack: 2,
      health: 8,
      stars: 1,
      ability: {
        name: 'Meditation',
        description: 'Heal 2 HP every 3 attacks',
        trigger: 'everyX',
        triggerCount: 3,
        effect: 'heal_2',
      },
      synergies: ['Healer', 'Human'],
    },
    {
      id: 'archer-1',
      name: 'Archer',
      tier: 1,
      cost: 1,
      attack: 5,
      health: 3,
      stars: 1,
      ability: {
        name: 'Precise Shot',
        description: 'Attacks ignore 1 armor',
        trigger: 'onAttack',
        effect: 'ignore_armor_1',
      },
      synergies: ['Ranger', 'Human'],
    },
  ],
  2: [
    {
      id: 'ronin-2',
      name: 'Ronin',
      tier: 2,
      cost: 2,
      attack: 6,
      health: 10,
      stars: 1,
      ability: {
        name: 'Masterless',
        description: '+2 attack when alone',
        trigger: 'conditional',
        effect: 'attack_bonus_alone_2',
      },
      synergies: ['Warrior', 'Wanderer'],
    },
    {
      id: 'shrine-maiden-2',
      name: 'Shrine Maiden',
      tier: 2,
      cost: 2,
      attack: 3,
      health: 12,
      stars: 1,
      ability: {
        name: 'Blessing',
        description: 'Heals adjacent allies for 3 HP on combat start',
        trigger: 'startCombat',
        effect: 'heal_adjacent_3',
      },
      synergies: ['Healer', 'Divine'],
    },
    {
      id: 'shinobi-2',
      name: 'Shinobi',
      tier: 2,
      cost: 2,
      attack: 7,
      health: 7,
      stars: 1,
      ability: {
        name: 'Shadow Strike',
        description: 'Deal damage to random enemy on death',
        trigger: 'onDeath',
        effect: 'damage_random_5',
      },
      synergies: ['Assassin', 'Shadow'],
    },
  ],
  3: [
    {
      id: 'oni-3',
      name: 'Oni',
      tier: 3,
      cost: 3,
      attack: 10,
      health: 15,
      stars: 1,
      ability: {
        name: 'Rampage',
        description: '+2 attack on each kill',
        trigger: 'onKill',
        effect: 'stack_attack_2',
      },
      synergies: ['Demon', 'Berserker'],
    },
    {
      id: 'kitsune-3',
      name: 'Kitsune',
      tier: 3,
      cost: 3,
      attack: 8,
      health: 12,
      stars: 1,
      ability: {
        name: 'Fox Fire',
        description: 'Deal 5 damage to 3 random enemies on combat start',
        trigger: 'startCombat',
        effect: 'damage_random_multi_5',
      },
      synergies: ['Mystic', 'Beast'],
    },
  ],
  4: [
    {
      id: 'dragon-samurai-4',
      name: 'Dragon Samurai',
      tier: 4,
      cost: 4,
      attack: 12,
      health: 18,
      stars: 1,
      ability: {
        name: 'Dragon Fury',
        description: 'Every 2 attacks deal 10 damage to all enemies',
        trigger: 'everyX',
        triggerCount: 2,
        effect: 'damage_all_10',
      },
      synergies: ['Warrior', 'Dragon'],
    },
    {
      id: 'yokai-hunter-4',
      name: 'Yokai Hunter',
      tier: 4,
      cost: 4,
      attack: 14,
      health: 14,
      stars: 1,
      ability: {
        name: 'Banish',
        description: 'Deals double damage to Demons and Mystics',
        trigger: 'conditional',
        effect: 'double_damage_demon_mystic',
      },
      synergies: ['Hunter', 'Human'],
    },
  ],
  5: [
    {
      id: 'shogun-5',
      name: 'Shogun',
      tier: 5,
      cost: 5,
      attack: 15,
      health: 25,
      stars: 1,
      ability: {
        name: 'Commander',
        description: 'All allies gain +3 attack and +5 health',
        trigger: 'startCombat',
        effect: 'buff_all_attack_3_health_5',
      },
      synergies: ['Warrior', 'Noble'],
    },
    {
      id: 'celestial-dragon-5',
      name: 'Celestial Dragon',
      tier: 5,
      cost: 5,
      attack: 18,
      health: 20,
      stars: 1,
      ability: {
        name: 'Divine Breath',
        description: 'On attack, deal 8 damage to all enemies',
        trigger: 'onAttack',
        effect: 'damage_all_8',
      },
      synergies: ['Dragon', 'Divine'],
    },
  ],
  6: [
    {
      id: 'susanoo-6',
      name: 'Susanoo',
      tier: 6,
      cost: 6,
      attack: 25,
      health: 35,
      stars: 1,
      ability: {
        name: 'Storm God',
        description: 'On combat start, deal 20 damage to all enemies and gain 10 attack',
        trigger: 'startCombat',
        effect: 'damage_all_20_buff_attack_10',
      },
      synergies: ['God', 'Storm'],
    },
    {
      id: 'amaterasu-6',
      name: 'Amaterasu',
      tier: 6,
      cost: 6,
      attack: 20,
      health: 30,
      stars: 1,
      ability: {
        name: 'Sun Goddess',
        description: 'Heal all allies for 10 HP every 2 attacks',
        trigger: 'everyX',
        triggerCount: 2,
        effect: 'heal_all_10',
      },
      synergies: ['God', 'Divine'],
    },
  ],
};

export class ShopGenerator {
  private cardPool: Record<number, Unit[]>;

  constructor() {
    this.cardPool = CARD_POOL;
  }

  /**
   * Generate a shop of 5 cards based on player level
   */
  generateShop(playerLevel: number, shopSize: number = 5): Unit[] {
    const shop: Unit[] = [];
    const probabilities = this.getTierProbabilities(playerLevel);

    for (let i = 0; i < shopSize; i++) {
      const tier = this.selectTier(probabilities);
      const card = this.getRandomCardFromTier(tier);
      shop.push(card);
    }

    return shop;
  }

  /**
   * Get tier probabilities for a given player level
   */
  private getTierProbabilities(level: number): Record<number, number> {
    // Clamp level between 1 and 10
    const clampedLevel = Math.max(1, Math.min(10, level));
    return TIER_PROBABILITIES[clampedLevel];
  }

  /**
   * Select a tier based on probabilities
   */
  private selectTier(probabilities: Record<number, number>): number {
    const random = Math.random();
    let cumulative = 0;

    for (let tier = 1; tier <= 6; tier++) {
      cumulative += probabilities[tier] || 0;
      if (random <= cumulative) {
        return tier;
      }
    }

    // Fallback to tier 1
    return 1;
  }

  /**
   * Get a random card from a specific tier
   */
  private getRandomCardFromTier(tier: number): Unit {
    const tierCards = this.cardPool[tier] || this.cardPool[1];
    const randomIndex = Math.floor(Math.random() * tierCards.length);

    // Create a copy with a unique ID
    const card = { ...tierCards[randomIndex] };
    card.id = `${card.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return card;
  }

  /**
   * Add a custom card to the pool
   */
  addCardToPool(tier: number, card: Unit): void {
    if (!this.cardPool[tier]) {
      this.cardPool[tier] = [];
    }
    this.cardPool[tier].push(card);
  }

  /**
   * Get all cards of a specific tier
   */
  getCardsByTier(tier: number): Unit[] {
    return this.cardPool[tier] || [];
  }

  /**
   * Get total number of cards in the pool
   */
  getTotalCards(): number {
    return Object.values(this.cardPool).reduce((sum, cards) => sum + cards.length, 0);
  }
}
