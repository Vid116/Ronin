/**
 * Client-side logging utility
 * Matches server logging format for easy comparison
 */

type LogLevel = 'connect' | 'match' | 'action' | 'emit' | 'receive' | 'state' | 'phase' | 'disconnect' | 'error' | 'info';

const logStyles: Record<LogLevel, string> = {
  connect: 'color: #22c55e; font-weight: bold',  // green
  match: 'color: #3b82f6; font-weight: bold',    // blue
  action: 'color: #06b6d4; font-weight: bold',   // cyan
  emit: 'color: #a855f7; font-weight: bold',     // magenta
  receive: 'color: #eab308; font-weight: bold',  // yellow
  state: 'color: #3b82f6; font-weight: bold',    // blue
  phase: 'color: #a855f7; font-weight: bold',    // magenta
  disconnect: 'color: #ef4444; font-weight: bold', // red
  error: 'color: #ef4444; font-weight: bold',    // red
  info: 'color: #6b7280; font-weight: bold',     // gray
};

const logPrefixes: Record<LogLevel, string> = {
  connect: '🔗 CONNECT',
  match: '🎮 MATCH',
  action: '🎯 ACTION',
  emit: '📤 EMIT',
  receive: '📥 RECEIVE',
  state: '🔄 STATE',
  phase: '⏰ PHASE',
  disconnect: '🔌 DISCONNECT',
  error: '⚠️  ERROR',
  info: 'ℹ️  INFO',
};

/**
 * Get formatted timestamp
 */
function getTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `[${hours}:${minutes}:${seconds}.${ms}]`;
}

/**
 * Truncate wallet address for readability
 */
function truncateWallet(wallet: string | undefined): string {
  if (!wallet) return 'NO_WALLET';
  if (wallet.startsWith('bot_')) return wallet;
  if (wallet.length > 10) {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  }
  return wallet;
}

/**
 * Truncate socket ID for readability
 */
function truncateSocket(socketId: string | undefined): string {
  if (!socketId) return 'NO_SOCKET';
  if (socketId.length > 8) {
    return socketId.slice(0, 8);
  }
  return socketId;
}

interface LogContext {
  wallet?: string;
  socketId?: string;
  matchId?: string;
}

/**
 * Main logging function
 */
export function log(level: LogLevel, message: string, context?: LogContext, data?: any) {
  const timestamp = getTimestamp();
  const prefix = logPrefixes[level];
  const style = logStyles[level];

  // Build context string
  const contextParts: string[] = [];
  if (context?.wallet) {
    contextParts.push(`Wallet: ${truncateWallet(context.wallet)}`);
  }
  if (context?.socketId) {
    contextParts.push(`Socket: ${truncateSocket(context.socketId)}`);
  }
  if (context?.matchId) {
    contextParts.push(`Match: ${context.matchId.slice(0, 12)}`);
  }

  const contextStr = contextParts.length > 0 ? ` | ${contextParts.join(' | ')}` : '';

  // Build full log message
  const logMessage = `${timestamp} %c${prefix}%c${contextStr} | ${message}`;

  // Log with styles
  if (data !== undefined) {
    console.log(logMessage, style, 'color: inherit', data);
  } else {
    console.log(logMessage, style, 'color: inherit');
  }
}

// Convenience methods
export const logger = {
  connect: (message: string, context?: LogContext, data?: any) => log('connect', message, context, data),
  match: (message: string, context?: LogContext, data?: any) => log('match', message, context, data),
  action: (message: string, context?: LogContext, data?: any) => log('action', message, context, data),
  emit: (message: string, context?: LogContext, data?: any) => log('emit', message, context, data),
  receive: (message: string, context?: LogContext, data?: any) => log('receive', message, context, data),
  state: (message: string, context?: LogContext, data?: any) => log('state', message, context, data),
  phase: (message: string, context?: LogContext, data?: any) => log('phase', message, context, data),
  disconnect: (message: string, context?: LogContext, data?: any) => log('disconnect', message, context, data),
  error: (message: string, context?: LogContext, data?: any) => log('error', message, context, data),
  info: (message: string, context?: LogContext, data?: any) => log('info', message, context, data),
};
