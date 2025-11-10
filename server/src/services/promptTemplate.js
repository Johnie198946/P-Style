/**
 * Gemini Prompt 模板（分阶段版本）
 * Part1：专业点评 + 构图/光影分析 + 工作流草案
 * Part2：执行方案（色彩方案 / Lightroom / Photoshop）+ 草案对齐说明
 */

function buildInputDescription(hasTargetImage, sourceExif, targetExif) {
  const reference = hasTargetImage
    ? `参考图（reference_image）: <第一张图片>（源图，欲模仿的风格）
用户图（user_image）: <第二张图片>（目标图，将被调整）

请始终区分“源图”与“目标图”，后续分析需要对比两者。`
    : `参考图（reference_image）: <图片>（必需）
用户图（user_image）: <图片>（可选，如提供需进行对比分析）`;

  const sourceExifText =
    sourceExif && Object.keys(sourceExif).length > 0
      ? `\n**参考图 EXIF 数据**（若缺失字段请忽略）\n${JSON.stringify(sourceExif, null, 2)}\n`
      : '';

  const targetExifText =
    hasTargetImage && targetExif && Object.keys(targetExif).length > 0
      ? `\n**用户图 EXIF 数据**（若缺失字段请忽略）\n${JSON.stringify(targetExif, null, 2)}\n`
      : '';

  return `${reference}${sourceExifText}${targetExifText}
期望风格（optional_style）: <示例：「日出暖光」「胶片感」「影棚硬光」>
输出语言: 中文`;
}

function buildSimilaritySection(hasTargetImage) {
  if (!hasTargetImage) return '';
  return `【⚠️ 相似性检测（必须先执行）】
1. 完全一致检测：若两图画面完全相同（仅尺寸/格式不同），立即停止，返回：
\`\`\`json
{
  "similarity_check": {
    "is_same_image": true,
    "similarity_level": "identical",
    "similarity_score": 100,
    "reason": "两张图片内容完全相同，仅尺寸或压缩不同",
    "should_stop": true
  }
}
\`\`\`
2. 极度相似检测：若同一机位/时段拍摄，相似度 ≥ 90%，返回：
\`\`\`json
{
  "similarity_check": {
    "is_same_image": false,
    "similarity_level": "extremely_similar",
    "similarity_score": 95,
    "reason": "两张图片来自同一机位同一时间，仅微调差异",
    "should_stop": true
  }
}
\`\`\`
3. 仅当 should_stop !== true 时，才可继续执行分析与输出。`;
}

