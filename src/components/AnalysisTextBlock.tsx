import React from 'react';
import { AnalysisSectionConfig } from './config/AnalysisConfig';

interface AnalysisTextBlockProps {
  sectionConfig: AnalysisSectionConfig;
  content: string | { text?: string } | undefined; // 支持字符串或对象格式
  isActive: boolean; // 是否激活（高亮状态）
  onClick: () => void; // 点击回调，用于激活对应的图片区域
}

/**
 * 交互式文本块组件
 * 点击文字时高亮对应的图片区域
 * 
 * 核心逻辑：
 * - 点击文本块时调用 onClick，设置 activeId
 * - 根据 isActive 状态改变背景色和边框颜色
 * - 支持 content 为字符串或对象格式（兼容 color_depth_analysis）
 */
export const AnalysisTextBlock: React.FC<AnalysisTextBlockProps> = ({ 
  sectionConfig, 
  content, 
  isActive, 
  onClick 
}) => {
  // 处理 content 可能是对象的情况（如 color_depth_analysis）
  // 支持多种格式：字符串、对象（包含 text 字段）、对象（包含 description 字段）、或 undefined
  const text = typeof content === 'string' 
    ? content 
    : (content && typeof content === 'object' && 'text' in content)
      ? content.text 
      : (content && typeof content === 'object' && 'description' in content)
        ? content.description
        : "暂无分析";

  return (
    <div 
      onClick={onClick}
      className={`
        mb-6 p-4 rounded-lg cursor-pointer transition-all duration-300 border-l-4
        ${isActive 
          ? 'bg-gray-800 shadow-lg transform scale-[1.02]' 
          : 'bg-transparent border-transparent hover:bg-gray-900'}
      `}
      // 动态内联样式处理边框颜色（Tailwind 动态类名有时会失效）
      style={{ 
        borderColor: isActive ? sectionConfig.color : 'transparent',
        borderLeftWidth: '4px'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 
          className="font-bold text-lg transition-colors duration-300" 
          style={{ color: isActive ? sectionConfig.color : '#9CA3AF' }}
        >
          {sectionConfig.title}
        </h3>
        {isActive && (
          <span 
            className="text-xs px-2 py-1 rounded bg-white/10"
            style={{ color: sectionConfig.color }}
          >
            Active
          </span>
        )}
      </div>
      
      <p 
        className={`text-sm leading-relaxed transition-colors duration-300 ${
          isActive ? 'text-gray-100' : 'text-gray-500'
        }`}
      >
        {text}
      </p>
    </div>
  );
};

