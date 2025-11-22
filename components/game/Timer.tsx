'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Countdown from 'react-countdown';
import { GamePhase } from '@/types/game';

interface TimerProps {
  timeRemaining: number;
  phase: GamePhase;
}

export function Timer({ timeRemaining, phase }: TimerProps) {
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    setIsWarning(timeRemaining <= 5);
  }, [timeRemaining]);

  const phaseConfig = {
    PLANNING: { label: '⚡ Planning Phase', color: 'text-blue-400', bg: 'bg-blue-900/30' },
    COMBAT: { label: '⚔️ Combat Phase', color: 'text-red-400', bg: 'bg-red-900/30' },
    TRANSITION: { label: '🔄 Transition', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  };

  const config = phaseConfig[phase];

  return (
    <div className={`${config.bg} border-2 ${isWarning ? 'border-red-500' : 'border-gray-700'} rounded-lg p-4 transition-all`}>
      <div className="flex items-center justify-between">
        {/* Phase Label */}
        <div className="flex items-center gap-2">
          <span className={`font-bold ${config.color}`}>{config.label}</span>
        </div>

        {/* Countdown */}
        <motion.div
          animate={isWarning ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: isWarning ? Infinity : 0, duration: 1 }}
          className={`
            text-3xl font-bold tabular-nums
            ${isWarning ? 'text-red-400' : config.color}
          `}
        >
          {timeRemaining}s
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${isWarning ? 'bg-red-500' : 'bg-blue-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${(timeRemaining / 20) * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
