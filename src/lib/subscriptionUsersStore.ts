// 订阅用户数据存储
// 在生产环境中，这应该连接到真实的后端API或数据库

export interface SubscriptionUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  planId: string;
  planName: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  paymentMethod?: string;
  totalSpent: number;
  analysisCount: number;
  lastLoginDate?: string;
  createdAt: string;
}

const STORAGE_KEY = 'quantanova_subscription_users';

// 模拟数据
const MOCK_USERS: SubscriptionUser[] = [
  {
    id: 'user_001',
    email: 'zhang.wei@example.com',
    name: '张伟',
    planId: 'plan_free',
    planName: '免费版',
    status: 'active',
    startDate: '2024-10-15T08:00:00Z',
    autoRenew: false,
    totalSpent: 0,
    analysisCount: 12,
    lastLoginDate: '2024-11-08T14:23:00Z',
    createdAt: '2024-10-15T08:00:00Z',
  },
  {
    id: 'user_002',
    email: 'li.na@example.com',
    name: '李娜',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
    planId: 'plan_pro',
    planName: '专业版',
    status: 'active',
    startDate: '2024-10-20T10:30:00Z',
    endDate: '2024-12-20T10:30:00Z',
    autoRenew: true,
    paymentMethod: '微信支付',
    totalSpent: 99,
    analysisCount: 245,
    lastLoginDate: '2024-11-09T09:15:00Z',
    createdAt: '2024-10-20T10:30:00Z',
  },
  {
    id: 'user_003',
    email: 'wang.fang@example.com',
    name: '王芳',
    planId: 'plan_business',
    planName: '企业版',
    status: 'active',
    startDate: '2024-09-01T00:00:00Z',
    endDate: '2025-09-01T00:00:00Z',
    autoRenew: true,
    paymentMethod: '支付宝',
    totalSpent: 2388,
    analysisCount: 1847,
    lastLoginDate: '2024-11-09T11:42:00Z',
    createdAt: '2024-09-01T00:00:00Z',
  },
  {
    id: 'user_004',
    email: 'chen.jun@example.com',
    name: '陈军',
    planId: 'plan_pro',
    planName: '专业版',
    status: 'trial',
    startDate: '2024-11-05T12:00:00Z',
    endDate: '2024-11-12T12:00:00Z',
    autoRenew: false,
    totalSpent: 0,
    analysisCount: 8,
    lastLoginDate: '2024-11-09T08:30:00Z',
    createdAt: '2024-11-05T12:00:00Z',
  },
  {
    id: 'user_005',
    email: 'zhao.min@example.com',
    name: '赵敏',
    planId: 'plan_pro',
    planName: '专业版',
    status: 'expired',
    startDate: '2024-08-15T00:00:00Z',
    endDate: '2024-10-15T00:00:00Z',
    autoRenew: false,
    paymentMethod: '微信支付',
    totalSpent: 198,
    analysisCount: 423,
    lastLoginDate: '2024-10-20T16:45:00Z',
    createdAt: '2024-08-15T00:00:00Z',
  },
  {
    id: 'user_006',
    email: 'liu.yang@example.com',
    name: '刘洋',
    planId: 'plan_free',
    planName: '免费版',
    status: 'active',
    startDate: '2024-11-01T09:20:00Z',
    autoRenew: false,
    totalSpent: 0,
    analysisCount: 5,
    lastLoginDate: '2024-11-07T20:15:00Z',
    createdAt: '2024-11-01T09:20:00Z',
  },
  {
    id: 'user_007',
    email: 'huang.lei@example.com',
    name: '黄磊',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Huang',
    planId: 'plan_business',
    planName: '企业版',
    status: 'cancelled',
    startDate: '2024-07-01T00:00:00Z',
    endDate: '2024-10-31T23:59:59Z',
    autoRenew: false,
    paymentMethod: '支付宝',
    totalSpent: 995,
    analysisCount: 892,
    lastLoginDate: '2024-10-28T14:20:00Z',
    createdAt: '2024-07-01T00:00:00Z',
  },
  {
    id: 'user_008',
    email: 'xu.jing@example.com',
    name: '徐静',
    planId: 'plan_pro',
    planName: '专业版',
    status: 'active',
    startDate: '2024-10-10T15:30:00Z',
    endDate: '2024-12-10T15:30:00Z',
    autoRenew: true,
    paymentMethod: '微信支付',
    totalSpent: 99,
    analysisCount: 156,
    lastLoginDate: '2024-11-09T07:50:00Z',
    createdAt: '2024-10-10T15:30:00Z',
  },
  {
    id: 'user_009',
    email: 'sun.hao@example.com',
    name: '孙浩',
    planId: 'plan_free',
    planName: '免费版',
    status: 'active',
    startDate: '2024-11-06T11:00:00Z',
    autoRenew: false,
    totalSpent: 0,
    analysisCount: 3,
    lastLoginDate: '2024-11-08T18:30:00Z',
    createdAt: '2024-11-06T11:00:00Z',
  },
  {
    id: 'user_010',
    email: 'zhou.xin@example.com',
    name: '周欣',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhou',
    planId: 'plan_pro',
    planName: '专业版',
    status: 'active',
    startDate: '2024-09-20T10:00:00Z',
    endDate: '2024-12-20T10:00:00Z',
    autoRenew: true,
    paymentMethod: '支付宝',
    totalSpent: 297,
    analysisCount: 678,
    lastLoginDate: '2024-11-09T10:05:00Z',
    createdAt: '2024-09-20T10:00:00Z',
  },
];

