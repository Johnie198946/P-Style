import React from 'react';
import { BaseModal } from './BaseModal';
import { LightroomPanel } from '../analysis/LightroomPanel';
import { MOCK_FULL_DATA } from '../../src/lib/mockData';

import { useLanguage } from '../../src/contexts/LanguageContext';

export const LightroomModal = ({ data, imageAnalysis, userImageUrl, refImageUrl, taskId, onClose }: any) => {
  const { t } = useLanguage();
  const safeData = (data && data.basic_panel && !Array.isArray(data.basic_panel)) 
    ? data 
    : MOCK_FULL_DATA.lightroom;

  return (
    <BaseModal title={t('modal.lr.title')} onClose={onClose}>
      {/* 【修复】h-full 确保占满容器高度，LightroomPanel 内部管理滚动 */}
      <div className="h-full">
         <LightroomPanel data={safeData} imageAnalysis={imageAnalysis} userImageUrl={userImageUrl} refImageUrl={refImageUrl} taskId={taskId} />
      </div>
    </BaseModal>
  );
};
