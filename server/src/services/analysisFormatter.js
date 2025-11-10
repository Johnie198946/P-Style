import { logger } from '../utils/logger.js';

/**
 * 分析结果格式化工具
 * 作用：将 Gemini 原始输出整理为 review/composition/lighting/color 等规范结构
 * 注意：不改变原始数据，仅在响应时包装结构化结果
 */

const ADVANCED_SECTION_TEMPLATES = [
  { id: 'structure', title: '画面主结构分析' },
  { id: 'subject', title: '主体位置与视觉权重' },
  { id: 'lines', title: '线条与方向引导' },
  { id: 'space', title: '空间层次与分区' },
  { id: 'ratio', title: '比例与留白' },
  { id: 'balance', title: '视觉平衡与动势' },
  { id: 'style', title: '构图风格归类与改进建议' }
];

const SECTION_TITLE_MAP = {
  structure: '画面主结构分析',
  subject: '主体位置与视觉权重',
  lines: '线条与方向引导',
  space: '空间层次与分区',
  ratio: '比例与留白',
  balance: '视觉平衡与动势',
  style: '构图风格归类与改进建议'
};

const NATURAL_SECTION_REGEX_CACHE = {};

export function formatAnalysisResult({
  stage = 'part1',
  rawAnalysis = {},
  naturalLanguage = '',
  colorMapping = null
}) {
  const review = normalizeReview(rawAnalysis, naturalLanguage);
  const composition = normalizeComposition(rawAnalysis, naturalLanguage);
  const lighting = normalizeLighting(rawAnalysis, naturalLanguage);
  const color = normalizeColor(rawAnalysis);
  const workflow = normalizeWorkflow(rawAnalysis);
  const execution = stage === 'part1' ? null : normalizeExecution(rawAnalysis, colorMapping);
  const meta = normalizeMeta(rawAnalysis, stage);

  return {
    stage,
    naturalLanguage: naturalLanguage || '',
    review,
    composition,
    lighting,
    color,
    workflow,
    execution,
    meta
  };
}

// ---------- 审稿区：规范化各板块 ----------

function normalizeReview(rawAnalysis, naturalLanguage) {
  const review = rawAnalysis.professional_evaluation || {};
  return {
    raw: review,
    intro:
      cleanup(review.summary || review.overall || review.intro) ||
      extractIntroFromNaturalLanguage(naturalLanguage),
    visualGuidance: cleanup(review.visual_guidance),
    focusExposure: cleanup(review.focus_exposure),
    colorDepth: cleanup(review.color_depth),
    compositionExpression: cleanup(review.composition_expression),
    technicalDetails: cleanup(review.technical_details),
    equipment: cleanup(review.equipment_analysis),
    lens: cleanup(review.lens_analysis),
    technique: cleanup(review.shooting_techniques),
    colorPalette: cleanup(review.color_palette),
    emotion: cleanup(review.photo_emotion),
    strengths: ensureArray(review.strengths).map(cleanup),
    comparison: review.comparison || null,
    styleAnalysis: ensureArray(review.style_analysis).map(cleanup),
    colorParameterSummary: ensureArray(review.color_parameter_summary),
    workflowBrief: ensureArray(review.workflow_brief || review.workflow_summary).map(cleanup),
    photographerStyleSummary: cleanup(review.photographer_style_summary)
  };
}

function normalizeComposition(rawAnalysis, naturalLanguage) {
  const compositionRaw = rawAnalysis.composition || {};
  const advancedSections = ensureAdvancedSections(
    compositionRaw.advanced_sections || compositionRaw.advanced,
    naturalLanguage
  );

  return {
    raw: compositionRaw,
    origin: compositionRaw.origin || '',
    sceneType: compositionRaw.scene_type || compositionRaw.type || '',
    focusArea:
      compositionRaw.focus_area ||
      compositionRaw.subject_location ||
      (compositionRaw.location ? compositionRaw.location.subject : ''),
    resolution: compositionRaw.resolution || '',
    avgBrightness: compositionRaw.avg_brightness || '',
    depthOfField: compositionRaw.depth_of_field || '',
    lightDirection: compositionRaw.light_direction || '',
    advancedSections
  };
}

function normalizeLighting(rawAnalysis, naturalLanguage) {
  const lightingRaw = rawAnalysis.lighting || {};
  const fallback = extractLightingFromNaturalLanguage(naturalLanguage);

  return {
    raw: lightingRaw,
    exposureTrend: lightingRaw.exposure_trend || fallback.exposure_trend || '',
    contrastTrend: lightingRaw.contrast_trend || fallback.contrast_trend || '',
    dynamicRange: lightingRaw.dynamic_range || fallback.dynamic_range || '',
    whiteBalance:
      lightingRaw.white_balance || fallback.white_balance || {
        source_trend: '',
        target_trend: '',
        adjust_direction: ''
      },
    keyHandles: ensureArray(lightingRaw.key_handles || fallback.key_handles),
    textureAdjustment: lightingRaw.texture_adjustment || fallback.texture_adjustment || {},
    handles: ensureArray(lightingRaw.handles || fallback.handles),
    postProcessing: ensureArray(lightingRaw.post_processing || fallback.post_processing)
  };
}

function normalizeColor(rawAnalysis) {
  const colorScheme = rawAnalysis.color_scheme || rawAnalysis.color || {};
  return {
    raw: colorScheme,
    dominantPalette: colorScheme.dominant_palette || colorScheme.dominantColors || [],
    temperatureNote: colorScheme.temperature_note || '',
    tintNote: colorScheme.tint_note || '',
    mood: colorScheme.mood || colorScheme.keywords || [],
    details: colorScheme
  };
}