class SubscriptionUsersStore {
  private listeners: Set<() => void> = new Set();

  // 获取所有用户
  getAllUsers(): SubscriptionUser[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // 初始化模拟数据
      this.saveAllUsers(MOCK_USERS);
      return MOCK_USERS;
    } catch (error) {
      console.error('Failed to load subscription users:', error);
      return MOCK_USERS;
    }
  }

  // 根据ID获取用户
  getUserById(id: string): SubscriptionUser | null {
    const users = this.getAllUsers();
    return users.find(user => user.id === id) || null;
  }

  // 根据计划筛选用户
  getUsersByPlan(planId: string): SubscriptionUser[] {
    const users = this.getAllUsers();
    return users.filter(user => user.planId === planId);
  }

  // 根据状态筛选用户
  getUsersByStatus(status: SubscriptionUser['status']): SubscriptionUser[] {
    const users = this.getAllUsers();
    return users.filter(user => user.status === status);
  }

  // 搜索用户（按姓名或邮箱）
  searchUsers(query: string): SubscriptionUser[] {
    const users = this.getAllUsers();
    const lowerQuery = query.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(lowerQuery) ||
      user.email.toLowerCase().includes(lowerQuery)
    );
  }

  // 更新用户信息
  updateUser(id: string, updates: Partial<SubscriptionUser>): void {
    const users = this.getAllUsers();
    const index = users.findIndex(user => user.id === id);
    
    if (index >= 0) {
      users[index] = { ...users[index], ...updates };
      this.saveAllUsers(users);
      this.notifyListeners();
      console.log('✏️ 订阅用户 - 更新用户:', users[index].name);
    }
  }

  // 删除用户
  deleteUser(id: string): void {
    const users = this.getAllUsers();
    const deletedUser = users.find(user => user.id === id);
    const filtered = users.filter(user => user.id !== id);
    this.saveAllUsers(filtered);
    this.notifyListeners();
    console.log('🗑️ 订阅用户 - 删除用户:', deletedUser?.name || id);
  }

  // 获取统计数据
  getStats() {
    const users = this.getAllUsers();
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const trialUsers = users.filter(u => u.status === 'trial').length;
    const expiredUsers = users.filter(u => u.status === 'expired').length;
    const cancelledUsers = users.filter(u => u.status === 'cancelled').length;
    const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0);
    const totalAnalyses = users.reduce((sum, u) => sum + u.analysisCount, 0);

    const planDistribution = users.reduce((acc, user) => {
      acc[user.planName] = (acc[user.planName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers,
      activeUsers,
      trialUsers,
      expiredUsers,
      cancelledUsers,
      totalRevenue,
      totalAnalyses,
      planDistribution,
      avgRevenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0,
      conversionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
    };
  }

  // 保存所有用户
  private saveAllUsers(users: SubscriptionUser[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Failed to save subscription users:', error);
    }
  }

  // 订阅变化
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // 重置为默认数据
  resetToDefaults(): void {
    console.log('🔄 订阅用户 - 恢复默认数据');
    this.saveAllUsers(MOCK_USERS);
    this.notifyListeners();
    console.log('✅ 订阅用户 - 默认数据已恢复');
  }
}

// 导出单例
export const subscriptionUsersStore = new SubscriptionUsersStore();
