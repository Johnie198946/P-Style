import { v4 as uuidv4 } from 'uuid';
import { analyzeWithGemini } from './geminiService.js';
import { saveTask, getTaskById } from './taskService.js';
import { buildMappingFromAnalysis } from './colorMappingService.js';
import { formatAnalysisResult, reportMissingSections } from './analysisFormatter.js';
import { extractImageMeta } from '../utils/image.js';
import { toDataUrl } from '../utils/file.js';
import { logger } from '../utils/logger.js';

const META_EXTRACT_LIMIT = 8 * 1024 * 1024;

export async function analyzePart1({ sourceFile, targetFile }) {
  if (!sourceFile) {
    throw new Error('sourceImage 为必填项');
  }

  logger.info('触发阶段一分析', {
    hasTarget: Boolean(targetFile),
    sourceSize: sourceFile.size,
    targetSize: targetFile?.size
  });

  const taskId = uuidv4();
  const sourceDataUrl = toDataUrl(sourceFile);
  const targetDataUrl = toDataUrl(targetFile);
  const sourceMeta = await extractMetadataSafely({
    taskId,
    role: 'source',
    size: sourceFile.size,
    buffer: sourceFile.buffer
  });
  const targetMeta = targetFile
    ? await extractMetadataSafely({
        taskId,
        role: 'target',
        size: targetFile.size,
        buffer: targetFile.buffer
      })
    : null;

  const geminiResult = await analyzeWithGemini({
    stage: 'part1',
    sourceImageDataUrl: sourceDataUrl,
    targetImageDataUrl: targetDataUrl,
    sourceMeta,
    targetMeta
  });

  const rawAnalysis = geminiResult.analysis || {};
  const structured = formatAnalysisResult({
    stage: 'part1',
    rawAnalysis,
    naturalLanguage: geminiResult.naturalLanguage || ''
  });
  if (rawAnalysis.composition) {
    reportMissingSections(structured);
  }

  await saveTask({
    id: taskId,
    sourceImageData: sourceDataUrl,
    targetImageData: targetDataUrl,
    geminiResult: rawAnalysis,
    structuredResult: structured,
    part1Summary: geminiResult.naturalLanguage,
    workflowDraft: rawAnalysis.workflow_draft || [],
    naturalLanguagePart1: geminiResult.naturalLanguage,
    status: geminiResult.similarityCheck?.should_stop ? 'completed' : 'part1_completed'
  });

  logger.info('阶段一分析完成', {
    taskId,
    status: geminiResult.similarityCheck?.should_stop ? 'similarity_warning' : 'part1_completed'
  });

  return {
    taskId,
    stage: 'part1',
    status: geminiResult.similarityCheck?.should_stop ? 'similarity_warning' : 'part1_completed',
    analysis: rawAnalysis,
    structuredAnalysis: structured,
    naturalLanguage: geminiResult.naturalLanguage,
    similarityCheck: geminiResult.similarityCheck || null
  };
}

export async function analyzePart2({ taskId, sourceFile, targetFile }) {
  if (!taskId) {
    throw new Error('taskId 为必填项');
  }

  logger.info('触发阶段二分析', {
    taskId,
    hasNewSource: Boolean(sourceFile),
    hasNewTarget: Boolean(targetFile)
  });

  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error('未找到对应的任务，请先执行阶段一分析');
  }

  const sourceDataUrl = sourceFile ? toDataUrl(sourceFile) : task.source_image_data;
  const targetDataUrl =
    targetFile ? toDataUrl(targetFile) : task.target_image_data || null;

  const storedImageInfo = task.gemini_result?.analysis_meta?.image_info || {};
  const sourceMeta = sourceFile
    ? await extractMetadataSafely({
        taskId,
        role: 'source',
        size: sourceFile.size,
        buffer: sourceFile.buffer
      })
    : storedImageInfo.source || null;
  const targetMeta = targetFile
    ? await extractMetadataSafely({
        taskId,
        role: 'target',
        size: targetFile.size,
        buffer: targetFile.buffer
      })
    : storedImageInfo.target || null;

  const workflowDraft = task.workflow_draft || task.gemini_result?.workflow_draft || [];
  const part1Summary = task.part1_summary || task.natural_language_part1 || '';

  const geminiResult = await analyzeWithGemini({
    stage: 'part2',
    sourceImageDataUrl: sourceDataUrl,
    targetImageDataUrl: targetDataUrl,
    sourceMeta,
    targetMeta,
    context: {
      workflowDraft,
      part1Summary
    }
  });

  if (geminiResult.similarityCheck?.should_stop) {
    logger.warn('阶段二相似性检测触发中止', { taskId, similarity: geminiResult.similarityCheck });
    return {
      taskId,
      stage: 'part2',
      status: 'similarity_warning',
      similarityCheck: geminiResult.similarityCheck
    };
  }

  const rawAnalysis = geminiResult.analysis || {};
  const mapping = buildMappingFromAnalysis(rawAnalysis);
  const structured = formatAnalysisResult({
    stage: 'part2',
    rawAnalysis,
    naturalLanguage: geminiResult.naturalLanguage || '',
    colorMapping: mapping
  });
  if (rawAnalysis.composition) {
    reportMissingSections(structured);
  }

  await saveTask({
    id: taskId,
    sourceImageData: sourceDataUrl,
    targetImageData: targetDataUrl,
    geminiResult: rawAnalysis,
    structuredResult: structured,
    mappingResult: mapping,
    workflowFinal: rawAnalysis.workflow_final || rawAnalysis.workflow_steps || [],
    workflowAlignmentNotes: rawAnalysis.workflow_alignment_notes || [],
    naturalLanguagePart2: geminiResult.naturalLanguage,
    part2Completed: 1,
    status: 'completed'
  });

  logger.info('阶段二分析完成', { taskId });

  return {
    taskId,
    stage: 'part2',
    status: 'completed',
    analysis: rawAnalysis,
    structuredAnalysis: structured,
    mapping,
    naturalLanguage: geminiResult.naturalLanguage
  };
}

