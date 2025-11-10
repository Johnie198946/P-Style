import { ENV } from '../config/env.js';

const timestamp = () => new Date().toISOString();

export const logger = {
  info: (...args) => console.log(`[${timestamp()}][INFO]`, ...args),
  warn: (...args) => console.warn(`[${timestamp()}][WARN]`, ...args),
  error: (...args) => console.error(`[${timestamp()}][ERROR]`, ...args),
  debug: (...args) => {
    if (ENV.NODE_ENV === 'development') {
      console.debug(`[${timestamp()}][DEBUG]`, ...args);
    }
  }
};


