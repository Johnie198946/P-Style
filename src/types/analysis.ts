export interface ColorAdjustment {
  hue: number;
  saturation: number;
  luminance: number;
}

export interface HSLData {
  red: ColorAdjustment;
  orange: ColorAdjustment;
  yellow: ColorAdjustment;
  green: ColorAdjustment;
  aqua: ColorAdjustment;
  blue: ColorAdjustment;
  purple: ColorAdjustment;
  magenta: ColorAdjustment;
}

export interface ColorGradingPoint {
  hue: number;
  saturation: number;
  reason: string;
}

export interface ColorSchemeData {
  style_key_points: string;
  white_balance: {
    temp: { value: number; range: string; reason: string };
    tint: { value: number; range: string; reason: string };
  };
  color_grading: {
    highlights: ColorGradingPoint;
    midtones: ColorGradingPoint;
    shadows: ColorGradingPoint;
    balance: number;
  };
  hsl: HSLData;
}

export interface CompositionData {
    structure: { 
        visual_frame: string; 
        geometry: string; 
        balance: string;
    };
    subject: { 
        position: string; 
        weight_score: number; 
        method: string; 
        analysis: string;
    };
    lines: { 
        path: string[];
        guide?: string;
    };
    zones: { 
        foreground: string; 
        midground: string; 
        background: string; 
        perspective: string;
    };
    proportions: { 
        entities: string; 
        negative: string; 
        distribution: string;
    };
    balance: { 
        horizontal: string; 
        vertical: string; 
        strategy: string; 
    };
    style: { 
        name: string; 
        method: string; 
        features: string; 
    };
}

export interface LightroomData {
  histogram: {
    r: number[];
    g: number[];
    b: number[];
    l: number[];
    avg_l: number;
    shadows: number;
    midtones: number;
    highlights: number;
  };
  basic_panel: {
    temp: { value: number; range: string; reason: string };
    tint: { value: number; range: string; reason: string };
    exposure: { value: number; range: string; reason: string };
    contrast: { value: number; range: string; reason: string };
    highlights: { value: number; range: string; reason: string };
    shadows: { value: number; range: string; reason: string };
    whites: { value: number; range: string; reason: string };
    blacks: { value: number; range: string; reason: string };
    texture: { value: number; range: string; reason: string };
    clarity: { value: number; range: string; reason: string };
    dehaze: { value: number; range: string; reason: string };
    vibrance: { value: number; range: string; reason: string };
    saturation: { value: number; range: string; reason: string };
  };
  hsl: HSLData;
  curve: {
    rgb: Array<{x: number, y: number}>;
    red: Array<{x: number, y: number}>;
    green: Array<{x: number, y: number}>;
    blue: Array<{x: number, y: number}>;
    reason: string;
  };
  split_toning: {
    highlights: { hue: number; saturation: number; reason: string };
    shadows: { hue: number; saturation: number; reason: string };
    balance: { value: number; reason: string };
  };
  composition?: CompositionData;
}

export interface PhotoshopData {
  camera_raw_adjustments: string;
  curve_refinement: string;
  hsl_refinement: string;
  selective_color: Array<{
    color: string;
    adjustments: { c: number; m: number; y: number; k: number };
    method: "Relative" | "Absolute";
    reason: string;
  }>;
  local_adjustments: Array<{
    tool: "Dodge" | "Burn" | "Brush";
    location: string;
    params: string;
    reason: string;
  }>;
  atmosphere: {
    technique: string;
    opacity: number;
    blend_mode: string;
    color: string;
    reason: string;
  };
  sharpening: {
    technique: "High Pass" | "Unsharp Mask";
    amount: number;
    radius: number;
    threshold: number;
    reason: string;
  };
  grain: {
    amount: number;
    size: number;
    roughness: number;
    reason: string;
  };
}

export interface AdvancedPhotoshopData {
    histogram: {
        r: number[]; g: number[]; b: number[]; l: number[];
        avg_l: number; shadows: number; midtones: number; highlights: number;
    };
    cr_base: {
        temp: number; tint: number; exposure: number; contrast: number;
        highlights: number; shadows: number; whites: number; blacks: number;
        texture: number; clarity: number; dehaze: number;
        reason: string;
    };
    curves: {
        rgb: Array<{x: number, y: number}>;
        reason: string;
    };
    hsl: {
        red: { h:number, s:number, l:number }; orange: { h:number, s:number, l:number }; yellow: { h:number, s:number, l:number };
        green: { h:number, s:number, l:number }; aqua: { h:number, s:number, l:number }; blue: { h:number, s:number, l:number };
        purple: { h:number, s:number, l:number }; magenta: { h:number, s:number, l:number };
        reason: string;
    };
    selective_color: Array<{
        color: string;
        c: number; m: number; y: number; k: number;
        method: "Relative" | "Absolute";
        opacity: number; blend_mode: string;
        reason: string;
    }>;
    local_light: Array<{
        location: string; tool: "Dodge" | "Burn";
        params: string; opacity: number; blend_mode: string;
        reason: string;
    }>;
    atmosphere: {
        hardness: number; opacity: number; flow: number; color: string;
        reason: string;
    };
    sharpen: {
        technique: string; amount: number; radius: number; threshold: number;
        reason: string;
    };
    grain: {
        type: string; amount: number; size: number; roughness: number;
        reason: string;
    };
    vignette: {
        amount: number; midpoint: number; roundness: number; feather: number;
        reason: string;
    };
    levels: {
        black_input: number; white_input: number; gamma: number;
        black_output: number; white_output: number;
        blend_mode: string; opacity: number;
        reason: string;
    };
}

export interface FullAnalysisData {
  review: {
    style_summary: string;
    comprehensive_review: string;
    pros_evaluation: string;
  };
  composition: CompositionData;
  lighting?: {
    exposure_control: Array<{ param: string; range: string; desc: string }>;
    zone_system_data?: number[];
  };
  color_scheme?: ColorSchemeData;
  lightroom: LightroomData;
  photoshop: PhotoshopData | AdvancedPhotoshopData;
}
