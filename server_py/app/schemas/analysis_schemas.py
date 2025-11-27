"""
分析结果 Pydantic Schema 定义
根据开发方案第 14、23、24 节实现严格 Schema 验证
"""
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
from loguru import logger


class StyleClassificationSchema(BaseModel):
    """风格分类 Schema"""
    master_archetype: Optional[str] = Field(default="", description="主导原型")
    visual_signature: Optional[str] = Field(default="", description="视觉签名")


class PhotoReviewStructuredSchema(BaseModel):
    """照片点评结构化数据 Schema（嵌套在 structured 字段中）"""
    overviewSummary: Optional[str] = Field(default="", description="整体概览")
    # 【新增】comprehensive_review 字段：综合点评（用于前端显示）
    comprehensive_review: Optional[str] = Field(default="", description="综合点评（完整分析文本）")
    # 新增字段支持
    style_classification: Optional[StyleClassificationSchema] = Field(default=None, description="风格分类")
    master_archetype: Optional[str] = Field(default="", description="主导原型（扁平化支持）")
    visual_signature: Optional[str] = Field(default="", description="视觉签名（扁平化支持）")
    
    dimensions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="各维度分析")
    
    # 新增色彩策略字段
    saturation_strategy: Optional[str] = Field(default="", description="饱和度策略")
    tonal_intent: Optional[str] = Field(default="", description="影调意图")
    simulated_histogram_data: Optional[Dict[str, Any]] = Field(default=None, description="模拟直方图数据")
    
    # 新增情感字段（如果不在 dimensions 中）
    emotion: Optional[str] = Field(default="", description="情感与意境")
    
    # 之前的字段
    photographerStyleSummary: Optional[str] = Field(default="", description="摄影师风格总结")
    # 兼容 style_summary 别名
    style_summary: Optional[str] = Field(default="", description="风格总结（Phase 2 指令）")
    
    comparisonTable: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="参数对比表")
    # 兼容 parameter_comparison_table 别名
    parameter_comparison_table: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="参数对比表")
    
    feasibility: Optional[Dict[str, Any]] = Field(default_factory=dict, description="可行性评估")
    # 兼容 feasibility_assessment 别名
    feasibility_assessment: Optional[Dict[str, Any]] = Field(default_factory=dict, description="可行性评估")
    
    # 【新增】overlays 字段：用于前端图片区域高亮显示
    # 根据 BACKEND_AI_SPECS.md 要求，必须包含 visual_subject、focus_exposure、color_depth 三个区域
    overlays: Optional[Dict[str, Any]] = Field(default_factory=dict, description="区域坐标数据（用于图片高亮显示）")
    
    # 【新增】spatial_analysis 字段：空间分析大一统（最新格式）
    # 包含 ref_visual_mass_polygon、ref_overlays、user_overlays
    # 注意：这是 Prompt 模板的新结构，用于解决 Gemini 跳过 visual_mass 的问题
    spatial_analysis: Optional[Dict[str, Any]] = Field(default_factory=dict, description="空间分析数据（包含 visual_mass 和 overlays）")
    
    # 【新增】image_verification 字段：图像验证描述
    # 用于前端在参考图和用户图下方显示图像内容描述
    # 包含 ref_image_content 和 user_image_content 两个字段
    image_verification: Optional[Dict[str, Any]] = Field(default_factory=dict, description="图像验证描述（包含参考图和用户图的内容描述）")
    
    # 允许额外字段
    model_config = {"extra": "allow"}


class PhotoReviewNaturalLanguageSchema(BaseModel):
    """照片点评自然语言数据 Schema（嵌套在 naturalLanguage 字段中）"""
    summary: Optional[str] = Field(default="", description="综合描述")
    highlights: Optional[str] = Field(default="", description="亮点评价")
    technique: Optional[str] = Field(default="", description="技术分析")
    comparison: Optional[str] = Field(default="", description="对比分析")


