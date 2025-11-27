import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  CreditCard, 
  Image, 
  TrendingUp, 
  Activity,
  DollarSign,
  UserPlus,
  Zap,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { adminApi, DashboardMetricsResponse, ApiError } from '../../lib/api';
import { toast } from 'sonner';

/**
 * Dashboard 组件
 * 根据开发方案第 768-779 节，使用 GET /api/admin/dashboard/metrics 获取真实数据
 * 不再使用模拟数据（根据开发方案第 382-387 节要求）
 */
export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);

  // 加载 Dashboard 数据
  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('加载 Dashboard 数据失败:', err);
      const errorMessage = err instanceof ApiError ? err.message : '加载数据失败，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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
  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>Dashboard</h2>
          <p className="text-gray-500 mt-1">系统运营概览</p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-900" style={{ fontWeight: 600 }}>加载失败</p>
                <p className="text-red-700 text-sm mt-1">{error || '无法获取数据'}</p>
                <button
                  onClick={loadMetrics}
                  className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
                >
                  重试
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 计算统计数据（用于显示卡片）
  const statsCards = [
    { 
      title: '总用户数', 
      value: metrics.users.total.toLocaleString(), 
      change: `+${metrics.users.recent7Days}`, 
      icon: Users, 
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: '活跃订阅', 
      value: metrics.subscriptions.total.toLocaleString(), 
      change: `+${Math.round((metrics.subscriptions.total / metrics.users.total) * 100)}%`, 
      icon: CreditCard, 
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      title: '今日处理', 
      value: metrics.tasks.recent7Days.toLocaleString(), 
      change: `+${Math.round((metrics.tasks.recent7Days / metrics.tasks.total) * 100)}%`, 
      icon: Image, 
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      title: '月收入', 
      value: `¥${metrics.payments.successful.toLocaleString()}`, 
      change: `+${Math.round((metrics.payments.successful / metrics.payments.total) * 100)}%`, 
      icon: DollarSign, 
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  // 任务状态数据（用于饼图）
  const taskData = [
    { name: '已完成', value: metrics.tasks.completed, color: '#10b981' },
    { name: '进行中', value: metrics.tasks.total - metrics.tasks.completed, color: '#3b82f6' },
  ];

  // 注意：由于后端接口只返回基础统计数据，以下图表数据暂时简化显示
  // 如需完整的历史趋势数据，需要后端提供额外的接口（如 /api/admin/analytics/trends）
  const userGrowthData = [
    { month: '最近7天', users: metrics.users.total, active: metrics.users.active },
  ];

  const revenueData = [
    { month: '总计', revenue: metrics.payments.total, subscriptions: metrics.subscriptions.total },
  ];

  const sourceData = [
    { source: '用户', count: metrics.users.total },
    { source: '任务', count: metrics.tasks.total },
    { source: '订阅', count: metrics.subscriptions.total },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>Dashboard</h2>
        <p className="text-gray-500 mt-1">系统运营概览</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-gray-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                        {stat.value}
                      </h3>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-sm text-green-600">{stat.change}</span>
                        <span className="text-xs text-gray-500 ml-1">vs 上月</span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <UserPlus className="w-5 h-5 text-blue-500" />
                用户增长趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="users" name="总用户" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="active" name="活跃用户" stroke="#10b981" fillOpacity={1} fill="url(#colorActive)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <DollarSign className="w-5 h-5 text-green-500" />
                收入与订阅
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis yAxisId="left" stroke="#6b7280" />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="收入 (¥)" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                  <Line yAxisId="right" type="monotone" dataKey="subscriptions" name="订阅数" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Activity className="w-5 h-5 text-purple-500" />
                任务状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={taskData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Traffic Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                流量来源
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="source" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="count" name="访问量" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Zap className="w-5 h-5 text-orange-500" />
                最近活动
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'subscription' ? 'bg-green-500' :
                      activity.type === 'task' ? 'bg-blue-500' :
                      activity.type === 'register' ? 'bg-purple-500' :
                      activity.type === 'upload' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span style={{ fontWeight: 600 }}>{activity.user}</span>{' '}
                        <span className="text-gray-600">{activity.action}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
