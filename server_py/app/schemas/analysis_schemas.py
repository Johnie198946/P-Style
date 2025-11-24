"""
分析结果 Pydantic Schema 定义
根据开发方案第 14、23、24 节实现严格 Schema 验证
"""
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
from loguru import logger


class PhotoReviewStructuredSchema(BaseModel):
    """照片点评结构化数据 Schema（嵌套在 structured 字段中）"""
    overviewSummary: Optional[str] = Field(default="", description="整体概览")
    dimensions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="各维度分析")
    photographerStyleSummary: Optional[str] = Field(default="", description="摄影师风格总结")
    comparisonTable: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="参数对比表")
    feasibility: Optional[Dict[str, Any]] = Field(default_factory=dict, description="可行性评估")


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
    subject_weight: Optional[Dict[str, str]] = Field(default_factory=dict, description="主体位置与视觉权重（新结构）")
    visual_guidance: Optional[Dict[str, str]] = Field(default_factory=dict, description="线条与方向引导（新结构）")
    ratios_negative_space: Optional[Dict[str, str]] = Field(default_factory=dict, description="比例与留白（新结构）")
    style_class: Optional[str] = Field(default="", description="构图风格归类（新结构）")
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
    subject_weight: Optional[Dict[str, str]] = Field(default=None, description="主体位置与视觉权重（向后兼容，优先使用 structured.subject_weight）")
    visual_guidance: Optional[Dict[str, str]] = Field(default=None, description="线条与方向引导（向后兼容，优先使用 structured.visual_guidance）")
    ratios_negative_space: Optional[Dict[str, str]] = Field(default=None, description="比例与留白（向后兼容，优先使用 structured.ratios_negative_space）")
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
        # 使用 exclude_none=True 排除 None 值，避免向后兼容字段干扰
        result = validated.model_dump(exclude_none=True)
        
        # 【调试日志】记录验证后的结构
        if "sections" in result and "photoReview" in result["sections"]:
            photo_review = result["sections"]["photoReview"]
            logger.debug(f"validate_part1_response: photoReview keys = {list(photo_review.keys())}")
            if "structured" in photo_review:
                structured = photo_review["structured"]
                logger.debug(f"validate_part1_response: photoReview.structured keys = {list(structured.keys())}")
                if "dimensions" in structured:
                    logger.debug(f"validate_part1_response: photoReview.structured.dimensions keys = {list(structured['dimensions'].keys())}")
        
        return result
    except Exception as e:
        logger.error(f"Part1 Schema 验证失败: {e}", exc_info=True)
        # 返回默认结构
        return Part1ResponseSchema().model_dump(exclude_none=True)


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


class DiagnosisScoresSchema(BaseModel):
    """诊断评分 Schema"""
    exposure: float = Field(ge=0, le=10, description="曝光评分（0-10）")
    color: float = Field(ge=0, le=10, description="色彩评分（0-10）")
    composition: float = Field(ge=0, le=10, description="构图评分（0-10）")
    mood: float = Field(ge=0, le=10, description="情感评分（0-10）")


class DiagnosisResponseSchema(BaseModel):
    """AI 诊断响应 Schema"""
    scores: DiagnosisScoresSchema = Field(description="多维评分")
    critique: str = Field(description="详细诊断文字")
    suggestions: List[str] = Field(default_factory=list, description="改进建议列表")
    issues: List[DiagnosisIssueSchema] = Field(default_factory=list, description="问题列表")


class DiagnosisRequestSchema(BaseModel):
    """AI 诊断请求 Schema"""
    imageUrl: str = Field(description="图片 URL 或 base64（低分辨率，建议 512x512）")
    histogramData: Dict[str, Any] = Field(description="直方图统计数据")
    dominantColors: List[Dict[str, Any]] = Field(default_factory=list, description="主色调列表")
    taskId: Optional[str] = Field(default=None, description="可选，关联已有分析任务")


def validate_diagnosis_response(data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    验证 AI 诊断响应数据
    
    Args:
        data: Gemini 返回的 JSON 字符串或字典
        
    Returns:
        验证后的标准化字典
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
        
        # 使用 Pydantic Schema 验证
        validated = DiagnosisResponseSchema(**raw_data)
        
        # 转换为字典
        result = validated.model_dump()
        
        return result
    except Exception as e:
        logger.error(f"AI 诊断 Schema 验证失败: {e}", exc_info=True)
        # 返回默认结构
        return DiagnosisResponseSchema(
            scores=DiagnosisScoresSchema(exposure=5.0, color=5.0, composition=5.0, mood=5.0),
            critique="诊断分析失败，请重试",
            suggestions=[],
            issues=[]
        ).model_dump()

