import React, { useState } from 'react';
import { Layers, Maximize, ArrowRight, Box, Grid, Eye, X } from 'lucide-react';
import { VisualVectorsOverlay } from './VisualVectorsOverlay';
import { DirectorViewfinder } from './DirectorViewfinder';
import { useLanguage } from '../src/contexts/LanguageContext';

interface CompositionAnalysisPanelProps {
  data: any;
  refImageUrl: string;
  userImageUrl: string;
}

type ActiveLayer = 'flow' | 'depth' | 'weight' | null;

export const CompositionAnalysisPanel: React.FC<CompositionAnalysisPanelProps> = ({ 
  data, 
  refImageUrl, 
  userImageUrl 
}) => {
  const { t } = useLanguage();
  
  // 【数据提取】从新双宇宙结构中提取数据
  const refData = data?.module_2_composition?.reference_analysis || 
                  data?.composition?.structured?.reference_analysis;
  const clinicData = data?.module_2_composition?.composition_clinic || 
                     data?.composition?.structured?.composition_clinic;
  
  // 【交互状态】
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('flow');
  const [showClinic, setShowClinic] = useState(false); // 控制是否打开诊疗室

  // 【调试日志】
  if (process.env.NODE_ENV === 'development') {
    console.log('[CompositionAnalysisPanel] 接收到的数据:', {
      hasData: !!data,
      hasRefData: !!refData,
      hasClinicData: !!clinicData,
      refDataKeys: refData ? Object.keys(refData) : [],
      clinicDataKeys: clinicData ? Object.keys(clinicData) : [],
    });
  }

  // 【诊疗室模式】全屏显示 DirectorViewfinder
  if (showClinic) {
    return (
      <div className="fixed inset-0 z-50 bg-black animate-in slide-in-from-right">
        <button 
          onClick={() => setShowClinic(false)}
          className="absolute top-6 right-6 z-50 bg-white/10 text-white px-4 py-2 rounded hover:bg-white/20 flex items-center gap-2"
        >
          <X size={16} />
          {t('modal.composition.clinic_close') || '关闭诊疗室'}
        </button>
        {/* 复用之前写的 DirectorViewfinder，传入用户图和诊疗数据 */}
        <DirectorViewfinder 
          data={{ compositionClinic: clinicData }} 
          userImageUrl={userImageUrl} 
        />
      </div>
    );
  }

  // 【主面板模式】左侧参考图交互，右侧数据分析
  return (
    <div className="flex h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* === 左侧：参考图交互区 (The Standard) === */}
      <div className="flex-1 relative flex items-center justify-center bg-black p-6">
        <div className="relative max-h-full aspect-auto">
          <img 
            src={refImageUrl} 
            className="max-h-[80vh] object-contain opacity-80" 
            alt="Reference Image"
          />
          
          {/* 图层 A: 视觉流 (Vectors) */}
          {activeLayer === 'flow' && refData?.visual_flow && (
            <VisualVectorsOverlay 
              data={refData.visual_flow} 
              width={100} 
              height={100} 
            />
          )}

          {/* 图层 B: 空间深度 (Z-Depth Polygons) */}
          {activeLayer === 'depth' && (
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              {['foreground', 'midground', 'background'].map((plane, idx) => {
                const poly = refData?.spatial_depth?.[plane]?.polygon;
                if (!poly || !Array.isArray(poly) || poly.length === 0) return null;
                
                // 【修复】确保 polygon points 格式正确（数字，不是百分比字符串）
                const points = poly.map((p: any) => {
                  const x = typeof p.x === 'string' ? parseFloat(p.x.replace('%', '')) : p.x;
                  const y = typeof p.y === 'string' ? parseFloat(p.y.replace('%', '')) : p.y;
                  return `${x},${y}`;
                }).join(' ');
                
                const colors = ['#F87171', '#60A5FA', '#34D399']; // 红蓝绿代表前中后
                return (
                  <polygon 
                    key={plane} 
                    points={points} 
                    fill={colors[idx]} 
                    fillOpacity="0.3" 
                    stroke={colors[idx]} 
                    strokeWidth="0.5" 
                  />
                );
              })}
            </svg>
          )}

          {/* 图层 C: 视觉权重 (Weight Boxes) */}
          {activeLayer === 'weight' && refData?.visual_weight?.layers_visual_map?.map((layer: any, idx: number) => {
            const box = layer.box;
            if (!box) return null;
            
            return (
              <div 
                key={idx}
                className="absolute border border-yellow-400 bg-yellow-400/10 flex items-center justify-center text-[10px] text-yellow-400 font-bold"
                style={{
                  left: `${box.x}%`, 
                  top: `${box.y}%`,
                  width: `${box.w}%`, 
                  height: `${box.h}%`
                }}
              >
                {layer.label} ({layer.score})
              </div>
            );
          })}
        </div>

        {/* 图层切换器 (底部悬浮) */}
        <div className="absolute bottom-8 flex gap-2 bg-gray-900/90 p-1.5 rounded-lg border border-gray-800">
          <LayerToggle 
            active={activeLayer === 'flow'} 
            onClick={() => setActiveLayer('flow')} 
            label={t('modal.composition.layer_flow') || '视觉流'} 
            icon={<ArrowRight size={14} />} 
          />
          <LayerToggle 
            active={activeLayer === 'depth'} 
            onClick={() => setActiveLayer('depth')} 
            label={t('modal.composition.layer_depth') || '空间深度'} 
            icon={<Layers size={14} />} 
          />
          <LayerToggle 
            active={activeLayer === 'weight'} 
            onClick={() => setActiveLayer('weight')} 
            label={t('modal.composition.layer_weight') || '视觉权重'} 
            icon={<Grid size={14} />} 
          />
        </div>
      </div>

      {/* === 右侧：数据分析与评价 === */}
      <div className="w-[400px] border-l border-gray-800 p-6 overflow-y-auto flex flex-col gap-8">
        
        {/* Header: 分类与结构 */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            {t('modal.composition.ref_classification') || '参考图分类'}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {refData?.classification || t('modal.composition.analyzing') || '分析中...'}
          </h1>
          <div className="inline-block bg-gray-800 px-2 py-1 rounded text-xs text-gray-300 border border-gray-700">
            {refData?.geometric_structure || '-'}
          </div>
        </div>

        {/* 1. 视觉质量评价 (Top-Tier Photographer) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-200">
              {t('modal.composition.visual_quality') || '视觉质量评价'}
            </h3>
            <span className="text-yellow-500 font-mono text-xl">
              {refData?.visual_weight?.score || 95}
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-yellow-500 pl-3">
            {refData?.visual_quality_assessment || t('modal.composition.analyzing') || '分析中...'}
          </p>
        </div>

        {/* 2. 视觉权重详情 */}
        <div>
          <h3 className="font-bold text-gray-200 mb-2">
            {t('modal.composition.visual_weight_distribution') || '视觉权重分布'}
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            {refData?.visual_weight?.description || ''}
          </p>
          <div className="space-y-2">
            {refData?.visual_weight?.layers_visual_map?.map((layer: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs bg-gray-800/50 p-2 rounded">
                <span>{layer.label || `Layer ${idx + 1}`}</span>
                <span className="text-gray-400">{layer.score || 0}%</span>
              </div>
            )) || (
              <div className="text-xs text-gray-500">
                {t('modal.composition.no_data') || '暂无数据'}
              </div>
            )}
          </div>
        </div>
        
        {/* 3. 空间与留白 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/30 p-3 rounded">
            <div className="text-[10px] text-gray-500 mb-1">
              {t('modal.composition.negative_space') || '留白比例'}
            </div>
            <div className="text-lg font-mono">
              {refData?.negative_space?.percentage || 0}%
            </div>
          </div>
          <div className="bg-gray-800/30 p-3 rounded">
            <div className="text-[10px] text-gray-500 mb-1">
              {t('modal.composition.center_of_gravity') || '重心'}
            </div>
            <div className="text-xs">
              {refData?.negative_space?.vertical_balance || '-'}
            </div>
          </div>
        </div>

        {/* === 核心按钮：进入诊疗室 === */}
        <div className="mt-auto pt-8">
          <button 
            onClick={() => setShowClinic(true)}
            className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 p-px focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#3182CE_50%,#E2E8F0_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-gray-900 px-8 py-4 text-sm font-medium text-white backdrop-blur-3xl transition-colors group-hover:bg-gray-900/80">
              <Maximize className="mr-2 h-5 w-5 text-blue-400" />
              {t('modal.composition.enter_clinic') || '进入构图诊疗室'}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
          <p className="text-[10px] text-center text-gray-500 mt-2">
            {t('modal.composition.clinic_description') || '基于顶级摄影师视角，针对用户图进行手术级修正'}
          </p>
        </div>

      </div>
    </div>
  );
};

// --- 辅助组件 ---

interface LayerToggleProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactElement;
}

const LayerToggle: React.FC<LayerToggleProps> = ({ active, onClick, label, icon }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
      active ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {React.cloneElement(icon, { size: 14 })}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

