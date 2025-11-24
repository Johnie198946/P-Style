from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Union, Any

# --- COMMON TYPES ---

class TacticalParam(BaseModel):
    value: float
    unit: str = ""
    min: float
    max: float
    target_min: Optional[float] = None
    target_max: Optional[float] = None
    range: Optional[str] = None # Legacy support if needed
    reason: str

class Point(BaseModel):
    x: float
    y: float

# --- LIGHTROOM / COLOR SCIENCE ---

class TacticalBrief(BaseModel):
    title: str
    content: str

class WhiteBalanceStrategy(BaseModel):
    temp: TacticalParam
    tint: TacticalParam

class ColorGradeWheel(BaseModel):
    hue: float
    saturation: float
    reason: str

class TrinityGrading(BaseModel):
    highlights: ColorGradeWheel
    midtones: ColorGradeWheel
    shadows: ColorGradeWheel
    balance: TacticalParam

class SpectralChannel(BaseModel):
    name: str
    h: float
    s: float
    l: float
    color: str

class TonePresenceParams(BaseModel):
    # White Balance
    temp: TacticalParam
    tint: TacticalParam
    
    # Tone
    exposure: TacticalParam
    contrast: TacticalParam
    highlights: TacticalParam
    shadows: TacticalParam
    whites: TacticalParam
    blacks: TacticalParam
    
    # Presence
    texture: TacticalParam
    clarity: TacticalParam
    dehaze: TacticalParam
    vibrance: TacticalParam
    saturation: TacticalParam

class CurveChannel(BaseModel):
    points: List[Point]
    analysis: str

class AdvancedCurve(BaseModel):
    rgb: List[Point]
    red: List[Point]
    green: List[Point]
    blue: List[Point]
    analysis: Dict[str, str] # {rgb: "...", red: "..."}
    tips: List[str]
    reason: Optional[str] = None

class ProHistogram(BaseModel):
    r: List[int]
    g: List[int]
    b: List[int]
    l: List[int]
    avg_l: float
    shadows: float
    midtones: float
    highlights: float

class HSLAdjustment(BaseModel):
    hue: float
    saturation: float
    luminance: float

class FullHSLData(BaseModel):
    red: HSLAdjustment
    orange: HSLAdjustment
    yellow: HSLAdjustment
    green: HSLAdjustment
    aqua: HSLAdjustment
    blue: HSLAdjustment
    purple: HSLAdjustment
    magenta: HSLAdjustment

# --- COMPOSITION ---

class CompositionStructure(BaseModel):
    visual_frame: str
    geometry: str
    balance: str

class SubjectAnalysis(BaseModel):
    position: str
    weight_score: int
    method: str
    analysis: str

class VisualLines(BaseModel):
    path: List[str]
    guide: Optional[str] = None

class SpatialZones(BaseModel):
    foreground: str
    midground: str
    background: str
    perspective: str

class Proportions(BaseModel):
    entities: str
    negative: str
    distribution: str

class CompBalance(BaseModel):
    horizontal: str
    vertical: str
    strategy: str

class CompStyle(BaseModel):
    name: str
    method: str
    features: str

class CompositionData(BaseModel):
    structure: CompositionStructure
    subject: SubjectAnalysis
    lines: VisualLines
    zones: SpatialZones
    proportions: Proportions
    balance: CompBalance
    style: CompStyle

# --- PHOTOSHOP (Keep legacy if needed, but we focus on LR now) ---
class PhotoshopData(BaseModel):
    camera_raw_adjustments: str
    curve_refinement: str
    hsl_refinement: str
    atmosphere: Dict[str, Any]

# --- ROOT RESPONSE ---

class LightroomData(BaseModel):
    brief: Optional[TacticalBrief] = None
    histogram: ProHistogram
    basic_panel: TonePresenceParams
    curve: AdvancedCurve
    hsl: FullHSLData
    split_toning: TrinityGrading
    spectrum: Optional[List[SpectralChannel]] = None # For the Matrix display

class AnalysisResponse(BaseModel):
    lightroom: LightroomData
    composition: CompositionData
    photoshop: Optional[PhotoshopData] = None
    review: Optional[Dict[str, Any]] = None # Legacy fallback