class PhotoReviewSchema(BaseModel):
    """照片点评 Schema（根据开发方案第 24 节，包含 naturalLanguage 和 structured 两个字段）"""
    # 【重要】根据开发方案第 24 节，sections.photoReview 应该包含 naturalLanguage 和 structured 两个字段
    # 前端需要从 structured 中提取数据，并合并 feasibility 字段
    naturalLanguage: Optional[PhotoReviewNaturalLanguageSchema] = Field(
        default_factory=PhotoReviewNaturalLanguageSchema,
        description="自然语言原文（完整保留，不允许丢弃）"
    )
    structured: Optional[PhotoReviewStructuredSchema] = Field(
        default_factory=PhotoReviewStructuredSchema,
        description="结构化数据（包含 overviewSummary、dimensions、comparisonTable 等）"
    )
    # 【向后兼容】为了兼容旧代码，也支持顶层字段（但优先使用 structured 中的字段）
    # 注意：这些字段主要用于向后兼容，新代码应该使用 structured 中的字段
    overviewSummary: Optional[str] = Field(default=None, description="整体概览（向后兼容，优先使用 structured.overviewSummary）")
    dimensions: Optional[Dict[str, Any]] = Field(default=None, description="各维度分析（向后兼容，优先使用 structured.dimensions）")
    photographerStyleSummary: Optional[str] = Field(default=None, description="摄影师风格总结（向后兼容，优先使用 structured.photographerStyleSummary）")
    comparisonTable: Optional[List[Dict[str, str]]] = Field(default=None, description="参数对比表（向后兼容，优先使用 structured.comparisonTable）")
    feasibility: Optional[Dict[str, Any]] = Field(default=None, description="可行性评估（向后兼容，优先使用 structured.feasibility）")
    feasibilityDescription: Optional[str] = Field(default="", description="可行性描述（向后兼容）")


class CompositionStructuredSchema(BaseModel):
    """构图分析结构化数据 Schema（嵌套在 structured 字段中）"""
    # 支持新结构（5字段）和旧结构（7段）
    main_structure: Optional[str] = Field(default="", description="画面主结构分析（新结构）")
    # 【修复】subject_weight 可能包含 score (int) 和 method (str) 等字段，使用 Dict[str, Any] 支持混合类型
    subject_weight: Optional[Dict[str, Any]] = Field(default_factory=dict, description="主体位置与视觉权重（新结构，包含 score、description、layers、method 等字段）")
    visual_guidance: Optional[Dict[str, Any]] = Field(default_factory=dict, description="线条与方向引导（新结构，包含 analysis、path 等字段）")
    ratios_negative_space: Optional[Dict[str, Any]] = Field(default_factory=dict, description="比例与留白（新结构，包含 entity_ratio、space_ratio、distribution 等字段）")
    style_class: Optional[str] = Field(default="", description="构图风格归类（新结构）")
    
    # 【新增】视觉流、空间深度、留白分析 (根据开发方案要求)
    visual_flow: Optional[Dict[str, Any]] = Field(default=None, description="视觉流路径分析")
    spatial_depth: Optional[Dict[str, Any]] = Field(default=None, description="空间深度分析")
    negative_space: Optional[Dict[str, Any]] = Field(default=None, description="留白与平衡分析")
    
    # 【新增】visual_mass 字段：视觉质量/视觉重心（用于前端 Visual Mass 功能）
    # 包含 score、composition_rule、center_point、polygon_points 等字段
    visual_mass: Optional[Dict[str, Any]] = Field(default=None, description="视觉质量/视觉重心数据（包含分数、构图法则、坐标等）")
    
    advanced_sections: Optional[Dict[str, str]] = Field(
        default_factory=lambda: {
            "画面主结构分析": "",
            "主体位置与视觉权重": "",
            "线条与方向引导": "",
            "空间层次与分区": "",
            "比例与留白": "",
            "视觉平衡与动势": "",
            "构图风格归类与改进建议": "",
        },
        description="构图七段分析（旧结构，向后兼容）"
    )


class CompositionNaturalLanguageSchema(BaseModel):
    """构图分析自然语言数据 Schema（嵌套在 naturalLanguage 字段中）"""
    framework: Optional[str] = Field(default="", description="画面主结构分析")
    subjectWeight: Optional[str] = Field(default="", description="主体位置与视觉权重")
    leadingLines: Optional[str] = Field(default="", description="线条与方向引导")
    spaceLayers: Optional[str] = Field(default="", description="空间层次与分区")
    proportion: Optional[str] = Field(default="", description="比例与留白")
    balanceDynamics: Optional[str] = Field(default="", description="视觉平衡与动势")


class CompositionSchema(BaseModel):
    """构图分析 Schema（根据开发方案第 24 节，包含 naturalLanguage 和 structured 两个字段）"""
    # 【重要】根据开发方案第 24 节，sections.composition 应该包含 naturalLanguage 和 structured 两个字段
    # 前端需要从 structured 中提取数据
    naturalLanguage: Optional[CompositionNaturalLanguageSchema] = Field(
        default_factory=CompositionNaturalLanguageSchema,
        description="自然语言原文（完整保留，不允许丢弃）"
    )
    structured: Optional[CompositionStructuredSchema] = Field(
        default_factory=CompositionStructuredSchema,
        description="结构化数据（包含 main_structure、subject_weight、visual_guidance 等）"
    )
    # 【向后兼容】为了兼容旧代码，也支持顶层字段（但优先使用 structured 中的字段）
    # 注意：这些字段主要用于向后兼容，新代码应该使用 structured 中的字段
    main_structure: Optional[str] = Field(default=None, description="画面主结构分析（向后兼容，优先使用 structured.main_structure）")
    # 【修复】subject_weight 可能包含 score (int) 和 method (str) 等字段，使用 Dict[str, Any] 支持混合类型
    subject_weight: Optional[Dict[str, Any]] = Field(default=None, description="主体位置与视觉权重（向后兼容，优先使用 structured.subject_weight）")
    visual_guidance: Optional[Dict[str, Any]] = Field(default=None, description="线条与方向引导（向后兼容，优先使用 structured.visual_guidance）")
    ratios_negative_space: Optional[Dict[str, Any]] = Field(default=None, description="比例与留白（向后兼容，优先使用 structured.ratios_negative_space）")
    style_class: Optional[str] = Field(default=None, description="构图风格归类（向后兼容，优先使用 structured.style_class）")
    advanced_sections: Optional[Dict[str, str]] = Field(default=None, description="构图七段分析（向后兼容，优先使用 structured.advanced_sections）")


