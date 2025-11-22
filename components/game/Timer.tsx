'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GamePhase } from '@/types/game';
import { PHASE_DURATIONS_SECONDS } from '@/constants/gameConfig';

interface TimerProps {
  timeRemaining: number;
  phase: GamePhase;
}

export function Timer({ timeRemaining, phase }: TimerProps) {
  const [isWarning, setIsWarning] = useState(false);

  // Debug: Log when Timer receives new props
  useEffect(() => {
    console.log('⏱️ [TIMER COMPONENT] Props updated:', {
      timeRemaining,
      phase
    });
  }, [timeRemaining, phase]);

  // Warning state
  useEffect(() => {
    setIsWarning(timeRemaining <= 5 && timeRemaining > 0);
  }, [timeRemaining]);

  const phaseConfig = {
    PLANNING: {
      label: 'Planning Phase',
      icon: '⚡',
      color: 'text-blue-400',
      bg: 'bg-blue-900/30',
      borderColor: 'border-blue-500',
      progressColor: 'bg-blue-500',
      maxTime: PHASE_DURATIONS_SECONDS.PLANNING,
    },
    COMBAT: {
      label: 'Combat Phase',
      icon: '⚔️',
      color: 'text-red-400',
      bg: 'bg-red-900/30',
      borderColor: 'border-red-500',
      progressColor: 'bg-red-500',
      maxTime: PHASE_DURATIONS_SECONDS.COMBAT,
    },
    TRANSITION: {
      label: 'Transition',
      icon: '🔄',
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/30',
      borderColor: 'border-yellow-500',
      progressColor: 'bg-yellow-500',
      maxTime: PHASE_DURATIONS_SECONDS.TRANSITION,
    },
  } as const;

  // Defensive: Handle undefined/invalid phase by defaulting to PLANNING
  const safePhase = phase && phase in phaseConfig ? phase : 'PLANNING';
  const config = phaseConfig[safePhase];
  const progressPercentage = (timeRemaining / config.maxTime) * 100;

  // Log warning if phase was invalid
  if (phase !== safePhase) {
    console.warn('⚠️ [TIMER] Invalid phase received:', phase, '- defaulting to PLANNING');
  }

  return (
    <div
      className={`${config.bg} border-2 ${
        isWarning ? 'border-red-500 animate-pulse' : config.borderColor
      } rounded-lg p-4 transition-all min-w-[200px]`}
    >
      <div className="flex items-center justify-between">
        {/* Phase Label */}
        <div className="flex items-center gap-2">
          <motion.span
            animate={isWarning ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: isWarning ? Infinity : 0, duration: 0.5 }}
            className="text-xl"
          >
            {config.icon}
          </motion.span>
          <span className={`font-bold text-sm ${config.color}`}>
            {config.label}
          </span>
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
          className={`h-full ${isWarning ? 'bg-red-500' : config.progressColor}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      </div>

      {/* Warning Text */}
      {isWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-center text-xs text-red-400 font-bold"
        >
          Time running out!
        </motion.div>
      )}
    </div>
  );
}