export async function analyzeCombined({ sourceFile, targetFile }) {
  if (!sourceFile) {
    throw new Error('sourceImage 为必填项');
  }

  logger.info('触发整合分析', {
    hasTarget: Boolean(targetFile),
    sourceSize: sourceFile.size,
    targetSize: targetFile?.size
  });

  const taskId = uuidv4();
  const sourceDataUrl = toDataUrl(sourceFile);
  const targetDataUrl = toDataUrl(targetFile);

  logger.info('图像已转换为 DataURL', {
    taskId,
    sourceLength: sourceDataUrl?.length,
    targetLength: targetDataUrl?.length
  });

  const sourceMeta = await extractMetadataSafely({
    taskId,
    role: 'source',
    size: sourceFile.size,
    buffer: sourceFile.buffer
  });
  const targetMeta = targetFile
    ? await extractMetadataSafely({
        taskId,
        role: 'target',
        size: targetFile.size,
        buffer: targetFile.buffer
      })
    : null;

  // 在调用 Gemini 之前记录日志，便于排查挂起问题
  logger.info('即将进入 Gemini 综合分析', {
    taskId,
    stage: 'combined',
    sourceDimensions: sourceMeta?.dimensions,
    targetDimensions: targetMeta?.dimensions
  });

  const geminiResult = await analyzeWithGemini({
    stage: 'combined',
    sourceImageDataUrl: sourceDataUrl,
    targetImageDataUrl: targetDataUrl,
    sourceMeta,
    targetMeta
  });

  const rawAnalysis = geminiResult.analysis || {};
  const mapping = buildMappingFromAnalysis(rawAnalysis);
  const structured = formatAnalysisResult({
    stage: 'combined',
    rawAnalysis,
    naturalLanguage: geminiResult.naturalLanguage || '',
    colorMapping: mapping
  });
  if (rawAnalysis.composition) {
    reportMissingSections(structured);
  }

  await saveTask({
    id: taskId,
    sourceImageData: sourceDataUrl,
    targetImageData: targetDataUrl,
    geminiResult: rawAnalysis,
    structuredResult: structured,
    mappingResult: mapping,
    part1Summary: geminiResult.naturalLanguage,
    workflowDraft: rawAnalysis.workflow_draft || [],
    workflowFinal: rawAnalysis.workflow_final || rawAnalysis.workflow_steps || [],
    workflowAlignmentNotes: rawAnalysis.workflow_alignment_notes || [],
    naturalLanguagePart1: geminiResult.naturalLanguage,
    naturalLanguagePart2: geminiResult.naturalLanguage,
    part2Completed: 1,
    status: geminiResult.similarityCheck?.should_stop ? 'completed' : 'completed'
  });

  logger.info('整合分析完成', {
    taskId,
    status: geminiResult.similarityCheck?.should_stop ? 'similarity_warning' : 'completed'
  });

  return {
    taskId,
    stage: 'combined',
    status: geminiResult.similarityCheck?.should_stop ? 'similarity_warning' : 'completed',
    analysis: rawAnalysis,
    structuredAnalysis: structured,
    mapping,
    naturalLanguage: geminiResult.naturalLanguage,
    similarityCheck: geminiResult.similarityCheck || null
  };
}

async function extractMetadataSafely({ taskId, role, size, buffer }) {
  if (!buffer) return null;

  if (size > META_EXTRACT_LIMIT) {
    logger.warn('图片体积较大，跳过 EXIF 解析', {
      taskId,
      role,
      size
    });
    return {
      skipped: true,
      reason: 'file_size_exceeded_threshold',
      dimensions: null,
      exif: null
    };
  }

  logger.info('开始提取图片元数据', {
    taskId,
    role,
    size
  });
  const meta = await extractImageMeta(buffer);
  logger.info('图片元数据提取完成', {
    taskId,
    role,
    size,
    dimensions: meta?.dimensions
  });
  return meta;
}

