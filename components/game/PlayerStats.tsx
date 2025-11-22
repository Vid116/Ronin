'use client';

import { motion } from 'framer-motion';
import { Player } from '@/types/game';

interface PlayerStatsProps {
  player: Player;
  onBuyXP?: () => void;
  canBuyXP?: boolean;
}

export function PlayerStats({ player, onBuyXP, canBuyXP = false }: PlayerStatsProps) {
  const xpForNextLevel = player.level * 2;
  const xpProgress = (player.xp / xpForNextLevel) * 100;

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 space-y-3">
      {/* Player Address */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Player</span>
        <span className="text-sm font-mono text-gray-300">
          {player.address ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}` : 'Anonymous'}
        </span>
      </div>

      {/* Health */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-red-400">❤️ Health</span>
          <span className="text-xl font-bold text-white">{player.health}/20</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-600 to-red-400"
            initial={{ width: '100%' }}
            animate={{ width: `${(player.health / 20) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Gold */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-yellow-400">💰 Gold</span>
        <span className="text-2xl font-bold text-yellow-300">{player.gold}</span>
      </div>

      {/* Level & XP */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-purple-400">⬆️ Level {player.level}</span>
          <span className="text-xs text-gray-400">{player.xp}/{xpForNextLevel} XP</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 to-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Buy XP Button */}
        {onBuyXP && (
          <motion.button
            whileHover={canBuyXP ? { scale: 1.02 } : {}}
            whileTap={canBuyXP ? { scale: 0.98 } : {}}
            onClick={onBuyXP}
            disabled={!canBuyXP}
            className={`
              mt-2 w-full py-1 rounded text-xs font-bold transition-all
              ${canBuyXP
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Buy 4 XP (4💰)
          </motion.button>
        )}
      </div>

      {/* Streaks */}
      <div className="flex gap-2 text-xs">
        {player.winStreak > 0 && (
          <div className="flex-1 bg-green-900/30 border border-green-700 rounded px-2 py-1">
            <span className="text-green-400">🔥 Win x{player.winStreak}</span>
          </div>
        )}
        {player.loseStreak > 0 && (
          <div className="flex-1 bg-red-900/30 border border-red-700 rounded px-2 py-1">
            <span className="text-red-400">💔 Loss x{player.loseStreak}</span>
          </div>
        )}
      </div>
    </div>
  );
}