class LightingBasicSchema(BaseModel):
    """光影基础参数 Schema"""
    exposure: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    contrast: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    highlights: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    shadows: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    whites: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    blacks: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})


class LightingTextureSchema(BaseModel):
    """光影质感参数 Schema"""
    texture: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    clarity: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    dehaze: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    saturation: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})
    vibrance: Dict[str, str] = Field(default_factory=lambda: {"range": "+0", "note": ""})


class ToneCurvesSchema(BaseModel):
    """色调曲线 Schema"""
    explanation: Optional[str] = Field(default="", description="曲线调整逻辑说明")
    points_rgb: Optional[List[List[int]]] = Field(default_factory=list, description="RGB 曲线坐标点数组")
    points_red: Optional[List[List[int]]] = Field(default_factory=list, description="红色通道曲线坐标点数组")
    points_green: Optional[List[List[int]]] = Field(default_factory=list, description="绿色通道曲线坐标点数组")
    points_blue: Optional[List[List[int]]] = Field(default_factory=list, description="蓝色通道曲线坐标点数组")


class LightingStructuredSchema(BaseModel):
    """光影参数结构化数据 Schema（嵌套在 structured 字段中）"""
    basic: LightingBasicSchema = Field(default_factory=LightingBasicSchema)
    texture: LightingTextureSchema = Field(default_factory=LightingTextureSchema)
    toneCurves: Optional[ToneCurvesSchema] = Field(default=None, description="色调曲线（新结构）")


class LightingNaturalLanguageSchema(BaseModel):
    """光影参数自然语言数据 Schema（嵌套在 naturalLanguage 字段中）"""
    exposureControl: Optional[str] = Field(default="", description="曝光控制说明")
    toneCurve: Optional[str] = Field(default="", description="色调曲线说明")
    textureClarity: Optional[str] = Field(default="", description="纹理与清晰度说明")


class LightingSchema(BaseModel):
    """光影参数 Schema（根据开发方案第 24 节，包含 naturalLanguage 和 structured 两个字段）"""
    # 【重要】根据开发方案第 24 节，sections.lighting 应该包含 naturalLanguage 和 structured 两个字段
    # 前端需要从 structured 中提取数据
    naturalLanguage: Optional[LightingNaturalLanguageSchema] = Field(
        default_factory=LightingNaturalLanguageSchema,
        description="自然语言原文（完整保留，不允许丢弃）"
    )
    structured: Optional[LightingStructuredSchema] = Field(
        default_factory=LightingStructuredSchema,
        description="结构化数据（包含 basic、texture、toneCurves 等）"
    )
    # 【向后兼容】为了兼容旧代码，也支持顶层字段（但优先使用 structured 中的字段）
    # 注意：这些字段主要用于向后兼容，新代码应该使用 structured 中的字段
    basic: Optional[LightingBasicSchema] = Field(default=None, description="光影基础参数（向后兼容，优先使用 structured.basic）")
    texture: Optional[LightingTextureSchema] = Field(default=None, description="光影质感参数（向后兼容，优先使用 structured.texture）")
    toneCurves: Optional[ToneCurvesSchema] = Field(default=None, description="色调曲线（向后兼容，优先使用 structured.toneCurves）")


class ColorGradingSchema(BaseModel):
    """色彩分级 Schema"""
    highlights: Dict[str, Union[int, str]] = Field(default_factory=lambda: {"hue": 0, "saturation": 0})
    midtones: Dict[str, Union[int, str]] = Field(default_factory=lambda: {"hue": 0, "saturation": 0})
    shadows: Dict[str, Union[int, str]] = Field(default_factory=lambda: {"hue": 0, "saturation": 0})
    balance: Union[int, str] = Field(default=0, description="平衡值")


