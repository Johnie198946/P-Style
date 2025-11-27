import React, { useState } from 'react';
import { Camera, Scissors, Move, Crop, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../src/contexts/LanguageContext'; // 【新增】导入国际化支持

// 定义类型
interface ClinicData {
  diagnosis: string;
  pre_shoot_advice: {
    camera_position: string;
    angle_adjustment: string;
    element_management: string;
  };
  post_processing_advice: {
    crop_ratio: string;
    crop_instruction: string;
    geometry_correction: string;
  };
  reframing_simulator?: { 
    x: number; 
    y: number; 
    w: number; 
    h: number; 
  };
}

interface CompositionClinicPanelProps {
  data: any; // 从后端获取的完整数据
  imageUrl: string; // 图片 URL
}

/**
 * 构图诊疗室面板组件
 * 实现"手术刀般"的构图拆解，提供前期拍摄和后期重构建议
 * 
 * 核心功能：
 * - 诊断：一针见血的构图问题诊断
 * - 前期指导：物理机位、角度、元素管理建议
 * - 后期方案：裁剪策略、几何校正、画幅建议
 * - 重构模拟器：AI 建议的裁剪框预览
 * 
 * @param data - 后端返回的数据，包含 composition_clinic 字段
 * @param imageUrl - 图片 URL
 */
export const CompositionClinicPanel: React.FC<CompositionClinicPanelProps> = ({ data, imageUrl }) => {
  const { t } = useLanguage(); // 【国际化】获取翻译函数
  
  // 【🔍 调试点】打印看看拿到的是什么
  if (process.env.NODE_ENV === 'development') {
    console.log('[CompositionClinicPanel] 🔍 Clinic Panel Data:', {
      dataKeys: data ? Object.keys(data) : [],
      hasModule2Composition: !!data?.module_2_composition,
      hasComposition: !!data?.composition,
      hasCompositionClinic: !!data?.composition_clinic,
      module2CompositionKeys: data?.module_2_composition ? Object.keys(data.module_2_composition) : [],
      compositionKeys: data?.composition ? Object.keys(data.composition) : [],
    });
  }
  
  // 【修复】确认读取路径是否正确
  // 路径 A: 如果 data 是 adaptData 的结果（经过 dataAdapter 处理）
  // 路径 B: 如果 data 是原始 response（直接从后端获取）
  const clinic: ClinicData | undefined = data?.composition?.composition_clinic ||  // 【优先】从 composition.composition_clinic 读取（dataAdapter 处理后的路径）
                                         data?.composition_clinic ||                  // 【备选】从顶层 composition_clinic 读取
                                         data?.module_2_composition?.composition_clinic ||  // 【备选】从 module_2_composition.composition_clinic 读取
                                         data?.composition_clinic;                    // 【最后】直接读取
  
  // 【调试日志】仅在开发环境记录
  if (process.env.NODE_ENV === 'development') {
    console.log('[CompositionClinicPanel] 接收到的数据:', {
      hasData: !!data,
      hasModule2Composition: !!data?.module_2_composition,
      hasComposition: !!data?.composition,
      hasClinic: !!clinic,
      clinicKeys: clinic ? Object.keys(clinic) : [],
      clinicData: clinic, // 【新增】打印完整的 clinic 数据
    });
  }
  
  const [showCropPreview, setShowCropPreview] = useState(true); // 【状态】控制裁剪预览显示/隐藏

  if (!clinic) {
    return (
      <div className="p-4 text-gray-500 text-center">
        <div className="text-sm">{t('modal.composition.clinic_loading') || '等待 AI 构图诊断...'}</div>
        <div className="text-xs text-gray-600 mt-2">{t('modal.composition.clinic_analyzing') || '正在分析构图问题...'}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0a0a0a] text-gray-200 font-sans">
      
      {/* === 左侧：视觉模拟区 === */}
      <div className="flex-1 relative border-r border-gray-800 bg-black flex items-center justify-center p-8 overflow-hidden">
        <div className="relative shadow-2xl max-w-full max-h-full">
          <img 
            src={imageUrl} 
            alt="Original" 
            className="max-h-[80vh] max-w-full object-contain opacity-60" 
          />
          
          {/* AI 建议裁剪框 (Reframing Simulator) */}
          {showCropPreview && clinic.reframing_simulator && (
            <div 
              className="absolute border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] pointer-events-none"
              style={{
                left: `${clinic.reframing_simulator.x}%`,
                top: `${clinic.reframing_simulator.y}%`,
                width: `${clinic.reframing_simulator.w}%`,
                height: `${clinic.reframing_simulator.h}%`,
              }}
            >
              <div className="absolute -top-6 left-0 text-yellow-400 text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                <Crop size={12} />
                AI 建议重构范围
              </div>
              {/* 三分线辅助网格 */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                <div className="border-r border-yellow-400/20 col-span-1 h-full" />
                <div className="border-r border-yellow-400/20 col-span-1 h-full" />
                <div className="border-b border-yellow-400/20 row-span-1 w-full absolute top-1/3" />
                <div className="border-b border-yellow-400/20 row-span-1 w-full absolute top-2/3" />
              </div>
            </div>
          )}
        </div>
        
        {/* 控制开关 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
          <button 
            onClick={() => setShowCropPreview(!showCropPreview)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              showCropPreview 
                ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {showCropPreview 
              ? (t('modal.composition.clinic_hide_crop') || '隐藏重构预览')
              : (t('modal.composition.clinic_show_crop') || '显示 AI 重构建议')
            }
          </button>
        </div>
      </div>

      {/* === 右侧：手术刀分析区 === */}
      <div className="w-[400px] flex flex-col h-full overflow-y-auto bg-[#111] p-6 custom-scrollbar">
        
        {/* 1. 诊断头部 */}
        <div className="mb-8 border-l-4 border-red-500 pl-4 py-1">
          <h2 className="text-sm uppercase tracking-widest text-red-500 font-bold mb-1 flex items-center gap-2">
            <AlertTriangle size={14} /> {t('modal.composition.clinic_diagnosis_title') || 'Surgical Diagnosis'}
          </h2>
          <p className="text-xl font-bold text-white leading-tight">
            {clinic.diagnosis}
          </p>
        </div>

        {/* 2. 前期拍摄建议 (Pre-Shoot) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <Camera size={18} />
            <h3 className="font-bold text-lg tracking-wide">{t('modal.composition.clinic_pre_shoot_title') || '前期机位指导'}</h3>
          </div>
          
          <div className="space-y-3">
            <AdviceCard 
              label={t('modal.composition.clinic_camera_position') || '物理移动'} 
              value={clinic.pre_shoot_advice.camera_position} 
              icon={<Move size={14}/>} 
            />
            <AdviceCard 
              label={t('modal.composition.clinic_angle_adjustment') || '运镜角度'} 
              value={clinic.pre_shoot_advice.angle_adjustment} 
            />
            <AdviceCard 
              label={t('modal.composition.clinic_element_management') || '元素管理'} 
              value={clinic.pre_shoot_advice.element_management} 
            />
          </div>
        </div>

        <div className="w-full h-px bg-gray-800 mb-8" />

        {/* 3. 后期重构建议 (Post-Processing) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <Scissors size={18} />
            <h3 className="font-bold text-lg tracking-wide">{t('modal.composition.clinic_post_processing_title') || '后期手术方案'}</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg mb-2">
              <span className="text-xs text-purple-400 uppercase font-bold block mb-1">{t('modal.composition.clinic_crop_ratio_label') || '推荐画幅'}</span>
              <span className="text-lg font-mono font-bold text-white">{clinic.post_processing_advice.crop_ratio}</span>
            </div>
            
            <AdviceCard 
              label={t('modal.composition.clinic_crop_instruction') || '裁剪策略'} 
              value={clinic.post_processing_advice.crop_instruction} 
            />
            <AdviceCard 
              label={t('modal.composition.clinic_geometry_correction') || '几何校正'} 
              value={clinic.post_processing_advice.geometry_correction} 
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// 辅助子组件
interface AdviceCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const AdviceCard: React.FC<AdviceCardProps> = ({ label, value, icon }) => (
  <div className="group">
    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
      {icon} {label}
    </div>
    <div className="text-sm text-gray-300 leading-relaxed border-l-2 border-gray-700 pl-3 group-hover:border-white transition-colors">
      {value}
    </div>
  </div>
);