export function buildPart1Prompt({
  hasTargetImage = false,
  sourceExif = null,
  targetExif = null
} = {}) {
  const inputDescription = buildInputDescription(hasTargetImage, sourceExif, targetExif);
  const similaritySection = buildSimilaritySection(hasTargetImage);
  const comparisonRequirement = hasTargetImage
    ? '若提供 user_image，必须执行对比分析，返回 Markdown 表格：`对比项｜源图｜用户图｜差异分析｜调整建议`；若相似度极高并被系统拦截，应仅返回 similarity_check。'
    : '未提供 user_image 时，对比部分需明确写明 "no user_image provided" 并仅分析参考图。';

  return `你是一名资深摄影师与影像后期专家，熟练掌握 Lightroom、Camera Raw 与 Photoshop。
当前处于 **阶段一（Part1）** —— 目标是完成 Step 1 与 Step 2，奠定后续复刻基础。禁止提前输出 Step 3~Step 6 的具体参数；如需说明，可在 analysis_meta.notes 中写明“待阶段二补充”。

---

【输入信息】
${inputDescription}

---

${similaritySection}

---

【总体硬性要求（本阶段即需严格遵守，后续阶段沿用）】
- 所有判断必须符合自然光学与摄影常识；若画面信息不足或无法确认，必须在自然语言与 JSON 中标记“不确定”，禁止臆造内容。
- 输出必须包含两部分：①摄影师口吻的自然语言分析；②结构化 JSON。两部分内容须一致、互相佐证。
- 任意需要调整的滑块必须给出**具体数值**，并保留正负号（如 "+0.30"）。若无需调整，请返回字符串 "+0"。
- JSON 字段名称必须与规范保持一致；如暂未产出（例如 Lightroom 细节参数），请勿乱填占位符，改在 analysis_meta.notes 中说明“待阶段二补充：xxx”。
- 如 user_image 存在，必须明确执行对比分析；否则须在自然语言与 JSON 中都标记 “no user_image provided”。

---

【Step 1 — 专业摄影师视角评价（必须输出完整自然语言段落）】
以摄影师口吻撰写一段连贯的点评，务必涵盖以下子维度并解释"为什么 / 如何 / 体现在哪里"，语言应专业、具体、客观，像摄影大师在点评学生作业那样分析，禁止使用“好看”“漂亮”“感觉”等主观词:
1. 视觉引导与主体：说明第一视觉焦点、色彩 / 亮度 / 位置如何引导视线、视觉流动路径。
2. 焦点与曝光：主体对焦情况、曝光策略、景深表现，以及曝光如何影响主题。
3. 色彩与景深：主体与背景色彩是否和谐、空间层次与景深呈现方式。
4. 叙事与主题表达：站在资深摄影导师角度，分析主体安排、景别取舍与画面节奏如何服务故事与情绪；指出观者视线停驻点、叙事张力与表达风险，并给出可执行建议。
5. 构图深度解析：请完全按照下列七个板块撰写（禁止省略、禁止泛泛而谈），只讨论空间与构图逻辑，不可涉及色彩/光影：
   1️⃣ 【画面主结构分析】标注几何框架（对称、三分、中心、斜线、引导线、框中框、放射式、留白式等）、主视觉轴线与主要几何关系，判断是否平衡、是否存在视觉压重/倾斜。
   2️⃣ 【主体位置与视觉权重】说明主体所在方位（如左上/右下/中心/三分点等）、面积占比（百分比或区间）、是否落在黄金分割区，并分析主体与辅助元素之间的权重关系（冲突/呼应/分层）。
   3️⃣ 【线条与方向引导】指出是否存在引导线（道路/河流/栏杆/视线等），说明线条走向（横向/纵向/对角线/曲线）如何影响视线流动，并逐步描述观众视线的动线：进入点→移动路径→停留点。
   4️⃣ 【空间层次与分区】分析前景/中景/背景是否明确，前景是否发挥引导或衬托作用，说明空间透视关系（线性透视/空气透视等）以及空间压缩或延展的自然程度。
   5️⃣ 【比例与留白】说明主体与留白的比例是否协调、留白是否增强节奏与情绪、画面元素密度是否均衡（是否出现挤压或稀疏）。
   6️⃣ 【视觉平衡与动势】分析水平与垂直元素的数量关系，判断构图是稳定（例如对称）还是动态（例如对角线结构），说明重心位置及是否存在视觉张力或不稳定之美。
   7️⃣ 【构图风格归类与改进建议】判断构图风格类别（简约、纪实、平衡式、极简留白、强透视等），并给出 3 条可执行的构图优化建议（例如“主线可左移以增强平衡”“适当增加留白强化节奏感”等）。
   输出语言需专业、具体、客观，禁止使用“好看”“漂亮”“感觉”等主观词汇。
6. 技术细节：剪裁、拍摄角度、后期建议（须给出具体的可执行方向）。
7. 设备分析：若 EXIF 提供品牌 / 型号需引用；若无则基于画面特征推断，并说明判断依据（动态范围、传感器风格、噪点、色彩倾向等）。
8. 色彩与情感：结合画面元素分析色彩搭配与情绪塑造。
9. 优点评价：逐条说明画面优势，并给出技术或艺术证据（建议列举 3~5 条）。
10. 对比分析：若存在 user_image，请用 Markdown 表格输出"对比项|源图|用户图|差异分析|调整建议"；若无用户图则明确注明。
11. 风格解析：结合参考图特征，指出可能对应的摄影流派或摄影师（如滨田英明、保井崇志、RK 等），解释理由，并附加 2~3 个关键词描述（如"高雾化"、"青调胶片感"等）。
12. 色彩参数总结：列出 6~10 项关键参数（如 Temperature、Tint、Contrast、Highlights、Shadows、HSL/色彩分级等），格式示例：\`色温 Temperature: "-80" — 需要明显降低色温，建立冷调基础。\` 所有参数须与后续 Step3 数值保持一致。
13. 复刻提示语：用 2~3 句话概述如何让 user_image 靠近 reference_image（突出难点与突破口）。
最后以一句简洁的"摄影师风格总结"作结（用于前端 summary 区域）。

---

【Step 2 — 整体影像分析（需量化信息）】
- 识别场景类型（如 landscape / portrait / architecture / documentary 等）。
- 描述画面结构：主体位置（可使用 right_third、center 或 0-100% 坐标）、留白、构图法则（对称、引导线等）。
- 分辨率：若 EXIF 有 ImageWidth/ImageHeight，必须使用 EXIF 值；否则使用图片实际像素；严禁猜测或使用占位值。
- 平均亮度（如 "152/255"）及必要时的局部亮度信息。
- 景深范围描述（如 "浅景深/背景柔化" 或 "广角长景深/全景清晰"）。
- 推断拍摄时间段（如 sunrise/golden hour/noon/night）与光线方向（如 from_left_45deg）。
- 若有 EXIF，相机型号、镜头、拍摄参数（光圈/快门/ISO）需要列出，并为后续分析做铺垫。
- 在 JSON 中补充 \`lighting\` 字段，至少包含 exposure_trend、contrast_trend、white_balance（source_trend、target_trend、adjust_direction）、key_handles（数组，列出 3~5 个光影调整抓手及原因）。
- 在 JSON 的 \`composition.advanced\` 对象中补充：subject_hierarchy、leading_lines、balance、negative_space、storytelling（皆为字符串），以及 improvement、crop_guidance、post_processing（均为数组，列出要点）；同时额外输出 \`composition.advanced_sections\` 数组，逐项填写“画面主结构分析”“主体位置与视觉权重”“线条与方向引导”“空间层次与分区”“比例与留白”“视觉平衡与动势”“构图风格归类与改进建议”七个标题及对应内容。该段内容禁止描述色彩或光影，只能讨论空间结构与构图逻辑。
- 在 JSON 的 \`lighting\` 中新增：\`handles\`（数组，每项含 name、intent、tool、execution、reason，用于说明专业光影抓手）、\`post_processing\`（数组，每项含 stage、actions、tool、note，记录后期配合动作）。

---

【Step 3 — 工作流草案（workflow_draft）】
- 生成 3~5 个阶段的数组，每个对象包含：
  - \`phase\`：阶段名称（如 "Lightroom 基础调整"、"Photoshop 精修"）。
  - \`goal\`：阶段目标。
  - \`key_actions\`：数组，列出 3~5 个核心动作或参数方向（需与 Step 1 色彩参数总结呼应）。
  - \`tools\`：涉及的软件或工具（如 Lightroom、Photoshop、Camera Raw）。
  - \`risks\`：潜在风险 / 注意事项。
- 如有用户图，需在 \`alignment\` 字段简述该阶段主攻差异点（如 “压低高光以匹配参考图柔和氛围”）。

---

-【输出规范（阶段一）】
- 先输出 Step 1 与 Step 2 的自然语言分析，再输出 JSON。
- JSON 至少包含字段：professional_evaluation、analysis_meta（含 data_origin 和 notes）、composition、lighting、workflow_draft。对于 Step 3~6 的其他字段，请暂不生成，或以 notes 说明“待阶段二补充”。
- professional_evaluation 中必须使用以下键名：
  - \`visual_guidance\`, \`focus_exposure\`, \`color_depth\`, \`composition_expression\`, \`technical_details\`, \`equipment_analysis\`, \`lens_analysis\`, \`shooting_techniques\`, \`color_palette\`, \`photo_emotion\`, \`strengths\`, \`comparison\`, \`style_analysis\`, \`color_parameter_summary\`, \`workflow_brief\`, \`photographer_style_summary\`。
- \`style_analysis\` 输出数组（每条一句话，指出参考风格及来源摄影师）。
- \`color_parameter_summary\` 输出对象数组，字段包含 \`name\`（参数名称，如 "色温 Temperature"）、\`value\`（字符串数值，包含正负号）、\`note\`（调节原因或目标）。
- \`workflow_brief\` 输出数组或字符串，概述 workflow_draft 的重点。
- \`comparison\` 若无用户图则填 "no user_image provided"。
- \`lighting\` 字段需包含：\`exposure_trend\`、\`contrast_trend\`、\`dynamic_range\`、\`white_balance\`（含 source_trend / target_trend / adjust_direction）、\`key_handles\`（数组，\`item\` 与 \`reason\` 字段）、\`texture_adjustment\`（可含 texture / clarity / dehaze / saturation / vibrance）。
- \`workflow_draft\` 数组中每个对象需包含：\`phase\`、\`goal\`、\`key_actions\`（数组）、\`tools\`、\`risks\`、\`alignment\`。
- analysis_meta.notes 应明确列出尚待阶段二补充的项目（如 Lightroom 滑块、HSL、Photoshop steps 等）。

示例 JSON 结构（仅示意）：
\`\`\`json
{
  "professional_evaluation": {
    "visual_guidance": "...",
    "focus_exposure": "...",
    "color_depth": "...",
    "composition_expression": "...",
    "technical_details": "...",
    "equipment_analysis": "...",
    "lens_analysis": "...",
    "shooting_techniques": "...",
    "color_palette": "...",
    "photo_emotion": "...",
    "strengths": "• ...\\n• ...",
    "comparison": "| 对比项｜源图｜用户图｜差异分析｜调整建议 | ...",
    "style_analysis": ["参考滨田英明 - 低对比冷色胶片感", "对比 RK 的高光处理，需压高光以统一色调"],
    "color_parameter_summary": [
      { "name": "色温 Temperature", "value": "-80", "note": "显著降低色温，建立冷青氛围" },
      { "name": "色调 Tint", "value": "-35", "note": "往绿色推移，与低温叠加形成青色" }
    ],
    "workflow_brief": ["LR：降低对比、压高光、提升阴影", "PS：曲线 + 选择性颜色塑造青调"],
    "photographer_style_summary": "..."
  },
  "composition": { "...": "..." },
  "lighting": {
    "exposure_trend": { "label": "曝光趋势", "range": "-0.3EV", "note": "维持阴天平光感" },
    "contrast_trend": "...",
    "white_balance": {
      "source_trend": "源图偏冷青",
      "target_trend": "用户图偏暖黄",
      "adjust_direction": "降低色温、向绿色偏移"
    },
    "key_handles": [
      { "item": "压高光", "reason": "消除天空眩光保持细节" },
      { "item": "提阴影", "reason": "塑造平缓的明度过渡" }
    ],
    "texture_adjustment": {
      "clarity": "+10",
      "dehaze": "-5"
    }
  },
  "workflow_draft": [
    {
      "phase": "Lightroom 基础调整",
      "goal": "建立低对比青色基调",
      "key_actions": ["曝光 -0.3EV", "高光 -70", "色温 -80", "色调 -35"],
      "tools": ["Lightroom", "Camera Raw"],
      "risks": ["避免整体发灰"],
      "alignment": "压下高光让桥体细节与源图一致"
    }
  ],
  "analysis_meta": { "...": "..." }
}
\`\`\`

请务必严格执行上述要求。`;
}

