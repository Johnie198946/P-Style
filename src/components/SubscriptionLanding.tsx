import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Crown, Star, X, ArrowLeft, CreditCard } from 'lucide-react';
import { PublishedContent } from './PublishedContent';
import { TopNav } from './TopNav';
import { subscriptionStore, SubscriptionPlan } from '../lib/subscriptionStore';

interface SubscriptionLandingProps {
  onBack: () => void;
}

export function SubscriptionLanding({ onBack }: SubscriptionLandingProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // 从数据存储加载订阅计划
  useEffect(() => {
    loadPlans();
    const unsubscribe = subscriptionStore.subscribe(loadPlans);
    return unsubscribe;
  }, []);

  const loadPlans = () => {
    const activePlans = subscriptionStore.getActivePlans();
    console.log('🌐 主站订阅页 - 加载活跃计划:', activePlans);
    console.log('📦 主站订阅页 - 所有计划:', subscriptionStore.getAllPlans());
    setPlans(activePlans);
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const confirmUpgrade = () => {
    console.log('升级到:', selectedPlan);
    setShowUpgradeDialog(false);
    alert('请先登录或注册以继续订阅');
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      star: Star,
      zap: Zap,
      crown: Crown,
    };
    const Icon = icons[iconName] || Zap;
    return <Icon className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <TopNav />

      <div className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>返回首页</span>
          </motion.button>

          {/* Published Content - Announcements */}
          <div className="mb-8">
            <PublishedContent position="subscription" type="announcement" />
          </div>

          {/* Published Content - Banners */}
          <div className="mb-12">
            <PublishedContent position="subscription" type="banner" />
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
              选择适合你的订阅计划
            </h1>
            <p className="text-gray-600 text-lg">
              专业的照片风格克隆 AI 工具，让每一张照片都完美呈现
            </p>
          </motion.div>

          {/* Plans */}
          {plans.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-gray-50 rounded-2xl mb-4">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-xl text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                暂无可用的订阅计划
              </h3>
              <p className="text-gray-500 mb-4">
                管理员尚未配置订阅计划，或所有计划都已禁用
              </p>
              <p className="text-xs text-gray-400">
                请联系管理员或稍后再试
              </p>
            </div>
          )}
          
          <div className={`grid grid-cols-1 gap-8 mb-16 ${
            plans.length === 3 ? 'md:grid-cols-3' : 
            plans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 
            plans.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : ''
          }`}>
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative rounded-3xl border-2 border-gray-200 hover:border-indigo-300 bg-white p-8 transition-all hover:shadow-xl"
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg">
                      <p style={{ fontSize: '12px', fontWeight: 600 }}>最受欢迎</p>
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center text-white mb-6`}>
                  {getIconComponent(plan.icon)}
                </div>

                {/* Plan Info */}
                <h3 className="text-gray-900 mb-2" style={{ fontSize: '24px', fontWeight: 700 }}>
                  {plan.name}
                </h3>
                <p className="text-gray-500 mb-6" style={{ fontSize: '14px', fontWeight: 400 }}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-1">
                    {plan.originalPrice && (
                      <span className="text-gray-400 line-through" style={{ fontSize: '20px', fontWeight: 500 }}>
                        ¥{plan.originalPrice}
                      </span>
                    )}
                    <span className="text-gray-900" style={{ fontSize: '40px', fontWeight: 700 }}>
                      {plan.price === 0 ? '免费' : `¥${plan.price}`}
                    </span>
                    <span className="text-gray-500" style={{ fontSize: '16px', fontWeight: 400 }}>
                      /{plan.periodDisplay}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.filter(f => f.enabled).map((feature) => (
                    <li key={feature.id} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700" style={{ fontSize: '14px', fontWeight: 400 }}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan)}
                  className={`w-full py-4 rounded-xl transition-all flex items-center justify-center ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                  style={{ fontSize: '16px', fontWeight: 600 }}
                >
                  立即订阅
                </button>
              </motion.div>
            ))}
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-gray-900 text-center mb-8" style={{ fontSize: '32px', fontWeight: 700 }}>
              强大的功能特性
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PublishedContent position="subscription" type="feature" />
            </div>
          </div>

          {/* FAQ or Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <p className="text-gray-600" style={{ fontSize: '14px' }}>
              需要帮助选择计划？
              <a href="#" className="text-blue-600 hover:text-blue-700 ml-2">
                联系我们的客服团队
              </a>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <AnimatePresence>
        {showUpgradeDialog && selectedPlan && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeDialog(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            />
            <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
                    订阅确认
                  </h3>
                  <button
                    onClick={() => setShowUpgradeDialog(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    {/* Plan Details */}
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${
                          selectedPlan?.color
                        } rounded-lg flex items-center justify-center text-white`}>
                          {selectedPlan && getIconComponent(selectedPlan.icon)}
                        </div>
                        <div>
                          <p className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                            {selectedPlan?.name}
                          </p>
                          <p className="text-gray-600" style={{ fontSize: '13px', fontWeight: 400 }}>
                            {selectedPlan?.price === 0 ? '免费' : `¥${selectedPlan?.price}`}/{selectedPlan?.periodDisplay}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-blue-900" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        💡 <strong>提示：</strong>您需要先登录或注册账号才能订阅。订阅后即可享受所有功能。
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <button
                        onClick={confirmUpgrade}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                        style={{ fontSize: '14px', fontWeight: 600 }}
                      >
                        继续订阅
                      </button>
                      <button
                        onClick={() => setShowUpgradeDialog(false)}
                        className="w-full py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 transition-all flex items-center justify-center"
                        style={{ fontSize: '14px', fontWeight: 500 }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
