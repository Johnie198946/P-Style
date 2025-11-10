import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(moduleDir, '../.env'),
  path.resolve(moduleDir, '../../.env'),
  path.resolve(moduleDir, '../../../.env')
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 8081),
  HOST: process.env.HOST || '0.0.0.0',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  HTTPS_PROXY: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 3306),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'photostyle_clone',
  GEMINI_MIN_INTERVAL_MS: Number(process.env.GEMINI_MIN_INTERVAL_MS || 5000),
  GEMINI_MAX_ATTEMPTS: Number(process.env.GEMINI_MAX_ATTEMPTS || 4),
  GEMINI_TIMEOUT_MS: Number(process.env.GEMINI_TIMEOUT_MS || 60000)
};