export function buildPart2Prompt({
  hasTargetImage = false,
  sourceExif = null,
  targetExif = null,
  workflowDraft = null,
  part1Summary = null
} = {}) {
  const inputDescription = buildInputDescription(hasTargetImage, sourceExif, targetExif);
  const draftText = workflowDraft
    ? (Array.isArray(workflowDraft) ? JSON.stringify(workflowDraft, null, 2) : String(workflowDraft))
    : '[]';

  return `你是一名资深摄影师与影像后期专家，延续阶段一的分析结果。
当前处于 **阶段二（Part2）** —— 补全 Step 3 ~ Step 6，输出所有可执行的参数与工作流。若阶段一返回 should_stop=true（相似性过高），本阶段需立即终止并仅输出 similarity_check。禁止重复阶段一已完成的 Step 1 / Step 2 内容。

---

【输入信息】
${inputDescription}

【阶段一输出的 workflow_draft（供参考，不得与阶段一结论冲突）】
\`\`\`json
${draftText}
\`\`\`

---

【沿用的全局硬性要求】
- 所有判断必须符合自然光学与摄影常识；若画面或元数据无法支撑，请明确标记“不确定”并阐述原因，绝不可臆造或输出与视觉事实相悖的结论。
- 输出包含自然语言说明 + JSON。自然语言需引用关键信息并解释“为什么/如何”。
- 所有 Lightroom/Photoshop 滑块类参数必须为字符串（含 + / - 号），示例 "+0.25"、"-45"。tone_curve 与 rgb_curves 控点使用数字数组。
- 禁止使用占位符（如 “示例值”/“未提供”）；若确无数据，可省略字段并在 analysis_meta.notes 明确说明原因。
- 当 user_image 存在且判定为 identical / extremely_similar，须在 JSON 根部添加 similarity_check，且不得输出后续分析。

---

【Step 3 — 光影与色彩参数推理（必须数值化）】
1. Lightroom/Camera Raw 基础滑块：exposure、contrast、highlights、shadows、whites、blacks、clarity、texture、dehaze、vibrance、saturation，全为字符串数值。
2. tone_curve：Luma 曲线需提供 5 个控制点，格式 [[0,y1],[64,y2],[128,y3],[192,y4],[255,y5]]。
3. rgb_curves：红/绿/蓝三个通道各至少 4 个控制点。
4. HSL：输出 red, orange, yellow, green, aqua, blue, purple, magenta 的 hue/saturation/luminance 数值。
5. color_grading：shadows/midtones/highlights 各自提供 hue 与 saturation（数字），并给出 balance（字符串）。
6. texture / dehaze：输出字符串数值，即使为 "+0"。
7. curve_explanation：解释 tone_curve 与每个 RGB 通道对画面带来的影响；curve_tips：提供 2~3 条具体操控建议。
8. lightroom_panels：数组形式，涵盖基本面板、质感细节、白平衡、色调曲线、HSL、色彩分级、效果、细节、局部蒙版等。每个 panel 需包含 title、description、params（name/value/purpose）。若某面板无调整，params 应写 "+0" 并说明原因。
9. lightroom_local_adjustments：列出每个蒙版（type、position、feather、opacity、params）；若确实不需要，返回空数组并在 analysis_meta.notes 说明理由。
10. Photoshop：steps 必须覆盖 Camera Raw 基础 → 曲线（含 RGB 控点）→ 色彩平衡或可选颜色 → 色相/饱和度 → LUT/Color Lookup → 局部渐变或蒙版 → Dodge & Burn → 智能锐化 → 最终微调。每步包含 title、description、params（含 name/value）；曲线步骤必须提供每通道控制点。
11. 色温与色调：temperature 范围 [-150,+300]，tint 范围 [-150,+150]（字符串形式）。在 analysis_meta.parameter_interpretation 中解释这些数值基于何种光源、氛围与复刻目标。

---

【Step 4 — 可复刻可行性评估】
- 输出 conversion_feasibility：can_transform、difficulty、confidence（0.0~1.0）、limiting_factors（数组）、recommendation（具体行动建议）。若不可行，必须说明原因并提出补拍/补光等方案。

---

【Step 5 — 复刻逻辑与调整指导】
- 按 Lightroom → Photoshop 的顺序列出详细步骤（step_number、action、params、reason、target）。target 字段需标明参数来源（source_image_analysis 或 target_image_adjustment）。
- 若需要局部蒙版，必须在 lightroom_local_adjustments 中提供 type、位置（中心坐标或 bounding box）、feather、opacity 及参数列表，便于前端绘制示意。

---

【Step 6 — 结构化输出（JSON 模板）】
最终 JSON 至少包含以下字段，不得缺失；可在基础上扩展：
\`\`\`json
{
  "professional_evaluation": {
    "visual_guidance": "<string>",
    "focus_exposure": "<string>",
    "color_depth": "<string>",
    "composition_expression": "<string>",
    "technical_details": "<string>",
    "equipment_analysis": "<string>",
    "lens_analysis": "<string>",
    "shooting_techniques": "<string>",
    "color_palette": "<string>",
    "photo_emotion": "<string>",
    "strengths": "<string>",
    "comparison": "<若有 user_image 输出结构化表格；否则 'no user_image provided'>"
  },
  "analysis_meta": {
    "data_origin": {
      "professional_evaluation": "source_image_analysis",
      "composition": "source_image_analysis",
      "lighting": "target_image_adjustment",
      "color": "target_image_adjustment"
    },
    "conversion_feasibility": {
      "can_transform": true,
      "difficulty": "medium",
      "confidence": 0.82,
      "limiting_factors": ["..."],
      "recommendation": "..."
    },
    "parameter_interpretation": {
      "temperature": { "value": "+120", "meaning": "..." },
      "tint": { "value": "+8", "meaning": "..." }
    },
    "notes": { "composition": "...", "lighting": "...", "color": "..." }
  },
  "composition": {
    "origin": "source_image_analysis",
    "scene_type": "architecture",
    "focus_area": "center_right",
    "rule_of_thirds": "partial",
    "resolution": "7952×5304",
    "avg_brightness": "152/255",
    "depth_of_field": "广角长景深/全景清晰",
    "advanced": {
      "subject_hierarchy": "主体建筑占画面 60%，前景围栏与天空形成辅助层次",
      "leading_lines": "道路与栏杆引导视线指向主体，形成对角线动势",
      "balance": "主建筑居中略偏右，左侧树木作为配重，整体稳定",
      "negative_space": "天空留白约 30%，强化呼吸感与现代感",
      "storytelling": "利用对称与留白表达理性秩序，强调现代都市孤独感",
      "improvement": [
        "主体向右微移半个三分区，减少与画面右缘的紧贴感",
        "前景可增加行人或灯光，引导叙事层次",
        "使用更低机位强化建筑体量"
      ],
      "crop_guidance": [
        "16:9 横幅裁切以强化延伸感",
        "顶部保留 15% 天空避免压迫"
      ],
      "post_processing": [
        "局部提亮主体窗格，增强节奏",
        "使用径向滤镜压暗边缘，集中视觉"
      ],
      "advanced_sections": [
        {"title": "画面主结构分析", "content": "采用中心对称框架，主视觉轴线沿建筑正中垂直向上；左右树木形成对称配重，无明显倾斜风险。"},
        {"title": "主体位置与视觉权重", "content": "主体位于中心略偏右，占框 60%；前景草坪与左右树木作为辅元素呼应，视觉权重由主体主导。"},
        {"title": "线条与方向引导", "content": "道路与草坪边缘形成双引导线，引导视线自前景对角线进入建筑立面，再沿窗格水平移动后回到中心。"},
        {"title": "空间层次与分区", "content": "前景草坪、中景建筑、背景天空三段分区清晰；线性透视收束于中央，空间延展自然。"},
        {"title": "比例与留白", "content": "主体与留白约 7:3，天空留白提供呼吸感；画面密度均匀无挤压。"},
        {"title": "视觉平衡与动势", "content": "垂直元素占优，对称结构带来稳定；对角引导线提供轻微动势，重心落在画面中心。"},
        {"title": "构图风格归类与改进建议", "content": "归类为平衡式建筑构图；建议增加前景点缀、微调机位高度、引入轻微角度以强化空间呼吸。"}
      ]
    }
  },
  "lightroom": {
    "origin": "target_image_adjustment",
    "exposure": "+0.25",
    "contrast": "+15",
    "highlights": "-45",
    "shadows": "+30",
    "whites": "+12",
    "blacks": "-10",
    "clarity": "+8",
    "texture": "+4",
    "vibrance": "+6",
    "saturation": "-3",
    "tone_curve": [[0,10],[64,60],[128,128],[192,200],[255,245]],
    "temperature": "+120",
    "tint": "+8",
    "rgb_curves": {
      "red": [[0,0],[128,135],[200,210],[255,255]],
      "green": [[0,0],[128,128],[200,205],[255,255]],
      "blue": [[0,0],[64,58],[180,188],[255,255]]
    },
    "curve_explanation": { "luma": "...", "red": "...", "green": "...", "blue": "..." },
    "curve_tips": ["...", "..."],
    "HSL": {
      "red": {"hue": 0, "saturation": -5, "luminance": 0},
      "orange": {"hue": 0, "saturation": 8, "luminance": 4},
      "yellow": {"hue": 0, "saturation": 0, "luminance": 0},
      "green": {"hue": 0, "saturation": 0, "luminance": 0},
      "aqua": {"hue": 0, "saturation": 0, "luminance": 0},
      "blue": {"hue": 5, "saturation": -10, "luminance": -3},
      "purple": {"hue": 0, "saturation": 0, "luminance": 0},
      "magenta": {"hue": 0, "saturation": 0, "luminance": 0}
    },
    "color_grading": {
      "shadows": {"hue": 230, "saturation": 18},
      "midtones": {"hue": 55, "saturation": 14},
      "highlights": {"hue": 35, "saturation": 12},
      "balance": "+5"
    },
    "dehaze": "+2",
    "effects": { "grain": 8, "vignette": -12 },
    "detail": {
      "sharpen_amount": "+40",
      "sharpen_radius": "1.0",
      "sharpen_detail": "+25",
      "sharpen_masking": "+40",
      "noise_luminance": "+10",
      "noise_color": "+5"
    }
  },
  "lightroom_panels": [],
  "lightroom_local_adjustments": [],
  "photoshop": {
    "origin": "target_image_adjustment",
    "curves": { "rgb": [[0,0],[50,40],[128,130],[200,220],[255,255]] },
    "selective_color": { "reds": {"cyan": -3, "magenta": 5, "yellow": 8, "black": 0} },
    "color_balance": {
      "shadows": {"cyan_red": 3, "magenta_green": -2, "yellow_blue": -4},
      "midtones": {"cyan_red": 1, "magenta_green": -1, "yellow_blue": -2},
      "highlights": {"cyan_red": 0, "magenta_green": 0, "yellow_blue": 0}
    },
    "hue_saturation": {
      "master": {"hue": 0, "saturation": 5, "lightness": 0},
      "blues": {"hue": -5, "saturation": 8, "lightness": -3}
    },
    "masks": [
      {
        "tool": "gradient",
        "position": "sky upper third",
        "feather": "80",
        "opacity": "65",
        "params": {"exposure": "-0.30", "contrast": "+12"}
      },
      {
        "tool": "brush",
        "position": "main subject",
        "feather": "45",
        "opacity": "55",
        "params": {"clarity": "+12", "saturation": "+6"}
      }
    ],
    "LUT": "CinematicWarm.cube",
    "steps": [
      {
        "title": "Camera Raw 滤镜",
        "description": "继承 Lightroom 参数并精修局部曝光色彩",
        "params": [
          {"name": "曝光", "value": "-0.35", "purpose": "统一亮度"},
          {"name": "色温", "value": "-80", "purpose": "保持冷调"}
        ]
      },
      {
        "title": "曲线调整",
        "description": "强化 S 型对比并微调 RGB 色调",
        "params": {
          "rgb": [[0,0],[50,40],[128,130],[200,220],[255,255]],
          "red": [[0,0],[64,65],[192,205],[255,255]],
          "green": [[0,0],[64,60],[192,198],[255,255]],
          "blue": [[0,0],[64,55],[192,190],[255,255]]
        }
      },
      {
        "title": "色彩平衡",
        "description": "压暖提冷，强调胶片感的冷青氛围",
        "params": [
          {"name": "阴影 青→红", "value": "+3"},
          {"name": "阴影 黄→蓝", "value": "-4"},
          {"name": "中间调 青→红", "value": "+1"}
        ]
      },
      {
        "title": "可选颜色",
        "description": "加强天空与树林色彩对比",
        "params": [
          {"name": "蓝色 青色", "value": "-6"},
          {"name": "蓝色 黄", "value": "+4"},
          {"name": "红色 洋红", "value": "+5"}
        ]
      },
      {
        "title": "LUT / Color Lookup",
        "description": "应用 WarmMorningTone.cube LUT 并调整到 45% 强度",
        "params": [
          {"name": "LUT", "value": "WarmMorningTone.cube"},
          {"name": "不透明度", "value": "45%"}
        ]
      },
      {
        "title": "Dodge & Burn",
        "description": "加深天空边缘、提亮主体高光，塑造立体感",
        "params": [
          {"name": "Burn 天空", "value": "-0.25 EV"},
          {"name": "Dodge 主体", "value": "+0.20 EV"}
        ]
      },
      {
        "title": "智能锐化",
        "description": "统一锐化并控制噪点",
        "params": [
          {"name": "数量", "value": "80"},
          {"name": "半径", "value": "1.0"},
          {"name": "减少杂色", "value": "20"}
        ]
      }
    ]
  },
  "color_mapping": {
    "dominant_colors": ["#F2C99C","#6B7C9B","#D9E3E9"],
    "highlight_hue_shift": 25,
    "shadow_hue_shift": -15,
    "tone_balance": 5,
    "suggested_LUT": "WarmMorningTone.cube"
  }
}
\`\`\`
在实际输出中，请根据分析结果填充所有字段。缺失字段需在 analysis_meta.notes 中说明原因。

---

【输出规范（阶段二）】
- 先给出自然语言分析（需引用阶段一要点并说明本阶段的执行策略），随后输出完整 JSON。
- JSON 中必须补全阶段一未输出的字段，并确保数值可直接用于前端滑块、导出模块。
- 若 user_image 存在，对比分析部分需更新为表格数据并给出具体调整建议；若无则保持 "no user_image provided"。

请严格按上述要求完成阶段二输出。`;
}

export function buildPromptByStage({
  hasTargetImage = false,
  sourceExif = null,
  targetExif = null,
  stage = 'combined',
  workflowDraft = null,
  part1Summary = null
} = {}) {
  if (stage === 'part1') {
    return buildPart1Prompt({ hasTargetImage, sourceExif, targetExif });
  }
  if (stage === 'part2') {
    return buildPart2Prompt({
      hasTargetImage,
      sourceExif,
      targetExif,
      workflowDraft,
      part1Summary
    });
  }

  const part1Prompt = buildPart1Prompt({ hasTargetImage, sourceExif, targetExif });
  const part2Prompt = buildPart2Prompt({
    hasTargetImage,
    sourceExif,
    targetExif,
    workflowDraft,
    part1Summary
  });

  return `${part1Prompt}

---

${part2Prompt}`;
}

export function getAnalysisPrompt(hasTargetImage = false, sourceExif = null, targetExif = null) {
  return buildPromptByStage({ hasTargetImage, sourceExif, targetExif, stage: 'combined' });
}

