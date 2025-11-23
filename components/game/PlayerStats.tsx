'use client';

import { motion } from 'framer-motion';
import { Player } from '@/types/game';
import { Heart, Coins, TrendingUp, Flame, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PlayerStatsProps {
  player: Player;
  onBuyXP?: () => void;
  canBuyXP?: boolean;
}

export function PlayerStats({ player, onBuyXP, canBuyXP = false }: PlayerStatsProps) {
  const xpForNextLevel = player.level * 2;
  const xpProgress = (player.xp / xpForNextLevel) * 100;

  return (
    <div className="bg-surface rounded-lg p-4 border-2 border-warm-gray-700 space-y-3">
      {/* Player Address */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-warm-gray-400">Player</span>
        <span className="text-sm font-mono text-foreground">
          {player.address ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}` : 'Anonymous'}
        </span>
      </div>

      {/* Health */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-foreground flex items-center gap-1">
            <Heart className="w-4 h-4 text-error" strokeWidth={2} />
            Health
          </span>
          <span className="text-xl font-semibold text-foreground">{player.health}/20</span>
        </div>
        <div className="h-3 bg-warm-gray-800 rounded-full overflow-hidden border border-warm-gray-700">
          <motion.div
            className="h-full bg-error"
            initial={{ width: '100%' }}
            animate={{ width: `${(player.health / 20) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Gold */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1">
          <Coins className="w-4 h-4 text-warning" strokeWidth={2} />
          Gold
        </span>
        <span className="text-2xl font-semibold text-warning">{player.gold}</span>
      </div>

      {/* Level & XP */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-foreground flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-sage-500" strokeWidth={2} />
            Level {player.level}
          </span>
          <span className="text-xs text-warm-gray-400">{player.xp}/{xpForNextLevel} XP</span>
        </div>
        <div className="h-2 bg-warm-gray-800 rounded-full overflow-hidden border border-warm-gray-700">
          <motion.div
            className="h-full bg-sage-600"
            initial={{ width: '0%' }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Buy XP Button */}
        {onBuyXP && (
          <Button
            onClick={onBuyXP}
            disabled={!canBuyXP}
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
          >
            <Coins className="w-3 h-3 mr-1" strokeWidth={2} />
            Buy 4 XP (4 Gold)
          </Button>
        )}
      </div>

      {/* Streaks */}
      <div className="flex gap-2 text-xs">
        {player.winStreak > 0 && (
          <div className="flex-1 bg-surface-light border-2 border-success rounded px-2 py-1 flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-success" strokeWidth={2} />
            <span className="text-success font-semibold">Win x{player.winStreak}</span>
          </div>
        )}
        {player.loseStreak > 0 && (
          <div className="flex-1 bg-surface-light border-2 border-error rounded px-2 py-1 flex items-center justify-center gap-1">
            <TrendingDown className="w-3 h-3 text-error" strokeWidth={2} />
            <span className="text-error font-semibold">Loss x{player.loseStreak}</span>
          </div>
        )}
      </div>
    </div>
  );
}
