/**
 * 综合分析面板配置
 * 定义文本字段和坐标字段的映射关系
 * 
 * 核心逻辑：
 * - id: 唯一标识符，用于状态管理
 * - textKey: 对应 JSON module_1_critique 下的文本字段名
 * - boxSuffix: 对应 spatial_analysis 下的坐标后缀（会自动拼装 ref_ 或 user_ 前缀）
 * - color: 专属颜色，用于高亮显示
 */

export interface AnalysisSectionConfig {
  id: string; // 唯一标识符（如 "visual_subject"）
  title: string; // 显示标题（如 "视觉主体分析"）
  textKey: string; // 对应 JSON 字段名（如 "visual_subject_analysis"）
  boxSuffix: string; // 坐标字段后缀（如 "visual_subject"），会自动拼装为 "ref_visual_subject" 或 "user_visual_subject"
  color: string; // 专属颜色（十六进制）
}

export const ANALYSIS_SECTIONS: AnalysisSectionConfig[] = [
  {
    id: "visual_subject", // 唯一标识符
    title: "视觉主体分析",
    // 对应 JSON module_1_critique 下的文本字段名
    textKey: "visual_subject_analysis", 
    // 对应 spatial_analysis 下的坐标后缀（会自动拼装 ref_ 或 user_）
    boxSuffix: "visual_subject",
    color: "#FF5733" // 专属颜色：橙红
  },
  {
    id: "focus_exposure",
    title: "焦点与曝光",
    textKey: "focus_exposure_analysis",
    boxSuffix: "focus_exposure",
    color: "#33FF57" // 专属颜色：亮绿
  },
  {
    id: "color_depth",
    title: "色彩与氛围",
    textKey: "emotion", // 【修复】使用 emotion 字段，因为 color_depth_analysis 可能不存在
    boxSuffix: "color_depth",
    color: "#3357FF" // 专属颜色：亮蓝
  }
];

/**
 * 根据 section id 获取配置
 */
export const getSectionConfig = (id: string): AnalysisSectionConfig | undefined => {
  return ANALYSIS_SECTIONS.find(section => section.id === id);
};

/**
 * 根据 textKey 获取配置
 */
export const getSectionConfigByTextKey = (textKey: string): AnalysisSectionConfig | undefined => {
  return ANALYSIS_SECTIONS.find(section => section.textKey === textKey);
};