class HSLAdjustmentSchema(BaseModel):
    """HSL 调整 Schema"""
    color: str = Field(description="颜色名称（红/橙/黄/绿/青/蓝/紫/洋红）")
    hue: str = Field(default="0", description="色相调整（±xx）")
    saturation: str = Field(default="0", description="饱和度调整（±xx）")
    luminance: str = Field(default="0", description="明度调整（±xx）")
    note: Optional[str] = Field(default=None, description="备注")


class ColorStructuredSchema(BaseModel):
    """色彩方案结构化数据 Schema（嵌套在 structured 字段中）"""
    styleKey: str = Field(default="", description="风格关键词")
    whiteBalance: Dict[str, Dict[str, str]] = Field(
        default_factory=lambda: {
            "temp": {"range": "+0"},
            "tint": {"range": "+0"}
        }
    )
    grading: ColorGradingSchema = Field(default_factory=ColorGradingSchema)
    hsl: List[HSLAdjustmentSchema] = Field(default_factory=list, description="HSL 调整列表")


class ColorNaturalLanguageSchema(BaseModel):
    """色彩方案自然语言数据 Schema（嵌套在 naturalLanguage 字段中）"""
    styleKey: Optional[str] = Field(default="", description="风格关键词说明")
    whiteBalance: Optional[str] = Field(default="", description="白平衡说明")
    colorGrading: Optional[str] = Field(default="", description="色彩分级说明")
    hslAdjustments: Optional[str] = Field(default="", description="HSL 调整说明")


class ColorSchema(BaseModel):
    """色彩方案 Schema（根据开发方案第 24 节，包含 naturalLanguage 和 structured 两个字段）"""
    # 【重要】根据开发方案第 24 节，sections.color 应该包含 naturalLanguage 和 structured 两个字段
    # 前端需要从 structured 中提取数据
    naturalLanguage: Optional[ColorNaturalLanguageSchema] = Field(
        default_factory=ColorNaturalLanguageSchema,
        description="自然语言原文（完整保留，不允许丢弃）"
    )
    structured: Optional[ColorStructuredSchema] = Field(
        default_factory=ColorStructuredSchema,
        description="结构化数据（包含 styleKey、whiteBalance、grading、hsl 等）"
    )
    # 【向后兼容】为了兼容旧代码，也支持顶层字段（但优先使用 structured 中的字段）
    # 注意：这些字段主要用于向后兼容，新代码应该使用 structured 中的字段
    styleKey: Optional[str] = Field(default=None, description="风格关键词（向后兼容，优先使用 structured.styleKey）")
    whiteBalance: Optional[Dict[str, Dict[str, str]]] = Field(default=None, description="白平衡（向后兼容，优先使用 structured.whiteBalance）")
    grading: Optional[ColorGradingSchema] = Field(default=None, description="色彩分级（向后兼容，优先使用 structured.grading）")
    hsl: Optional[List[HSLAdjustmentSchema]] = Field(default=None, description="HSL 调整列表（向后兼容，优先使用 structured.hsl）")


class LightroomPanelParamSchema(BaseModel):
    """Lightroom 面板参数 Schema"""
    name: str = Field(description="参数名称")
    value: str = Field(description="参数值（字符串，带±）")
    reason: Optional[str] = Field(default=None, description="调整原因")
    # 【向后兼容】支持 purpose 字段（与 reason 等价，用于兼容旧代码）
    purpose: Optional[str] = Field(default=None, description="调整目的（与 reason 等价）")


class LightroomPanelSchema(BaseModel):
    """Lightroom 面板 Schema"""
    title: str = Field(description="面板标题")
    description: Optional[str] = Field(default="", description="面板描述")
    params: List[LightroomPanelParamSchema] = Field(default_factory=list, description="参数列表")
    note: Optional[str] = Field(default=None, description="备注")
    masks: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="局部蒙版")
    
    # 【重要】Pydantic V2 使用 ConfigDict 替代 Config 类
    # 允许额外字段，避免 Pydantic 验证时丢弃未知字段
    # 原因：如果后端返回了额外的字段（如 purpose），Pydantic 默认会丢弃，导致数据丢失
    # 解决方案：设置 extra='allow'，允许保留额外字段
    model_config = {"extra": "allow"}


class LightroomStructuredSchema(BaseModel):
    """Lightroom 结构化数据 Schema（嵌套在 structured 字段中）"""
    panels: List[LightroomPanelSchema] = Field(default_factory=list, description="面板列表")
    toneCurve: List[List[int]] = Field(
        default_factory=lambda: [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]],
        description="色调曲线（5个控制点）"
    )
    rgbCurves: Dict[str, List[List[int]]] = Field(default_factory=dict, description="RGB 曲线")
    colorGrading: Dict[str, Any] = Field(default_factory=dict, description="色彩分级")
    localAdjustments: List[Dict[str, Any]] = Field(default_factory=list, description="局部调整")


