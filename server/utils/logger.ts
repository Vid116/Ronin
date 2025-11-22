/**
 * Centralized server logging utility
 * Provides consistent, color-coded logging with timestamps and wallet/socket tracking
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

type LogLevel = 'connect' | 'match' | 'action' | 'emit' | 'receive' | 'state' | 'phase' | 'disconnect' | 'error' | 'info';

const logPrefixes: Record<LogLevel, string> = {
  connect: `${colors.green}🔗 CONNECT${colors.reset}`,
  match: `${colors.blue}🎮 MATCH${colors.reset}`,
  action: `${colors.cyan}🎯 ACTION${colors.reset}`,
  emit: `${colors.magenta}📤 EMIT${colors.reset}`,
  receive: `${colors.yellow}📥 RECEIVE${colors.reset}`,
  state: `${colors.blue}🔄 STATE${colors.reset}`,
  phase: `${colors.magenta}⏰ PHASE${colors.reset}`,
  disconnect: `${colors.red}🔌 DISCONNECT${colors.reset}`,
  error: `${colors.red}⚠️  ERROR${colors.reset}`,
  info: `${colors.white}ℹ️  INFO${colors.reset}`,
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
  return `${colors.dim}[${hours}:${minutes}:${seconds}.${ms}]${colors.reset}`;
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

  // Build context string
  const contextParts: string[] = [];
  if (context?.wallet) {
    contextParts.push(`${colors.cyan}Wallet: ${truncateWallet(context.wallet)}${colors.reset}`);
  }
  if (context?.socketId) {
    contextParts.push(`${colors.yellow}Socket: ${truncateSocket(context.socketId)}${colors.reset}`);
  }
  if (context?.matchId) {
    contextParts.push(`${colors.green}Match: ${context.matchId.slice(0, 12)}${colors.reset}`);
  }

  const contextStr = contextParts.length > 0 ? ` | ${contextParts.join(' | ')}` : '';

  // Build full log message
  let logMessage = `${timestamp} ${prefix}${contextStr} | ${message}`;

  // Add data if provided
  if (data !== undefined) {
    if (typeof data === 'object') {
      logMessage += `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`;
    } else {
      logMessage += ` ${colors.dim}${data}${colors.reset}`;
    }
  }

  console.log(logMessage);
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
