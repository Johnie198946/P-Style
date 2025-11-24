import React from 'react';
import { BaseModal } from './BaseModal';
import { ColorGradeWheel } from '../analysis/ColorGradeWheel';
import { HSLVisualizer } from '../analysis/HSLVisualizer';
import { MOCK_FULL_DATA } from '../../src/lib/mockData';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { Aperture } from 'lucide-react';

export const ColorModal = ({ data, onClose }: any) => {
  const { t } = useLanguage();
  const safeData = (data && data.hsl_12) 
    ? MOCK_FULL_DATA.color_scheme
    : (data || MOCK_FULL_DATA.color_scheme);

  return (
    <BaseModal title={t('modal.color.title')} onClose={onClose}>
      <div className="bg-carbon-900 h-full overflow-y-auto custom-scrollbar relative">
        <div className="p-12 pb-0">
            {/* Strategy Header */}
            <div className="p-6 bg-white/[0.02] border-l-2 border-optic-accent rounded-r mb-12 shadow-[0_0_20px_rgba(0,122,255,0.1)]">
                <h3 className="text-[10px] font-bold text-white uppercase mb-2 tracking-widest font-mono">{t('modal.color.strategy')}</h3>
                <p className="text-sm text-gray-300 font-light leading-relaxed">{safeData.style_key_points}</p>
            </div>

            <div className="space-y-8">
                {/* Color Grading Wheel Section */}
                <section className="bg-white/5 p-6 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-2">
                        <Aperture className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">{t('modal.color.cinematic')}</span>
                    </div>
                    <ColorGradeWheel 
                        highlights={safeData.color_grading.highlights}
                        midtones={safeData.color_grading.midtones}
                        shadows={safeData.color_grading.shadows}
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
