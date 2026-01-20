import winston from 'winston';
import { getConfig } from '../config/index.js';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

let logger: winston.Logger | null = null;

export function getLogger(): winston.Logger {
  if (!logger) {
    const config = getConfig();
    logger = winston.createLogger({
      level: config.LOG_LEVEL,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
      transports: [
        new winston.transports.Console({
          format: combine(colorize(), logFormat),
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        }),
      ],
    });
  }
  return logger;
}

export const log = {
  info: (message: string, meta?: object) => getLogger().info(message, meta),
  warn: (message: string, meta?: object) => getLogger().warn(message, meta),
  error: (message: string, meta?: object) => getLogger().error(message, meta),
  debug: (message: string, meta?: object) => getLogger().debug(message, meta),
};
