import { buildMappingFromAnalysis } from './colorMappingService.js';

export function buildJsonExport(task) {
  const mapping = task.mapping_result || buildMappingFromAnalysis(task.gemini_result || {});
  return JSON.stringify(
    {
      taskId: task.id,
      status: task.status,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      part1Summary: task.part1_summary || task.natural_language_part1,
      analysis: task.gemini_result,
      mapping
    },
    null,
    2
  );
}

export function buildXmpExport(task) {
  const mapping = task.mapping_result || buildMappingFromAnalysis(task.gemini_result || {});
  const lr = mapping.lightroom?.summary || {};

  const entry = (tag, value, fallback = '+0.00') =>
    value !== undefined && value !== null
      ? `<crs:${tag}>${value}</crs:${tag}>`
      : `<crs:${tag}>${fallback}</crs:${tag}>`;

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="QuantaNova PhotoStyle Clone">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/">
      ${entry('Exposure2012', lr.exposure)}
      ${entry('Contrast2012', lr.contrast, '+0')}
      ${entry('Highlights2012', lr.highlights, '+0')}
      ${entry('Shadows2012', lr.shadows, '+0')}
      ${entry('Whites2012', lr.whites, '+0')}
      ${entry('Blacks2012', lr.blacks, '+0')}
      ${entry('Temperature', lr.temperature, '+0')}
      ${entry('Tint', lr.tint, '+0')}
      ${entry('Texture', lr.texture, '+0')}
      ${entry('Clarity2012', lr.clarity, '+0')}
      ${entry('Dehaze', lr.dehaze, '+0')}
      ${entry('Vibrance', lr.vibrance, '+0')}
      ${entry('Saturation', lr.saturation, '+0')}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`;
}

export function buildJsxExport(task) {
  const mapping = task.mapping_result || buildMappingFromAnalysis(task.gemini_result || {});
  const steps = mapping.photoshop?.steps || [];

  const lines = steps
    .map((step, index) => {
      const params = (step.params || []).map(
        (param) => `        logStep("${param.name || '参数'}", "${param.value || ''}");`
      );
      return `      runStep(${index + 1}, "${step.title.replace(/"/g, '""')}", "${(step.description || '').replace(/"/g, '""')}");
${params.join('\n')}`;
    })
    .join('\n\n');

  return `#target photoshop
app.bringToFront();

function runStep(order, title, description) {
  $.writeln("\\n步骤 " + order + ": " + title);
  if (description) {
    $.writeln("说明: " + description);
  }
}

function logStep(label, value) {
  if (!value) return;
  $.writeln("  - " + label + ": " + value);
}

function main() {
  $.writeln("=== QuantaNova PhotoStyle Clone 执行方案 ===");
${lines || '  $.writeln("未检测到详细步骤，请参考分析报告手动执行。");'}
  $.writeln("\\n指导完成，请结合分析报告检查最终效果。");
}

main();`;
}





