import { motion } from 'motion/react';
import { BarChart3, Globe, Users, Clock, TrendingUp, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 模拟数据
const loginData = [
  { hour: '00-04', count: 234 },
  { hour: '04-08', count: 892 },
  { hour: '08-12', count: 2456 },
  { hour: '12-16', count: 3789 },
  { hour: '16-20', count: 4234 },
  { hour: '20-24', count: 1876 },
];

const deviceData = [
  { name: '桌面端', value: 6234, color: '#3b82f6' },
  { name: '移动端', value: 4892, color: '#8b5cf6' },
  { name: '平板', value: 1333, color: '#10b981' },
];

const regionData = [
  { region: '华东', users: 3847, percentage: 31 },
  { region: '华北', users: 2934, percentage: 24 },
  { region: '华南', users: 2456, percentage: 20 },
  { region: '华中', users: 1678, percentage: 13 },
  { region: '西南', users: 987, percentage: 8 },
  { region: '其他', users: 557, percentage: 4 },
];

const browserData = [
  { name: 'Chrome', value: 7234, percentage: 58 },
  { name: 'Safari', value: 2876, percentage: 23 },
  { name: 'Firefox', value: 1456, percentage: 12 },
  { name: 'Edge', value: 893, percentage: 7 },
];

const peakHours = [
  { time: '09:00-10:00', users: 2456 },
  { time: '14:00-15:00', users: 2234 },
  { time: '15:00-16:00', users: 3789 },
  { time: '16:00-17:00', users: 4234 },
  { time: '20:00-21:00', users: 2876 },
];

const referralSources = [
  { source: '搜索引擎', visitors: 4231, conversion: 32 },
  { source: '社交媒体', visitors: 2876, conversion: 28 },
  { source: '直接访问', visitors: 3542, conversion: 45 },
  { source: '推荐链接', visitors: 1810, conversion: 38 },
];

export function Analytics() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>数据分析</h2>
        <p className="text-gray-500 mt-1">深度分析用户行为和来源数据</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">今日访问</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  13,481
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+18.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">平均停留</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  8:42
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+2.3分钟</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">跳出率</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  24.8%
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500 rotate-180" />
                  <span className="text-sm text-green-600">-3.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">转化率</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  31.2%
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+2.4%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login Time Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5 text-blue-500" />
                用户登录时段分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loginData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="count" name="登录次数" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Device Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Globe className="w-5 h-5 text-purple-500" />
                设备类型分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {deviceData.map((device, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }} />
                      <div>
                        <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{device.name}</p>
                        <p className="text-xs text-gray-500">{device.value.toLocaleString()} 用户</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Region Distribution */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <MapPin className="w-5 h-5 text-green-500" />
            地域分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regionData.map((region, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4"
              >
                <div className="w-20 text-sm text-gray-700" style={{ fontWeight: 600 }}>
                  {region.region}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-end px-3"
                      style={{ width: `${region.percentage}%` }}
                    >
                      <span className="text-xs text-white" style={{ fontWeight: 600 }}>
                        {region.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-gray-900" style={{ fontWeight: 600 }}>
                  {region.users.toLocaleString()}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Browser Stats & Referral Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browser Stats */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">浏览器统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {browserData.map((browser, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs" style={{ fontWeight: 700 }}>
                      {browser.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{browser.name}</p>
                      <p className="text-xs text-gray-500">{browser.value.toLocaleString()} 用户</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{browser.percentage}%</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Referral Sources */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">流量来源分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralSources.map((source, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{source.source}</p>
                    <p className="text-sm text-gray-600">{source.visitors.toLocaleString()} 访问</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${source.conversion}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-12 text-right">
                      转化 {source.conversion}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            高峰时段分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="users" 
                name="活跃用户数" 
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
