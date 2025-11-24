import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileCode, FileBox, Download, Check, X, Loader2, FileText, FileJson } from 'lucide-react';
import { useLanguage } from '../src/contexts/LanguageContext';
import { api } from '../src/lib/api';
import { toast } from 'sonner@2.0.3';

interface DownloadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string | null;
}

export const DownloadPanel: React.FC<DownloadPanelProps> = ({ isOpen, onClose, taskId }) => {
  const { t } = useLanguage();
  const [loadingState, setLoadingState] = useState<{ [key: string]: boolean }>({});
  const [completedState, setCompletedState] = useState<{ [key: string]: boolean }>({});

  if (!isOpen) return null;

  const handleDownload = async (type: 'xmp' | 'jsx' | 'json' | 'pdf') => {
    if (!taskId) {
      toast.error("Task ID is missing");
      return;
    }

    setLoadingState(prev => ({ ...prev, [type]: true }));
    
    try {
      await api.export[type](taskId);
      setLoadingState(prev => ({ ...prev, [type]: false }));
      setCompletedState(prev => ({ ...prev, [type]: true }));
      
      toast.success(`${type.toUpperCase()} Generated`, {
        description: "File download started."
      });

      // Reset completed state after a few seconds
      setTimeout(() => {
        setCompletedState(prev => ({ ...prev, [type]: false }));
      }, 3000);
    } catch (error) {
      console.error(`Export ${type} error:`, error);
      setLoadingState(prev => ({ ...prev, [type]: false }));
      toast.error(`Failed to export ${type.toUpperCase()}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl bg-carbon-950 border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-white/[0.02]">
           <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-optic-accent rounded-full animate-pulse"></div>
               <h3 className="text-sm font-display font-bold text-white tracking-[0.2em] uppercase">
                   {t('simulation.export_panel')}
               </h3>
           </div>
           <button 
               onClick={onClose}
               className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
           >
               <X className="w-4 h-4" />
           </button>
        </div>

        {/* Content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Option 1: XMP */}
            <div className="group relative p-6 bg-black/40 border border-white/10 hover:border-optic-accent/50 rounded-lg transition-all duration-300 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <FileCode className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2">{t('simulation.preset_xmp')}</h4>
                <p className="text-gray-500 text-xs font-mono mb-6 h-10">
                    {t('simulation.desc_xmp')}
                </p>
                
                <button 
                    onClick={() => handleDownload('xmp')}
                    disabled={loadingState['xmp'] || !taskId}
                    className={`
                        w-full py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                        ${completedState['xmp'] 
                            ? 'bg-green-500 text-black' 
                            : 'bg-white hover:bg-optic-accent text-black'
                        }
                        ${!taskId ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {loadingState['xmp'] ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('simulation.generating')}
                        </>
                    ) : completedState['xmp'] ? (
                        <>
                            <Check className="w-3 h-3" />
                            {t('simulation.download_ready')}
                        </>
                    ) : (
                        <>
                            <Download className="w-3 h-3" />
                            {t('simulation.download_preset')}
                        </>
                    )}
                </button>
            </div>

            {/* Option 2: JSX */}
            <div className="group relative p-6 bg-black/40 border border-white/10 hover:border-purple-500/50 rounded-lg transition-all duration-300 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20 group-hover:scale-110 transition-transform">
                    <FileBox className="w-8 h-8 text-purple-400" />
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2">JSX Script</h4>
                <p className="text-gray-500 text-xs font-mono mb-6 h-10">
                    Photoshop JSX automation script
                </p>
                
                <button 
                    onClick={() => handleDownload('jsx')}
                    disabled={loadingState['jsx'] || !taskId}
                    className={`
                        w-full py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                        ${completedState['jsx'] 
                            ? 'bg-green-500 text-black' 
                            : 'bg-white hover:bg-purple-400 text-black'
                        }
                        ${!taskId ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {loadingState['jsx'] ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('simulation.generating')}
                        </>
                    ) : completedState['jsx'] ? (
                        <>
                            <Check className="w-3 h-3" />
                            {t('simulation.download_ready')}
                        </>
                    ) : (
                        <>
                            <Download className="w-3 h-3" />
                            Download JSX
                        </>
                    )}
                </button>
            </div>

            {/* Option 3: JSON */}
            <div className="group relative p-6 bg-black/40 border border-white/10 hover:border-green-500/50 rounded-lg transition-all duration-300 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20 group-hover:scale-110 transition-transform">
                    <FileJson className="w-8 h-8 text-green-400" />
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2">JSON Data</h4>
                <p className="text-gray-500 text-xs font-mono mb-6 h-10">
                    Complete analysis data in JSON format
                </p>
                
                <button 
                    onClick={() => handleDownload('json')}
                    disabled={loadingState['json'] || !taskId}
                    className={`
                        w-full py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                        ${completedState['json'] 
                            ? 'bg-green-500 text-black' 
                            : 'bg-white hover:bg-green-400 text-black'
                        }
                        ${!taskId ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {loadingState['json'] ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('simulation.generating')}
                        </>
                    ) : completedState['json'] ? (
                        <>
                            <Check className="w-3 h-3" />
                            {t('simulation.download_ready')}
                        </>
                    ) : (
                        <>
                            <Download className="w-3 h-3" />
                            Download JSON
                        </>
                    )}
                </button>
            </div>

            {/* Option 4: PDF */}
            <div className="group relative p-6 bg-black/40 border border-white/10 hover:border-red-500/50 rounded-lg transition-all duration-300 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20 group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8 text-red-400" />
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-2">PDF Report</h4>
                <p className="text-gray-500 text-xs font-mono mb-6 h-10">
                    Complete analysis report in PDF format
                </p>
                
                <button 
                    onClick={() => handleDownload('pdf')}
                    disabled={loadingState['pdf'] || !taskId}
                    className={`
                        w-full py-3 rounded font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                        ${completedState['pdf'] 
                            ? 'bg-green-500 text-black' 
                            : 'bg-white hover:bg-red-400 text-black'
                        }
                        ${!taskId ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {loadingState['pdf'] ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('simulation.generating')}
                        </>
                    ) : completedState['pdf'] ? (
                        <>
                            <Check className="w-3 h-3" />
                            {t('simulation.download_ready')}
                        </>
                    ) : (
                        <>
                            <Download className="w-3 h-3" />
                            Download PDF
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 text-[10px] text-gray-500 font-mono flex justify-between">
            <span>{t('simulation.secure_channel')}</span>
            <span>{t('simulation.version')}</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
