import React, { useState } from 'react';
import { Layers, Maximize, ArrowRight, Box, Grid, Eye, X, Activity, Zap } from 'lucide-react';
import { VisualVectorsOverlay } from './VisualVectorsOverlay';
import { DirectorViewfinder } from './DirectorViewfinder';
import { GridOverlay } from './overlays/GridOverlay';
import { VisualMassOverlay } from './overlays/VisualMassOverlay';
import { useLanguage } from '../src/contexts/LanguageContext';

interface CompositionAnalysisPanelProps {
  data: any;
  refImageUrl: string;
  userImageUrl: string;
}

type ActiveLayer = 'vector' | 'grid' | 'mass' | null;

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
  
  // 【交互状态】按照新设计方案：vector（视觉向量）、grid（三分构图）、mass（视觉质量）
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('vector');
  const [showClinic, setShowClinic] = useState(false); // 控制是否打开诊疗室
  const [selectedWeightLayer, setSelectedWeightLayer] = useState<number | null>(null); // 选中的视觉权重图层
  const [selectedDepthPlane, setSelectedDepthPlane] = useState<string | null>(null); // 选中的空间深度平面

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

  // 【主面板模式】采用 Quantum HUD 设计理念
  return (
    <div className="flex h-screen bg-[#050505] text-gray-300 font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* =================================================================
         LEFT: 沉浸式影像工作台（Quantum HUD 风格）
         ================================================================= */}
      <div className="flex-1 relative flex flex-col p-6 transition-all duration-500">
        
        {/* 图片视口 */}
        <div className="flex-1 relative flex items-center justify-center bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-2xl overflow-hidden group">
          
          {/* 背景网格装饰（科技感） */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
              backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }} 
          />

          {/* 核心图片 */}
          <div className="relative max-w-full max-h-full transition-transform duration-700 ease-out hover:scale-[1.01]">
          <img 
            src={refImageUrl} 
              className="max-h-[80vh] max-w-full object-contain shadow-2xl" 
              alt="Reference Analysis" 
          />
          
            {/* 图层 A: 视觉向量 (Vectors) */}
            {activeLayer === 'vector' && refData?.visual_flow && (
            <VisualVectorsOverlay 
              data={refData.visual_flow} 
              width={100} 
              height={100} 
            />
          )}

            {/* 图层 B: 三分构图 (Grid) */}
            {activeLayer === 'grid' && (
              <GridOverlay />
            )}

            {/* 图层 C: 视觉质量 (Visual Mass) - 支持点击交互 */}
            {activeLayer === 'mass' && (
              <>
                {/* Visual Mass 多边形覆盖层 - 支持多种数据路径 */}
                <VisualMassOverlay 
                  visualData={{
                    ...data?.composition?.visual_data,
                    visual_mass: refData?.visual_mass || 
                                 data?.composition?.visual_data?.visual_mass ||
                                 data?.composition?.structured?.visual_mass
                  }}
                />
                
                {/* 视觉权重图层（Weight Boxes）- 保留原有功能 */}
                {refData?.visual_weight?.layers_visual_map?.map((layer: any, idx: number) => {
            const box = layer.box;
            if (!box) return null;
            
            const isSelected = selectedWeightLayer === idx;
            
            return (
              <div 
                key={idx}
                onClick={() => setSelectedWeightLayer(isSelected ? null : idx)}
                className={`absolute border-2 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-yellow-400 bg-yellow-400/30 shadow-lg shadow-yellow-400/50' 
                    : 'border-yellow-400/50 bg-yellow-400/10 hover:bg-yellow-400/20'
                }`}
                style={{
                  left: `${box.x}%`, 
                  top: `${box.y}%`,
                  width: `${box.w}%`, 
                  height: `${box.h}%`
                }}
              >
                <span className="text-yellow-400">{layer.label} ({layer.score})</span>
              </div>
            );
          })}
          
                {/* 空间深度图层（保留原有功能，但只在 mass 模式下作为辅助显示） */}
                {refData?.spatial_depth && (
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-auto" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              {['foreground', 'midground', 'background'].map((plane, idx) => {
                const poly = refData?.spatial_depth?.[plane]?.polygon;
                if (!poly || !Array.isArray(poly) || poly.length === 0) return null;
                
                const points = poly.map((p: any) => {
                  const x = typeof p.x === 'string' ? parseFloat(p.x.replace('%', '')) : p.x;
                  const y = typeof p.y === 'string' ? parseFloat(p.y.replace('%', '')) : p.y;
                  return `${x},${y}`;
                }).join(' ');
                
                      const colors = ['#F87171', '#60A5FA', '#34D399'];
                const isSelected = selectedDepthPlane === plane;
                
                return (
                  <polygon 
                    key={plane} 
                    points={points} 
                    fill={colors[idx]} 
                          fillOpacity={isSelected ? 0.4 : 0.2}
                    stroke={colors[idx]} 
                          strokeWidth={isSelected ? 0.8 : 0.4}
                    className="cursor-pointer transition-all"
                    onClick={() => setSelectedDepthPlane(isSelected ? null : plane)}
                  />
                );
              })}
            </svg>
          )}
              </>
            )}
          </div>

          {/* 顶部悬浮标签 */}
          <div className="absolute top-6 left-6 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-mono tracking-widest text-gray-400 uppercase">
            MOD.02 COMPOSITION ANALYSIS
          </div>
        </div>

        {/* =================================================================
           BOTTOM DOCK: 悬浮控制栏（底部四按钮栏）
           ================================================================= */}
        <div className="h-24 flex items-center justify-center">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
            
            <DockButton 
              active={activeLayer === 'vector'} 
              onClick={() => setActiveLayer(activeLayer === 'vector' ? null : 'vector')}
              icon={<ArrowRight />} 
              label={t('modal.composition.layer_flow') || '视觉向量'}
              hotkey="1"
          />
            
            <DockButton 
              active={activeLayer === 'grid'} 
              onClick={() => setActiveLayer(activeLayer === 'grid' ? null : 'grid')}
              icon={<Grid />} 
              label={t('modal.composition.rule_of_thirds') || '三分构图'}
              hotkey="2"
          />
            
            <DockButton 
              active={activeLayer === 'mass'} 
              onClick={() => setActiveLayer(activeLayer === 'mass' ? null : 'mass')}
              icon={<Box />} 
              label={t('modal.composition.visual_mass') || '视觉质量'}
              hotkey="3"
            />

            <div className="w-px h-8 bg-white/10 mx-2" /> {/* 分割线 */}

            {/* 核心按钮：构图诊疗室 */}
            <button 
              onClick={() => setShowClinic(true)}
              className="group relative flex flex-col items-center justify-center w-20 h-16 rounded-xl transition-all duration-300 hover:bg-white/5"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-2 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity size={18} />
              </div>
              <span className="relative mt-1 text-[10px] font-medium text-blue-200 group-hover:text-white transition-colors">
                {t('modal.composition.enter_clinic') || '诊疗室'}
              </span>
              {/* 呼吸灯效果 */}
              <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
            </button>

          </div>
        </div>
      </div>

      {/* =================================================================
         RIGHT: 数据分析面板（重新设计 - Quantum HUD 风格）
         ================================================================= */}
      <div className="w-[380px] bg-[#0A0A0A] border-l border-white/5 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={14} className="text-blue-500" />
            <span className="text-xs font-bold tracking-widest text-blue-500 uppercase">
              {t('modal.composition.analysis_report') || 'Analysis Report'}
            </span>
          </div>
          {/* 【修复】分类字段：优先使用 main_structure（Gemini日志中的字段），如果没有则使用 classification */}
          <h1 className="text-2xl font-bold text-white leading-tight">
            {data?.composition?.structured?.main_structure || 
             refData?.main_structure || 
             refData?.classification || 
             t('modal.composition.analyzing') || '分析中...'}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {/* 【修复】几何结构字段：geometric_structure */}
            <Tag>
              {t('modal.composition.geometric_structure') || '几何结构'}: {refData?.geometric_structure || '-'}
            </Tag>
            <Tag>
              {t('modal.composition.score') || 'Score'}: {refData?.visual_weight?.score || 0}
            </Tag>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Section 1: 视觉评价（visual_quality_assessment） */}
          {/* 【修复】确保 visual_quality_assessment 有独立的显示位置 */}
        {refData?.visual_quality_assessment && (
            <Section title={t('modal.composition.visual_quality_assessment') || 'VISUAL QUALITY ASSESSMENT'}>
              <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-white/10 pl-3">
              {refData.visual_quality_assessment}
            </p>
            </Section>
        )}

          {/* Section 2: 视觉质量（composition_quality）- 顶级摄影师角度评价 */}
          {/* 【修复】视觉质量字段：composition_quality，需要Gemini站在顶级摄影师角度评价构图质量 */}
          {refData?.composition_quality && (
            <Section title={t('modal.composition.composition_quality') || 'COMPOSITION QUALITY'}>
              <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-purple-500/50 pl-3">
                {refData.composition_quality}
              </p>
            </Section>
          )}

          {/* Section 3: 视觉权重（subject_weight）- 包含 score、method、description、layers_visual_map */}
          <Section title={t('modal.composition.visual_weight_distribution') || 'VISUAL WEIGHT'}>
            {/* 【修复】Score 显示在上方 */}
            {(refData?.visual_weight?.score !== undefined || refData?.visual_weight?.method) && (
              <div className="mb-4 space-y-2">
                {refData?.visual_weight?.score !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase">{t('modal.composition.score') || '分数'}:</span>
              <span className="text-yellow-500 font-mono text-xl font-bold">
                      {refData.visual_weight.score}
              </span>
            </div>
                )}
            {refData?.visual_weight?.method && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase">{t('modal.composition.method') || '方法'}:</span>
                <span className="text-xs text-gray-300">{refData.visual_weight.method}</span>
              </div>
            )}
          </div>
            )}
            {/* 【修复】Description 显示在 score 下方（符合用户要求） */}
          {refData?.visual_weight?.description && (
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              {refData.visual_weight.description}
            </p>
          )}
            {/* 【修复】layers_visual_map 可点击列表 - 点击后会在图中标记（已有实现，124-149行） */}
            <div className="space-y-3">
              {refData?.visual_weight?.layers_visual_map?.length > 0 ? (
                refData.visual_weight.layers_visual_map.map((layer: any, idx: number) => {
              const isSelected = selectedWeightLayer === idx;
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedWeightLayer(isSelected ? null : idx);
                        setActiveLayer('mass'); // 切换到视觉质量图层，显示标记框
                  }}
                      className={`group flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-blue-500/30 transition-colors cursor-pointer ${
                        isSelected ? 'border-yellow-500/50 bg-yellow-500/10' : ''
                      }`}
                      title={t('modal.composition.click_to_highlight') || '点击在图中高亮显示'}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono transition-colors ${
                          isSelected 
                            ? 'bg-yellow-500 text-black' 
                            : 'bg-white/10 text-gray-400 group-hover:bg-blue-500 group-hover:text-white'
                        }`}>
                          {idx + 1}
                  </span>
                        <span className={`text-xs font-medium ${isSelected ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {layer.label || `${t('modal.composition.layer') || 'Layer'} ${idx + 1}`}
                  </span>
                      </div>
                      <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${isSelected ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min(layer.score || 0, 100)}%` }} 
                        />
                      </div>
                </div>
              );
                })
              ) : (
              <div className="text-xs text-gray-500">
                {t('modal.composition.no_data') || '暂无数据'}
              </div>
            )}
          </div>
          </Section>

          {/* Section 4: 视觉路径（visual_flow.description）- 基于顶级摄影师角度深入浅出描述 */}
          {/* 【修复】视觉路径：已经通过向量在图中画出来了，但需要Gemini基于顶级摄影师角度深入浅出描述 */}
        {refData?.visual_flow?.description && (
            <Section title={t('modal.composition.visual_flow_path') || 'VISUAL FLOW'}>
              <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-cyan-500/50 pl-3">
              {refData.visual_flow.description}
            </p>
            </Section>
        )}

          {/* Section 5: 空间深度（spatial_depth）- 需要Gemini在图中画出来对应的位置，需要有交互 */}
          {/* 【修复】空间深度：字段为 spatial_depth，需要Gemini在图中画出来对应的位置，需要有交互 */}
          {/* 【已有实现】图中绘制：152-185行，支持点击交互 */}
        {refData?.spatial_depth && (
            <Section title={t('modal.composition.spatial_depth') || 'SPATIAL DEPTH'}>
              <div className="space-y-3">
              {['foreground', 'midground', 'background'].map((plane) => {
                const planeData = refData.spatial_depth[plane];
                if (!planeData) return null;
                
                const isSelected = selectedDepthPlane === plane;
                const planeLabels: Record<string, string> = {
                  foreground: t('modal.composition.foreground') || '前景',
                  midground: t('modal.composition.midground') || '中景',
                  background: t('modal.composition.background') || '背景'
                };
                
                return (
                  <div 
                    key={plane}
                    onClick={() => {
                      setSelectedDepthPlane(isSelected ? null : plane);
                        setActiveLayer('mass'); // 切换到视觉质量图层以显示深度多边形
                    }}
                      className={`p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer transition-colors hover:border-blue-500/30 ${
                        isSelected ? 'border-blue-500/50 bg-blue-500/10' : ''
                      }`}
                      title={t('modal.composition.click_to_highlight_depth') || '点击在图中高亮显示空间深度区域'}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                        {planeLabels[plane]}
                      </span>
                      {planeData.depth_range && Array.isArray(planeData.depth_range) && (
                        <span className="text-xs text-gray-500">
                          {planeData.depth_range[0]}-{planeData.depth_range[1]}
                        </span>
                      )}
                    </div>
                    {planeData.content && (
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {planeData.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            </Section>
        )}
        
          {/* Section 6: 留白分析（negative_space 和 ratios_negative_space） */}
          {/* 【修复】留白：negative_space 和 ratios_negative_space 字段 */}
          <Section title={t('modal.composition.negative_space') || 'NEGATIVE SPACE'}>
            <div className="grid grid-cols-2 gap-3">
              <DataCard 
                label={t('modal.composition.negative_space') || '留白比例'} 
                value={`${refData?.negative_space?.percentage ?? 0}%`} 
                sub="Space"
              />
              <DataCard 
                label={t('modal.composition.balance') || '平衡'} 
                value={refData?.negative_space?.vertical_balance || 'Center'} 
                sub={refData?.negative_space?.horizontal_balance || 'Balanced'}
                icon={<Zap size={12} className="text-yellow-500"/>}
              />
            </div>
            {/* 水平平衡详情 */}
          {refData?.negative_space?.horizontal_balance && (
              <p className="text-xs text-gray-400 mt-3">
                {t('modal.composition.h_balance') || '水平平衡'}: {refData.negative_space.horizontal_balance}
              </p>
          )}
            {/* ratios_negative_space 显示 - 支持多种数据路径 */}
            {/* 【修复】ratios_negative_space 可能在不同的路径中 */}
            {(() => {
              const ratiosData = data?.composition?.structured?.ratios_negative_space || 
                                data?.composition?.ratios_negative_space ||
                                refData?.ratios_negative_space;
              if (!ratiosData) return null;
              
              return (
                <div className="mt-4 space-y-2 text-xs text-gray-400">
                  {ratiosData.entity_ratio && (
                <div>
                  <span className="text-gray-500">{t('modal.composition.entity_ratio') || '实体比例'}:</span>
                      <span className="ml-2 text-gray-300">{ratiosData.entity_ratio}</span>
                </div>
              )}
                  {ratiosData.space_ratio && (
                <div>
                  <span className="text-gray-500">{t('modal.composition.space_ratio') || '留白比例'}:</span>
                      <span className="ml-2 text-gray-300">{ratiosData.space_ratio}</span>
                </div>
              )}
                  {ratiosData.distribution && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                  <span className="text-gray-500">{t('modal.composition.distribution') || '分布'}:</span>
                      <p className="text-gray-300 mt-1">{ratiosData.distribution}</p>
                </div>
              )}
            </div>
              );
            })()}
          </Section>

        </div>
      </div>
    </div>
  );
};

// --- 辅助组件（Quantum HUD 风格）---

interface DockButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
  hotkey: string;
}

const DockButton: React.FC<DockButtonProps> = ({ active, onClick, icon, label, hotkey }) => (
  <button 
    onClick={onClick}
    className={`
      group relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200
      ${active ? 'bg-white/10' : 'hover:bg-white/5'}
    `}
  >
    <div className={`mb-1 transition-colors ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
      {React.cloneElement(icon, { size: 20, strokeWidth: 1.5 })}
    </div>
    <span className={`text-[9px] font-medium tracking-wide transition-colors ${active ? 'text-white' : 'text-gray-600'}`}>
      {label}
    </span>
    {/* 底部光条 */}
    {active && (
      <div className="absolute bottom-0 w-6 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-4px_10px_rgba(59,130,246,0.5)]" />
    )}
    {/* 快捷键提示 */}
    <span className="absolute top-1 right-1 text-[8px] font-mono text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
      {hotkey}
    </span>
  </button>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div>
    <h3 className="text-[10px] font-bold text-gray-500 tracking-[0.2em] mb-4 uppercase flex items-center gap-2">
      {title}
      <div className="h-px flex-1 bg-white/5" />
    </h3>
    {children}
  </div>
);

interface TagProps {
  children: React.ReactNode;
}

const Tag: React.FC<TagProps> = ({ children }) => (
  <span className="inline-block px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] text-gray-400">
    {children}
  </span>
);

interface DataCardProps {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactElement;
}

const DataCard: React.FC<DataCardProps> = ({ label, value, sub, icon }) => (
  <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col justify-between h-20">
    <div className="flex justify-between items-start">
      <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      {icon}
    </div>
    <div>
      <div className="text-xl font-mono font-medium text-white">{value}</div>
      <div className="text-[10px] text-gray-500">{sub}</div>
    </div>
  </div>
);

