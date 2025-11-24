# PhotoScience Backend Engineering Requirements

## Overview
This document outlines the backend requirements to support the "Hollywood-grade" visualization features in the PhotoScience frontend. The backend (FastAPI + Gemini 1.5 Pro) must transition from generating simple text summaries to outputting a complex, strictly typed JSON structure.

## 1. Pydantic Data Models (`schemas.py`)

The backend **MUST** output JSON that adheres strictly to these Pydantic models. These models map 1:1 to the frontend TypeScript interfaces defined in `src/types/analysis.ts`.

```python
from pydantic import BaseModel, Field
from typing import List, Optional

# --- Shared Primitive Models ---

class RangeValue(BaseModel):
    """Used for Sliders (Lightroom) and generic ranges"""
    value: float = Field(..., description="Numeric value for the slider/graph")
    range_str: str = Field(..., description="Formatted string for display, e.g. '+20' or '-500K'")
    reason: str = Field(..., description="Short explanation for this specific adjustment")

class ColorPoint(BaseModel):
    """Used for Color Wheels (Highlights/Midtones/Shadows)"""
    hue: float = Field(..., ge=0, le=360)
    saturation: float = Field(..., ge=0, le=100)
    reason: str

class HSLChannel(BaseModel):
    """Used for HSL Matrix Visualization"""
    hue: float = Field(..., ge=-100, le=100)
    saturation: float = Field(..., ge=-100, le=100)
    luminance: float = Field(..., ge=-100, le=100)

# --- Module 1-3: Basic Analysis ---

class ReviewData(BaseModel):
    style_summary: str = Field(..., description="Short title, e.g. 'Cyberpunk Neo-Noir'")
    comprehensive_review: str
    pros_evaluation: str

class CompositionData(BaseModel):
    main_structure: str
    subject_weight_desc: str = Field(..., alias="subject_weight_description") # Note: Frontend expects { subject_weight: { description: string } }

class LightingExposureItem(BaseModel):
    param: str
    range: str
    desc: str

class LightingData(BaseModel):
    exposure_control: List[LightingExposureItem]
    # Note: Real Zone System data (histogram) is calculated client-side or via OpenCV, not LLM.

# --- Module 4: Color Scheme ---

class WhiteBalance(BaseModel):
    temp: RangeValue
    tint: RangeValue

class ColorGrading(BaseModel):
    highlights: ColorPoint
    midtones: ColorPoint
    shadows: ColorPoint
    balance: float = Field(..., ge=-100, le=100)

class HSLMatrix(BaseModel):
    red: HSLChannel
    orange: HSLChannel
    yellow: HSLChannel
    green: HSLChannel
    aqua: HSLChannel
    blue: HSLChannel
    purple: HSLChannel
    magenta: HSLChannel

class ColorSchemeData(BaseModel):
    style_key_points: str
    white_balance: WhiteBalance
    color_grading: ColorGrading
    hsl: HSLMatrix

# --- Module 5: Lightroom ---

class LRBasicPanel(BaseModel):
    temp: RangeValue
    tint: RangeValue
    exposure: RangeValue
    contrast: RangeValue
    highlights: RangeValue
    shadows: RangeValue
    whites: RangeValue
    blacks: RangeValue
    texture: RangeValue
    clarity: RangeValue
    dehaze: RangeValue
    vibrance: RangeValue
    saturation: RangeValue

class LRCurve(BaseModel):
    reason: str
    # Optional: Add specific control points if needed in future
    
class LRSplitToning(BaseModel):
    highlights: ColorPoint
    shadows: ColorPoint
    balance: RangeValue

class LightroomData(BaseModel):
    histogram: dict # Placeholder, usually empty from LLM, calculated by OpenCV
    basic_panel: LRBasicPanel
    curve: LRCurve
    split_toning: LRSplitToning

# --- Module 6: Photoshop ---

class PSSelectiveColor(BaseModel):
    color: str # e.g., "Reds", "Cyans"
    adjustments: dict # { c: int, m: int, y: int, k: int }
    method: str # "Relative" | "Absolute"
    reason: str

class PSLocalAdj(BaseModel):
    tool: str # "Dodge" | "Burn" | "Brush"
    location: str
    params: str
    reason: str

class PSAtmosphere(BaseModel):
    technique: str
    opacity: int
    blend_mode: str
    color: str # Hex code
    reason: str

class PSSharpening(BaseModel):
    technique: str
    amount: int
    radius: float
    threshold: int
    reason: str

class PSGrain(BaseModel):
    amount: int
    size: int
    roughness: int
    reason: str

class PhotoshopData(BaseModel):
    camera_raw_adjustments: str
    curve_refinement: str
    hsl_refinement: str
    selective_color: List[PSSelectiveColor]
    local_adjustments: List[PSLocalAdj]
    atmosphere: PSAtmosphere
    sharpening: PSSharpening
    grain: PSGrain

# --- ROOT RESPONSE ---

class FullAnalysisResponse(BaseModel):
    review: ReviewData
    composition: CompositionData
    lighting: LightingData
    color_scheme: ColorSchemeData
    lightroom: LightroomData
    photoshop: PhotoshopData
```

