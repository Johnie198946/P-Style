// 订阅数据存储服务
// 管理订阅计划、功能特性、用户订阅记录等

export interface SubscriptionFeature {
  id: string;
  text: string;
  enabled: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameEn: string; // 英文名称，用于标识
  price: number;
  originalPrice?: number; // 原价，用于显示折扣
  period: string; // 计费周期：'month' | 'year' | 'lifetime'
  periodDisplay: string; // 显示文本：'每月' | '每年' | '永久'
  description: string;
  icon: string; // 图标名称：'star' | 'zap' | 'crown'
  color: string; // Tailwind渐变色类名
  popular?: boolean;
  features: SubscriptionFeature[];
  limits: {
    monthlyAnalysis: number; // 每月分析次数，-1表示无限
    exportQuality: string; // 导出画质
    batchProcessing: boolean; // 批量处理
    apiAccess: boolean; // API访问
    teamCollaboration: boolean; // 团队协作
    prioritySupport: boolean; // 优先支持
    customTraining: boolean; // 定制训练
  };
  isActive: boolean; // 是否启用该计划
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod?: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  paidUsers: number;
  conversionRate: number;
  churnRate: number;
  planDistribution: Record<string, number>;
}

const PLANS_KEY = 'quantanova_subscription_plans';
const SUBSCRIPTIONS_KEY = 'quantanova_user_subscriptions';

