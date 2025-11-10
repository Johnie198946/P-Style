import { motion } from 'motion/react';
import { 
  Users, 
  CreditCard, 
  Image, 
  TrendingUp, 
  Activity,
  DollarSign,
  UserPlus,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

// 模拟数据
const statsCards = [
  { 
    title: '总用户数', 
    value: '12,459', 
    change: '+12.5%', 
    icon: Users, 
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  { 
    title: '活跃订阅', 
    value: '3,847', 
    change: '+8.2%', 
    icon: CreditCard, 
    color: 'from-green-500 to-green-600',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  { 
    title: '今日处理', 
    value: '1,239', 
    change: '+23.1%', 
    icon: Image, 
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  { 
    title: '月收入', 
    value: '¥89,420', 
    change: '+15.3%', 
    icon: DollarSign, 
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
];

const userGrowthData = [
  { month: '1月', users: 4200, active: 3100 },
  { month: '2月', users: 5300, active: 3900 },
  { month: '3月', users: 6800, active: 5100 },
  { month: '4月', users: 7900, active: 6200 },
  { month: '5月', users: 9400, active: 7500 },
  { month: '6月', users: 12459, active: 9800 },
];

const taskData = [
  { name: '已完成', value: 8934, color: '#10b981' },
  { name: '进行中', value: 245, color: '#3b82f6' },
  { name: '失败', value: 128, color: '#ef4444' },
];

const revenueData = [
  { month: '1月', revenue: 45000, subscriptions: 2800 },
  { month: '2月', revenue: 52000, subscriptions: 3100 },
  { month: '3月', revenue: 61000, subscriptions: 3450 },
  { month: '4月', revenue: 71000, subscriptions: 3680 },
  { month: '5月', revenue: 78000, subscriptions: 3790 },
  { month: '6月', revenue: 89420, subscriptions: 3847 },
];

const sourceData = [
  { source: '直接访问', count: 3542 },
  { source: '搜索引擎', count: 4231 },
  { source: '社交媒体', count: 2876 },
  { source: '推荐链接', count: 1810 },
];

const recentActivities = [
  { user: '张三', action: '订阅了 Pro 套餐', time: '2分钟前', type: 'subscription' },
  { user: '李四', action: '处理了 15 张照片', time: '5分钟前', type: 'task' },
  { user: '王五', action: '新用户注册', time: '12分钟前', type: 'register' },
  { user: '赵六', action: '上传了新照片', time: '18分钟前', type: 'upload' },
  { user: '陈七', action: '取消了订阅', time: '25分钟前', type: 'cancel' },
];

export function Dashboard() {
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
