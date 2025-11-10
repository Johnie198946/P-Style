import { ProxyAgent, fetch } from 'undici';
import { ENV } from '../config/env.js';
import { APP_CONFIG } from '../config/appConfig.js';
import { buildPart1Prompt, buildPart2Prompt, buildPromptByStage } from './promptTemplate.js';
import { stripDataUrl, guessMimeFromDataUrl } from '../utils/file.js';
import { safeJsonParse } from '../utils/json.js';
import { AsyncQueue } from '../utils/asyncQueue.js';
import { logger } from '../utils/logger.js';

const queue = new AsyncQueue();
let proxyAgent = null;

function configureProxy() {
  if (!ENV.HTTPS_PROXY) return;
  proxyAgent = new ProxyAgent({
    uri: ENV.HTTPS_PROXY,
    connect: {
      timeout: 30000
    }
  });
  globalThis.fetch = (url, options = {}) => {
    const dispatcher = options.dispatcher || proxyAgent;
    return fetch(url, { ...options, dispatcher });
  };
  logger.info('已启用代理访问 Gemini:', ENV.HTTPS_PROXY);
}

configureProxy();

export async function analyzeWithGemini({
  stage = 'combined',
  sourceImageDataUrl,
  targetImageDataUrl,
  sourceMeta = {},
  targetMeta = {},
  context = {}
}) {
  if (!ENV.GEMINI_API_KEY) {
    throw new Error('Gemini API Key 未配置，请设置 GEMINI_API_KEY 环境变量。');
  }

  logger.info('分析任务启动', {
    stage,
    hasTarget: Boolean(targetImageDataUrl),
    model: ENV.GEMINI_MODEL
  });

  const prompt = selectPrompt(stage, {
    hasTargetImage: Boolean(targetImageDataUrl),
    sourceExif: sourceMeta?.exif,
    targetExif: targetMeta?.exif,
    workflowDraft: context.workflowDraft,
    part1Summary: context.part1Summary
  });

  const contentParts = buildContentParts({
    sourceImageDataUrl,
    targetImageDataUrl,
    prompt
  });

  const text = await queue.enqueue(() =>
    callGeminiWithRetry(contentParts, APP_CONFIG.geminiMaxAttempts)
  );

  const parsed = parseGeminiResponse(text, stage);
  enrichAnalysisMeta(parsed.analysis, { sourceMeta, targetMeta, stage });

  return parsed;
}

function selectPrompt(stage, options) {
  if (stage === 'part1') {
    return buildPart1Prompt(options);
  }
  if (stage === 'part2') {
    return buildPart2Prompt(options);
  }
  return buildPromptByStage({ ...options, stage: 'combined' });
}

function buildContentParts({ sourceImageDataUrl, targetImageDataUrl, prompt }) {
  const parts = [];

  if (sourceImageDataUrl) {
    parts.push({
      inline_data: {
        data: stripDataUrl(sourceImageDataUrl),
        mime_type: guessMimeFromDataUrl(sourceImageDataUrl)
      }
    });
  }

  if (targetImageDataUrl) {
    parts.push({
      inline_data: {
        data: stripDataUrl(targetImageDataUrl),
        mime_type: guessMimeFromDataUrl(targetImageDataUrl)
      }
    });
  }

  parts.push({ text: prompt });
  return parts;
}

async function callGeminiWithRetry(content, maxAttempts) {
  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    attempt += 1;
    logger.info(`Gemini 调用开始`, { attempt, model: ENV.GEMINI_MODEL });
    try {
      const text = await callGeminiWithTimeout(() => invokeGemini(content));
      logger.info(`Gemini 调用成功`, { attempt });
      return text;
    } catch (error) {
      lastError = error;
      const message = error?.message || '';
      const isTimeout = error?.code === 'GEMINI_TIMEOUT';
      const retryable =
        !isTimeout && /429|Resource exhausted|fetch failed|ENOTFOUND/i.test(message);

      logger.warn(`Gemini 调用失败（第 ${attempt} 次）: ${message}`);
      if (!retryable || attempt >= maxAttempts) {
        break;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  throw lastError || new Error('Gemini 调用失败');
}

async function callGeminiWithTimeout(fn) {
  const timeoutMs = APP_CONFIG.geminiTimeoutMs;
  if (!timeoutMs || Number.isNaN(timeoutMs) || timeoutMs <= 0) {
    return fn();
  }

  let timeoutId;
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const error = new Error(
            `Gemini 调用超过 ${Math.round(timeoutMs / 1000)} 秒未响应，已自动终止。`
          );
          error.code = 'GEMINI_TIMEOUT';
          error.status = 504;
          reject(error);
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function invokeGemini(parts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ENV.GEMINI_MODEL}:generateContent`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': ENV.GEMINI_API_KEY
    },
    dispatcher: proxyAgent || undefined,
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage =
      data?.error?.message ||
      data?.error?.status ||
      `Gemini 调用失败，状态码 ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const text =
    data?.candidates
      ?.flatMap((candidate) =>
        candidate?.content?.parts
          ?.map((part) => part?.text)
          ?.filter((segment) => typeof segment === 'string' && segment.length > 0)
      )
      ?.filter(Boolean)
      ?.join('\n') || '';

  if (!text) {
    throw new Error('Gemini 返回内容为空或不包含文本信息。');
  }

  return text;
}

function parseGeminiResponse(text, stage) {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  let jsonText = null;
  let naturalLanguage = trimmed;

  if (jsonMatch) {
    jsonText = jsonMatch[1];
    naturalLanguage = trimmed.slice(0, jsonMatch.index).trim();
  } else {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = trimmed.slice(firstBrace, lastBrace + 1);
      naturalLanguage = trimmed.slice(0, firstBrace).trim();
    }
  }

  if (!jsonText) {
    throw new Error('未能在 Gemini 响应中找到 JSON 结果。');
  }

  const analysis = safeJsonParse(jsonText);
  const similarityCheck = extractSimilarityCheck(analysis);

  if (shouldStopForSimilarity(similarityCheck)) {
    return {
      stage,
      analysis,
      naturalLanguage,
      similarityCheck,
      rawText: text
    };
  }

  if (stage === 'part2' && (!analysis.lightroom || !analysis.photoshop)) {
    logger.warn('阶段二缺少完整的 Lightroom 或 Photoshop 区块，Prompt 可能需要调整。');
  }

  return {
    stage,
    analysis,
    naturalLanguage,
    similarityCheck: similarityCheck || null,
    rawText: text
  };
}

function extractSimilarityCheck(analysis) {
  if (!analysis) return null;
  if (analysis.similarity_check) {
    return analysis.similarity_check;
  }
  if (analysis.similarityCheck) {
    return analysis.similarityCheck;
  }
  return null;
}

function shouldStopForSimilarity(similarityCheck) {
  if (!similarityCheck || typeof similarityCheck !== 'object') return false;
  const level =
    similarityCheck.similarity_level ||
    similarityCheck.similarityLevel ||
    similarityCheck.level;
  const shouldStop =
    similarityCheck.should_stop === true ||
    similarityCheck.shouldStop === true;
  return shouldStop || APP_CONFIG.similarityStopLevels.includes(level);
}

function enrichAnalysisMeta(analysis, { sourceMeta, targetMeta, stage }) {
  if (!analysis) return;
  analysis.analysis_meta = analysis.analysis_meta || {};
  analysis.analysis_meta.image_info = {
    source: sourceMeta,
    target: targetMeta
  };
  analysis.analysis_meta.stage = stage;
}

