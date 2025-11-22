'use client';

import { useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { Board as BoardType, Unit } from '@/types/game';
import { Card } from './Card';

interface BoardProps {
  board: BoardType;
  isPlayerBoard: boolean;
  onCardDrop?: (unit: Unit, position: number) => void;
  onCardClick?: (position: number) => void;
  isInteractive?: boolean;
}

export function Board({
  board,
  isPlayerBoard,
  onCardDrop,
  onCardClick,
  isInteractive = false,
}: BoardProps) {
  const renderSlot = (card: Unit | null, position: number, row: 'top' | 'bottom') => {
    const [{ isOver, canDrop }, drop] = useDrop(
      () => ({
        accept: 'card',
        drop: (item: Unit) => onCardDrop?.(item, position),
        collect: (monitor) => ({
          isOver: !!monitor.isOver(),
          canDrop: !!monitor.canDrop(),
        }),
        canDrop: () => isPlayerBoard && isInteractive,
      }),
      [position, isPlayerBoard, isInteractive]
    );

    return (
      <motion.div
        ref={isInteractive ? drop : null}
        key={`${row}-${position}`}
        className={`
          relative rounded-lg border-2 transition-all
          ${card ? 'bg-transparent' : 'bg-gray-800/30'}
          ${isOver && canDrop ? 'border-green-400 bg-green-400/20' : ''}
          ${!isOver && canDrop ? 'border-gray-600 border-dashed' : 'border-gray-700'}
          ${!canDrop && card ? 'border-purple-500/50' : ''}
          ${isInteractive && !card ? 'hover:border-gray-500' : ''}
          w-24 h-32
        `}
        onClick={() => card && onCardClick?.(position)}
        whileHover={isInteractive && !card ? { scale: 1.02 } : {}}
      >
        {/* Position Number */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-900 border border-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-400 z-10">
          {position + 1}
        </div>

        {/* Card */}
        {card && (
          <div className="absolute inset-0">
            <Card
              unit={card}
              isDraggable={isPlayerBoard && isInteractive}
              showCost={false}
            />
          </div>
        )}

        {/* Empty Slot Indicator */}
        {!card && isInteractive && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">
            {isOver && canDrop ? '✓' : ''}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Board Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-400">
          {isPlayerBoard ? '🛡️ Your Board' : '⚔️ Enemy Board'}
        </span>
        <span className="text-xs text-gray-500">
          {[...board.top, ...board.bottom].filter(Boolean).length}/8 units
        </span>
      </div>

      {/* Top Row (Positions 0-3) */}
      <div className="flex gap-2 justify-center">
        {board.top.map((card, i) => renderSlot(card, i, 'top'))}
      </div>

      {/* Bottom Row (Positions 4-7) */}
      <div className="flex gap-2 justify-center">
        {board.bottom.map((card, i) => renderSlot(card, i + 4, 'bottom'))}
      </div>
    </div>
  );
}