// 默认订阅计划
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: '免费版',
    nameEn: 'Free',
    price: 0,
    period: 'lifetime',
    periodDisplay: '永久免费',
    description: '适合个人体验使用',
    icon: 'star',
    color: 'from-gray-500 to-gray-600',
    features: [
      { id: 'f1', text: '每月 10 次分析', enabled: true },
      { id: 'f2', text: '基础风格克隆', enabled: true },
      { id: 'f3', text: '标准画质导出', enabled: true },
      { id: 'f4', text: '社区支持', enabled: true },
    ],
    limits: {
      monthlyAnalysis: 10,
      exportQuality: '1080p',
      batchProcessing: false,
      apiAccess: false,
      teamCollaboration: false,
      prioritySupport: false,
      customTraining: false,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pro',
    name: '专业版',
    nameEn: 'Pro',
    price: 99,
    period: 'month',
    periodDisplay: '每月',
    description: '适合专业摄影师',
    icon: 'zap',
    color: 'from-indigo-500 to-purple-600',
    popular: true,
    features: [
      { id: 'p1', text: '每月 500 次分析', enabled: true },
      { id: 'p2', text: '高级风格克隆', enabled: true },
      { id: 'p3', text: '4K 画质导出', enabled: true },
      { id: 'p4', text: '批量处理', enabled: true },
      { id: 'p5', text: 'LR/PS 预设下载', enabled: true },
      { id: 'p6', text: '优先客服支持', enabled: true },
    ],
    limits: {
      monthlyAnalysis: 500,
      exportQuality: '4K',
      batchProcessing: true,
      apiAccess: false,
      teamCollaboration: false,
      prioritySupport: true,
      customTraining: false,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'enterprise',
    name: '企业版',
    nameEn: 'Enterprise',
    price: 299,
    period: 'month',
    periodDisplay: '每月',
    description: '适合团队和工作室',
    icon: 'crown',
    color: 'from-amber-500 to-orange-600',
    features: [
      { id: 'e1', text: '无限次分析', enabled: true },
      { id: 'e2', text: 'AI 定制训练', enabled: true },
      { id: 'e3', text: '8K 画质导出', enabled: true },
      { id: 'e4', text: 'API 接口访问', enabled: true },
      { id: 'e5', text: '团队协作', enabled: true },
      { id: 'e6', text: '专属客户经理', enabled: true },
      { id: 'e7', text: '定制化服务', enabled: true },
    ],
    limits: {
      monthlyAnalysis: -1,
      exportQuality: '8K',
      batchProcessing: true,
      apiAccess: true,
      teamCollaboration: true,
      prioritySupport: true,
      customTraining: true,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 模拟用户订阅数据
const MOCK_SUBSCRIPTIONS: UserSubscription[] = [
  {
    id: 'sub_001',
    userId: 'user_001',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    planId: 'pro',
    planName: '专业版',
    status: 'active',
    startDate: '2024-06-01',
    endDate: '2025-06-01',
    autoRenew: true,
    paymentMethod: '微信支付',
    amount: 99,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'sub_002',
    userId: 'user_002',
    userName: '李四',
    userEmail: 'lisi@example.com',
    planId: 'enterprise',
    planName: '企业版',
    status: 'active',
    startDate: '2024-06-05',
    endDate: '2025-06-05',
    autoRenew: true,
    paymentMethod: '支付宝',
    amount: 299,
    createdAt: '2024-06-05T14:30:00Z',
    updatedAt: '2024-06-05T14:30:00Z',
  },
];

class SubscriptionStore {
  private listeners: Set<() => void> = new Set();

  // ========== 订阅计划管理 ==========

  getAllPlans(): SubscriptionPlan[] {
    try {
      const stored = localStorage.getItem(PLANS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      this.savePlans(DEFAULT_PLANS);
      return DEFAULT_PLANS;
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
      return DEFAULT_PLANS;
    }
  }

  getActivePlans(): SubscriptionPlan[] {
    return this.getAllPlans().filter(plan => plan.isActive);
  }

  getPlanById(id: string): SubscriptionPlan | null {
    const plans = this.getAllPlans();
    return plans.find(plan => plan.id === id) || null;
  }

  savePlan(plan: SubscriptionPlan): void {
    const plans = this.getAllPlans();
    const existingIndex = plans.findIndex(p => p.id === plan.id);
    
    if (existingIndex >= 0) {
      plans[existingIndex] = {
        ...plan,
        updatedAt: new Date().toISOString(),
      };
    } else {
      plans.push({
        ...plan,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    this.savePlans(plans);
    this.notifyListeners();
  }

  deletePlan(id: string): void {
    const plans = this.getAllPlans();
    const filtered = plans.filter(plan => plan.id !== id);
    this.savePlans(filtered);
    this.notifyListeners();
  }

  togglePlanStatus(id: string): void {
    const plans = this.getAllPlans();
    const plan = plans.find(p => p.id === id);
    if (plan) {
      plan.isActive = !plan.isActive;
      plan.updatedAt = new Date().toISOString();
      this.savePlans(plans);
      this.notifyListeners();
    }
  }

  private savePlans(plans: SubscriptionPlan[]): void {
    try {
      localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    } catch (error) {
      console.error('Failed to save subscription plans:', error);
    }
  }

  // ========== 用户订阅管理 ==========

  getAllSubscriptions(): UserSubscription[] {
    try {
      const stored = localStorage.getItem(SUBSCRIPTIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      this.saveSubscriptions(MOCK_SUBSCRIPTIONS);
      return MOCK_SUBSCRIPTIONS;
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      return MOCK_SUBSCRIPTIONS;
    }
  }

  getSubscriptionById(id: string): UserSubscription | null {
    const subscriptions = this.getAllSubscriptions();
    return subscriptions.find(sub => sub.id === id) || null;
  }

  getUserSubscription(userId: string): UserSubscription | null {
    const subscriptions = this.getAllSubscriptions();
    return subscriptions.find(sub => sub.userId === userId && sub.status === 'active') || null;
  }

  saveSubscription(subscription: UserSubscription): void {
    const subscriptions = this.getAllSubscriptions();
    const existingIndex = subscriptions.findIndex(s => s.id === subscription.id);
    
    if (existingIndex >= 0) {
      subscriptions[existingIndex] = {
        ...subscription,
        updatedAt: new Date().toISOString(),
      };
    } else {
      subscriptions.push({
        ...subscription,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    this.saveSubscriptions(subscriptions);
    this.notifyListeners();
  }

  cancelSubscription(id: string): void {
    const subscriptions = this.getAllSubscriptions();
    const subscription = subscriptions.find(s => s.id === id);
    if (subscription) {
      subscription.status = 'cancelled';
      subscription.autoRenew = false;
      subscription.updatedAt = new Date().toISOString();
      this.saveSubscriptions(subscriptions);
      this.notifyListeners();
    }
  }

  private saveSubscriptions(subscriptions: UserSubscription[]): void {
    try {
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
    } catch (error) {
      console.error('Failed to save subscriptions:', error);
    }
  }

  // ========== 统计数据 ==========

  getStats(): SubscriptionStats {
    const subscriptions = this.getAllSubscriptions();
    const plans = this.getAllPlans();
    
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
    const monthlyRevenue = totalRevenue; // 简化计算
    const totalUsers = subscriptions.length;
    const paidUsers = activeSubscriptions.filter(s => s.amount > 0).length;
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
    const churnRate = 5.2; // 模拟数据

    const planDistribution: Record<string, number> = {};
    plans.forEach(plan => {
      planDistribution[plan.id] = activeSubscriptions.filter(s => s.planId === plan.id).length;
    });

    return {
      totalRevenue,
      monthlyRevenue,
      totalUsers,
      paidUsers,
      conversionRate,
      churnRate,
      planDistribution,
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
    this.savePlans(DEFAULT_PLANS);
    this.saveSubscriptions(MOCK_SUBSCRIPTIONS);
    this.notifyListeners();
  }

  clearAll(): void {
    localStorage.removeItem(PLANS_KEY);
    localStorage.removeItem(SUBSCRIPTIONS_KEY);
    this.notifyListeners();
  }
}

// 导出单例实例
export const subscriptionStore = new SubscriptionStore();
