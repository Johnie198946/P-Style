import React from 'react';
import { BaseModal } from './BaseModal';
import { PhotoshopPanel } from '../analysis/PhotoshopPanel';
import { MOCK_PS_ADVANCED } from '../../src/lib/mockData';

import { useLanguage } from '../../src/contexts/LanguageContext';

export const PhotoshopModal = ({ data, onClose }: any) => {
  const { t } = useLanguage();
  // Fallback logic:
  // If data contains 'steps' (Old Format), switch to MOCK_PS_ADVANCED to show the new UI.
  // If data is null/undefined, use MOCK_PS_ADVANCED.
  // If data matches the new structure (has 'selective_color' array), use it.
  
  const isNewFormat = data && (data.selective_color || data.histogram);
  // Deep merge to ensure all required fields (like histogram) exist even if data is partial
  const safeData = { ...MOCK_PS_ADVANCED, ...(isNewFormat ? data : {}) };

  return (
    <BaseModal title={t('modal.ps.title')} onClose={onClose}>
      <div className="bg-carbon-950 h-full overflow-y-auto custom-scrollbar relative">
        {/* No padding wrapper for full-width sticky footer */}
        <PhotoshopPanel data={safeData} />
      </div>
    </BaseModal>
  );
};
