// 支付数据存储服务
// 管理支付订单、支付方式配置、退款记录等

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentMethod = 'wechat' | 'alipay' | 'creditcard' | 'paypal';
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface PaymentOrder {
  id: string;
  orderNo: string; // 订单号
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  originalAmount?: number; // 原价
  discountAmount?: number; // 折扣金额
  couponCode?: string; // 优惠码
  paymentMethod: PaymentMethod;
  paymentMethodDisplay: string;
  status: PaymentStatus;
  statusDisplay: string;
  transactionId?: string; // 第三方交易ID
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface RefundRecord {
  id: string;
  refundNo: string;
  orderId: string;
  orderNo: string;
  userId: string;
  userName: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  statusDisplay: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  enabled: boolean;
  icon: string; // lucide-react 图标名
  description: string;
  processingFee?: number; // 手续费百分比
  minAmount?: number; // 最小金额
  maxAmount?: number; // 最大金额
}

export interface PaymentStats {
  totalRevenue: number;
  monthlyRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  pendingOrders: number;
  refundedOrders: number;
  successRate: number;
  refundRate: number;
  avgOrderValue: number;
  methodDistribution: Record<PaymentMethod, number>;
}

const ORDERS_KEY = 'quantanova_payment_orders';
const REFUNDS_KEY = 'quantanova_refund_records';
const PAYMENT_METHODS_KEY = 'quantanova_payment_methods';

// 默认支付方式配置
const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'wechat',
    name: '微信支付',
    enabled: true,
    icon: 'MessageCircle',
    description: '支持微信扫码支付',
    processingFee: 0.6,
    minAmount: 0.01,
    maxAmount: 50000,
  },
  {
    id: 'alipay',
    name: '支付宝',
    enabled: true,
    icon: 'CreditCard',
    description: '支持支付宝扫码支付',
    processingFee: 0.6,
    minAmount: 0.01,
    maxAmount: 50000,
  },
  {
    id: 'creditcard',
    name: '信用卡',
    enabled: true,
    icon: 'CreditCard',
    description: '支持 Visa、Mastercard、银联',
    processingFee: 2.9,
    minAmount: 1,
    maxAmount: 100000,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    enabled: false,
    icon: 'Wallet',
    description: '国际支付方式',
    processingFee: 3.4,
    minAmount: 1,
    maxAmount: 100000,
  },
];

// 生成订单号
function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${timestamp}${random}`;
}

// 生成退款单号
function generateRefundNo(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RFD${timestamp}${random}`;
}

// 模拟支付订单数据
const MOCK_ORDERS: PaymentOrder[] = [
  {
    id: 'order_001',
    orderNo: 'ORD20241109001234',
    userId: 'user_001',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    planId: 'pro',
    planName: '专业版',
    amount: 99,
    originalAmount: 99,
    paymentMethod: 'wechat',
    paymentMethodDisplay: '微信支付',
    status: 'completed',
    statusDisplay: '已完成',
    transactionId: '4200001234567890',
    paidAt: '2024-11-09T10:30:00Z',
    createdAt: '2024-11-09T10:25:00Z',
    updatedAt: '2024-11-09T10:30:00Z',
  },
  {
    id: 'order_002',
    orderNo: 'ORD20241109001235',
    userId: 'user_002',
    userName: '李四',
    userEmail: 'lisi@example.com',
    planId: 'enterprise',
    planName: '企业版',
    amount: 299,
    originalAmount: 399,
    discountAmount: 100,
    couponCode: 'LAUNCH100',
    paymentMethod: 'alipay',
    paymentMethodDisplay: '支付宝',
    status: 'completed',
    statusDisplay: '已完成',
    transactionId: '2024110912345678',
    paidAt: '2024-11-09T14:20:00Z',
    createdAt: '2024-11-09T14:15:00Z',
    updatedAt: '2024-11-09T14:20:00Z',
  },
  {
    id: 'order_003',
    orderNo: 'ORD20241109001236',
    userId: 'user_003',
    userName: '王五',
    userEmail: 'wangwu@example.com',
    planId: 'pro',
    planName: '专业版',
    amount: 99,
    paymentMethod: 'creditcard',
    paymentMethodDisplay: '信用卡',
    status: 'pending',
    statusDisplay: '待支付',
    createdAt: '2024-11-09T16:00:00Z',
    updatedAt: '2024-11-09T16:00:00Z',
  },
  {
    id: 'order_004',
    orderNo: 'ORD20241108001237',
    userId: 'user_004',
    userName: '赵六',
    userEmail: 'zhaoliu@example.com',
    planId: 'pro',
    planName: '专业版',
    amount: 99,
    paymentMethod: 'wechat',
    paymentMethodDisplay: '微信支付',
    status: 'failed',
    statusDisplay: '失败',
    createdAt: '2024-11-08T09:10:00Z',
    updatedAt: '2024-11-08T09:15:00Z',
  },
  {
    id: 'order_005',
    orderNo: 'ORD20241108001238',
    userId: 'user_005',
    userName: '孙七',
    userEmail: 'sunqi@example.com',
    planId: 'enterprise',
    planName: '企业版',
    amount: 299,
    paymentMethod: 'alipay',
    paymentMethodDisplay: '支付宝',
    status: 'refunded',
    statusDisplay: '已退款',
    transactionId: '2024110812345679',
    paidAt: '2024-11-08T11:00:00Z',
    createdAt: '2024-11-08T10:55:00Z',
    updatedAt: '2024-11-08T15:30:00Z',
  },
];

