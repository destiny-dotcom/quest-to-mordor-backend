type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

const formatMessage = (level: LogLevel, message: string, data?: unknown): LogMessage => {
  const logMessage: LogMessage = {
    level,
    message,
    timestamp: new Date().toISOString()
  };
  if (data !== undefined) {
    logMessage.data = data;
  }
  return logMessage;
};

const output = (logMessage: LogMessage): void => {
  const prefix = {
    info: 'ℹ️ ',
    warn: '⚠️ ',
    error: '❌',
    debug: '🔍'
  }[logMessage.level];

  const formatted = `${prefix} [${logMessage.timestamp}] ${logMessage.message}`;

  switch (logMessage.level) {
    case 'error':
      process.stderr.write(formatted + '\n');
      if (logMessage.data) process.stderr.write(JSON.stringify(logMessage.data, null, 2) + '\n');
      break;
    case 'warn':
      process.stdout.write(formatted + '\n');
      if (logMessage.data) process.stdout.write(JSON.stringify(logMessage.data, null, 2) + '\n');
      break;
    default:
      process.stdout.write(formatted + '\n');
      if (logMessage.data) process.stdout.write(JSON.stringify(logMessage.data, null, 2) + '\n');
  }
};

export const logger = {
  info: (message: string, data?: unknown) => output(formatMessage('info', message, data)),
  warn: (message: string, data?: unknown) => output(formatMessage('warn', message, data)),
  error: (message: string, data?: unknown) => output(formatMessage('error', message, data)),
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      output(formatMessage('debug', message, data));
    }
  }
};

export default logger;
