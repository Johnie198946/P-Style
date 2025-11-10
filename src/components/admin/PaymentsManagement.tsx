import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Search,
  Filter,
  Eye,
  Ban,
  RotateCcw,
  MessageCircle,
  Wallet,
  AlertTriangle,
  TrendingDown,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  paymentStore,
  PaymentOrder,
  RefundRecord,
  PaymentMethodConfig,
} from '../../lib/paymentStore';

// 支付趋势数据
const paymentTrend = [
  { month: '6月', revenue: 12800, orders: 145 },
  { month: '7月', revenue: 15200, orders: 168 },
  { month: '8月', revenue: 18900, orders: 201 },
  { month: '9月', revenue: 22400, orders: 235 },
  { month: '10月', revenue: 26700, orders: 278 },
  { month: '11月', revenue: 31200, orders: 312 },
];

// 支付方式图表颜色
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export function PaymentsManagement() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = paymentStore.subscribe(loadData);
    return unsubscribe;
  }, []);

  const loadData = () => {
    setOrders(paymentStore.getAllOrders());
    setRefunds(paymentStore.getAllRefunds());
    setPaymentMethods(paymentStore.getPaymentMethods());
  };

  const stats = paymentStore.getStats();

  // 过滤订单
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || order.paymentMethod === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      completed: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
      failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
      refunded: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: RotateCcw },
      cancelled: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Ban },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {orders.find(o => o.status === status)?.statusDisplay || status}
      </Badge>
    );
  };

  const getMethodIcon = (method: string) => {
    const icons: Record<string, any> = {
      wechat: MessageCircle,
      alipay: CreditCard,
      creditcard: CreditCard,
      paypal: Wallet,
    };
    const Icon = icons[method] || CreditCard;
    return <Icon className="w-4 h-4" />;
  };

  const handleViewOrder = (order: PaymentOrder) => {
    alert(`查看订单详情: ${order.orderNo}`);
  };

  const handleRefund = (order: PaymentOrder) => {
    if (order.status !== 'completed') {
      alert('只能退款已完成的订单');
      return;
    }
    const reason = prompt('请输入退款原因：');
    if (reason) {
      paymentStore.createRefund({
        orderId: order.id,
        userId: order.userId,
        userName: order.userName,
        amount: order.amount,
        reason,
      });
      alert('退款申请已创建');
    }
  };

  const handleProcessRefund = (refund: RefundRecord) => {
    if (confirm(`确认处理退款 ${refund.refundNo}？`)) {
      paymentStore.updateRefundStatus(refund.id, 'completed', 'admin_current', '退款已处理');
      alert('退款已完成');
    }
  };

  const handleRejectRefund = (refund: RefundRecord) => {
    const reason = prompt('请输入拒绝原因：');
    if (reason) {
      paymentStore.updateRefundStatus(refund.id, 'rejected', 'admin_current', reason);
      alert('已拒绝退款申请');
    }
  };

  const handleTogglePaymentMethod = (methodId: string) => {
    paymentStore.togglePaymentMethod(methodId as any);
  };

  const handleExportData = () => {
    const csv = [
      ['订单号', '用户', '计划', '金额', '支付方式', '状态', '创建时间'].join(','),
      ...filteredOrders.map(order =>
        [
          order.orderNo,
          order.userName,
          order.planName,
          order.amount,
          order.paymentMethodDisplay,
          order.statusDisplay,
          new Date(order.createdAt).toLocaleString('zh-CN'),
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payment_orders_${Date.now()}.csv`;
    link.click();
  };

  const handleResetToDefaults = () => {
    if (confirm('⚠️ 警告：这将恢复模拟数据。确定继续吗？')) {
      paymentStore.resetToDefaults();
      alert('✅ 已恢复默认数据！');
    }
  };

  // 准备支付方式分布图表数据
  const methodChartData = Object.entries(stats.methodDistribution)
    .filter(([_, value]) => value > 0)
    .map(([method, value]) => {
      const methodConfig = paymentMethods.find(m => m.id === method);
      return {
        name: methodConfig?.name || method,
        value,
      };
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
            支付管理
          </h2>
          <p className="text-gray-500 mt-1">
            管理支付订单、退款和支付方式配置
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
            onClick={handleExportData}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            导出数据
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
              <p>
                <strong>订单总数:</strong> {orders.length}
              </p>
              <p>
                <strong>退款记录:</strong> {refunds.length}
              </p>
              <p>
                <strong>支付方式:</strong> {paymentMethods.filter(m => m.enabled).length} 启用
              </p>
              <p>
                <strong>LocalStorage Keys:</strong> quantanova_payment_orders,
                quantanova_refund_records
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">总收入</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  ¥{stats.totalRevenue.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+23.5%</span>
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
                <p className="text-sm text-gray-600 mb-1">本月收入</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  ¥{stats.monthlyRevenue.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+18.2%</span>
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
                <p className="text-sm text-gray-600 mb-1">成功率</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  {stats.successRate.toFixed(1)}%
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+5.3%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">订单总数</p>
                <h3 className="text-3xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
                  {stats.totalOrders.toLocaleString()}
                </h3>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-sm text-green-600">+15.7%</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            支付订单
          </TabsTrigger>
          <TabsTrigger value="refunds" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            退款管理
          </TabsTrigger>
          <TabsTrigger value="methods" className="gap-2">
            <CreditCard className="w-4 h-4" />
            支付方式
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900">支付订单列表</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="搜索订单号、用户..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="pending">待支付</SelectItem>
                      <SelectItem value="processing">处理中</SelectItem>
                      <SelectItem value="failed">失败</SelectItem>
                      <SelectItem value="refunded">已退款</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部方式</SelectItem>
                      <SelectItem value="wechat">微信支付</SelectItem>
                      <SelectItem value="alipay">支付宝</SelectItem>
                      <SelectItem value="creditcard">信用卡</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>订单号</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>计划</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>支付方式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          暂无订单数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order, index) => (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <TableCell className="text-gray-900" style={{ fontWeight: 500 }}>
                            {order.orderNo}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-900" style={{ fontSize: '14px', fontWeight: 500 }}>
                                {order.userName}
                              </p>
                              <p className="text-gray-500" style={{ fontSize: '12px' }}>
                                {order.userEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700">{order.planName}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-900" style={{ fontWeight: 600 }}>
                                ¥{order.amount}
                              </p>
                              {order.discountAmount && (
                                <p className="text-gray-500 line-through" style={{ fontSize: '12px' }}>
                                  ¥{order.originalAmount}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getMethodIcon(order.paymentMethod)}
                              <span className="text-gray-700">{order.paymentMethodDisplay}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-gray-600" style={{ fontSize: '13px' }}>
                            {new Date(order.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewOrder(order)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {order.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRefund(order)}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Trend */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">收入趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={paymentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="收入 (¥)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Method Distribution */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">支付方式分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={methodChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {methodChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">退款申请列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>退款单号</TableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>原因</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>申请时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          暂无退款记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      refunds.map(refund => (
                        <TableRow key={refund.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <TableCell className="text-gray-900" style={{ fontWeight: 500 }}>
                            {refund.refundNo}
                          </TableCell>
                          <TableCell className="text-gray-700">{refund.orderNo}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-900" style={{ fontSize: '14px', fontWeight: 500 }}>
                                {refund.userName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900" style={{ fontWeight: 600 }}>
                            ¥{refund.amount}
                          </TableCell>
                          <TableCell className="text-gray-600 max-w-xs truncate">
                            {refund.reason}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                refund.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : refund.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {refund.statusDisplay}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600" style={{ fontSize: '13px' }}>
                            {new Date(refund.createdAt).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right">
                            {refund.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleProcessRefund(refund)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  通过
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRejectRefund(refund)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  拒绝
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">支付方式配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method, index) => (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-6 border-2 rounded-xl transition-all ${
                      method.enabled
                        ? 'border-gray-200 hover:border-gray-300 bg-white'
                        : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`w-14 h-14 rounded-xl ${
                            method.enabled
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                              : 'bg-gray-300'
                          } flex items-center justify-center text-white`}
                        >
                          {getMethodIcon(method.id)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
                              {method.name}
                            </h4>
                            {!method.enabled && (
                              <Badge className="bg-red-100 text-red-700 border-red-200">已禁用</Badge>
                            )}
                          </div>

                          <p className="text-gray-600 mb-3" style={{ fontSize: '14px' }}>
                            {method.description}
                          </p>

                          <div className="flex items-center gap-6 text-gray-600" style={{ fontSize: '13px' }}>
                            {method.processingFee && <span>手续费: {method.processingFee}%</span>}
                            {method.minAmount && <span>•</span>}
                            {method.minAmount && <span>最小金额: ¥{method.minAmount}</span>}
                            {method.maxAmount && <span>•</span>}
                            {method.maxAmount && <span>最大金额: ¥{method.maxAmount}</span>}
                          </div>

                          <div className="mt-3">
                            <Badge className="bg-gray-100 text-gray-700">
                              已处理订单: {stats.methodDistribution[method.id] || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant={method.enabled ? 'outline' : 'default'}
                        onClick={() => handleTogglePaymentMethod(method.id)}
                        className={
                          method.enabled
                            ? 'text-red-600 border-red-300 hover:bg-red-50'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }
                      >
                        {method.enabled ? '禁用' : '启用'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
