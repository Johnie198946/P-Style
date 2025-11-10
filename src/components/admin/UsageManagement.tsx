import { motion } from 'motion/react';
import { Activity, Cpu, HardDrive, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 模拟数据
const apiUsageData = [
  { hour: '00:00', calls: 234, success: 228, failed: 6 },
  { hour: '04:00', calls: 189, success: 185, failed: 4 },
  { hour: '08:00', calls: 892, success: 875, failed: 17 },
  { hour: '12:00', calls: 1456, success: 1432, failed: 24 },
  { hour: '16:00', calls: 1789, success: 1756, failed: 33 },
  { hour: '20:00', calls: 1234, success: 1205, failed: 29 },
];

const storageGrowth = [
  { date: '6/4', storage: 425 },
  { date: '6/5', storage: 438 },
  { date: '6/6', storage: 451 },
  { date: '6/7', storage: 465 },
  { date: '6/8', storage: 478 },
  { date: '6/9', storage: 489.5 },
];

const resourceByUser = [
  { plan: 'Free', users: 8612, avgCalls: 8, avgStorage: '0.3 GB' },
  { plan: 'Pro', users: 3247, avgCalls: 156, avgStorage: '2.8 GB' },
  { plan: 'Business', users: 600, avgStorage: '12.5 GB', avgCalls: 892 },
];

export function UsageManagement() {
  const currentStats = {
    apiCalls: {
      today: 8934,
      limit: 50000,
      change: '+12.3%'
    },
    cpuUsage: {
      current: 67,
      change: '+5.2%'
    },
    storage: {
      used: 489.5,
      total: 2000,
      change: '+2.4%'
    },
    bandwidth: {
      today: 156.8,
      change: '+8.7%'
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>资源用量</h2>
        <p className="text-gray-500 mt-1">监控系统资源使用情况</p>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">API 调用</p>
                  <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                    {currentStats.apiCalls.today.toLocaleString()}
                  </h3>
                  <div className="space-y-2">
                    <Progress 
                      value={(currentStats.apiCalls.today / currentStats.apiCalls.limit) * 100} 
                      className="h-2"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {currentStats.apiCalls.today.toLocaleString()} / {currentStats.apiCalls.limit.toLocaleString()}
                      </span>
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {currentStats.apiCalls.change}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">CPU 使用率</p>
                  <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                    {currentStats.cpuUsage.current}%
                  </h3>
                  <div className="space-y-2">
                    <Progress value={currentStats.cpuUsage.current} className="h-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className={currentStats.cpuUsage.current > 80 ? 'text-red-600' : 'text-gray-500'}>
                        {currentStats.cpuUsage.current > 80 ? '高负载' : '正常'}
                      </span>
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {currentStats.cpuUsage.change}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">存储空间</p>
                  <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                    {currentStats.storage.used} GB
                  </h3>
                  <div className="space-y-2">
                    <Progress 
                      value={(currentStats.storage.used / currentStats.storage.total) * 100} 
                      className="h-2"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {currentStats.storage.used} / {currentStats.storage.total} GB
                      </span>
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {currentStats.storage.change}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">今日带宽</p>
                  <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                    {currentStats.bandwidth.today} GB
                  </h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-sm text-green-600">{currentStats.bandwidth.change}</span>
                    <span className="text-xs text-gray-500 ml-1">vs 昨日</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Zap className="w-5 h-5 text-blue-500" />
                API 调用趋势（今日）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={apiUsageData}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    name="总调用" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorCalls)" 
                  />
                  <Line type="monotone" dataKey="failed" name="失败" stroke="#ef4444" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Storage Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <HardDrive className="w-5 h-5 text-purple-500" />
                存储增长趋势（近7天）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={storageGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="storage" 
                    name="存储 (GB)" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Resource by Plan */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">各套餐资源使用统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resourceByUser.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-lg ${
                      item.plan === 'Business' ? 'bg-purple-100 text-purple-700' :
                      item.plan === 'Pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-200 text-gray-700'
                    }`} style={{ fontWeight: 600 }}>
                      {item.plan}
                    </div>
                    <span className="text-sm text-gray-600">
                      {item.users.toLocaleString()} 用户
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">平均 API 调用/天</p>
                    <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>
                      {item.avgCalls}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">平均存储使用</p>
                    <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>
                      {item.avgStorage}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">总存储占用</p>
                    <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>
                      {(parseFloat(item.avgStorage) * item.users / 1024).toFixed(1)} TB
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
