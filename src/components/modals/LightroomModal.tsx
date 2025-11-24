import React from 'react';
import { BaseModal } from './BaseModal';
import { LightroomPanel } from '../analysis/LightroomPanel';
import { MOCK_FULL_DATA } from '../../src/lib/mockData';

import { useLanguage } from '../../src/contexts/LanguageContext';

export const LightroomModal = ({ data, onClose }: any) => {
  const { t } = useLanguage();
  const safeData = (data && data.basic_panel && !Array.isArray(data.basic_panel)) 
    ? data 
    : MOCK_FULL_DATA.lightroom;

  return (
    <BaseModal title={t('modal.lr.title')} onClose={onClose}>
      <div className="bg-carbon-950 h-full overflow-y-auto custom-scrollbar relative">
         {/* No padding wrapper - Panel handles its own internal spacing for edge-to-edge feel */}
         <LightroomPanel data={safeData} />
      </div>
    </BaseModal>
  );
};