// 模拟退款记录
const MOCK_REFUNDS: RefundRecord[] = [
  {
    id: 'refund_001',
    refundNo: 'RFD20241108001',
    orderId: 'order_005',
    orderNo: 'ORD20241108001238',
    userId: 'user_005',
    userName: '孙七',
    amount: 299,
    reason: '用户主动申请退款',
    status: 'completed',
    statusDisplay: '已完成',
    processedAt: '2024-11-08T15:30:00Z',
    processedBy: 'admin_001',
    notes: '已确认退款，7个工作日内到账',
    createdAt: '2024-11-08T14:00:00Z',
    updatedAt: '2024-11-08T15:30:00Z',
  },
];

class PaymentStore {
  private listeners: Set<() => void> = new Set();

  // ========== 支付订单管理 ==========

  getAllOrders(): PaymentOrder[] {
    try {
      const stored = localStorage.getItem(ORDERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      this.saveOrders(MOCK_ORDERS);
      return MOCK_ORDERS;
    } catch (error) {
      console.error('Failed to load payment orders:', error);
      return MOCK_ORDERS;
    }
  }

  getOrderById(id: string): PaymentOrder | null {
    const orders = this.getAllOrders();
    return orders.find(order => order.id === id) || null;
  }

  getOrderByOrderNo(orderNo: string): PaymentOrder | null {
    const orders = this.getAllOrders();
    return orders.find(order => order.orderNo === orderNo) || null;
  }

  getUserOrders(userId: string): PaymentOrder[] {
    const orders = this.getAllOrders();
    return orders.filter(order => order.userId === userId);
  }

  createOrder(orderData: Partial<PaymentOrder>): PaymentOrder {
    const orders = this.getAllOrders();
    const newOrder: PaymentOrder = {
      id: `order_${Date.now()}`,
      orderNo: generateOrderNo(),
      userId: orderData.userId || '',
      userName: orderData.userName || '',
      userEmail: orderData.userEmail || '',
      planId: orderData.planId || '',
      planName: orderData.planName || '',
      amount: orderData.amount || 0,
      originalAmount: orderData.originalAmount,
      discountAmount: orderData.discountAmount,
      couponCode: orderData.couponCode,
      paymentMethod: orderData.paymentMethod || 'wechat',
      paymentMethodDisplay: orderData.paymentMethodDisplay || '微信支付',
      status: 'pending',
      statusDisplay: '待支付',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: orderData.metadata,
    };

    orders.push(newOrder);
    this.saveOrders(orders);
    this.notifyListeners();
    return newOrder;
  }

  updateOrderStatus(orderId: string, status: PaymentStatus, transactionId?: string): void {
    const orders = this.getAllOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.statusDisplay = this.getStatusDisplay(status);
      if (transactionId) {
        order.transactionId = transactionId;
      }
      if (status === 'completed') {
        order.paidAt = new Date().toISOString();
      }
      order.updatedAt = new Date().toISOString();
      this.saveOrders(orders);
      this.notifyListeners();
    }
  }

  private getStatusDisplay(status: PaymentStatus): string {
    const statusMap: Record<PaymentStatus, string> = {
      pending: '待支付',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      refunded: '已退款',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  }

  private saveOrders(orders: PaymentOrder[]): void {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error('Failed to save payment orders:', error);
    }
  }

  // ========== 退款管理 ==========

