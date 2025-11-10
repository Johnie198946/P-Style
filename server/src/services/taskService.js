import { query } from '../database/connection.js';
import { logger } from '../utils/logger.js';

function stringifyOrNull(value) {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export async function saveTask({
  id,
  sourceImageUrl = null,
  targetImageUrl = null,
  sourceImageData = null,
  targetImageData = null,
  geminiResult = null,
  structuredResult = null,
  mappingResult = null,
  part1Summary = null,
  workflowDraft = null,
  workflowFinal = null,
  workflowAlignmentNotes = null,
  naturalLanguagePart1 = null,
  naturalLanguagePart2 = null,
  part2Completed = 0,
  status = 'pending'
}) {
  await query(
    `INSERT INTO analysis_tasks (
      id,
      source_image_url,
      target_image_url,
      source_image_data,
      target_image_data,
      gemini_result,
      structured_result,
      mapping_result,
      part1_summary,
      workflow_draft,
      workflow_final,
      workflow_alignment_notes,
      natural_language_part1,
      natural_language_part2,
      part2_completed,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      source_image_url = VALUES(source_image_url),
      target_image_url = VALUES(target_image_url),
      source_image_data = VALUES(source_image_data),
      target_image_data = VALUES(target_image_data),
      gemini_result = VALUES(gemini_result),
      structured_result = VALUES(structured_result),
      mapping_result = VALUES(mapping_result),
      part1_summary = VALUES(part1_summary),
      workflow_draft = VALUES(workflow_draft),
      workflow_final = VALUES(workflow_final),
      workflow_alignment_notes = VALUES(workflow_alignment_notes),
      natural_language_part1 = VALUES(natural_language_part1),
      natural_language_part2 = VALUES(natural_language_part2),
      part2_completed = VALUES(part2_completed),
      status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      sourceImageUrl,
      targetImageUrl,
      sourceImageData,
      targetImageData,
      stringifyOrNull(geminiResult),
      stringifyOrNull(structuredResult),
      stringifyOrNull(mappingResult),
      stringifyOrNull(part1Summary),
      stringifyOrNull(workflowDraft),
      stringifyOrNull(workflowFinal),
      stringifyOrNull(workflowAlignmentNotes),
      stringifyOrNull(naturalLanguagePart1),
      stringifyOrNull(naturalLanguagePart2),
      part2Completed ? 1 : 0,
      status
    ]
  );
}

export async function getTaskById(id) {
  const [rows] = await query('SELECT * FROM analysis_tasks WHERE id = ?', [id]);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    ...row,
    gemini_result: safeParseJson(row.gemini_result),
    structured_result: safeParseJson(row.structured_result),
    mapping_result: safeParseJson(row.mapping_result),
    workflow_draft: safeParseJson(row.workflow_draft),
    workflow_final: safeParseJson(row.workflow_final),
    workflow_alignment_notes: safeParseJson(row.workflow_alignment_notes),
    part1_summary: safeParseJson(row.part1_summary) ?? row.part1_summary,
    natural_language_part1: row.natural_language_part1,
    natural_language_part2: row.natural_language_part2
  };
}

export async function listRecentTasks(limit = 20) {
  const [rows] = await query(
    'SELECT id, status, created_at, updated_at FROM analysis_tasks ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  return rows;
}

function safeParseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    logger.warn('JSON 解析失败，返回原始值', { value });
    return value;
  }
}

