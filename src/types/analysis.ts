export interface ColorAdjustment {
  hue: number;
  saturation: number;
  luminance: number;
  desc?: string;  // 【新增】HSL 调整原因描述（来自 Gemini 的 desc 字段）
  note?: string;  // 【新增】HSL 调整原因描述（后端可能使用 note 字段，兼容）
  reason?: string;  // 【向后兼容】HSL 调整原因描述（旧字段名）
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
    // 【修复】value 可以是 number（有实际色温值）或 null（只有调整值）
    // adjustment 是调整值（相对值），用于在没有实际色温值时显示
    temp: { value: number | null; range: string; adjustment?: number; reason: string };
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
        // New field for vector data
        vectors?: {
            entry: { label: string, coords: number[] };
            focal: { label: string, coords: number[] };
            exit: { label: string, coords: number[] };
            path: number[][];
        };
    };
    zones: { 
        foreground: string; 
        midground: string; 
        background: string; 
        perspective: string;
        // New field for detailed depth data
        details?: {
            foreground: { content: string, range: number[] };
            midground: { content: string, range: number[] };
            background: { content: string, range: number[] };
        };
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
        // New field for detailed negative space data
        details?: {
            percentage: number;
            h_balance: string;
            v_balance: string;
        };
    };
    style: { 
        name: string; 
        method: string; 
        features: string; 
    };
    // 【新增】Visual Mass 功能所需的数据（视觉质量/视觉重心）
    visual_data?: {
        saliency_mask_url?: string;  // 显著性遮罩图 URL（优先使用）
        subject_poly?: string;  // SVG polygon points 格式（后备方案）
        visual_mass?: {
            type: string;
            confidence: number;
            score: number;  // 视觉吸引力分数 (0-100)
            composition_rule: string;  // 构图法则名称
            center_point: { x: number; y: number };  // 重心点（百分比格式 0-100）
            center_of_gravity: number[];  // 向后兼容字段
            vertices: number[][];  // 向后兼容字段
            polygon_points: Array<{ x: number; y: number }>;  // 多边形点集（百分比格式 0-100）
            saliency_mask_url?: string;
        };
    };
}

export interface LightroomData {
  // 【新增】元数据（包含 OpenCV 图像分析数据）
  meta?: {
    image_analysis?: any;
  };
  // 【新增】色彩分析数据
  color?: {
    scene_type?: string;
  };
  // 【新增】Part 2 分析数据
  analysis?: {
    scene_type?: string;
    lighting_strategy?: string;
    key_colors?: string[];
    dynamic_range_analysis?: string;
    color_calibration_strategy?: string;
  };
  // 【新增】Phase 1 提取数据
  phase_1_extraction?: {
    master_style_recap?: string;
    style_summary_recap?: string;
    key_adjustment_strategy?: string;
  };
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
  // 【新增】simulated_histogram 字段：用于显示 Gemini 输出的模拟直方图数据
  simulated_histogram?: {
    description?: string;  // 直方图形态描述（如："直方图呈现典型的'中间调堆积'形态..."）
    rgb_values?: { r: number; g: number; b: number };  // RGB 平均值
    histogram_data?: {  // 完整的直方图数据（256 个值，已插值）
      r: number[];
      g: number[];
      b: number[];
      l: number[];
    };
    palette_strip_description?: string;  // 调色板条描述
    stats_grid_description?: string;  // 统计网格描述
  };
  basic_panel: {
    temp: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    tint: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    exposure: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    contrast: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    highlights: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    shadows: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    whites: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    blacks: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    texture: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    clarity: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    dehaze: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    vibrance: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
    saturation: { value: number; range: string; reason: string; min?: number; max?: number; target_min?: number; target_max?: number };
  };
  curve: {
    rgb: [number, number][];
    red: [number, number][];
    green: [number, number][];
    blue: [number, number][];
    analysis: { rgb: string; red: string }; // Simplified
    tips: string[];
    reason: string;
  };
  hsl: HSLData;
  split_toning: {
    highlights: { hue: number; saturation: number; reason: string };
    midtones: { hue: number; saturation: number; reason: string };
    shadows: { hue: number; saturation: number; reason: string };
    balance: { value: number; min: number; max: number; target_min: number; target_max: number; reason: string };
  };
  // 【新增】白平衡数据（用于 COLOR MATCH PROTOCOL 区域）
  white_balance?: {
    temp?: { value: number; target_min?: number; target_max?: number; reason?: string };
    tint?: { value: number; target_min?: number; target_max?: number; reason?: string };
  };
  // 【新增】色彩分级数据（用于 COLOR MATCH PROTOCOL 区域）
  // 【更新】添加 luminance 字段，用于显示明度调整
  color_grading?: {
    highlights?: { hue: number; saturation: number; luminance?: number; reason?: string };
    midtones?: { hue: number; saturation: number; luminance?: number; reason?: string };
    shadows?: { hue: number; saturation: number; luminance?: number; reason?: string };
    balance?: number;
    blending?: number;  // 【新增】混合滑块
  };
  // 【新增】相机校准数据（用于模仿胶片/电影感）
  calibration?: {
    red_primary?: { hue: number; saturation: number; note?: string };
    green_primary?: { hue: number; saturation: number; note?: string };
    blue_primary?: { hue: number; saturation: number; note?: string };
    shadows_tint?: number;
  };
  // 【新增】构图数据（用于构图分析面板）
  composition?: CompositionData;
  