  getAllRefunds(): RefundRecord[] {
    try {
      const stored = localStorage.getItem(REFUNDS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      this.saveRefunds(MOCK_REFUNDS);
      return MOCK_REFUNDS;
    } catch (error) {
      console.error('Failed to load refund records:', error);
      return MOCK_REFUNDS;
    }
  }

  getRefundById(id: string): RefundRecord | null {
    const refunds = this.getAllRefunds();
    return refunds.find(refund => refund.id === id) || null;
  }

  createRefund(refundData: Partial<RefundRecord>): RefundRecord {
    const refunds = this.getAllRefunds();
    const orders = this.getAllOrders();
    
    const order = orders.find(o => o.id === refundData.orderId);
    
    const newRefund: RefundRecord = {
      id: `refund_${Date.now()}`,
      refundNo: generateRefundNo(),
      orderId: refundData.orderId || '',
      orderNo: order?.orderNo || '',
      userId: refundData.userId || order?.userId || '',
      userName: refundData.userName || order?.userName || '',
      amount: refundData.amount || order?.amount || 0,
      reason: refundData.reason || '',
      status: 'pending',
      statusDisplay: '待处理',
      notes: refundData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    refunds.push(newRefund);
    this.saveRefunds(refunds);
    
    // 更新订单状态为处理中
    if (refundData.orderId) {
      this.updateOrderStatus(refundData.orderId, 'processing');
    }
    
    this.notifyListeners();
    return newRefund;
  }

  updateRefundStatus(
    refundId: string, 
    status: RefundStatus, 
    processedBy?: string, 
    notes?: string
  ): void {
    const refunds = this.getAllRefunds();
    const refund = refunds.find(r => r.id === refundId);
    if (refund) {
      refund.status = status;
      refund.statusDisplay = this.getRefundStatusDisplay(status);
      if (status === 'completed' || status === 'rejected') {
        refund.processedAt = new Date().toISOString();
      }
      if (processedBy) {
        refund.processedBy = processedBy;
      }
      if (notes) {
        refund.notes = notes;
      }
      refund.updatedAt = new Date().toISOString();
      this.saveRefunds(refunds);
      
      // 如果退款完成，更新订单状态
      if (status === 'completed' && refund.orderId) {
        this.updateOrderStatus(refund.orderId, 'refunded');
      }
      
      this.notifyListeners();
    }
  }

  private getRefundStatusDisplay(status: RefundStatus): string {
    const statusMap: Record<RefundStatus, string> = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      rejected: '已拒绝',
    };
    return statusMap[status] || status;
  }

  private saveRefunds(refunds: RefundRecord[]): void {
    try {
      localStorage.setItem(REFUNDS_KEY, JSON.stringify(refunds));
    } catch (error) {
      console.error('Failed to save refund records:', error);
    }
  }

  // ========== 支付方式管理 ==========

  getPaymentMethods(): PaymentMethodConfig[] {
    try {
      const stored = localStorage.getItem(PAYMENT_METHODS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      this.savePaymentMethods(DEFAULT_PAYMENT_METHODS);
      return DEFAULT_PAYMENT_METHODS;
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      return DEFAULT_PAYMENT_METHODS;
    }
  }

  getEnabledPaymentMethods(): PaymentMethodConfig[] {
    return this.getPaymentMethods().filter(method => method.enabled);
  }

  togglePaymentMethod(methodId: PaymentMethod): void {
    const methods = this.getPaymentMethods();
    const method = methods.find(m => m.id === methodId);
    if (method) {
      method.enabled = !method.enabled;
      this.savePaymentMethods(methods);
      this.notifyListeners();
    }
  }

  private savePaymentMethods(methods: PaymentMethodConfig[]): void {
    try {
      localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(methods));
    } catch (error) {
      console.error('Failed to save payment methods:', error);
    }
  }

  // ========== 统计数据 ==========

  getStats(): PaymentStats {
    const orders = this.getAllOrders();
    const completedOrders = orders.filter(o => o.status === 'completed');
    const refundedOrders = orders.filter(o => o.status === 'refunded');
    const failedOrders = orders.filter(o => o.status === 'failed');
    const pendingOrders = orders.filter(o => o.status === 'pending');

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.amount, 0);
    
    // 计算本月收入
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyOrders = completedOrders.filter(o => new Date(o.paidAt || o.createdAt) >= monthStart);
    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.amount, 0);

    // 计算今日收入
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = completedOrders.filter(o => new Date(o.paidAt || o.createdAt) >= todayStart);
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.amount, 0);

    const totalOrders = orders.length;
    const successfulOrders = completedOrders.length;
    const successRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;
    const refundRate = successfulOrders > 0 ? (refundedOrders.length / successfulOrders) * 100 : 0;
    const avgOrderValue = successfulOrders > 0 ? totalRevenue / successfulOrders : 0;

    // 支付方式分布
    const methodDistribution: Record<PaymentMethod, number> = {
      wechat: 0,
      alipay: 0,
      creditcard: 0,
      paypal: 0,
    };
    completedOrders.forEach(order => {
      methodDistribution[order.paymentMethod]++;
    });

    return {
      totalRevenue,
      monthlyRevenue,
      todayRevenue,
      totalOrders,
      successfulOrders,
      failedOrders: failedOrders.length,
      pendingOrders: pendingOrders.length,
      refundedOrders: refundedOrders.length,
      successRate,
      refundRate,
      avgOrderValue,
      methodDistribution,
    };
  }

  // ========== 订阅通知 ==========

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // ========== 工具方法 ==========

  resetToDefaults(): void {
    this.saveOrders(MOCK_ORDERS);
    this.saveRefunds(MOCK_REFUNDS);
    this.savePaymentMethods(DEFAULT_PAYMENT_METHODS);
    this.notifyListeners();
  }

  clearAll(): void {
    localStorage.removeItem(ORDERS_KEY);
    localStorage.removeItem(REFUNDS_KEY);
    localStorage.removeItem(PAYMENT_METHODS_KEY);
    this.notifyListeners();
  }
}

// 导出单例实例
export const paymentStore = new PaymentStore();
