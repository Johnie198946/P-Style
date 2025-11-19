"""
分析结果 Pydantic Schema 定义
根据开发方案第 14、23、24 节实现严格 Schema 验证
"""
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
from loguru import logger


class PhotoReviewSchema(BaseModel):
    """照片点评 Schema"""
    overviewSummary: Optional[str] = Field(default="", description="整体概览")
    dimensions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="各维度分析")
    photographerStyleSummary: Optional[str] = Field(default="", description="摄影师风格总结")
    comparisonTable: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="参数对比表")
    feasibility: Optional[Dict[str, Any]] = Field(default_factory=dict, description="可行性评估")
    feasibilityDescription: Optional[str] = Field(default="", description="可行性描述")


class CompositionSchema(BaseModel):
    """构图分析 Schema"""
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


class LightingSchema(BaseModel):
    """光影参数 Schema"""
    basic: LightingBasicSchema = Field(default_factory=LightingBasicSchema)
    texture: LightingTextureSchema = Field(default_factory=LightingTextureSchema)
    toneCurves: Optional[ToneCurvesSchema] = Field(default=None, description="色调曲线（新结构）")


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


class ColorSchema(BaseModel):
    """色彩方案 Schema"""
    styleKey: str = Field(default="", description="风格关键词")
    whiteBalance: Dict[str, Dict[str, str]] = Field(
        default_factory=lambda: {
            "temp": {"range": "+0"},
            "tint": {"range": "+0"}
        }
    )
    grading: ColorGradingSchema = Field(default_factory=ColorGradingSchema)
    hsl: List[HSLAdjustmentSchema] = Field(default_factory=list, description="HSL 调整列表")


class LightroomPanelParamSchema(BaseModel):
    """Lightroom 面板参数 Schema"""
    name: str = Field(description="参数名称")
    value: str = Field(description="参数值（字符串，带±）")
    reason: Optional[str] = Field(default=None, description="调整原因")


class LightroomPanelSchema(BaseModel):
    """Lightroom 面板 Schema"""
    title: str = Field(description="面板标题")
    description: Optional[str] = Field(default="", description="面板描述")
    params: List[LightroomPanelParamSchema] = Field(default_factory=list, description="参数列表")
    note: Optional[str] = Field(default=None, description="备注")
    masks: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="局部蒙版")


class LightroomSchema(BaseModel):
    """Lightroom 参数 Schema"""
    panels: List[LightroomPanelSchema] = Field(default_factory=list, description="面板列表")
    toneCurve: List[List[int]] = Field(
        default_factory=lambda: [[0, 0], [64, 64], [128, 128], [192, 192], [255, 255]],
        description="色调曲线（5个控制点）"
    )
    rgbCurves: Dict[str, List[List[int]]] = Field(default_factory=dict, description="RGB 曲线")
    colorGrading: Dict[str, Any] = Field(default_factory=dict, description="色彩分级")
    localAdjustments: List[Dict[str, Any]] = Field(default_factory=list, description="局部调整")


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


class PhotoshopSchema(BaseModel):
    """Photoshop 参数 Schema"""
    steps: List[PhotoshopStepSchema] = Field(default_factory=list, description="步骤列表")


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
        
        # 转换为字典并返回
        return validated.dict(exclude_none=False)
    except Exception as e:
        logger.error(f"Part1 Schema 验证失败: {e}")
        # 返回默认结构
        return Part1ResponseSchema().dict()


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
        
        # 转换为字典并返回
        return validated.dict(exclude_none=False)
    except Exception as e:
        logger.error(f"Part2 Schema 验证失败: {e}")
        # 返回默认结构
        return Part2ResponseSchema().dict()

