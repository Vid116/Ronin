'use client';

import { motion } from 'framer-motion';
import { Player } from '@/types/game';
import { Users, Heart, TrendingUp, Flame, User, Swords, Skull } from 'lucide-react';

interface OpponentListProps {
  opponents: Player[];
  currentOpponent?: Player;
  localPlayer: Player;
}

export function OpponentList({ opponents, currentOpponent, localPlayer }: OpponentListProps) {
  // Combine all players and sort by health (descending)
  const allPlayers = [localPlayer, ...opponents].sort((a, b) => b.health - a.health);

  return (
    <div className="bg-surface rounded-lg p-4 border-2 border-warm-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground flex items-center gap-1">
          <Users className="w-4 h-4 text-sage-500" strokeWidth={2} />
          Players ({allPlayers.filter(p => p.health > 0).length}/6)
        </span>
        <span className="text-xs text-warm-gray-400">Sorted by HP</span>
      </div>

      {/* Player List */}
      <div className="space-y-2">
        {allPlayers.map((player, index) => {
          const isLocalPlayer = player.id === localPlayer.id;
          const isCurrentOpponent = currentOpponent && player.id === currentOpponent.id;
          const isEliminated = player.health <= 0;

          return (
            <motion.div
              key={player.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                p-2 rounded-lg border-2 transition-all
                ${isLocalPlayer ? 'bg-surface-light border-sage-500' : 'bg-surface border-warm-gray-700'}
                ${isCurrentOpponent ? 'ring-2 ring-error border-error' : ''}
                ${isEliminated ? 'opacity-40' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                {/* Player Info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Rank */}
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2
                    ${index === 0 ? 'bg-warning border-warning text-background' : 'bg-surface border-warm-gray-600 text-foreground'}
                  `}>
                    {index + 1}
                  </div>

                  {/* Address */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {isLocalPlayer && <User className="w-3 h-3 text-sage-500" strokeWidth={2} />}
                      {isCurrentOpponent && <Swords className="w-3 h-3 text-error" strokeWidth={2} />}
                      <span className="text-xs font-mono truncate text-foreground">
                        {player.address
                          ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`
                          : `Player ${index + 1}`
                        }
                      </span>
                    </div>
                    {isLocalPlayer && (
                      <span className="text-[10px] text-sage-500">You</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  {/* Health */}
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-error" strokeWidth={2} />
                    <span className={`text-sm font-semibold ${
                      player.health > 15 ? 'text-success' :
                      player.health > 10 ? 'text-warning' :
                      player.health > 5 ? 'text-warning' :
                      'text-error'
                    }`}>
                      {player.health}
                    </span>
                  </div>

                  {/* Level */}
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-sage-500" strokeWidth={2} />
                    <span className="text-sm font-semibold text-foreground">{player.level}</span>
                  </div>

                  {/* Win Streak */}
                  {player.winStreak > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-success" strokeWidth={2} />
                      <span className="text-xs font-semibold text-success">{player.winStreak}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Health Bar */}
              <div className="mt-1.5 h-1.5 bg-warm-gray-800 rounded-full overflow-hidden border border-warm-gray-700">
                <motion.div
                  className={`h-full ${
                    player.health > 15 ? 'bg-success' :
                    player.health > 10 ? 'bg-warning' :
                    player.health > 5 ? 'bg-warning' :
                    'bg-error'
                  }`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(player.health / 20) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Eliminated Label */}
              {isEliminated && (
                <div className="mt-1 text-center flex items-center justify-center gap-1">
                  <Skull className="w-3 h-3 text-warm-gray-500" strokeWidth={2} />
                  <span className="text-[10px] text-warm-gray-500">Eliminated</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-warm-gray-700 flex gap-3 text-[10px] text-warm-gray-400">
        <span className="flex items-center gap-0.5">
          <User className="w-2.5 h-2.5" strokeWidth={2} />
          You
        </span>
        <span className="flex items-center gap-0.5">
          <Swords className="w-2.5 h-2.5" strokeWidth={2} />
          Current Opponent
        </span>
        <span className="flex items-center gap-0.5">
          <Flame className="w-2.5 h-2.5" strokeWidth={2} />
          Win Streak
        </span>
      </div>
    </div>
  );
}
