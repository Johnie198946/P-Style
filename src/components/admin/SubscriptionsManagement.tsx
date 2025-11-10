import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Check, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  RefreshCw,
  AlertTriangle,
  UserCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { subscriptionStore, SubscriptionPlan } from '../../lib/subscriptionStore';
import { PlanEditor } from './PlanEditor';
import { SubscriptionUsersList } from './SubscriptionUsersList';

// 模拟趋势数据
const subscriptionTrend = [
  { month: '1月', Free: 7200, Pro: 2800, Business: 450 },
  { month: '2月', Free: 7450, Pro: 2950, Business: 480 },
  { month: '3月', Free: 7800, Pro: 3100, Business: 520 },
  { month: '4月', Free: 8100, Pro: 3200, Business: 550 },
  { month: '5月', Free: 8350, Pro: 3300, Business: 580 },
  { month: '6月', Free: 8612, Pro: 3247, Business: 600 },
];

const revenueTrend = [
  { month: '1月', revenue: 412200 },
  { month: '2月', revenue: 435050 },
  { month: '3月', revenue: 462300 },
  { month: '4月', revenue: 481500 },
  { month: '5月', revenue: 500700 },
  { month: '6月', revenue: 501153 },
];

export function SubscriptionsManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | undefined>(undefined);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    loadPlans();
    const unsubscribe = subscriptionStore.subscribe(loadPlans);
    return unsubscribe;
  }, []);

  const loadPlans = () => {
    const allPlans = subscriptionStore.getAllPlans();
    console.log('📊 订阅管理 - 加载计划:', allPlans);
    setPlans(allPlans);
  };

  const stats = subscriptionStore.getStats();

  const handleNewPlan = () => {
    setEditingPlan(undefined);
    setShowEditor(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setShowEditor(true);
  };

  const handleSavePlan = (plan: SubscriptionPlan) => {
    subscriptionStore.savePlan(plan);
    setShowEditor(false);
    setEditingPlan(undefined);
  };

  const handleDeletePlan = (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (confirm(`确定要删除 "${plan?.name}" 计划吗？这将影响所有使用该计划的用户。`)) {
      subscriptionStore.deletePlan(id);
    }
  };

  const handleToggleStatus = (id: string) => {
    subscriptionStore.togglePlanStatus(id);
  };

  const handleResetToDefaults = () => {
    if (confirm('⚠️ 警告：这将删除所有自定义订阅计划并恢复到默认设置。此操作不可撤销！\n\n确定要继续吗？')) {
      subscriptionStore.resetToDefaults();
      alert('✅ 已恢复默认订阅计划！主站将立即同步更新。');
    }
  };

  const handleClearAll = () => {
    if (confirm('⚠️ 危险操作：这将清空所有订阅计划数据！\n\n确定要继续吗？')) {
      if (confirm('⚠️ 最后确认：数据将被永久删除且无法恢复！')) {
        subscriptionStore.clearAll();
        alert('✅ 已清空所有数据！');
      }
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      star: Check,
      zap: CreditCard,
      crown: TrendingUp,
    };
    const Icon = icons[iconName] || CreditCard;
    return <Icon className="w-6 h-6" />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>订阅管理</h2>
          <p className="text-gray-500 mt-1">
            管理订阅计划、价格和功能配置 
            <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="ml-3 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {showDebugInfo ? '隐藏' : '显示'}调试信息
            </button>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={handleResetToDefaults}
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            恢复默认
          </Button>
          <Button 
            onClick={handleNewPlan}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建计划
          </Button>
        </div>
      </div>

      {/* Debug Info */}
      {showDebugInfo && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertTriangle className="w-5 h-5" />
              调试信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-yellow-900">
              <p><strong>计划总数:</strong> {plans.length}</p>
              <p><strong>启用计划:</strong> {plans.filter(p => p.isActive).length}</p>
              <p><strong>禁用计划:</strong> {plans.filter(p => !p.isActive).length}</p>
              <p><strong>LocalStorage Key:</strong> quantanova_subscription_plans</p>
              <details className="mt-4">
                <summary className="cursor-pointer text-yellow-900 font-medium hover:text-yellow-700">
                  查看原始数据 JSON
                </summary>
                <pre className="mt-2 p-4 bg-white rounded text-xs overflow-auto max-h-64 border border-yellow-200">
                  {JSON.stringify(plans, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">月度收入</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  ¥{stats.monthlyRevenue.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+15.3%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">付费用户</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  {stats.paidUsers.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+8.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
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
                  {stats.conversionRate.toFixed(1)}%
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+2.4%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">总用户数</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  {stats.totalUsers.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+12.5%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Plans and Users */}
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="w-4 h-4" />
            订阅计划
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <UserCircle2 className="w-4 h-4" />
            订阅用户
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          {/* Subscription Plans Management */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">订阅计划配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-6 border-2 rounded-xl transition-all ${
                  plan.isActive 
                    ? 'border-gray-200 hover:border-gray-300 bg-white' 
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {getIconComponent(plan.icon)}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
                          {plan.name}
                        </h4>
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                          {plan.nameEn}
                        </Badge>
                        {plan.popular && (
                          <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
                            最受欢迎
                          </Badge>
                        )}
                        {!plan.isActive && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            已禁用
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-600 mb-3" style={{ fontSize: '14px' }}>
                        {plan.description}
                      </p>

                      <div className="flex items-center gap-6 mb-4">
                        <div>
                          <span className="text-gray-900" style={{ fontSize: '28px', fontWeight: 700 }}>
                            {plan.price === 0 ? '免费' : `¥${plan.price}`}
                          </span>
                          <span className="text-gray-500 ml-2" style={{ fontSize: '14px' }}>
                            /{plan.periodDisplay}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span style={{ fontSize: '14px' }}>
                            {stats.planDistribution[plan.id] || 0} 用户
                          </span>
                        </div>
                      </div>

                      {/* Features Preview */}
                      <div className="grid grid-cols-2 gap-2">
                        {plan.features.slice(0, 4).map((feature) => (
                          <div key={feature.id} className="flex items-center gap-2 text-gray-700" style={{ fontSize: '13px' }}>
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="truncate">{feature.text}</span>
                          </div>
                        ))}
                        {plan.features.length > 4 && (
                          <p className="text-gray-500" style={{ fontSize: '12px' }}>
                            +{plan.features.length - 4} 更多功能
                          </p>
                        )}
                      </div>

                      {/* Limits Preview */}
                      <div className="mt-3 flex items-center gap-4 text-gray-600" style={{ fontSize: '12px' }}>
                        <span>
                          分析: {plan.limits.monthlyAnalysis === -1 ? '无限' : `${plan.limits.monthlyAnalysis}/月`}
                        </span>
                        <span>•</span>
                        <span>画质: {plan.limits.exportQuality}</span>
                        {plan.limits.apiAccess && (
                          <>
                            <span>•</span>
                            <span>API 访问</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(plan.id)}
                      className={plan.isActive ? 'text-gray-600' : 'text-green-600'}
                    >
                      {plan.isActive ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          禁用
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          启用
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPlan(plan)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {plans.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                暂无订阅计划
              </h3>
              <p className="text-gray-500 mb-4" style={{ fontSize: '14px' }}>
                创建第一个订阅计划开始
              </p>
              <Button 
                onClick={handleNewPlan}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建计划
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Trend */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">订阅趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={subscriptionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Free" name="Free" stroke="#6b7280" strokeWidth={2} />
                <Line type="monotone" dataKey="Pro" name="Pro" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Business" name="Business" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">收入趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="revenue" name="收入 (¥)" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="users">
          <SubscriptionUsersList />
        </TabsContent>
      </Tabs>

      {/* Plan Editor Dialog */}
      <PlanEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingPlan(undefined);
        }}
        onSave={handleSavePlan}
        initialPlan={editingPlan}
      />
    </div>
  );
}
