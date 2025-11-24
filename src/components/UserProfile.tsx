import React, { useState } from 'react';
import { 
  User, CreditCard, Zap, HelpCircle, Layers, Share2, 
  Settings, Check, Smartphone, Globe, 
  LogOut, ChevronRight, Activity
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../src/contexts/LanguageContext';
import { BillingSettings } from './billing/BillingSettings';

// --- MOCK DATA ---
const USER_DATA = {
  name: "Dr. Aris Thorne",
  email: "aris.thorne@photoscience.lab",
  id: "OP-9942-X",
  plan: "PROFESSIONAL",
  usage: {
    current: 2450,
    limit: 5000,
    type: "Neural Credits"
  },
  tasks: [
    { id: "TASK-01", name: "Cyberpunk City", date: "2025-11-20", status: "Completed", img: "https://images.unsplash.com/photo-1515630278258-407f66498911?w=200&q=80" },
    { id: "TASK-02", name: "Neon Portrait", date: "2025-11-22", status: "Processing", img: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?w=200&q=80" },
    { id: "TASK-03", name: "Mars Rover", date: "2025-11-23", status: "Saved", img: "https://images.unsplash.com/photo-1541562232579-512a21360020?w=200&q=80" },
  ]
};

// --- SUB-COMPONENTS ---

const AccountTab = () => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(USER_DATA.name);
  const [keyLoading, setKeyLoading] = useState(false);

  const handleSave = () => {
      setIsEditing(false);
      toast.success("Profile Updated", { description: "Identity matrix re-calibrated." });
  };

  const handleResetKey = () => {
      setKeyLoading(true);
      setTimeout(() => {
          setKeyLoading(false);
          toast.success("API Key Rotated", { description: "Previous key revoked. New key generated." });
      }, 1500);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start gap-6 p-6 bg-white/5 border border-white/10 rounded-lg">
         <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-optic-accent/50 flex items-center justify-center overflow-hidden relative group">
             <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="avatar" />
             <div className="absolute inset-0 bg-optic-accent/20 mix-blend-overlay"></div>
         </div>
         <div className="flex-1">
             <h3 className="text-xl text-white font-display tracking-wider">{name}</h3>
             <p className="text-optic-accent font-mono text-xs mt-1">{t('profile.id')}: {USER_DATA.id}</p>
             <div className="flex gap-2 mt-4">
                <button onClick={() => toast.info("Avatar Upload", { description: "Connecting to neural drive..." })} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-xs text-white font-mono rounded transition-colors">{t('profile.change_avatar')}</button>
                <button onClick={handleResetKey} disabled={keyLoading} className="px-3 py-1 border border-red-500/50 text-red-500 hover:bg-red-500/10 text-xs font-mono rounded transition-colors flex items-center gap-2">
                    {keyLoading ? t('profile.generating') : t('profile.reset_key')}
                </button>
             </div>
         </div>
      </div>
  
      <div className="grid grid-cols-2 gap-6">
          <div className="group">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">{t('profile.username')}</label>
              <div className={`bg-black border px-4 py-3 rounded flex items-center justify-between transition-colors ${isEditing ? 'border-optic-accent' : 'border-white/10'}`}>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    readOnly={!isEditing}
                    className={`bg-transparent text-white text-sm font-mono w-full outline-none ${!isEditing && 'cursor-default text-gray-400'}`} 
                  />
                  <Settings 
                    className={`w-4 h-4 cursor-pointer ${isEditing ? 'text-optic-accent' : 'text-gray-600'}`} 
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  />
              </div>
          </div>
          <div className="group">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">{t('profile.email')}</label>
              <div className="bg-black border border-white/10 px-4 py-3 rounded flex items-center justify-between">
                  <input type="text" defaultValue={USER_DATA.email} readOnly className="bg-transparent text-gray-400 text-sm font-mono w-full outline-none cursor-not-allowed" />
                  <Check className="w-4 h-4 text-green-500" />
              </div>
          </div>
          <div className="group col-span-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">{t('profile.password')}</label>
              <div className="bg-black border border-white/10 px-4 py-3 rounded flex items-center justify-between group-focus-within:border-optic-accent transition-colors">
                  <input type="password" defaultValue="********" className="bg-transparent text-white text-sm font-mono w-full outline-none" />
                  <button onClick={() => toast.success("Instructions Sent", { description: "Check your secure inbox for reset protocol." })} className="text-[10px] text-optic-accent uppercase hover:underline">{t('profile.update')}</button>
              </div>
          </div>
      </div>
  
      <div className="p-6 bg-gradient-to-r from-blue-900/20 to-transparent border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded text-blue-400"><Smartphone className="w-5 h-5" /></div>
                  <div>
                      <h4 className="text-sm text-white font-bold">{t('profile.alipay_binding')}</h4>
                      <p className="text-[10px] text-gray-400">{t('profile.secure_quick')}</p>
                  </div>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-xs font-mono border border-green-500/30 px-2 py-1 rounded bg-green-500/10">
                  <Check className="w-3 h-3" /> {t('profile.connected')}
              </div>
          </div>
      </div>
    </div>
  );
};

const SubscriptionTab = () => {
  const { t } = useLanguage();
  return (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-carbon-900 border border-white/10 rounded-xl p-8 relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h3 className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-1">{t('subscription.current_plan')}</h3>
                    <h2 className="text-3xl text-white font-display">{USER_DATA.plan}</h2>
                    <p className="text-xs text-optic-accent mt-2 flex items-center gap-2"><Zap className="w-3 h-3" /> {t('subscription.gpu_cluster')}</p>
                </div>
                
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="60" className="stroke-white/5" strokeWidth="8" fill="none" />
                        <circle cx="64" cy="64" r="60" className="stroke-optic-accent" strokeWidth="8" fill="none" strokeDasharray="377" strokeDashoffset={377 - (377 * (USER_DATA.usage.current / USER_DATA.usage.limit))} strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-bold text-white">{Math.round((USER_DATA.usage.current / USER_DATA.usage.limit) * 100)}%</span>
                        <span className="text-[9px] text-gray-500">{t('subscription.load')}</span>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="text-[10px] text-gray-500 uppercase">{t('subscription.used_credits')}</div>
                    <div className="text-lg text-white font-mono">{USER_DATA.usage.current}</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 uppercase">{t('subscription.total_limit')}</div>
                    <div className="text-lg text-white font-mono">{USER_DATA.usage.limit}</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 uppercase">{t('subscription.renewal')}</div>
                    <div className="text-lg text-white font-mono">12 {t('subscription.days')}</div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
            {['FREE', 'PRO', 'ENTERPRISE'].map((tier, i) => (
                <button 
                  key={tier} 
                  onClick={() => toast.info(t('subscription.plan_selection'), { description: t('subscription.switching_to').replace('{tier}', tier) })}
                  className={`p-4 border ${tier === 'PRO' ? 'border-optic-accent bg-optic-accent/10' : 'border-white/10 bg-black/20'} rounded hover:border-white/30 transition-all text-left group`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-bold ${tier === 'PRO' ? 'text-optic-accent' : 'text-gray-400'}`}>
                            {tier === 'FREE' ? t('subscription.tier_free') : tier === 'PRO' ? t('subscription.tier_pro') : t('subscription.tier_enterprise')}
                        </span>
                        {tier === 'PRO' && <div className="w-2 h-2 bg-optic-accent rounded-full shadow-[0_0_10px_#007AFF]"></div>}
                    </div>
                    <div className="text-lg text-white font-mono">{tier === 'FREE' ? '$0' : tier === 'PRO' ? '$29' : '$99'} <span className="text-[10px] text-gray-500">{t('subscription.mo')}</span></div>
                </button>
            ))}
        </div>
    </div>
  );
};

const PaymentTab = () => (
  <div className="h-full">
      <BillingSettings />
  </div>
);

const TaskTab = () => {
  const { t, language } = useLanguage();
  return (
    <div className="space-y-4 animate-fade-in h-full overflow-y-auto custom-scrollbar">
        {USER_DATA.tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 hover:border-white/20 rounded transition-all group">
                <div className="w-16 h-16 bg-black rounded overflow-hidden border border-white/10">
                    <img src={task.img} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={task.name} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="text-sm text-white font-bold">{task.name}</h4>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono border ${
                            task.status === 'Completed' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                            task.status === 'Processing' ? 'border-optic-accent/30 text-optic-accent bg-optic-accent/10' :
                            'border-gray-500/30 text-gray-500'
                        }`}>{
                           // Simple status translation
                           language === 'zh' ? 
                               (task.status === 'Completed' ? '已完成' : task.status === 'Processing' ? '处理中' : '已保存') 
                               : task.status
                        }</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">ID: {task.id} • {task.date}</div>
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toast.success("Download Started")} className="text-[9px] text-white bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                            {language === 'zh' ? '下载' : 'DOWNLOAD'}
                        </button>
                        <button onClick={() => toast.info("Link Copied")} className="text-[9px] text-white bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                            {language === 'zh' ? '分享' : 'SHARE'}
                        </button>
                    </div>
                </div>
            </div>
        ))}
    </div>
  );
};