class LightroomNaturalLanguageSchema(BaseModel):
    """Lightroom 自然语言数据 Schema（嵌套在 naturalLanguage 字段中）"""
    panelSummary: Optional[str] = Field(default="", description="面板摘要")
    localAdjustments: Optional[str] = Field(default="", description="局部调整说明")


class LightroomSchema(BaseModel):
    """Lightroom 参数 Schema（根据开发方案第 24 节，包含 naturalLanguage 和 structured 两个字段）"""
    # 【重要】根据开发方案第 24 节，sections.lightroom 应该包含 naturalLanguage 和 structured 两个字段
    # 前端需要从 structured 中提取数据
    naturalLanguage: Optional[LightroomNaturalLanguageSchema] = Field(
        default_factory=LightroomNaturalLanguageSchema,
        description="自然语言原文（完整保留，不允许丢弃）"
    )
    structured: Optional[LightroomStructuredSchema] = Field(
        default_factory=LightroomStructuredSchema,
        description="结构化数据（包含 panels、toneCurve、rgbCurves 等）"
    )
    # 【向后兼容】为了兼容旧代码，也支持顶层字段（但优先使用 structured 中的字段）
    # 注意：这些字段主要用于向后兼容，新代码应该使用 structured 中的字段
    panels: Optional[List[LightroomPanelSchema]] = Field(default=None, description="面板列表（向后兼容，优先使用 structured.panels）")
    toneCurve: Optional[List[List[int]]] = Field(default=None, description="色调曲线（向后兼容，优先使用 structured.toneCurve）")
    rgbCurves: Optional[Dict[str, List[List[int]]]] = Field(default=None, description="RGB 曲线（向后兼容，优先使用 structured.rgbCurves）")
    colorGrading: Optional[Dict[str, Any]] = Field(default=None, description="色彩分级（向后兼容，优先使用 structured.colorGrading）")
    localAdjustments: Optional[List[Dict[str, Any]]] = Field(default=None, description="局部调整（向后兼容，优先使用 structured.localAdjustments）")


class PhotoshopStepParamSchema(BaseModel):
    """Photoshop 步骤参数 Schema"""
    name: str = Field(description="参数名称")
    value: str = Field(description="参数值")
    reason: Optional[str] = Field(default=None, description="调整原因")


class PhotoshopStepSchema(BaseModel):
    """Photoshop 步骤 Schema"""
    title: str = Field(description="步骤标题")
    description: str = Field(default="", description="步骤描述")
    params: Optional[List[PhotoshopStepParamSchema]] = Field(default_factory=list, description="参数列表")
    details: Optional[str] = Field(default=None, description="详细说明")
    blendMode: Optional[str] = Field(default=None, description="混合模式")
    opacity: Optional[str] = Field(default=None, description="不透明度")


class PhotoshopStructuredSchema(BaseModel):
    """Photoshop 结构化数据 Schema（嵌套在 structured 字段中）"""
    steps: List[PhotoshopStepSchema] = Field(default_factory=list, description="步骤列表")


class PhotoshopNaturalLanguageSchema(BaseModel):
    """Photoshop 自然语言数据 Schema（嵌套在 naturalLanguage 字段中）"""
    stepSummary: Optional[str] = Field(default="", description="步骤摘要")
    workflowNotes: Optional[str] = Field(default="", description="工作流说明")


class PhotoshopSchema(BaseModel):
    """Photoshop 参数 Schema（根据开发方案第 24 节，包含 naturalLanguage 和 structured 两个字段）"""
    # 【重要】根据开发方案第 24 节，sections.photoshop 应该包含 naturalLanguage 和 structured 两个字段
    # 前端需要从 structured 中提取数据
    naturalLanguage: Optional[PhotoshopNaturalLanguageSchema] = Field(
        default_factory=PhotoshopNaturalLanguageSchema,
        description="自然语言原文（完整保留，不允许丢弃）"
    )
    structured: Optional[PhotoshopStructuredSchema] = Field(
        default_factory=PhotoshopStructuredSchema,
        description="结构化数据（包含 steps 等）"
    )
    # 【向后兼容】为了兼容旧代码，也支持顶层字段（但优先使用 structured 中的字段）
    # 注意：这些字段主要用于向后兼容，新代码应该使用 structured 中的字段
    steps: Optional[List[PhotoshopStepSchema]] = Field(default=None, description="步骤列表（向后兼容，优先使用 structured.steps）")


class AnalysisMetaSchema(BaseModel):
    """分析元数据 Schema"""
    warnings: List[str] = Field(default_factory=list, description="警告列表")
    rawNaturalLanguage: str = Field(default="", description="原始自然语言")
    protocolVersion: str = Field(default="2025-02", description="协议版本")


