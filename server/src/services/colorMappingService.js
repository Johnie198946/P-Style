const DEFAULT_STEP = {
  title: '占位步骤',
  description: '请根据分析结果补充详细步骤',
  params: []
};

export function buildMappingFromAnalysis(analysis = {}) {
  const {
    lightroom = {},
    lightroom_panels = [],
    lightroom_local_adjustments = [],
    photoshop = {},
    color_scheme = {},
    workflow_steps = []
  } = analysis;

  return {
    lightroom: {
      summary: lightroom,
      panels: normaliseArray(lightroom_panels),
      localAdjustments: normaliseArray(lightroom_local_adjustments)
    },
    photoshop: {
      summary: photoshop,
      curves: photoshop.curves || {},
      masks: normaliseArray(photoshop.masks),
      steps: ensureStepsArray(photoshop.steps)
    },
    colorScheme: color_scheme || {},
    workflow: normaliseArray(workflow_steps)
  };
}

function normaliseArray(maybeArray) {
  if (!maybeArray) return [];
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}

function ensureStepsArray(steps) {
  const normalized = normaliseArray(steps);
  if (!normalized.length) {
    return [DEFAULT_STEP];
  }
  return normalized.map((step) => ({
    title: step.title || DEFAULT_STEP.title,
    description: step.description || DEFAULT_STEP.description,
    params: normaliseArray(step.params || step.parameters)
  }));
}