const HelpTab = () => {
    const { language } = useLanguage();
    const topics = language === 'zh' ? 
        ['如何初始化融合引擎？', '了解算力点数', '导出格式与质量', 'API 访问密钥'] :
        ['How to initialize fusion engine?', 'Understanding Neural Credits', 'Exporting formats & quality', 'API Access Keys'];
    
    return (
        <div className="animate-fade-in space-y-4">
            <div className="relative">
                <input placeholder={language === 'zh' ? "搜索协议数据库..." : "Search Protocol Database..."} className="w-full bg-black border border-white/20 p-3 rounded text-sm text-white font-mono focus:border-optic-accent outline-none" />
                <HelpCircle className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
            </div>
            <div className="grid gap-2 mt-4">
                {topics.map((topic) => (
                    <button key={topic} className="text-left p-4 border border-white/5 hover:border-optic-accent/30 bg-white/[0.02] hover:bg-white/[0.05] rounded text-sm text-gray-300 hover:text-white transition-all">
                        {topic}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ShareTab = () => {
    const { t } = useLanguage();
    return (
        <div className="animate-fade-in flex flex-col h-full">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-optic-accent/10 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 border border-optic-accent/30 rounded-full animate-ping-slow"></div>
                    <Share2 className="w-8 h-8 text-optic-accent" />
                </div>
                <div>
                    <h3 className="text-lg text-white font-display">{t('share.title')}</h3>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-2">
                        {t('share.desc')}
                    </p>
                </div>
                <button onClick={() => toast.success(t('share.sync_enabled'), { description: t('share.connected_hive') })} className="flex items-center gap-4 bg-white/5 p-2 rounded-full pl-4 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
                    <span className="text-[10px] text-gray-400 font-mono">{t('share.auto_publish')}</span>
                    <div className="w-12 h-6 bg-optic-accent rounded-full relative">
                        <div className="absolute right-1 top-1 bottom-1 w-4 bg-white rounded-full shadow-lg"></div>
                    </div>
                </button>
            </div>
        </div>
    );
};

interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserProfile = ({ isOpen, onClose }: UserProfileProps) => {
    const [activeTab, setActiveTab] = useState('account');
    const { t, language, setLanguage } = useLanguage();

    const tabs = [
        { id: 'account', icon: User, label: t('profile.tab_identity') },
        { id: 'subscription', icon: Activity, label: t('profile.tab_plan') },
        { id: 'payment', icon: CreditCard, label: t('profile.tab_billing') },
        { id: 'tasks', icon: Layers, label: t('profile.tab_tasks') },
        { id: 'share', icon: Share2, label: t('profile.tab_network') },
        { id: 'help', icon: HelpCircle, label: t('profile.tab_protocols') },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            {/* Modal Container */}
            <div className="relative w-[90vw] max-w-5xl h-[80vh] bg-carbon-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-scale">
                {/* Decoration Lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-optic-accent to-transparent opacity-50"></div>

                {/* SIDEBAR */}
                <div className="w-full md:w-64 bg-black/20 border-r border-white/5 flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-sm font-bold text-white font-display tracking-[0.2em]">{t('profile.operator')}</h2>
                        <span className="text-[9px] text-gray-500 font-mono">{t('profile.settings_console')}</span>
                    </div>
                    
                    <div className="flex-1 py-4 space-y-1 px-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all text-xs uppercase tracking-wider font-medium
                                    ${activeTab === tab.id 
                                        ? 'bg-optic-accent/10 text-optic-accent border border-optic-accent/20 shadow-[0_0_15px_rgba(0,122,255,0.1)]' 
                                        : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
                                    }
                                `}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-optic-accent' : 'text-gray-500'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-white/5 space-y-1">
                        <button 
                            onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white rounded transition-all text-xs uppercase tracking-wider hover:bg-white/5"
                        >
                            <Globe className="w-4 h-4" />
                            {language === 'en' ? 'Language: EN' : '语言: 中文'}
                        </button>
                        <button onClick={onClose} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white rounded transition-all text-xs uppercase tracking-wider hover:bg-white/5">
                            <LogOut className="w-4 h-4" />
                            {t('profile.logout')}
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 bg-carbon-900/50 relative flex flex-col">
                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-8">
                        <h2 className="text-lg text-white font-display uppercase">{tabs.find(t => t.id === activeTab)?.label}</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                            &times;
                        </button>
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                        <div className="absolute inset-0 opacity-20 pointer-events-none"></div>
                        <div className="relative z-10 max-w-3xl mx-auto">
                            {activeTab === 'account' && <AccountTab />}
                            {activeTab === 'subscription' && <SubscriptionTab />}
                            {activeTab === 'payment' && <PaymentTab />}
                            {activeTab === 'tasks' && <TaskTab />}
                            {activeTab === 'help' && <HelpTab />}
                            {activeTab === 'share' && <ShareTab />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