class Part1SectionsSchema(BaseModel):
    """Part1 章节 Schema"""
    photoReview: PhotoReviewSchema = Field(default_factory=PhotoReviewSchema)
    composition: CompositionSchema = Field(default_factory=CompositionSchema)
    lighting: LightingSchema = Field(default_factory=LightingSchema)
    color: ColorSchema = Field(default_factory=ColorSchema)


class Part2SectionsSchema(BaseModel):
    """Part2 章节 Schema"""
    lightroom: LightroomSchema = Field(default_factory=LightroomSchema)
    photoshop: PhotoshopSchema = Field(default_factory=PhotoshopSchema)
    color: ColorSchema = Field(default_factory=ColorSchema)


class Part1ResponseSchema(BaseModel):
    """Part1 响应 Schema"""
    protocolVersion: str = Field(default="2025-02", description="协议版本")
    stage: str = Field(default="part1", description="分析阶段")
    meta: AnalysisMetaSchema = Field(default_factory=AnalysisMetaSchema)
    sections: Part1SectionsSchema = Field(default_factory=Part1SectionsSchema)

    @validator('protocolVersion', pre=True, always=True)
    def set_protocol_version(cls, v):
        return v or "2025-02"

    @validator('stage', pre=True, always=True)
    def set_stage(cls, v):
        return v or "part1"


class Part2ResponseSchema(BaseModel):
    """Part2 响应 Schema"""
    protocolVersion: str = Field(default="2025-02", description="协议版本")
    stage: str = Field(default="part2", description="分析阶段")
    meta: AnalysisMetaSchema = Field(default_factory=AnalysisMetaSchema)
    sections: Part2SectionsSchema = Field(default_factory=Part2SectionsSchema)

    @validator('protocolVersion', pre=True, always=True)
    def set_protocol_version(cls, v):
        return v or "2025-02"

    @validator('stage', pre=True, always=True)
    def set_stage(cls, v):
        return v or "part2"