function normalizeWorkflow(rawAnalysis) {
  return {
    draft: ensureArray(rawAnalysis.workflow_draft),
    final:
      ensureArray(rawAnalysis.workflow_final).length > 0
        ? ensureArray(rawAnalysis.workflow_final)
        : ensureArray(rawAnalysis.workflow_steps),
    alignment: ensureArray(rawAnalysis.workflow_alignment_notes)
  };
}

function normalizeExecution(rawAnalysis, colorMapping) {
  return {
    colorScheme: rawAnalysis.color_scheme || rawAnalysis.color || {},
    lightroom: rawAnalysis.lightroom || {},
    lightroomPanels: ensureArray(rawAnalysis.lightroom_panels),
    lightroomLocalAdjustments: ensureArray(rawAnalysis.lightroom_local_adjustments),
    photoshop: rawAnalysis.photoshop || {},
    workflowSteps: ensureArray(rawAnalysis.workflow_steps),
    colorMapping: colorMapping || null
  };
}

function normalizeMeta(rawAnalysis, stage) {
  const analysisMeta = rawAnalysis.analysis_meta || {};
  return {
    stage,
    dataOrigin: analysisMeta.data_origin || {},
    notes: ensureArray(analysisMeta.notes),
    conversionFeasibility: analysisMeta.conversion_feasibility || null,
    parameterInterpretation: analysisMeta.parameter_interpretation || {},
    imageInfo: analysisMeta.image_info || {},
    raw: analysisMeta
  };
}

// ---------- 工具函数 ----------

function ensureAdvancedSections(rawSections, naturalLanguage) {
  const mapByTitle = new Map();

  if (Array.isArray(rawSections)) {
    rawSections.forEach((section) => {
      if (section && section.title) {
        mapByTitle.set(section.title.trim(), cleanup(section.content || section.text || ''));
      }
    });
  } else if (rawSections && typeof rawSections === 'object') {
    Object.entries(rawSections).forEach(([key, value]) => {
      if (!value) return;
      const title = SECTION_TITLE_MAP[key] || key;
      if (typeof value === 'string') {
        mapByTitle.set(title.trim(), cleanup(value));
      } else if (value && typeof value === 'object') {
        mapByTitle.set(title.trim(), cleanup(value.content || value.text || ''));
      }
    });
  }

  const naturalSections = extractAdvancedSectionsFromNaturalLanguage(naturalLanguage);
  naturalSections.forEach(({ title, content }) => {
    if (!mapByTitle.has(title) && content) {
      mapByTitle.set(title, content);
    }
  });

  return ADVANCED_SECTION_TEMPLATES.map(({ title }) => ({
    title,
    content: mapByTitle.get(title) || ''
  }));
}

function extractAdvancedSectionsFromNaturalLanguage(naturalLanguage) {
  if (!naturalLanguage) return [];
  const text = naturalLanguage.replace(/\r\n/g, '\n');

  return ADVANCED_SECTION_TEMPLATES.map(({ title }) => {
    const content = extractSectionBlock(text, title);
    return { title, content: cleanup(content) };
  }).filter((item) => item.content);
}

function extractSectionBlock(text, label) {
  const cacheKey = `section-${label}`;
  if (!NATURAL_SECTION_REGEX_CACHE[cacheKey]) {
    NATURAL_SECTION_REGEX_CACHE[cacheKey] = new RegExp(
      `(?:^|\n)(?:【${label}】|${label}[：:]|\*\*${label}[^\n]*\*\*)[\s\n]*([^]+?)(?=\n【|\n\*\*|\n[1-7]️⃣|$)`,
      'i'
    );
  }
  const regex = NATURAL_SECTION_REGEX_CACHE[cacheKey];
  const match = regex.exec(text);
  if (!match) return '';
  return match[1] || '';
}

function extractLightingFromNaturalLanguage(naturalLanguage) {
  if (!naturalLanguage) return {};
  const block = extractSectionBlock(naturalLanguage, '光影参数');
  if (!block) return {};

  const lines = block
    .split('\n')
    .map((line) => line.replace(/^[\s>*-]+/, '').trim())
    .filter(Boolean);

  const findLine = (keyword) => {
    const item = lines.find((line) => line.startsWith(keyword));
    if (!item) return '';
    return item.split(/[:：]/).slice(1).join(':').trim();
  };

  return {
    exposure_trend: findLine('曝光') || '',
    contrast_trend: findLine('对比') || '',
    dynamic_range: findLine('动态范围') || '',
    white_balance: {
      source_trend: findLine('源图白平衡') || '',
      target_trend: findLine('目标图白平衡') || '',
      adjust_direction: findLine('调整方向') || ''
    },
    key_handles: [],
    texture_adjustment: {},
    handles: [],
    post_processing: []
  };
}

function extractIntroFromNaturalLanguage(naturalLanguage) {
  if (!naturalLanguage) return '';
  const cleaned = naturalLanguage.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return '';
  const stepIndex = cleaned.search(/Step\s*[一1]/i);
  const intro = stepIndex > 0 ? cleaned.slice(0, stepIndex) : cleaned;
  return intro
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('\n');
}

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanup(value) {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);
  return value.replace(/\s+$/g, '').trim();
}

/**
 * 由于自然语言解析失败可能导致字段缺失，这里提供统一告警
 */
export function reportMissingSections(structuredResult) {
  const missing = [];
  structuredResult.composition.advancedSections.forEach((section) => {
    if (!section.content) {
      missing.push(section.title);
    }
  });
  if (missing.length) {
    logger.warn('构图高级段落缺失，已填充空值', { missingSections: missing });
    const note = `构图分析缺失段落：${missing.join('、')}`;
    const notes = new Set(ensureArray(structuredResult.meta.notes));
    notes.add(note);
    structuredResult.meta.notes = Array.from(notes);
  }
}
