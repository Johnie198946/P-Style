import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Aperture, Layers, Cpu, Zap, Check, ArrowRight, Globe } from 'lucide-react';
import { AuthModal } from '../auth/AuthModal';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { DemoExperience } from '../demo/DemoExperience';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const features = [
    {
      icon: <Aperture className="w-8 h-8 text-optic-accent" />,
      title: t('landing.feature.ai_color.title'),
      desc: t('landing.feature.ai_color.desc')
    },
    {
      icon: <Layers className="w-8 h-8 text-purple-400" />,
      title: t('landing.feature.style_cloning.title'),
      desc: t('landing.feature.style_cloning.desc')
    },
    {
      icon: <Cpu className="w-8 h-8 text-green-400" />,
      title: t('landing.feature.comp_analysis.title'),
      desc: t('landing.feature.comp_analysis.desc')
    }
  ];

  const pricing = [
    {
      title: t('pricing.trainee.title'),
      price: t('pricing.trainee.price'),
      features: [
          t('pricing.trainee.f1'), 
          t('pricing.trainee.f2'), 
          t('pricing.trainee.f3'), 
          t('pricing.trainee.f4')
      ],
      highlight: false
    },
    {
      title: t('pricing.pro.title'),
      price: t('pricing.pro.price'),
      period: t('pricing.pro.period'),
      features: [
          t('pricing.pro.f1'), 
          t('pricing.pro.f2'), 
          t('pricing.pro.f3'), 
          t('pricing.pro.f4'), 
          t('pricing.pro.f5')
      ],
      highlight: true
    },
    {
      title: t('pricing.studio.title'),
      price: t('pricing.studio.price'),
      period: t('pricing.studio.period'),
      features: [
          t('pricing.studio.f1'), 
          t('pricing.studio.f2'), 
          t('pricing.studio.f3'), 
          t('pricing.studio.f4'), 
          t('pricing.studio.f5')
      ],
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <AnimatePresence>
          {showDemo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
              >
                  <DemoExperience onClose={() => setShowDemo(false)} />
              </motion.div>
          )}
      </AnimatePresence>
      
      {/* Navigation */}
      <nav className="relative z-20 w-full px-10 py-6 flex justify-between items-center border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-optic-accent/10 border border-optic-accent/30 rounded flex items-center justify-center text-optic-accent font-bold text-xs">SC</div>
            <span className="font-display font-bold text-white tracking-widest">STYLE<span className="text-white/50">CLONE</span></span>
        </div>
        <div className="flex gap-6 items-center">
            <button 
                onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                className="text-xs font-mono text-white/40 hover:text-white transition-colors flex items-center gap-2 mr-2 uppercase tracking-widest"
            >
                <Globe className="w-3 h-3" />
                {language === 'en' ? 'CN' : 'EN'}
            </button>
            <div className="h-4 w-px bg-white/10 mx-2"></div>
            <button onClick={() => setIsAuthOpen(true)} className="text-xs font-mono text-white/60 hover:text-white uppercase tracking-widest transition-colors">{t('auth.login')}</button>
            <button onClick={() => setIsAuthOpen(true)} className="text-xs font-mono text-black bg-white px-4 py-2 rounded hover:bg-optic-accent transition-colors uppercase tracking-widest font-bold">
                {t('auth.register')}
            </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-20 pb-32">
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
        >
            <h1 className="text-6xl md:text-8xl font-display font-bold text-white mb-6 tracking-tighter leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">{t('landing.digital')}</span> <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-optic-accent to-cyan-900">{t('landing.darkroom')}</span>
            </h1>
            <p className="text-white/50 font-mono text-sm md:text-base max-w-2xl mx-auto mb-10 leading-relaxed tracking-wide whitespace-pre-wrap">
                {t('landing.description')}
            </p>
            
            <div className="flex justify-center gap-4">
                <button 
                    onClick={() => setIsAuthOpen(true)}
                    className="group relative px-8 py-4 bg-optic-accent text-black font-bold text-sm uppercase tracking-widest overflow-hidden rounded-sm hover:bg-white transition-colors"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {t('landing.enter_system')} <ArrowRight className="w-4 h-4" />
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                <button 
                    onClick={() => setShowDemo(true)}
                    className="px-8 py-4 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:bg-white/5 transition-colors rounded-sm"
                >
                    {t('landing.view_demo')}
                </button>
            </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-10 py-24 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
                {features.map((f, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="p-8 border border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
                    >
                        <div className="mb-6 p-3 bg-white/5 w-fit rounded-lg group-hover:scale-110 transition-transform duration-300 border border-white/5">
                            {f.icon}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 font-display">{f.title}</h3>
                        <p className="text-white/50 text-sm leading-relaxed">
                            {f.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 px-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center mb-16">
             <h2 className="text-3xl font-display font-bold text-white mb-4 tracking-widest">{t('landing.access_levels')}</h2>
             <p className="text-white/40 font-mono text-xs">{t('landing.select_tier')}</p>
        </div>
        
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 items-center">
            {pricing.map((p, i) => (
                <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`
                        relative p-8 rounded-2xl border transition-all duration-300
                        ${p.highlight 
                            ? 'bg-white/5 border-optic-accent shadow-[0_0_30px_rgba(56,189,248,0.1)] scale-105 z-10' 
                            : 'bg-black/40 border-white/10 hover:border-white/20 text-white/70'
                        }
                    `}
                >
                    {p.highlight && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-optic-accent text-black text-[10px] font-bold uppercase tracking-widest rounded-full">
                            {t('landing.recommended')}
                        </div>
                    )}
                    <h3 className="text-sm font-mono font-bold text-white/50 uppercase tracking-widest mb-4">{p.title}</h3>
                    <div className="flex items-baseline gap-1 mb-8">
                        <span className={`text-4xl font-bold ${p.highlight ? 'text-white' : 'text-white/80'}`}>{p.price}</span>
                        {p.period && <span className="text-white/40 text-sm font-mono">{p.period}</span>}
                    </div>
                    
                    <ul className="space-y-4 mb-8 text-left">
                        {p.features.map((feat, j) => (
                            <li key={j} className="flex items-center gap-3 text-sm">
                                <Check className={`w-4 h-4 ${p.highlight ? 'text-optic-accent' : 'text-white/30'}`} />
                                <span className={p.highlight ? 'text-white/90' : 'text-white/50'}>{feat}</span>
                            </li>
                        ))}
                    </ul>

                    <button 
                        onClick={() => setIsAuthOpen(true)}
                        className={`w-full py-3 rounded text-xs font-bold uppercase tracking-widest transition-all
                            ${p.highlight 
                                ? 'bg-white text-black hover:bg-gray-200' 
                                : 'border border-white/20 hover:bg-white/10 text-white'
                            }
                        `}
                    >
                        {t('landing.select_plan')}
                    </button>
                </motion.div>
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 text-center text-white/20 text-xs font-mono">
        <p>{t('landing.footer')}</p>
      </footer>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={() => {
            setIsAuthOpen(false);
            onEnterApp();
        }}
      />
    </div>
  );
};
