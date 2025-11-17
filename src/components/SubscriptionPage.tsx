import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Sparkles, Zap, Crown, Star } from 'lucide-react';

interface SubscriptionPageProps {
  onBack: () => void;
}

export function SubscriptionPage({ onBack }: SubscriptionPageProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'free',
      name: '免费版',
      price: { monthly: 0, yearly: 0 },
      icon: Star,
      iconColor: 'text-gray-600',
      bgGradient: 'from-gray-50 to-gray-100',
      borderColor: 'border-gray-200',
      features: [
        '每月 5 次分析',
        '基础调整方案',
        '标准画质输出',
        '社区支持'
      ],
      limitations: true
    },
    {
      id: 'pro',
      name: '专业版',
      price: { monthly: 99, yearly: 999 },
      icon: Zap,
      iconColor: 'text-indigo-600',
      bgGradient: 'from-indigo-50 to-purple-50',
      borderColor: 'border-indigo-200',
      popular: true,
      features: [
        '每月 100 次分析',
        '完整专业方案',
        '高清画质输出',
        '优先客服支持',
        'PS 预设下载',
        '批量处理功能'
      ]
    },
    {
      id: 'enterprise',
      name: '企业版',
      price: { monthly: 299, yearly: 2999 },
      icon: Crown,
      iconColor: 'text-purple-600',
      bgGradient: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      features: [
        '无限次分析',
        '定制化方案',
        '4K 画质输出',
        '专属客服经理',
        'API 接口访问',
        '团队协作功能',
        '数据安全保障',
        '私有化部署选项'
      ]
    }
  ];

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    // 这里可以添加实际的订阅逻辑
    console.log('订阅计划:', planId, '账单周期:', billingCycle);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      {/* 返回按钮 */}
      <div className="relative z-10">
        <div className="container mx-auto px-6 py-6">
          <motion.button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-white hover:shadow-md transition-all"
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </motion.button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
        
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-indigo-900" style={{ fontWeight: 500 }}>选择适合您的方案</span>
          </div>

          <h1 className="text-gray-900 mb-4" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            订阅计划
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontSize: '1.125rem' }}>
            解锁专业照片风格分析能力，让每一张照片都完美呈现
          </p>
        </motion.div>

        {/* 账单周期切换 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-xl transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{ fontWeight: 600 }}
            >
              月付
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-xl transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{ fontWeight: 600 }}
            >
              年付
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-green-500 text-white text-xs">
                省17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* 价格卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm shadow-lg" style={{ fontWeight: 600 }}>
                    最受欢迎
                  </div>
                </div>
              )}

              <div className={`relative h-full p-8 rounded-3xl bg-gradient-to-br ${plan.bgGradient} border-2 ${plan.borderColor} ${plan.popular ? 'shadow-2xl scale-105' : 'shadow-lg hover:shadow-xl'} transition-all`}>
                {/* 图标 */}
                <div className={`inline-flex p-3 rounded-2xl bg-white mb-6 ${plan.iconColor}`}>
                  <plan.icon className="w-7 h-7" strokeWidth={2} />
                </div>

                {/* 计划名称 */}
                <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {plan.name}
                </h3>

                {/* 价格 */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-900" style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                      ¥{billingCycle === 'monthly' ? plan.price.monthly : Math.floor(plan.price.yearly / 12)}
                    </span>
                    <span className="text-gray-600">/{billingCycle === 'monthly' ? '月' : '月'}</span>
                  </div>
                  {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      年付 ¥{plan.price.yearly}
                    </p>
                  )}
                </div>

                {/* 功能列表 */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-indigo-600" strokeWidth={3} />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* 订阅按钮 */}
                <motion.button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3.5 rounded-xl transition-all ${
                    plan.id === 'free'
                      ? 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ fontWeight: 600 }}
                >
                  {plan.id === 'free' ? '开始使用' : '立即订阅'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 常见问题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-center text-gray-900 mb-8" style={{ fontSize: '2rem', fontWeight: 700 }}>
            常见问题
          </h2>
          
          <div className="space-y-4">
            {[
              { q: '如何取消订阅？', a: '您可以随时在账户设置中取消订阅，取消后将在当前周期结束时生效。' },
              { q: '支持哪些支付方式？', a: '我们支持支付宝、微信支付、银行卡等多种支付方式。' },
              { q: '是否提供退款？', a: '订阅后7天内如不满意可申请全额退款。' }
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <h4 className="text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                  {faq.q}
                </h4>
                <p className="text-gray-600 text-sm">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
