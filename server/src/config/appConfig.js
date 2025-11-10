import { ENV } from './env.js';

export const APP_CONFIG = {
  queueIntervalMs: ENV.GEMINI_MIN_INTERVAL_MS,
  geminiMaxAttempts: ENV.GEMINI_MAX_ATTEMPTS,
  geminiTimeoutMs: ENV.GEMINI_TIMEOUT_MS,
  similarityStopLevels: ['identical', 'extremely_similar']
};

