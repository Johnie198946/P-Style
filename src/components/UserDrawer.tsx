/**
 * 用户抽屉组件 - 个人中心
 * 根据开发方案第 27 节实现
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, CreditCard, BarChart3, Palette, LogOut, Edit2, Lock, Settings } from 'lucide-react';
import { userApi, authApi, analyzeApi, ApiError } from '../lib/api';
import { toast } from 'sonner';

interface UserDrawerProps {
  open: boolean;
  onClose: () => void;
  initialPanel?: 'profile' | 'subscription' | 'usage' | 'reports';
}

type PanelType = 'profile' | 'subscription' | 'usage' | 'reports';

export function UserDrawer({ open, onClose, initialPanel = 'profile' }: UserDrawerProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(initialPanel);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUserInfo();
      if (activePanel === 'usage') {
        loadUsage();
      } else if (activePanel === 'reports') {
        loadReports();
      }
    }
  }, [open, activePanel]);

  const loadUserInfo = async () => {
    try {
      const data = await userApi.getMe();
      setUserInfo(data);
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const data = await userApi.getUsage();
      setUsage(data);
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await userApi.getReports(1, 20);
      setReports(data.items);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('userData');
    localStorage.removeItem('isAdmin');
    
    // 触发自定义事件，通知其他组件登录状态已改变（根据注册登录与权限设计方案）
    window.dispatchEvent(new CustomEvent('loginStatusChanged'));
    window.dispatchEvent(new CustomEvent('adminStatusChanged'));
    
    window.location.reload();
  };

  if (!open) return null;

  const menuItems = [
    { id: 'profile' as PanelType, label: '个人中心', icon: User },
    { id: 'subscription' as PanelType, label: '我的订阅', icon: CreditCard },
    { id: 'usage' as PanelType, label: '资源用量', icon: BarChart3 },
    { id: 'reports' as PanelType, label: '我的仿色', icon: Palette },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        {/* 遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* 抽屉 */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl overflow-hidden"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">用户中心</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex h-[calc(100vh-64px)]">
            {/* 侧边菜单 */}
            <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePanel(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activePanel === item.id
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 退出登录 */}
              <div className="mt-auto pt-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">退出登录</span>
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activePanel === 'profile' && (
                  <ProfilePanel key="profile" userInfo={userInfo} onUpdate={loadUserInfo} />
                )}
                {activePanel === 'subscription' && (
                  <SubscriptionPanel key="subscription" userInfo={userInfo} />
                )}
                {activePanel === 'usage' && (
                  <UsagePanel key="usage" usage={usage} />
                )}
                {activePanel === 'reports' && (
                  <ReportsPanel key="reports" reports={reports} loading={loading} onRefresh={loadReports} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// 个人中心面板
function ProfilePanel({ userInfo, onUpdate }: { userInfo: any; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userInfo?.user?.display_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await userApi.updateProfile({ display_name: displayName });
      toast.success('更新成功');
      setEditing(false);
      onUpdate();
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">个人中心</h3>
        <p className="text-gray-600">管理您的个人信息和账户设置</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">基本信息</h4>
            <p className="text-sm text-gray-600">编辑您的个人资料</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>编辑</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
            {editing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{userInfo?.user?.display_name || '未设置'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <p className="text-gray-900">{userInfo?.user?.email || ''}</p>
          </div>

          {editing && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDisplayName(userInfo?.user?.display_name || '');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">安全设置</h4>
        </div>
        <ChangePasswordForm />
      </div>
    </motion.div>
  );
}

// 修改密码表单
function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('两次密码输入不一致');
      return;
    }
    try {
      setSaving(true);
      await userApi.changePassword({ old_password: oldPassword, new_password: newPassword });
      toast.success('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || '密码修改失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">旧密码</label>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? '修改中...' : '修改密码'}
      </button>
    </form>
  );
}

// 订阅面板
function SubscriptionPanel({ userInfo }: { userInfo: any }) {
  const subscription = userInfo?.subscriptionSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">我的订阅</h3>
        <p className="text-gray-600">管理您的订阅计划和账单</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-900">{subscription?.plan_name || '免费版'}</h4>
            <p className="text-sm text-gray-600">状态: {subscription?.status || 'active'}</p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            升级套餐
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">分析次数</span>
            <span className="text-gray-900 font-medium">
              {subscription?.limits?.analysis_per_month || 10} 次/月
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">生成次数</span>
            <span className="text-gray-900 font-medium">
              {subscription?.limits?.generations_per_month || 5} 次/月
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 用量面板
function UsagePanel({ usage }: { usage: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">资源用量</h3>
        <p className="text-gray-600">查看您的使用情况和剩余配额</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">分析次数</h4>
          <div className="text-3xl font-bold text-indigo-600 mb-2">
            {usage?.analysisUsed || 0} / {usage?.analysisLimit || 10}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{
                width: `${((usage?.analysisUsed || 0) / (usage?.analysisLimit || 10)) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">生成次数</h4>
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {usage?.generationUsed || 0} / {usage?.generationLimit || 5}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{
                width: `${((usage?.generationUsed || 0) / (usage?.generationLimit || 5)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 报告面板
function ReportsPanel({
  reports,
  loading,
  onRefresh,
}: {
  reports: any[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const handleViewReport = (taskId: string) => {
    // 跳转到结果页
    window.location.href = `/results/${taskId}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">我的仿色</h3>
        <p className="text-gray-600">查看和管理您的历史分析报告</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-gray-600">暂无报告</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.taskId}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {report.preview_image_url && (
                  <img
                    src={report.preview_image_url}
                    alt="预览"
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                    {report.difficulty && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-xs">
                        {report.difficulty}
                      </span>
                    )}
                  </div>
                  {report.feasibilityScore !== null && (
                    <div className="text-sm text-gray-600">
                      可行性: {Math.round(report.feasibilityScore * 100)}%
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleViewReport(report.taskId)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

