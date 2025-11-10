import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Crown, Star, X, CreditCard } from 'lucide-react';
import { PublishedContent } from '../PublishedContent';
import { subscriptionStore, SubscriptionPlan } from '../../lib/subscriptionStore';

export function SubscriptionPage() {
  const currentPlan = 'pro'; // free, pro, enterprise
  const [showManageDialog, setShowManageDialog] = useState(false);
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
    console.log('👤 用户中心 - 加载活跃计划:', activePlans);
    setPlans(activePlans);
  };

  const handleManageSubscription = () => {
    setShowManageDialog(true);
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const confirmUpgrade = () => {
    // 这里处理升级逻辑
    console.log('升级到:', selectedPlan);
    setShowUpgradeDialog(false);
    alert('订阅升级成功！');
  };

  const handleCancelSubscription = () => {
    if (confirm('确定要取消订阅吗？取消后将在当前计费周期结束后生效。')) {
      console.log('取消订阅');
      setShowManageDialog(false);
      alert('订阅已取消，将在 2025年12月9日 到期后停止续费');
    }
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

  const currentPlanData = plans.find(p => p.id === currentPlan);

  return (
    <div className="px-8 py-8">
      {/* Published Content - Announcements */}
      <div className="mb-6">
        <PublishedContent position="subscription" type="announcement" />
      </div>

      {/* Published Content - Banners */}
      <div className="mb-8">
        <PublishedContent position="subscription" type="banner" />
      </div>

      {/* Current Plan */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 mb-1" style={{ fontSize: '13px', fontWeight: 500 }}>
                当前订阅
              </p>
              <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                {currentPlanData?.name || '免费版'}
              </h3>
            </div>
            <div className={`w-14 h-14 bg-gradient-to-br ${currentPlanData?.color || 'from-indigo-500 to-purple-600'} rounded-2xl flex items-center justify-center text-white`}>
              {currentPlanData && getIconComponent(currentPlanData.icon)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600" style={{ fontSize: '14px', fontWeight: 400 }}>
                下次续费时间：2025年12月9日
              </p>
            </div>
            <button
              onClick={handleManageSubscription}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-900 rounded-lg border border-gray-200 transition-all"
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              管理订阅
            </button>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="mb-6">
        <h3 className="text-gray-900 mb-4" style={{ fontSize: '18px', fontWeight: 600 }}>
          升级订阅计划
        </h3>
        <p className="text-gray-600 mb-6" style={{ fontSize: '14px', fontWeight: 400 }}>
          选择最适合你的订阅计划，随时可以升级或降级
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-2xl border-2 p-6 transition-all ${
              plan.id === currentPlan
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-gray-200 hover:border-indigo-300 bg-white'
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg">
                  <p style={{ fontSize: '11px', fontWeight: 600 }}>最受欢迎</p>
                </div>
              </div>
            )}

            {/* Current Plan Badge */}
            {plan.id === currentPlan && (
              <div className="absolute top-4 right-4">
                <div className="px-2 py-1 bg-indigo-500 text-white rounded-md">
                  <p style={{ fontSize: '11px', fontWeight: 600 }}>当前计划</p>
                </div>
              </div>
            )}

            {/* Icon */}
            <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center text-white mb-4`}>
              {plan.icon}
            </div>

            {/* Plan Info */}
            <h4 className="text-gray-900 mb-1" style={{ fontSize: '18px', fontWeight: 600 }}>
              {plan.name}
            </h4>
            <p className="text-gray-500 mb-4" style={{ fontSize: '13px', fontWeight: 400 }}>
              {plan.description}
            </p>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-gray-900" style={{ fontSize: '32px', fontWeight: 700 }}>
                  {plan.price}
                </span>
                <span className="text-gray-500" style={{ fontSize: '14px', fontWeight: 400 }}>
                  /{plan.period}
                </span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700" style={{ fontSize: '13px', fontWeight: 400 }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => {
                if (plan.id !== currentPlan) {
                  handleUpgrade(plan.id);
                }
              }}
              className={`w-full py-3 rounded-xl transition-all flex items-center justify-center ${
                plan.id === currentPlan
                  ? 'bg-gray-100 text-gray-500 cursor-default'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
              }`}
              style={{ fontSize: '14px', fontWeight: 600 }}
              disabled={plan.id === currentPlan}
            >
              {plan.id === currentPlan ? '当前计划' : '立即订阅'}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Manage Subscription Dialog */}
      <AnimatePresence>
        {showManageDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManageDialog(false)}
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
                    管理订阅
                  </h3>
                  <button
                    onClick={() => setShowManageDialog(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    {/* Current Plan Info */}
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                            专业版
                          </p>
                          <p className="text-gray-600" style={{ fontSize: '13px', fontWeight: 400 }}>
                            ¥99/月
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-gray-700" style={{ fontSize: '13px' }}>
                        <p>• 订阅时间：2024年11月9日</p>
                        <p>• 下次扣费：2025年12月9日</p>
                        <p>• 支付方式：微信支付</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setShowManageDialog(false);
                          alert('跳转到支付方式管理页面');
                        }}
                        className="w-full px-4 py-3 bg-white hover:bg-gray-50 text-gray-900 rounded-xl border border-gray-200 transition-all text-left flex items-center justify-between"
                        style={{ fontSize: '14px', fontWeight: 500 }}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                          <span>更改支付方式</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <button
                        onClick={handleCancelSubscription}
                        className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-all"
                        style={{ fontSize: '14px', fontWeight: 500 }}
                      >
                        取消订阅
                      </button>
                    </div>

                    <p className="text-gray-500 text-center" style={{ fontSize: '12px', fontWeight: 400 }}>
                      取消后订阅将在当前计费周期结束后停止
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

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
                    确认升级
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
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${selectedPlan?.color} rounded-lg flex items-center justify-center text-white`}>
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
                      <div className="space-y-2">
                        {selectedPlan?.features.filter(f => f.enabled).slice(0, 4).map((feature) => (
                          <div key={feature.id} className="flex items-center gap-2 text-gray-700" style={{ fontSize: '13px' }}>
                            <Check className="w-4 h-4 text-amber-600" />
                            <span>{feature.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600" style={{ fontSize: '14px', fontWeight: 400 }}>
                          立即支付
                        </span>
                        <span className="text-gray-900" style={{ fontSize: '20px', fontWeight: 700 }}>
                          {selectedPlan?.price === 0 ? '免费' : `¥${selectedPlan?.price}`}
                        </span>
                      </div>
                      <p className="text-gray-500" style={{ fontSize: '12px', fontWeight: 400 }}>
                        订阅将于 {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')} 自动续费
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <button
                        onClick={confirmUpgrade}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                        style={{ fontSize: '14px', fontWeight: 600 }}
                      >
                        确认并支付
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
