import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';
import { logger } from '../utils/logger.js';

/**
 * 新建上传记录
 * @param {object} params 上传参数集合
 */
export async function createUpload({
  sourceImageData,
  targetImageData = null,
  sourceImageUrl = null,
  targetImageUrl = null,
  similarityScore = null
}) {
  const id = uuidv4();
  await query(
    `INSERT INTO uploads (
      id,
      source_image_data,
      target_image_data,
      source_image_url,
      target_image_url,
      similarity_score,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, 'uploaded')`,
    [
      id,
      sourceImageData,
      targetImageData,
      sourceImageUrl,
      targetImageUrl,
      similarityScore
    ]
  );
  logger.info('上传记录已创建', { uploadId: id, hasTarget: Boolean(targetImageData) });
  return { id };
}

/**
 * 根据 ID 查询上传记录
 */
export async function getUploadById(id) {
  const [rows] = await query('SELECT * FROM uploads WHERE id = ?', [id]);
  if (!rows.length) return null;
  return rows[0];
}

/**
 * 将上传记录与分析任务关联
 */
export async function linkUploadToTask(uploadId, taskId) {
  if (!uploadId || !taskId) return;
  await query(
    `UPDATE uploads
     SET analysis_task_id = ?, status = 'linked', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [taskId, uploadId]
  );
  logger.info('上传记录已关联至任务', { uploadId, taskId });
}




