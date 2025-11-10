import mysql from 'mysql2/promise';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

let pool;

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${ENV.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

export async function getPool() {
  if (!pool) {
    await ensureDatabase();
    pool = mysql.createPool({
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    });
  }
  return pool;
}

export async function initDatabase() {
  const db = await getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS analysis_tasks (
      id VARCHAR(64) PRIMARY KEY,
      source_image_url TEXT,
      target_image_url TEXT,
      source_image_data LONGTEXT,
      target_image_data LONGTEXT,
      gemini_result JSON,
      structured_result JSON,
      mapping_result JSON,
      part1_summary LONGTEXT,
      workflow_draft LONGTEXT,
      workflow_final LONGTEXT,
      workflow_alignment_notes LONGTEXT,
      natural_language_part1 LONGTEXT,
      natural_language_part2 LONGTEXT,
      part2_completed TINYINT(1) DEFAULT 0,
      status ENUM('pending','processing','part1_completed','completed','failed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    await db.execute('ALTER TABLE analysis_tasks ADD COLUMN structured_result JSON AFTER gemini_result');
  } catch (error) {
    if (error?.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS uploads (
      id VARCHAR(64) PRIMARY KEY,
      source_image_data LONGTEXT,
      target_image_data LONGTEXT,
      source_image_url TEXT,
      target_image_url TEXT,
      similarity_score DECIMAL(5,2),
      analysis_task_id VARCHAR(64),
      status ENUM('uploaded','linked','analyzed','expired') DEFAULT 'uploaded',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      INDEX idx_task (analysis_task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  logger.info('数据库表初始化成功');
}

export async function query(sql, params = []) {
  const db = await getPool();
  return db.execute(sql, params);
}