## 2. Gemini System Prompt Strategy

Configure the Generative Model with the following System Instruction.

**Role Definition:**
> You are a world-class Senior Colorist and Retoucher working in a high-end Hollywood post-production house. You are an expert in the Ansel Adams Zone System, Color Theory, Lightroom pipelines, and Photoshop compositing.

**Task:**
> Analyze the provided image and generate a complete "Reconstruction Protocol" JSON. Your goal is to reverse-engineer the visual style so a user can replicate it exactly.

**Critical Instructions for Numeric Estimation (The "Visual Engine"):**

1.  **Color Grading (Wheel):**
    *   **Split Toning is Key:** Do not default to 0. Analyze the image's color separation.
    *   *Example:* If shadows are teal/blue, set `shadows.hue` to ~180-210.
    *   *Example:* If skin tones (highlights) are warm, set `highlights.hue` to ~30-45.

2.  **Lightroom Simulation:**
    *   **Physical Sliders:** Estimate the slider values (-100 to +100) needed to transform a "flat" raw file into this look.
    *   *Contrast:* If the image is punchy, `contrast` must be positive (e.g., +20).
    *   *Matte Look:* If blacks are faded, the `curve.reason` must mention "Lifted black point".

3.  **HSL Matrix:**
    *   **Specific Shifts:**
    *   *Desaturated Greens:* If foliage looks moody, set `green.saturation` to -40.
    *   *Teal Shift:* If blues look aqua, shift `blue.hue` towards negative.

4.  **Photoshop Layers (Visuals):**
    *   **Atmosphere:** If there is glow/bloom, propose a specific `color` (Hex code) and `blend_mode` (e.g., "Screen", "Linear Dodge").
    *   **Grain:** If the image looks filmic, provide `grain` params (amount, size, roughness).

**Output Requirement:**
> Return **ONLY** valid JSON matching the `FullAnalysisResponse` schema. Do not include markdown formatting like ```json.

## 3. API Logic & Architecture

### A. Zone System (Exposure)
*   **The LLM cannot see raw pixel data accurately enough for a real histogram.**
*   **Strategy:**
    *   Use **OpenCV** (Python) or **Canvas API** (Frontend) to calculate the *actual* Zone System histogram and distribution.
    *   Use the **LLM** only for the *interpretation* and textual advice (e.g., "Exposure is balanced, but contrast is high").
    *   The `ZoneSystemVisualizer` component in the frontend is already set up to handle raw image data if provided, or it can calculate it from the `imageSrc` canvas.

### B. Data Sanitization (Robustness)
*   LLMs may occasionally return `null` or omitting fields.
*   **Backend Responsibility:**
    *   Implement a sanitization layer before returning response to frontend.
    *   **Defaults:**
        *   If `grain` is missing -> `{ amount: 0, size: 0, roughness: 0, reason: "None" }`
        *   If `selective_color` is missing -> `[]`
        *   If `white_balance` is missing -> `{ temp: { value: 0, range_str: "0", reason: "Neutral" }, ... }`

### C. Hex Codes for Colors
*   For `Atmosphere` and `HSL`, ensure the LLM returns valid Hex codes (e.g., `#ff0000`). The frontend visualizer relies on these for the "Visual Cards".
