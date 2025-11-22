'use client';

import { motion } from 'framer-motion';
import { Shop as ShopType, Unit } from '@/types/game';
import { Card } from './Card';

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
    <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
      {/* Shop Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">🏪 Shop</span>
          <span className="text-sm text-gray-400">
            ({shop.cards.length}/5)
          </span>
        </div>

        {/* Reroll Button */}
        <motion.button
          whileHover={canReroll && !disabled ? { scale: 1.05 } : {}}
          whileTap={canReroll && !disabled ? { scale: 0.95 } : {}}
          onClick={onReroll}
          disabled={!canReroll || disabled}
          className={`
            px-4 py-2 rounded-lg font-bold text-sm transition-all
            ${canReroll && !disabled
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          🔄 Reroll
          {shop.freeRerolls > 0 ? (
            <span className="ml-1 text-green-400">(Free x{shop.freeRerolls})</span>
          ) : (
            <span className="ml-1 text-yellow-400">({shop.rerollCost}💰)</span>
          )}
        </motion.button>
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
                <div className="absolute inset-0 bg-green-500/0 hover:bg-green-500/20 rounded-lg transition-all pointer-events-none">
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-green-600 px-2 py-1 rounded opacity-0 group-hover:opacity-100">
                    Click to Buy
                  </div>
                </div>
              )}

              {/* Can't Afford Overlay */}
              {!canAfford && (
                <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="text-2xl">🔒</span>
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
            className="w-24 h-32 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30 flex items-center justify-center text-gray-600"
          >
            <span className="text-xs">Empty</span>
          </div>
        ))}
      </div>

      {/* Shop Info */}
      <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
        <span>💡 Cards refresh each round</span>
        <span>Your Gold: <span className="text-yellow-400 font-bold">{playerGold}💰</span></span>
      </div>
    </div>
  );
}