def validate_part1_response(data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    验证 Part1 响应数据
    
    Args:
        data: Gemini 返回的 JSON 字符串或字典
        
    Returns:
        验证后的标准化字典
    """
    import json
    
    try:
        # 解析 JSON
        if isinstance(data, str):
            raw_data = json.loads(data)
        else:
            raw_data = data
        
        # 使用 Pydantic Schema 验证
        validated = Part1ResponseSchema(**raw_data)
        
        # 【重要】使用 model_dump() 替代已废弃的 dict() 方法
        # 注意：Pydantic V2 使用 model_dump()，它会正确保留嵌套结构
        # 【修复】不使用 exclude_none=True，因为空字符串和空数组也是有效数据
        # 原因：如果使用 exclude_none=True，空字符串 "" 和空数组 [] 可能被过滤，导致数据丢失
        # 解决方案：使用 mode='json' 确保正确序列化，但不排除 None 值（因为 None 值在 JSON 中也是有效的）
        result = validated.model_dump(mode='json')
        
        # 【调试日志】记录验证后的结构
        if "sections" in result and "photoReview" in result["sections"]:
            photo_review = result["sections"]["photoReview"]
            logger.debug(f"validate_part1_response: photoReview keys = {list(photo_review.keys())}")
            if "structured" in photo_review:
                structured = photo_review["structured"]
                logger.debug(f"validate_part1_response: photoReview.structured keys = {list(structured.keys())}")
                # 【新增】记录关键字段的长度和存在性
                logger.debug(f"validate_part1_response: style_summary 长度 = {len(structured.get('style_summary', ''))} 字符")
                logger.debug(f"validate_part1_response: comprehensive_review 长度 = {len(structured.get('comprehensive_review', ''))} 字符")
                logger.debug(f"validate_part1_response: overlays keys = {list(structured.get('overlays', {}).keys()) if isinstance(structured.get('overlays'), dict) else 'not dict'}")
                logger.debug(f"validate_part1_response: simulated_histogram_data keys = {list(structured.get('simulated_histogram_data', {}).keys()) if isinstance(structured.get('simulated_histogram_data'), dict) else 'not dict'}")
                if "dimensions" in structured:
                    logger.debug(f"validate_part1_response: photoReview.structured.dimensions keys = {list(structured['dimensions'].keys())}")
        
        return result
    except Exception as e:
        logger.error(f"Part1 Schema 验证失败: {e}", exc_info=True)
        # 【修复】Schema 验证失败时，不应该返回默认空结构，应该抛出异常让 format_part1 处理
        # 原因：返回默认空结构会导致所有数据丢失，format_part1 的 try-except 无法捕获
        # 解决方案：重新抛出异常，让 format_part1 的异常处理逻辑处理（会使用原始 structured 数据）
        raise ValueError(f"Schema 验证失败: {str(e)}") from e


def validate_part2_response(data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    验证 Part2 响应数据
    
    Args:
        data: Gemini 返回的 JSON 字符串或字典
        
    Returns:
        验证后的标准化字典
    """
    import json
    
    try:
        # 解析 JSON
        if isinstance(data, str):
            raw_data = json.loads(data)
        else:
            raw_data = data
        
        # 使用 Pydantic Schema 验证
        validated = Part2ResponseSchema(**raw_data)
        
        # 【重要】使用 model_dump() 替代已废弃的 dict() 方法
        # 注意：Pydantic V2 使用 model_dump()，它会正确保留嵌套结构
        # 【关键修复】不使用 exclude_none=True，因为空字符串和空数组也是有效数据
        # 原因：如果使用 exclude_none=True，空数组 [] 和空字符串 "" 可能被过滤，导致 panels 内容丢失
        # 解决方案：使用 mode='json' 确保正确序列化，但不排除 None 值（因为 None 值在 JSON 中也是有效的）
        result = validated.model_dump(mode='json')
        
        # 【调试日志】检查 lightroom panels 是否正确保留
        if "sections" in result and "lightroom" in result["sections"]:
            lightroom_section = result["sections"]["lightroom"]
            if "structured" in lightroom_section:
                lightroom_structured = lightroom_section["structured"]
                if "panels" in lightroom_structured:
                    panels = lightroom_structured["panels"]
                    logger.info(f"【validate_part2_response】lightroom panels 数量: {len(panels) if isinstance(panels, list) else 'not list'}")
                    if isinstance(panels, list) and len(panels) > 0:
                        first_panel = panels[0]
                        has_content = bool(first_panel.get("title") or first_panel.get("description") or first_panel.get("params"))
                        logger.debug(f"【validate_part2_response】lightroom 第一个 panel 是否有内容: {has_content}, title = {first_panel.get('title')}, params count = {len(first_panel.get('params', []))}")
                        if not has_content:
                            logger.error(f"【validate_part2_response】❌ lightroom panels 内容为空！第一个 panel: {json.dumps(first_panel, ensure_ascii=False)[:200]}")
        
        return result
    except Exception as e:
        logger.error(f"Part2 Schema 验证失败: {e}", exc_info=True)
        # 返回默认结构
        return Part2ResponseSchema().model_dump(exclude_none=True)


# ========== AI 诊断 Schema（新增）==========

class DiagnosisIssueSchema(BaseModel):
    """诊断问题 Schema"""
    type: str = Field(description="问题类型：exposure/color/composition/mood")
    severity: str = Field(description="严重程度：high/medium/low")
    description: str = Field(description="问题描述")
    region: Optional[str] = Field(default=None, description="区域描述（如 sky、shadow）")


class DiagnosisRegionSchema(BaseModel):
    """诊断区域 Schema（用于在图像上标记区域）"""
    label: str = Field(description="区域标签（如：'过曝区域', '主体'）")
    box_2d: List[int] = Field(default_factory=list, description="归一化坐标 [ymin, xmin, ymax, xmax]，范围 0-1000")


class DiagnosisScoreItemSchema(BaseModel):
    """诊断评分项 Schema（包含数值和描述）"""
    value: float = Field(ge=0, le=100, description="评分数值（0-10 或 0-100）")
    description: str = Field(description="评分描述（如：'曝光准确，高光细节保留良好'）")
    regions: List[DiagnosisRegionSchema] = Field(default_factory=list, description="相关区域列表")


class DiagnosisScoresSchema(BaseModel):
    """诊断评分 Schema（支持两种格式：简单数值或带描述的格式）"""
    # 支持旧格式（简单数值，0-10分）
    exposure: float | DiagnosisScoreItemSchema = Field(description="曝光评分（0-10 或 0-100，可带描述）")
    color: float | DiagnosisScoreItemSchema = Field(description="色彩评分（0-10 或 0-100，可带描述）")
    composition: float | DiagnosisScoreItemSchema = Field(description="构图评分（0-10 或 0-100，可带描述）")
    mood: float | DiagnosisScoreItemSchema = Field(description="情感评分（0-10 或 0-100，可带描述）")


class DiagnosisResponseSchema(BaseModel):
    """AI 诊断响应 Schema"""
    scores: DiagnosisScoresSchema = Field(description="多维评分")
    critique: str = Field(description="详细诊断文字")
    suggestions: List[str] = Field(default_factory=list, description="改进建议列表")
    issues: List[DiagnosisIssueSchema] = Field(default_factory=list, description="问题列表")


class Part1RequestSchema(BaseModel):
    """
    Part1 分析请求 Schema
    根据开发方案第 763 行实现，支持通过 uploadId 获取图片数据
    """
    uploadId: str = Field(..., description="上传记录 ID（必填）")
    optional_style: Optional[str] = Field(None, description="可选风格关键词（如 '日出暖光', '胶片感'）")


class DiagnosisRequestSchema(BaseModel):
    """AI 诊断请求 Schema"""
    imageUrl: str = Field(description="图片 URL 或 base64（低分辨率，建议 512x512）")
    histogramData: Dict[str, Any] = Field(description="直方图统计数据")
    dominantColors: List[Dict[str, Any]] = Field(default_factory=list, description="主色调列表")
    taskId: Optional[str] = Field(default=None, description="可选，关联已有分析任务")


def validate_diagnosis_response(data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    验证 AI 诊断响应数据
    支持两种评分格式：
    1. 简单格式：{"exposure": 8.5, "color": 7.2, ...}
    2. 详细格式：{"exposure": {"value": 8.5, "description": "..."}, ...}
    
    Args:
        data: Gemini 返回的 JSON 字符串或字典
        
    Returns:
        验证后的标准化字典（统一转换为详细格式）
    """
    import json
    
    try:
        # 解析 JSON
        if isinstance(data, str):
            # 清理响应中的 markdown 代码块
            cleaned_response = data.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            raw_data = json.loads(cleaned_response)
        else:
            raw_data = data
        
        # 【数据标准化】将评分数据统一转换为详细格式
        # 支持两种格式：简单数值或带描述的格式
        if "scores" in raw_data:
            scores = raw_data["scores"]
            normalized_scores = {}
            
            for key in ["exposure", "color", "composition", "mood"]:
                if key in scores:
                    score_value = scores[key]
                    # 如果是简单数值格式，转换为详细格式
                    if isinstance(score_value, (int, float)):
                        normalized_scores[key] = {
                            "value": float(score_value),
                            "description": "",  # 如果没有描述，留空
                            "regions": []
                        }
                    # 如果是详细格式，直接使用
                    elif isinstance(score_value, dict) and "value" in score_value:
                        normalized_scores[key] = {
                            "value": float(score_value.get("value", 0)),
                            "description": str(score_value.get("description", "")),
                            "regions": score_value.get("regions", [])  # 保留区域数据
                        }
                    else:
                        # 格式不正确，使用默认值
                        normalized_scores[key] = {
                            "value": 5.0,
                            "description": "",
                            "regions": []
                        }
                else:
                    # 缺少该评分项，使用默认值
                    normalized_scores[key] = {
                        "value": 5.0,
                        "description": "",
                        "regions": []
                    }
            
            raw_data["scores"] = normalized_scores
        
        # 【诊断文本长度验证】确保 critique 不超过 100 字
        if "critique" in raw_data and isinstance(raw_data["critique"], str):
            critique_text = raw_data["critique"]
            # 计算中文字符数（中文字符算1个字，英文单词算1个字）
            # 简单估算：中文字符数 + 英文单词数
            chinese_chars = len([c for c in critique_text if '\u4e00' <= c <= '\u9fff'])
            english_words = len(critique_text.split())
            total_length = chinese_chars + english_words
            
            if total_length > 100:
                logger.warning(f"【AI 诊断】诊断文本长度超过 100 字（实际 {total_length} 字），将截断")
                # 截断到 100 字（简单处理，保留前 100 个字符）
                raw_data["critique"] = critique_text[:100] + "..."
        
        # 使用 Pydantic Schema 验证（注意：Schema 需要支持两种格式）
        # 由于 Schema 验证可能失败（如果评分格式不匹配），我们使用更宽松的验证
        try:
            validated = DiagnosisResponseSchema(**raw_data)
            result = validated.model_dump()
        except Exception as schema_error:
            # Schema 验证失败，但我们已经标准化了数据，尝试手动构建
            logger.warning(f"【AI 诊断】Schema 验证失败，使用标准化数据: {schema_error}")
            result = {
                "scores": raw_data.get("scores", {
                    "exposure": {"value": 5.0, "description": ""},
                    "color": {"value": 5.0, "description": ""},
                    "composition": {"value": 5.0, "description": ""},
                    "mood": {"value": 5.0, "description": ""}
                }),
                "critique": raw_data.get("critique", "诊断分析失败，请重试"),
                "suggestions": raw_data.get("suggestions", []),
                "issues": raw_data.get("issues", [])
            }
        
        return result
    except Exception as e:
        logger.error(f"AI 诊断 Schema 验证失败: {e}", exc_info=True)
        # 返回默认结构
        return {
            "scores": {
                "exposure": {"value": 5.0, "description": ""},
                "color": {"value": 5.0, "description": ""},
                "composition": {"value": 5.0, "description": ""},
                "mood": {"value": 5.0, "description": ""}
            },
            "critique": "诊断分析失败，请重试",
            "suggestions": [],
            "issues": []
        }

