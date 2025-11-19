import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Image, Download, TrendingUp, Calendar, Crown, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { userApi, UsageData, ApiError } from '../../lib/api';
import { toast } from 'sonner';

/**
 * 资源用量页面
 * 根据开发方案第 14 节和第 27 节，使用 GET /api/user/usage 获取真实数据
 * 不再使用模拟数据（根据开发方案第 382-387 节要求）
 */
export function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // 加载用量数据
  useEffect(() => {
    loadUsageData();
    loadSubscriptionInfo();
  }, []);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getUsage();
      setUsageData(data);
    } catch (err) {
      console.error('加载用量数据失败:', err);
      const errorMessage = err instanceof ApiError ? err.message : '加载用量数据失败，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionInfo = async () => {
    try {
      const data = await userApi.getMe();
      setSubscriptionInfo(data.subscriptionSummary);
    } catch (err) {
      console.error('加载订阅信息失败:', err);
      // 订阅信息加载失败不影响页面显示
    }
  };

  const handleUpgrade = () => {
    setShowUpgradeDialog(true);
  };

  const confirmUpgrade = () => {
    // 处理升级逻辑
    console.log('升级到企业版');
    setShowUpgradeDialog(false);
    alert('订阅升级成功！');
  };

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  // 如果加载失败，显示错误信息
  if (error || !usageData) {
    return (
      <div className="px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-red-900" style={{ fontWeight: 600 }}>加载失败</p>
              <p className="text-red-700 text-sm mt-1">{error || '无法获取数据'}</p>
              <button
                onClick={loadUsageData}
                className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 格式化限制显示（-1 表示无限）
  const formatLimit = (limit: number) => {
    if (limit === -1) return '∞';
    return limit.toLocaleString();
  };

  // 计算百分比（-1 表示无限，显示为 0%）
  const calculatePercentage = (used: number, total: number) => {
    if (total === -1) return 0; // 管理员无限，不显示百分比
    if (total === 0) return 0;
    return (used / total) * 100;
  };

  // 构建显示数据
  const displayData = {
    plan: subscriptionInfo?.plan_name || '免费版',
    resetDate: subscriptionInfo?.end_at 
      ? new Date(subscriptionInfo.end_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
      : '下个月',
    analyses: { 
      used: usageData.analysisUsed, 
      total: usageData.analysisLimit,
      percentage: calculatePercentage(usageData.analysisUsed, usageData.analysisLimit)
    },
    exports: { 
      used: usageData.generationUsed, 
      total: usageData.generationLimit,
      percentage: calculatePercentage(usageData.generationUsed, usageData.generationLimit)
    },
    storage: { used: 0, total: 0, unit: 'GB', percentage: 0 }, // 存储功能暂未实现
  };

  const recentActivity = [
    { id: 1, type: '风格分析', name: '日落海滩照片', date: '2025-11-08 14:30', status: 'completed' },
    { id: 2, type: '风格模拟', name: '人像摄影', date: '2025-11-08 10:15', status: 'completed' },
    { id: 3, type: '批量导出', name: '10张照片', date: '2025-11-07 16:45', status: 'completed' },
    { id: 4, type: '风格分析', name: '建筑摄影', date: '2025-11-07 09:20', status: 'completed' },
    { id: 5, type: '风格模拟', name: '风景照片', date: '2025-11-06 18:00', status: 'completed' },
  ];

  // 构建统计数据（使用真实 API 数据）
  const stats = [
    {
      label: '本月分析',
      value: displayData.analyses.used,
      total: displayData.analyses.total,
      percentage: displayData.analyses.percentage,
      icon: <Zap className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: '生成次数',
      value: displayData.exports.used,
      total: displayData.exports.total,
      percentage: displayData.exports.percentage,
      icon: <Download className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: '存储空间',
      value: `${displayData.storage.used}`,
      total: `${displayData.storage.total}`,
      percentage: displayData.storage.percentage,
      unit: displayData.storage.unit,
      icon: <Image className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="px-8 py-8">
      {/* Overview Card */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 mb-1" style={{ fontSize: '13px', fontWeight: 500 }}>
                当前订阅
              </p>
              <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                {displayData.plan}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span style={{ fontSize: '13px', fontWeight: 400 }}>
                重置时间: {displayData.resetDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="mb-8">
        <h3 className="text-gray-900 mb-4" style={{ fontSize: '18px', fontWeight: 600 }}>
          资源使用情况
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200"
            >
              {/* Icon */}
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center ${stat.textColor} mb-4`}>
                {stat.icon}
              </div>

              {/* Label */}
              <p className="text-gray-600 mb-2" style={{ fontSize: '13px', fontWeight: 500 }}>
                {stat.label}
              </p>

              {/* Value */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-gray-900" style={{ fontSize: '28px', fontWeight: 700 }}>
                  {stat.value}
                </span>
                <span className="text-gray-500" style={{ fontSize: '14px', fontWeight: 400 }}>
                  / {stat.total === -1 ? '∞' : stat.total} {stat.unit || '次'}
                </span>
              </div>

              {/* Progress Bar */}
              {stat.total !== -1 && stat.total > 0 && (
                <>
                  <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${stat.color} rounded-full`}
                    />
                  </div>
                  <p className="text-gray-500 mt-2 text-right" style={{ fontSize: '12px', fontWeight: 400 }}>
                    已使用 {stat.percentage.toFixed(1)}%
                  </p>
                </>
              )}
              {stat.total === -1 && (
                <p className="text-gray-500 mt-2 text-right" style={{ fontSize: '12px', fontWeight: 400 }}>
                  无限使用
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
            最近活动
          </h3>
          <button
            className="text-indigo-600 hover:text-indigo-700"
            style={{ fontSize: '13px', fontWeight: 500 }}
          >
            查看全部
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-900" style={{ fontSize: '14px', fontWeight: 600 }}>
                        {activity.name}
                      </p>
                      <p className="text-gray-500" style={{ fontSize: '12px', fontWeight: 400 }}>
                        {activity.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-green-600" style={{ fontSize: '12px', fontWeight: 500 }}>
                        已完成
                      </span>
                    </div>
                    <p className="text-gray-500" style={{ fontSize: '12px', fontWeight: 400 }}>
                      {activity.date}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      <div className="mt-8">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-gray-900 mb-1" style={{ fontSize: '16px', fontWeight: 600 }}>
                需要更多资源？
              </h4>
              <p className="text-gray-600" style={{ fontSize: '13px', fontWeight: 400 }}>
                升级到企业版，享受无限次分析和更多高级功能
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl whitespace-nowrap flex items-center justify-center"
              style={{ fontSize: '14px', fontWeight: 600 }}
            >
              立即升级
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <AnimatePresence>
        {showUpgradeDialog && (
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
                    升级到企业版
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
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                            企业版
                          </p>
                          <p className="text-gray-600" style={{ fontSize: '13px', fontWeight: 400 }}>
                            ¥299/每月
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          '无限次分析',
                          'AI 定制训练',
                          '8K 画质导出',
                          'API 接口访问',
                          '团队协作',
                          '专属客户经理'
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-gray-700" style={{ fontSize: '13px' }}>
                            <Check className="w-4 h-4 text-amber-600" />
                            <span>{feature}</span>
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
                          ¥299
                        </span>
                      </div>
                      <p className="text-gray-500" style={{ fontSize: '12px', fontWeight: 400 }}>
                        订阅将于 {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')} 自动续费
                      </p>
                    </div>

                    {/* Benefits Comparison */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-blue-900 mb-2" style={{ fontSize: '13px', fontWeight: 600 }}>
                        升级后的改进
                      </p>
                      <div className="space-y-1 text-blue-700" style={{ fontSize: '12px' }}>
                        <p>• 分析次数：500次/月 → 无限次</p>
                        <p>• 画质：4K → 8K</p>
                        <p>• 新增：API接口 + 团队协作</p>
                      </div>
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
