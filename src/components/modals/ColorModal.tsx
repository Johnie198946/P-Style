import React from 'react';
import { BaseModal } from './BaseModal';
import { ColorGradeWheel } from '../analysis/ColorGradeWheel';
import { HSLVisualizer } from '../analysis/HSLVisualizer';
import { MOCK_FULL_DATA } from '../../src/lib/mockData';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { Aperture, Sparkles, Target, Zap } from 'lucide-react';

export const ColorModal = ({ data, onClose }: any) => {
  const { t } = useLanguage();
  // 【修复】数据路径：从 dataAdapter 映射后，数据在 color_scheme 中
  // 兼容处理：如果 data 直接是 color_scheme 对象，直接使用；否则尝试从 data.color_scheme 获取
  const colorSchemeData = data?.color_scheme || data;
  const safeData = (colorSchemeData && colorSchemeData.hsl_12) 
    ? MOCK_FULL_DATA.color_scheme
    : (colorSchemeData || MOCK_FULL_DATA.color_scheme);
  
  // 【修复】确保 color_grading 数据存在，如果不存在则使用默认值
  // 从 colorSchemeData 中提取 color_grading 数据，如果没有则使用默认值
  const defaultColorGrading = {
    highlights: { hue: 0, saturation: 0, reason: "" },
    midtones: { hue: 0, saturation: 0, reason: "" },
    shadows: { hue: 0, saturation: 0, reason: "" },
    balance: 0,
  };
  const colorGrading = colorSchemeData?.color_grading || defaultColorGrading;
  
  // 【修复】确保 safeData 包含 color_grading 数据
  const finalSafeData = {
    ...safeData,
    color_grading: colorGrading,
  };
  
  // 【调试日志】记录数据路径，帮助排查问题
  console.log('[ColorModal] 🔍 数据检查:', {
    hasData: !!data,
    hasColorScheme: !!data?.color_scheme,
    dataType: typeof data,
    dataKeys: data ? Object.keys(data) : [],
    colorSchemeDataKeys: colorSchemeData ? Object.keys(colorSchemeData) : [],
    safeDataKeys: safeData ? Object.keys(safeData) : [],
    // 【关键】检查 color_grading 数据
    hasColorGrading: !!colorSchemeData?.color_grading,
    colorGradingHighlights: colorSchemeData?.color_grading?.highlights,
    colorGradingMidtones: colorSchemeData?.color_grading?.midtones,
    colorGradingShadows: colorSchemeData?.color_grading?.shadows,
    finalColorGrading: finalSafeData.color_grading,
    // 【关键】检查三个字段的值（包括空字符串检查）
    master_style_recap: safeData.master_style_recap,
    master_style_recapLength: safeData.master_style_recap?.length || 0,
    master_style_recapTruthy: !!safeData.master_style_recap,
    style_summary_recap: safeData.style_summary_recap,
    style_summary_recapLength: safeData.style_summary_recap?.length || 0,
    style_summary_recapTruthy: !!safeData.style_summary_recap,
    key_adjustment_strategy: safeData.key_adjustment_strategy,
    key_adjustment_strategyLength: safeData.key_adjustment_strategy?.length || 0,
    key_adjustment_strategyTruthy: !!safeData.key_adjustment_strategy,
    style_key_points: safeData.style_key_points,
    // 【关键】检查原始数据路径
    rawDataColorScheme: data?.color_scheme,
    rawDataDirect: data,
    // 【关键】检查条件渲染逻辑
    shouldShowCards: !!(safeData.master_style_recap || safeData.style_summary_recap || safeData.key_adjustment_strategy),
  });

  return (
    <BaseModal title={t('modal.color.title')} onClose={onClose}>
      <div className="bg-carbon-900 h-full overflow-y-auto custom-scrollbar relative">
        <div className="p-12 pb-0">
            {/* 【新增】色彩策略三卡片：主风格回顾、风格总结回顾、关键调整策略 */}
            {/* 【修复】检查字段是否存在且非空字符串 */}
            {((safeData.master_style_recap && safeData.master_style_recap.trim()) || 
              (safeData.style_summary_recap && safeData.style_summary_recap.trim()) || 
              (safeData.key_adjustment_strategy && safeData.key_adjustment_strategy.trim())) && (
              <div className="mb-12 space-y-4">
                {/* 卡片 1: 主风格回顾 */}
                {safeData.master_style_recap && safeData.master_style_recap.trim() && (
                  <div className="group p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          {t('modal.color.master_style')}
                          <div className="h-px flex-1 bg-purple-500/20" />
                        </h4>
                        <p className="text-sm text-gray-200 font-light leading-relaxed">{safeData.master_style_recap}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 卡片 2: 风格总结回顾 */}
                {safeData.style_summary_recap && safeData.style_summary_recap.trim() && (
                  <div className="group p-5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                        <Target className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          {t('modal.color.style_summary')}
                          <div className="h-px flex-1 bg-blue-500/20" />
                        </h4>
                        <p className="text-sm text-gray-200 font-light leading-relaxed">{safeData.style_summary_recap}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 卡片 3: 关键调整策略 */}
                {safeData.key_adjustment_strategy && safeData.key_adjustment_strategy.trim() && (
                  <div className="group p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg hover:border-yellow-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg shrink-0">
                        <Zap className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          {t('modal.color.key_strategy')}
                          <div className="h-px flex-1 bg-yellow-500/20" />
                        </h4>
                        <p className="text-sm text-gray-200 font-light leading-relaxed whitespace-pre-line">{safeData.key_adjustment_strategy}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Strategy Header（保留原有，作为兼容） */}
            {safeData.style_key_points && !safeData.master_style_recap && (
              <div className="p-6 bg-white/[0.02] border-l-2 border-optic-accent rounded-r mb-12 shadow-[0_0_20px_rgba(0,122,255,0.1)]">
                <h3 className="text-[10px] font-bold text-white uppercase mb-2 tracking-widest font-mono">{t('modal.color.strategy')}</h3>
                <p className="text-sm text-gray-300 font-light leading-relaxed">{safeData.style_key_points}</p>
              </div>
            )}

            <div className="space-y-8">
                {/* Color Grading Wheel Section */}
                <section className="bg-white/5 p-6 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
                        <Aperture className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">{t('modal.color.cinematic')}</span>
                    </div>
                    {/* 【修复】使用 finalSafeData.color_grading，确保数据存在 */}
                    <ColorGradeWheel 
                        highlights={finalSafeData.color_grading.highlights}
                        midtones={finalSafeData.color_grading.midtones}
                        shadows={finalSafeData.color_grading.shadows}
                    />
                </section>

                {/* HSL Matrix Section */}
                <section>
                    <h5 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 pl-1">{t('modal.color.hsl')}</h5>
                    <HSLVisualizer data={safeData.hsl} />
                </section>

                {/* White Balance Section */}
                <section className="bg-white/5 p-6 rounded-lg border border-white/5 mb-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-2">{t('modal.color.wb')}</span>
                            <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                                <span className="text-xs text-gray-400">{t('modal.common.temp')}</span>
                                <span className="text-xs font-mono text-white">{safeData.white_balance.temp.value}K</span>
                            </div>
                            <p className="text-[10px] text-white/50">{safeData.white_balance.temp.reason}</p>
                        </div>
                        <div>
                            <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-2">{t('modal.color.tint_cor')}</span>
                            <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                                <span className="text-xs text-gray-400">{t('modal.common.tint')}</span>
                                <span className="text-xs font-mono text-white">{safeData.white_balance.tint.value > 0 ? '+' : ''}{safeData.white_balance.tint.value}</span>
                            </div>
                            <p className="text-[10px] text-white/50">{safeData.white_balance.tint.reason}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
      </div>
    </BaseModal>
  );
};
