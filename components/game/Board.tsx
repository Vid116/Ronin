'use client';

import { useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { Board as BoardType, Unit } from '@/types/game';
import { Card } from './Card';
import { Shield, Swords, Check, MoveDown } from 'lucide-react';

interface BoardProps {
  board: BoardType;
  isPlayerBoard: boolean;
  onCardDrop?: (unit: Unit, position: number) => void;
  onCardClick?: (position: number) => void;
  onSlotClick?: (position: number) => void;
  isInteractive?: boolean;
  selectedCardId?: string;
}

export function Board({
  board,
  isPlayerBoard,
  onCardDrop,
  onCardClick,
  onSlotClick,
  isInteractive = false,
  selectedCardId,
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

    const isSelected = card?.id === selectedCardId;
    const hasSelection = !!selectedCardId;

    return (
      <motion.div
        ref={isInteractive ? (drop as any) : null}
        key={`${row}-${position}`}
        className={`
          relative rounded-lg border-2 transition-all
          ${card ? 'bg-transparent' : 'bg-surface'}
          ${isOver && canDrop ? 'border-success bg-success/10' : ''}
          ${!isOver && canDrop && hasSelection ? 'border-warning border-dashed animate-pulse' : ''}
          ${!isOver && canDrop && !hasSelection ? 'border-warm-gray-600 border-dashed' : ''}
          ${!canDrop && card && !isSelected ? 'border-sage-500/50' : ''}
          ${isSelected ? 'border-sage-500 ring-2 ring-sage-400' : 'border-warm-gray-700'}
          ${isInteractive && !card && hasSelection ? 'hover:border-warning cursor-pointer' : ''}
          ${isInteractive && !card && !hasSelection ? 'hover:border-warm-gray-600' : ''}
          ${isInteractive && card ? 'cursor-pointer' : ''}
          w-24 h-32
        `}
        onClick={() => {
          if (card) {
            onCardClick?.(position);
          } else if (isInteractive) {
            onSlotClick?.(position);
          }
        }}
        whileHover={isInteractive ? { scale: 1.02 } : {}}
      >
        {/* Position Number */}
        <div className={`absolute -top-2 -left-2 w-6 h-6 bg-background border-2 rounded-full flex items-center justify-center text-xs font-semibold z-10 ${
          isSelected ? 'border-sage-500 text-sage-500' : 'border-warm-gray-600 text-warm-gray-400'
        }`}>
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
          <div className="absolute inset-0 flex items-center justify-center">
            {isOver && canDrop ? (
              <Check className="w-6 h-6 text-success" strokeWidth={2} />
            ) : hasSelection ? (
              <MoveDown className="w-6 h-6 text-warning" strokeWidth={2} />
            ) : null}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Board Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1">
          {isPlayerBoard ? (
            <>
              <Shield className="w-4 h-4 text-sage-500" strokeWidth={2} />
              Your Board
            </>
          ) : (
            <>
              <Swords className="w-4 h-4 text-error" strokeWidth={2} />
              Enemy Board
            </>
          )}
        </span>
        <span className="text-xs text-warm-gray-400">
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
