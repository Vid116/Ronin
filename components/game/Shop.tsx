'use client';

import { motion } from 'framer-motion';
import { Shop as ShopType, Unit } from '@/types/game';
import { Card } from './Card';
import { Store, RefreshCw, Coins, Lock, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShopProps {
  shop: ShopType;
  playerGold: number;
  onBuyCard: (index: number) => void;
  onReroll: () => void;
  disabled?: boolean;
}

export function Shop({ shop, playerGold, onBuyCard, onReroll, disabled = false }: ShopProps) {
  const canReroll = shop.freeRerolls > 0 || playerGold >= shop.rerollCost;

  return (
    <div className="bg-surface rounded-lg p-4 border-2 border-warm-gray-700">
      {/* Shop Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-sage-500" strokeWidth={2} />
          <span className="text-lg font-semibold text-foreground">Shop</span>
          <span className="text-sm text-warm-gray-400">
            ({shop.cards.length}/5)
          </span>
        </div>

        {/* Reroll Button */}
        <Button
          onClick={onReroll}
          disabled={!canReroll || disabled}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" strokeWidth={2} />
          Reroll
          {shop.freeRerolls > 0 ? (
            <span className="ml-1 text-success">(Free x{shop.freeRerolls})</span>
          ) : (
            <span className="ml-1 text-warm-gray-400">({shop.rerollCost})</span>
          )}
        </Button>
      </div>

      {/* Shop Cards */}
      <div className="flex gap-3 justify-center">
        {shop.cards.map((card, index) => {
          const canAfford = playerGold >= card.cost;

          return (
            <div key={`shop-${index}-${card.id}`} className="relative">
              <motion.div
                whileHover={canAfford && !disabled ? { y: -4 } : {}}
                onClick={() => canAfford && !disabled && onBuyCard(index)}
                className={`
                  ${canAfford && !disabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                `}
              >
                <Card unit={card} isDraggable={false} showCost={true} />
              </motion.div>

              {/* Buy Overlay */}
              {canAfford && !disabled && (
                <div className="absolute inset-0 bg-success/0 hover:bg-success/10 rounded-lg transition-all pointer-events-none border-2 border-transparent hover:border-success">
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-foreground bg-success px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                    Click to Buy
                  </div>
                </div>
              )}

              {/* Can't Afford Overlay */}
              {!canAfford && (
                <div className="absolute inset-0 bg-error/10 rounded-lg pointer-events-none border-2 border-error/50">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Lock className="w-6 h-6 text-error" strokeWidth={2} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty Slots */}
        {[...Array(5 - shop.cards.length)].map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-24 h-32 rounded-lg border-2 border-dashed border-warm-gray-700 bg-surface-light flex items-center justify-center"
          >
            <span className="text-xs text-warm-gray-500">Empty</span>
          </div>
        ))}
      </div>

      {/* Shop Info */}
      <div className="mt-3 flex justify-between items-center text-xs text-warm-gray-400">
        <span className="flex items-center gap-1">
          <Lightbulb className="w-3 h-3" strokeWidth={2} />
          Cards refresh each round
        </span>
        <span className="flex items-center gap-1">
          Your Gold:
          <span className="text-warning font-semibold flex items-center gap-0.5">
            <Coins className="w-3 h-3" strokeWidth={2} />
            {playerGold}
          </span>
        </span>
      </div>
    </div>
  );
}
