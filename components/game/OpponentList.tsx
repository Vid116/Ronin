'use client';

import { motion } from 'framer-motion';
import { Player } from '@/types/game';

interface OpponentListProps {
  opponents: Player[];
  currentOpponent?: Player;
  localPlayer: Player;
}

export function OpponentList({ opponents, currentOpponent, localPlayer }: OpponentListProps) {
  // Combine all players and sort by health (descending)
  const allPlayers = [localPlayer, ...opponents].sort((a, b) => b.health - a.health);

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white">👥 Players ({allPlayers.filter(p => p.health > 0).length}/6)</span>
        <span className="text-xs text-gray-400">Sorted by HP</span>
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
                p-2 rounded-lg border transition-all
                ${isLocalPlayer ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800/50 border-gray-700'}
                ${isCurrentOpponent ? 'ring-2 ring-red-500 border-red-500' : ''}
                ${isEliminated ? 'opacity-40' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                {/* Player Info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Rank */}
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${index === 0 ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}
                  `}>
                    {index + 1}
                  </div>

                  {/* Address */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {isLocalPlayer && <span className="text-xs">👤</span>}
                      {isCurrentOpponent && <span className="text-xs">⚔️</span>}
                      <span className="text-xs font-mono truncate">
                        {player.address
                          ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`
                          : `Player ${index + 1}`
                        }
                      </span>
                    </div>
                    {isLocalPlayer && (
                      <span className="text-[10px] text-blue-400">You</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                  {/* Health */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-400">❤️</span>
                    <span className={`text-sm font-bold ${
                      player.health > 15 ? 'text-green-400' :
                      player.health > 10 ? 'text-yellow-400' :
                      player.health > 5 ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      {player.health}
                    </span>
                  </div>

                  {/* Level */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-purple-400">Lv</span>
                    <span className="text-sm font-bold text-purple-300">{player.level}</span>
                  </div>

                  {/* Win Streak */}
                  {player.winStreak > 0 && (
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs">🔥</span>
                      <span className="text-xs font-bold text-green-400">{player.winStreak}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Health Bar */}
              <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    player.health > 15 ? 'bg-green-500' :
                    player.health > 10 ? 'bg-yellow-500' :
                    player.health > 5 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(player.health / 20) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Eliminated Label */}
              {isEliminated && (
                <div className="mt-1 text-center">
                  <span className="text-[10px] text-gray-500">💀 Eliminated</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-700 flex gap-3 text-[10px] text-gray-500">
        <span>👤 You</span>
        <span>⚔️ Current Opponent</span>
        <span>🔥 Win Streak</span>
      </div>
    </div>
  );
}
