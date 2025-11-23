'use client';

import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { Unit, TIER_COLORS } from '@/types/game';
import { Sword, Heart, Star, Coins, Sparkles } from 'lucide-react';

interface CardProps {
  unit: Unit;
  isDraggable?: boolean;
  onClick?: () => void;
  showCost?: boolean;
  compact?: boolean;
}

export function Card({ unit, isDraggable = false, onClick, showCost = true, compact = false }: CardProps) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'card',
      item: unit,
      canDrag: isDraggable,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [unit, isDraggable]
  );

  const tierColor = TIER_COLORS[unit.tier] || 'border-warm-gray-500';

  return (
    <motion.div
      ref={isDraggable ? (drag as any) : null}
      whileHover={!isDragging ? { scale: 1.02 } : {}}
      whileTap={!isDragging ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        relative rounded-lg border-2 overflow-hidden
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${compact ? 'w-16 h-20' : 'w-24 h-32'}
        transition-all duration-200
        bg-surface
        ${tierColor}
        ${isDragging ? 'border-sage-500' : `hover:${tierColor.replace('border-', 'border-opacity-100 ')}`}
      `}
    >
      {/* Tier Badge */}
      <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-background/80 border ${tierColor.replace('border-', 'text-')}`}>
        T{unit.tier}
      </div>

      {/* Cost Badge */}
      {showCost && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-background/80 flex items-center gap-0.5">
          <Coins className="w-3 h-3 text-warning" strokeWidth={2} />
          <span className="text-foreground">{unit.cost}</span>
        </div>
      )}

      {/* Unit Image Placeholder */}
      <div className="flex items-center justify-center h-full">
        <div className={`text-3xl ${tierColor.replace('border-', 'text-')}`}>
          {/* You can replace this with actual unit images later */}
          <Sparkles className={compact ? "w-6 h-6" : "w-8 h-8"} strokeWidth={1.5} />
        </div>
      </div>

      {/* Unit Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-1 border-t border-warm-gray-700">
        <div className={`font-semibold truncate text-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {unit.name}
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="flex items-center gap-0.5 text-error">
            <Sword className="w-3 h-3" strokeWidth={2} />
            {unit.attack}
          </span>
          <span className="flex items-center gap-0.5 text-success">
            <Heart className="w-3 h-3" strokeWidth={2} />
            {unit.health}
          </span>
          <span className="flex items-center gap-0.5 text-warning">
            {[...Array(unit.stars)].map((_, i) => (
              <Star key={i} className="w-2.5 h-2.5 fill-warning" strokeWidth={0} />
            ))}
          </span>
        </div>
      </div>

      {/* Item Badge */}
      {unit.item && (
        <div className="absolute bottom-10 right-1 w-4 h-4 rounded-full bg-sage-600 border border-sage-500 flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-sage-100" strokeWidth={2} />
        </div>
      )}
    </motion.div>
  );
}
