'use client';

import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { Unit, TIER_COLORS } from '@/types/game';

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

  const tierColor = TIER_COLORS[unit.tier] || 'text-gray-400';
  const stars = '⭐'.repeat(unit.stars);

  return (
    <motion.div
      ref={isDraggable ? (drag as any) : null}
      whileHover={!isDragging ? { scale: 1.05 } : {}}
      whileTap={!isDragging ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`
        relative rounded-lg border-2 overflow-hidden
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${compact ? 'w-16 h-20' : 'w-24 h-32'}
        transition-all duration-200
        bg-gradient-to-b from-gray-800 to-gray-900
        border-gray-600 hover:border-purple-500
      `}
      style={{
        borderColor: isDragging ? '#a855f7' : undefined,
      }}
    >
      {/* Tier Badge */}
      <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-bold ${tierColor} bg-black/50`}>
        T{unit.tier}
      </div>

      {/* Cost Badge */}
      {showCost && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold text-yellow-400 bg-black/50">
          {unit.cost}💰
        </div>
      )}

      {/* Unit Image Placeholder */}
      <div className="flex items-center justify-center h-full">
        <div className="text-3xl">🎴</div>
      </div>

      {/* Unit Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
        <div className={`text-xs font-bold truncate ${compact ? 'text-[10px]' : ''}`}>
          {unit.name}
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-red-400">⚔️{unit.attack}</span>
          <span className="text-green-400">❤️{unit.health}</span>
          <span className="text-yellow-400">{stars}</span>
        </div>
      </div>

      {/* Item Badge */}
      {unit.item && (
        <div className="absolute bottom-10 right-1 w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[8px]">
          ⚡
        </div>
      )}
    </motion.div>
  );
}
