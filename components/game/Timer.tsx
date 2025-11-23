'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GamePhase } from '@/types/game';
import { PHASE_DURATIONS_SECONDS } from '@/constants/gameConfig';
import { Zap, Swords, RefreshCw, Clock } from 'lucide-react';

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
      Icon: Zap,
      color: 'text-sage-500',
      bg: 'bg-surface-light',
      borderColor: 'border-sage-500',
      progressColor: 'bg-sage-500',
      maxTime: PHASE_DURATIONS_SECONDS.PLANNING,
    },
    COMBAT: {
      label: 'Combat Phase',
      Icon: Swords,
      color: 'text-error',
      bg: 'bg-surface-light',
      borderColor: 'border-error',
      progressColor: 'bg-error',
      maxTime: PHASE_DURATIONS_SECONDS.COMBAT,
    },
    TRANSITION: {
      label: 'Transition',
      Icon: RefreshCw,
      color: 'text-warning',
      bg: 'bg-surface-light',
      borderColor: 'border-warning',
      progressColor: 'bg-warning',
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

  const PhaseIcon = config.Icon;

  return (
    <div
      className={`${config.bg} border-2 ${
        isWarning ? 'border-error animate-pulse' : config.borderColor
      } rounded-lg p-4 transition-all min-w-[200px]`}
    >
      <div className="flex items-center justify-between">
        {/* Phase Label */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={isWarning ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: isWarning ? Infinity : 0, duration: 0.5 }}
          >
            <PhaseIcon className={`w-5 h-5 ${config.color}`} strokeWidth={2} />
          </motion.div>
          <span className={`font-semibold text-sm ${config.color}`}>
            {config.label}
          </span>
        </div>

        {/* Countdown */}
        <motion.div
          animate={isWarning ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: isWarning ? Infinity : 0, duration: 1 }}
          className={`
            text-3xl font-semibold tabular-nums flex items-center gap-1
            ${isWarning ? 'text-error' : config.color}
          `}
        >
          <Clock className="w-6 h-6" strokeWidth={2} />
          {timeRemaining}s
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-2 bg-warm-gray-800 rounded-full overflow-hidden border border-warm-gray-700">
        <motion.div
          className={`h-full ${isWarning ? 'bg-error' : config.progressColor}`}
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
          className="mt-2 text-center text-xs text-error font-semibold"
        >
          Time running out!
        </motion.div>
      )}
    </div>
  );
}