  // 【新增】影调分区分析数据（用于精准仿色）
  tonal_zone_analysis?: {
    note?: string;
    highlights_zone?: {
      elements: string;
      color_treatment: string;
      detail_treatment: string;
      target_rgb?: { r: number; g: number; b: number };
      brightness_range?: string;
    };
    midtones_zone?: {
      elements: string;
      color_treatment: string;
      detail_treatment: string;
      target_rgb?: { r: number; g: number; b: number };
      brightness_range?: string;
    };
    shadows_zone?: {
      elements: string;
      color_treatment: string;
      detail_treatment: string;
      target_rgb?: { r: number; g: number; b: number };
      brightness_range?: string;
      black_point_lifted?: boolean;
    };
  };
  
  // 【新增】局部调整蒙版数据（用于精准仿色）
  local_adjustments_masks?: {
    note?: string;
    masks: Array<{
      mask_id?: number;
      mask_name: string;
      mask_type: string;
      mask_target: string;
      mask_parameters?: {
        luminosity_range?: { min: number; max: number; feather?: number };
        color_range?: { hue_center: number; hue_range: number; saturation_min?: number };
        gradient?: { start_y_percent: number; end_y_percent: number; angle?: number };
        radial?: { center_x_percent: number; center_y_percent: number; radius_percent: number; feather?: number };
        invert?: boolean;
      };
      adjustments: {
        exposure?: string;
        contrast?: string;
        highlights?: string;
        shadows?: string;
        whites?: string;
        blacks?: string;
        temperature?: string;
        tint?: string;
        saturation?: string;
        clarity?: string;
        dehaze?: string;
        sharpness?: string;
      };
      reason: string;
    }>;
  };
}

export interface PhotoshopData {
    layers: Array<{
        name: string;
        blend_mode: string;
        opacity: number;
        mask?: string;
        adjustments?: Record<string, any>;
    }>;
    operations: string[];
}

export interface FullAnalysisData {
  review: {
    style_summary: string;
    comprehensive_review: string;
    pros_evaluation: string;
    // 新增字段
    master_archetype?: string;
    visual_signature?: string;
    saturation_strategy?: string;
    tonal_intent?: string;
    simulated_histogram_data?: {
        reference: number[];
        user: number[];
        description?: string;
        ref_description?: string;
    };
    emotion?: string;
    visual_subject_analysis?: string;
    focus_exposure_analysis?: string;
    parameter_comparison_table?: any[];
    feasibility_assessment?: any;
    overlays?: any;
    // 【新增】图像验证描述字段
    // 用于前端在参考图和用户图下方显示图像内容描述
    image_verification?: {
      ref_image_content?: string;
      user_image_content?: string;
    };
  };
  lighting: {
      exposure_control: Array<{ param: string; range: string; desc: string }>;
  };
  color: ColorSchemeData;
  composition: CompositionData;
  lightroom: LightroomData;
  photoshop: PhotoshopData;
}

// AI 诊断相关类型定义
export interface DiagnosisRegion {
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax], 0-1000
}

export interface DiagnosisScoreDetail {
    value: number;
    description: string;
    regions?: DiagnosisRegion[];
}

export interface DiagnosisResult {
  scores: {
    exposure: number | DiagnosisScoreDetail;
    color: number | DiagnosisScoreDetail;
    composition: number | DiagnosisScoreDetail;
    mood: number | DiagnosisScoreDetail;
  };
  critique: string;
  suggestions: string[];
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    region?: string | null;
  }>;
  processingTime?: number;
}
