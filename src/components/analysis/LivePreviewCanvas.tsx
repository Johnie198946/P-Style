import React, { useRef, useEffect, useState, useMemo, useContext, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ImageEngine, FilterParams, DEFAULT_PARAMS } from '../../src/lib/ImageEngine';
import { Loader2, Layers, Eye, EyeOff, AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================================================
// 【图层键名定义】与 LightroomPanel 中的 handleSoloToggle 保持一致
// ============================================================================
export type LayerKey = 
  | 'temperature' | 'tint' 
  | 'exposure' | 'contrast' | 'highlights' | 'shadows' | 'whites' | 'blacks'
  | 'shadowTint' | 'midtoneTint' | 'highlightTint'
  | 'hslRed' | 'hslOrange' | 'hslYellow' | 'hslGreen' | 'hslCyan' | 'hslBlue' | 'hslPurple' | 'hslMagenta'
  | 'curve' | 'curveRgb' | 'curveRed' | 'curveGreen' | 'curveBlue' | 'saturation' | 'vibrance';

// 【修复】内置翻译，避免依赖 LanguageContext
const translations: Record<string, Record<string, string>> = {
  en: {
    'layer_stack': 'LAYER STACK',
    'layers_selected': 'SELECTED',
    'clear_solo': 'Show Original',
    'select_all_supported': 'Apply All',
    'initializing': 'INITIALIZING...',
    'wb_group': 'White Balance',
    'tone_group': 'Tone',
    'grading_group': 'Color Grading',
    'hsl_group': 'HSL',
    'other_group': 'Other',
    'temp': 'Temp',
    'tint': 'Tint',
    'exposure': 'Exposure',
    'contrast': 'Contrast',
    'highlights': 'Highlights',
    'shadows': 'Shadows',
    'whites': 'Whites',
    'blacks': 'Blacks',
    'shadow_tint': 'Shadow Tint',
    'midtone_tint': 'Midtone Tint',
    'highlight_tint': 'Highlight Tint',
    'reds': 'Red',
    'orange': 'Orange',
    'yellows': 'Yellow',
    'greens': 'Green',
    'cyans': 'Cyan',
    'blues': 'Blue',
    'purples': 'Purple',
    'magentas': 'Magenta',
    'curve': 'All Curves',
    'curveRgb': 'RGB Curve',
    'curveRed': 'Red Curve',
    'curveGreen': 'Green Curve',
    'curveBlue': 'Blue Curve',
    'saturation': 'Saturation',
    'vibrance': 'Vibrance',
  },
  zh: {
    'layer_stack': '图层堆栈',
    'layers_selected': '已选择',
    'clear_solo': '显示原图',
    'select_all_supported': '应用全部',
    'initializing': '初始化中...',
    'wb_group': '白平衡',
    'tone_group': '影调',
    'grading_group': '色彩分级',
    'hsl_group': 'HSL',
    'other_group': '其他',
    'temp': '色温',
    'tint': '色调',
    'exposure': '曝光',
    'contrast': '对比度',
    'highlights': '高光',
    'shadows': '阴影',
    'whites': '白色',
    'blacks': '黑色',
    'shadow_tint': '阴影色调',
    'midtone_tint': '中间调色调',
    'highlight_tint': '高光色调',
    'reds': '红',
    'orange': '橙',
    'yellows': '黄',
    'greens': '绿',
    'cyans': '青',
    'blues': '蓝',
    'purples': '紫',
    'magentas': '洋红',
    'curve': '全部曲线',
    'curveRgb': 'RGB 曲线',
    'curveRed': '红色曲线',
    'curveGreen': '绿色曲线',
    'curveBlue': '蓝色曲线',
    'saturation': '饱和度',
    'vibrance': '自然饱和度',
  }
};

// 【新增】实时直方图数据类型
export interface LiveHistogramData {
  r: number[];  // 256 个值，表示红色通道分布
  g: number[];  // 256 个值，表示绿色通道分布
  b: number[];  // 256 个值，表示蓝色通道分布
  l: number[];  // 256 个值，表示亮度分布
}

// ============================================================================
// 【直方图预测工具函数】
// 根据调整参数预测直方图的变化，而不是从渲染结果读取
// 这样更准确且性能更好
// ============================================================================

/**
 * 【直方图偏移函数】模拟曝光调整对直方图的影响
 * 曝光增加：直方图整体向右移动（变亮）
 * 曝光减少：直方图整体向左移动（变暗）
 */
const shiftHistogram = (histogram: number[], shift: number): number[] => {
  if (!histogram || histogram.length === 0) return histogram;
  const result = new Array(256).fill(0);
  for (let i = 0; i < 256; i++) {
    const newIndex = Math.max(0, Math.min(255, i + shift));
    result[newIndex] += histogram[i] || 0;
  }
  // 归一化
  const max = Math.max(...result);
  return result.map(v => max > 0 ? Math.round((v / max) * 100) : 0);
};

/**
 * 【直方图拉伸/压缩函数】模拟对比度调整对直方图的影响
 * 对比度增加：直方图向两端拉伸
 * 对比度减少：直方图向中间压缩
 */
const stretchHistogram = (histogram: number[], factor: number): number[] => {
  if (!histogram || histogram.length === 0) return histogram;
  const result = new Array(256).fill(0);
  const center = 128;
  for (let i = 0; i < 256; i++) {
    // 以128为中心进行拉伸/压缩
    const newIndex = Math.round(center + (i - center) * factor);
    const clampedIndex = Math.max(0, Math.min(255, newIndex));
    result[clampedIndex] += histogram[i] || 0;
  }
  // 归一化
  const max = Math.max(...result);
  return result.map(v => max > 0 ? Math.round((v / max) * 100) : 0);
};

/**
 * 【预测直方图变化】根据调整参数预测直方图
 * @param baseHistogram 基础直方图（原图）
 * @param params 调整参数
 * @returns 预测后的直方图
 */
export const predictHistogram = (
  baseHistogram: { r: number[]; g: number[]; b: number[]; l: number[] },
  params: FilterParams
): LiveHistogramData => {
  // 计算曝光偏移量（-5 到 +5 对应 -128 到 +128 的像素偏移）
  const exposureShift = Math.round((params.exposure || 0) * 25);
  
  // 计算对比度因子（-100 到 +100 对应 0.5 到 1.5 的拉伸因子）
  const contrastFactor = 1 + (params.contrast || 0) / 200;
  
  // 应用曝光偏移
  let r = shiftHistogram(baseHistogram.r, exposureShift);
  let g = shiftHistogram(baseHistogram.g, exposureShift);
  let b = shiftHistogram(baseHistogram.b, exposureShift);
  let l = shiftHistogram(baseHistogram.l, exposureShift);
  
  // 应用对比度拉伸
  r = stretchHistogram(r, contrastFactor);
  g = stretchHistogram(g, contrastFactor);
  b = stretchHistogram(b, contrastFactor);
  l = stretchHistogram(l, contrastFactor);
  
  // 高光调整：影响直方图右侧
  if (params.highlights && params.highlights !== 0) {
    const highlightShift = Math.round(params.highlights / 4);
    for (let i = 170; i < 256; i++) {
      const weight = (i - 170) / 85; // 0 到 1 的权重
      const shift = Math.round(highlightShift * weight);
      const newIdx = Math.max(0, Math.min(255, i + shift));
      // 简化处理：直接移动
      l[newIdx] = Math.max(l[newIdx], l[i]);
    }
  }
  
  // 阴影调整：影响直方图左侧
  if (params.shadows && params.shadows !== 0) {
    const shadowShift = Math.round(params.shadows / 4);
    for (let i = 0; i < 86; i++) {
      const weight = (85 - i) / 85; // 1 到 0 的权重
      const shift = Math.round(shadowShift * weight);
      const newIdx = Math.max(0, Math.min(255, i + shift));
      l[newIdx] = Math.max(l[newIdx], l[i]);
    }
  }
  
  return { r, g, b, l };
};

interface LivePreviewCanvasProps {
  imageUrl: string;
  params: FilterParams;
  className?: string;
  // 【新增】支持多选的 Solo 模式
  soloLayers?: Set<string>;
  onSoloLayersChange?: (layers: Set<string>) => void;
  // 【新增】实时直方图回调
  onHistogramUpdate?: (histogram: LiveHistogramData) => void;
}

// 【新增】导出 ref 类型，供父组件使用
export interface LivePreviewCanvasRef {
  getCanvas: () => HTMLCanvasElement | null; // 获取 canvas 元素，用于截图
}

// 【修复】使用 forwardRef 支持外部访问 canvas 元素（用于迭代反馈功能截图）
export const LivePreviewCanvas = forwardRef<LivePreviewCanvasRef, LivePreviewCanvasProps>(({ 
  imageUrl, 
  params, 
  className,
  soloLayers = new Set(),
  onSoloLayersChange,
  onHistogramUpdate
}, ref) => {
  // 【修复】使用内置翻译，根据浏览器语言自动选择
  const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  const t = (key: string) => translations[lang][key] || translations['en'][key] || key;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // 【新增】使用 useImperativeHandle 暴露 canvas 元素给父组件（用于迭代反馈功能截图）
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }), []);

  // ============================================================================
  // 【计算实际应用的参数】根据 Solo 模式过滤参数
  // 【重要逻辑修正】：
  // - 如果没有任何 Solo 选中 → 显示原图（使用默认参数，不应用任何调整）
  // - 如果有 Solo 选中 → 只应用选中图层的参数
  // ============================================================================
  const activeParams = useMemo(() => {
    const hasSolo = soloLayers.size > 0;
    
    // 【修复】如果没有 Solo 选中，返回默认参数（显示原图）
    if (!hasSolo) {
      console.log('[LivePreviewCanvas] 无 Solo 选中，显示原图');
      return DEFAULT_PARAMS;
    }
    
    // Solo 模式：只应用选中图层的参数，其他归零
    const result: FilterParams = { ...DEFAULT_PARAMS };
    
    // 图层键名到参数的映射
    if (soloLayers.has('temperature')) result.temperature = params.temperature;
    if (soloLayers.has('tint')) result.tint = params.tint;
    if (soloLayers.has('exposure')) result.exposure = params.exposure;
    if (soloLayers.has('contrast')) result.contrast = params.contrast;
    if (soloLayers.has('highlights')) result.highlights = params.highlights;
    if (soloLayers.has('shadows')) result.shadows = params.shadows;
    if (soloLayers.has('whites')) result.whites = params.whites;
    if (soloLayers.has('blacks')) result.blacks = params.blacks;
    if (soloLayers.has('saturation')) result.saturation = params.saturation;
    if (soloLayers.has('vibrance')) result.vibrance = params.vibrance;
    
    // 色彩分级
    if (soloLayers.has('shadowTint')) {
      result.shadowsHue = params.shadowsHue;
      result.shadowsSat = params.shadowsSat;
    }
    if (soloLayers.has('midtoneTint')) {
      result.midtonesHue = params.midtonesHue;
      result.midtonesSat = params.midtonesSat;
    }
    if (soloLayers.has('highlightTint')) {
      result.highlightsHue = params.highlightsHue;
      result.highlightsSat = params.highlightsSat;
    }
    // ============================================================================
    // 【色彩分级平衡逻辑】
    // 用户操作流程：
    // 1. 先点击"阴影/中间调/高光"色轮 → 预览色彩分级效果（此时 balance = 0）
    // 2. 再点击"平衡" → 在已有色彩分级基础上调整阴影/高光影响范围
    // ============================================================================
    const hasAnyGrading = soloLayers.has('shadowTint') || soloLayers.has('midtoneTint') || soloLayers.has('highlightTint');
    const hasBalance = soloLayers.has('gradingBalance');
    
    if (hasBalance) {
      // 用户选中了"平衡"，应用用户设置的 balance 值
      result.gradingBalance = params.gradingBalance;
      console.log('[LivePreviewCanvas] 平衡已选中，应用 balance:', params.gradingBalance);
    } else if (hasAnyGrading) {
      // 用户只选中了色彩分级（阴影/中间调/高光），使用默认 balance = 0
      result.gradingBalance = 0;
      console.log('[LivePreviewCanvas] 色彩分级已选中，使用默认 balance: 0');
    }
    // 如果两者都没选中，gradingBalance 保持 undefined（不影响预览）
    
    // 【新增】HSL 调整
    if (params.hsl) {
      // 初始化 HSL 对象
      if (!result.hsl) {
        result.hsl = {};
      }
      
      if (soloLayers.has('hslRed') && params.hsl.red) {
        result.hsl.red = params.hsl.red;
      }
      if (soloLayers.has('hslOrange') && params.hsl.orange) {
        result.hsl.orange = params.hsl.orange;
      }
      if (soloLayers.has('hslYellow') && params.hsl.yellow) {
        result.hsl.yellow = params.hsl.yellow;
      }
      if (soloLayers.has('hslGreen') && params.hsl.green) {
        result.hsl.green = params.hsl.green;
      }
      if (soloLayers.has('hslCyan') && params.hsl.cyan) {
        result.hsl.cyan = params.hsl.cyan;
      }
      if (soloLayers.has('hslBlue') && params.hsl.blue) {
        result.hsl.blue = params.hsl.blue;
      }
      if (soloLayers.has('hslPurple') && params.hsl.purple) {
        result.hsl.purple = params.hsl.purple;
      }
      if (soloLayers.has('hslMagenta') && params.hsl.magenta) {
        result.hsl.magenta = params.hsl.magenta;
      }
    }
    
    // 曲线 - 简化为只支持 RGB 主曲线
    // 'curve' 或 'curveRgb' 都会应用 RGB 主曲线
    if (soloLayers.has('curve') || soloLayers.has('curveRgb')) {
      result.curve = params.curve;
      console.log('[LivePreviewCanvas] 应用曲线，params.curve:', params.curve);
    }
    
    console.log('[LivePreviewCanvas] Solo 模式，应用图层:', Array.from(soloLayers));
    console.log('[LivePreviewCanvas] 输入 params.hsl:', params.hsl);
    console.log('[LivePreviewCanvas] 输出 result.hsl:', result.hsl);
    
    return result;
  }, [params, soloLayers]);

  // Initialize Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('[LivePreviewCanvas] 初始化，imageUrl:', imageUrl);

    try {
      const engine = new ImageEngine(canvasRef.current);
      engineRef.current = engine;
      console.log('[LivePreviewCanvas] ImageEngine 创建成功');

      // Load Image
      const img = new Image();
      img.crossOrigin = "anonymous"; // 【修复】使用小写
      img.src = imageUrl;
      
      console.log('[LivePreviewCanvas] 开始加载图片:', imageUrl);
      
      img.onload = () => {
        console.log('[LivePreviewCanvas] 图片加载成功，原始尺寸:', img.naturalWidth, 'x', img.naturalHeight);
        
        // 【修复】设置 canvas 尺寸为图片原始尺寸
        // WebGL 渲染完整图片，CSS max-width/max-height 负责缩放显示
        if (canvasRef.current) {
          canvasRef.current.width = img.naturalWidth;
          canvasRef.current.height = img.naturalHeight;
          console.log('[LivePreviewCanvas] Canvas 尺寸设置为:', img.naturalWidth, 'x', img.naturalHeight);
        }
        
        // 记录容器尺寸（用于调试）
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          console.log('[LivePreviewCanvas] 容器尺寸:', containerWidth, 'x', containerHeight);
          setCanvasSize({ width: img.naturalWidth, height: img.naturalHeight });
        }
        
        engine.loadImage(img);
        setIsLoading(false);
        
        // 【重要】初始渲染时应用参数
        engine.render(activeParams);
      };

      img.onerror = (e) => {
        console.error('[LivePreviewCanvas] 图片加载失败:', e);
        setError("Failed to load image");
        setIsLoading(false);
      };

    } catch (err) {
      console.error("[LivePreviewCanvas] WebGL Init Failed:", err);
      setError("WebGL not supported");
      setIsLoading(false);
    }
  }, [imageUrl]); // 只在 imageUrl 变化时重新初始化

  // 【新增】从 Canvas 计算实时直方图
  // ============================================================================
  // 【直方图预测】根据调整参数预测直方图变化
  // 
  // 【设计原理】：
  // 1. 基础直方图：使用 Gemini 分析的原图直方图数据
  // 2. 预测变化：根据用户选择的调整参数，预测直方图会如何变化
  //    - 曝光：直方图整体左右移动
  //    - 对比度：直方图拉伸/压缩
  //    - 高光/阴影：影响直方图的特定区域
  // 
  // 【优点】：
  // - 不需要从 WebGL canvas 读取像素（性能更好）
  // - 更准确地反映调整效果
  // - 与 Lightroom 的行为一致
  // ============================================================================

  // 【重要】参数变化时重新渲染
  useEffect(() => {
    if (!engineRef.current || isLoading) return;
    engineRef.current.render(activeParams);
    
    // 【注意】直方图预测现在由 LightroomPanel 处理
    // 这里不再需要计算直方图
  }, [activeParams, isLoading]);

  // 【图层分组定义】用于图层面板显示
  // 【更新】所有功能现在都已支持
  const layerGroups = [
    {
      name: t('wb_group'),
      layers: [
        { key: 'temperature' as const, label: t('temp'), supported: true },
        { key: 'tint' as const, label: t('tint'), supported: true },
      ]
    },
    {
      name: t('tone_group'),
      layers: [
        { key: 'exposure' as const, label: t('exposure'), supported: true },
        { key: 'contrast' as const, label: t('contrast'), supported: true },
        { key: 'highlights' as const, label: t('highlights'), supported: true },
        { key: 'shadows' as const, label: t('shadows'), supported: true },
        { key: 'whites' as const, label: t('whites'), supported: true },
        { key: 'blacks' as const, label: t('blacks'), supported: true },
      ]
    },
    {
      name: t('grading_group'),
      layers: [
        { key: 'shadowTint' as const, label: t('shadow_tint'), supported: true },
        { key: 'midtoneTint' as const, label: t('midtone_tint'), supported: true },
        { key: 'highlightTint' as const, label: t('highlight_tint'), supported: true },
      ]
    },
    {
      name: t('hsl_group'),
      layers: [
        { key: 'hslRed' as const, label: t('reds'), supported: true },
        { key: 'hslOrange' as const, label: t('orange'), supported: true },
        { key: 'hslYellow' as const, label: t('yellows'), supported: true },
        { key: 'hslGreen' as const, label: t('greens'), supported: true },
        { key: 'hslCyan' as const, label: t('cyans'), supported: true },
        { key: 'hslBlue' as const, label: t('blues'), supported: true },
        { key: 'hslPurple' as const, label: t('purples'), supported: true },
        { key: 'hslMagenta' as const, label: t('magentas'), supported: true },
      ]
    },
    {
      name: t('other_group'),
      layers: [
        { key: 'curve' as const, label: t('curve'), supported: true },
        { key: 'saturation' as const, label: t('saturation'), supported: true },
        { key: 'vibrance' as const, label: t('vibrance'), supported: true },
      ]
    },
  ];

  // 切换单个图层的 Solo 状态
  const toggleSoloLayer = (key: string) => {
    if (!onSoloLayersChange) return;
    const newSet = new Set(soloLayers);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    onSoloLayersChange(newSet);
  };

  // 清除所有 Solo
  const clearAllSolo = () => {
    onSoloLayersChange?.(new Set());
  };

  // 全选支持的图层（应用全部调整）
  const selectAllSupported = () => {
    const allSupported = new Set<string>();
    layerGroups.forEach(group => {
      group.layers.forEach(layer => {
        if (layer.supported) {
          allSupported.add(layer.key);
        }
      });
    });
    onSoloLayersChange?.(allSupported);
  };
  
  // 检查是否全部选中
  const isAllSelected = useMemo(() => {
    let totalSupported = 0;
    layerGroups.forEach(group => {
      group.layers.forEach(layer => {
        if (layer.supported) totalSupported++;
      });
    });
    return soloLayers.size === totalSupported;
  }, [soloLayers, layerGroups]);

  return (
    <div className={cn("relative bg-[#050505] flex flex-col overflow-hidden", className)}>
      {/* Header: 图层控制栏 */}
      <div className="shrink-0 h-9 border-b border-white/10 flex items-center px-3 justify-between bg-[#080808]">
        <button 
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="flex items-center gap-1.5 text-[9px] font-bold text-white/60 uppercase tracking-widest hover:text-white/80 transition-colors"
        >
          <Layers className="w-3 h-3" /> 
          {t('layer_stack')}
          {showLayerPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        
        {/* 当前 Solo 状态指示 */}
        {soloLayers.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
              SOLO: {soloLayers.size} {t('layers_selected')}
            </span>
            <button 
              onClick={clearAllSolo}
              className="text-[8px] text-white/40 hover:text-white/70 flex items-center gap-1"
              title={t('clear_solo')}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 图层面板（可折叠） */}
      {showLayerPanel && (
        <div className="shrink-0 max-h-48 overflow-y-auto border-b border-white/10 bg-[#0a0a0a] custom-scrollbar">
          {/* 快捷操作 */}
          <div className="flex gap-2 p-2 border-b border-white/5">
            <button 
              onClick={selectAllSupported}
              className="text-[8px] px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
            >
              {t('select_all_supported')}
            </button>
            <button 
              onClick={clearAllSolo}
              className="text-[8px] px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
            >
              {t('clear_solo')}
            </button>
          </div>
          
          {/* 图层分组 */}
          {layerGroups.map((group, gi) => (
            <div key={gi} className="border-b border-white/5 last:border-b-0">
              <div className="text-[8px] font-bold text-white/30 uppercase px-2 py-1 bg-white/[0.02]">
                {group.name}
              </div>
              <div className="flex flex-wrap gap-1 p-2">
                {group.layers.map(layer => {
                  const isSelected = soloLayers.has(layer.key);
                  return (
                    <button
                      key={layer.key}
                      onClick={() => layer.supported && toggleSoloLayer(layer.key)}
                      disabled={!layer.supported}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono transition-all",
                        !layer.supported && "opacity-30 cursor-not-allowed",
                        layer.supported && isSelected && "bg-blue-500/30 text-blue-300 border border-blue-500/50",
                        layer.supported && !isSelected && "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      {isSelected ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      {layer.label}
                      {!layer.supported && <span className="text-[6px] ml-1 opacity-50">N/A</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Canvas Area - 【修复】确保图片完整显示 */}
      <div 
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center bg-black/50 p-2 min-h-0 overflow-hidden"
      >
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(45deg,#222_25%,transparent_25%,transparent_75%,#222_75%,#222),linear-gradient(45deg,#222_25%,transparent_25%,transparent_75%,#222_75%,#222)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]"></div>

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-[8px] font-mono text-blue-500/80 animate-pulse">
              {t('initializing')}
            </span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-[8px] font-mono text-red-500/80">{error}</span>
          </div>
        )}

        {/* 画布 - 【修复】使用绝对定位和 object-fit 确保完整显示 */}
        <canvas 
          ref={canvasRef} 
          className="shadow-2xl max-w-full max-h-full"
          style={{
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
      
      {/* Bottom Info */}
      <div className="shrink-0 h-5 border-t border-white/10 bg-[#080808] flex items-center px-2 justify-between">
        <div className="text-[7px] font-mono text-white/30">WEBGL 2.0</div>
        <div className={cn(
          "text-[7px] font-mono",
          soloLayers.size > 0 ? (isAllSelected ? "text-emerald-400" : "text-blue-400") : "text-gray-500"
        )}>
          {soloLayers.size > 0 
            ? (isAllSelected ? '✓ ALL ADJUSTMENTS APPLIED' : `SOLO (${soloLayers.size})`) 
            : '○ ORIGINAL IMAGE'}
        </div>
      </div>
    </div>
  );
});

// 【新增】设置 displayName，便于 React DevTools 调试
LivePreviewCanvas.displayName = 'LivePreviewCanvas';
