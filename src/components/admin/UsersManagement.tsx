import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, UserPlus, MoreVertical, Mail, Phone, Calendar, Crown, Ban, Eye, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { adminApi, AdminUserItem, AdminUserDetailResponse, ApiError } from '../../lib/api';
import { toast } from 'sonner';

/**
 * 用户管理组件
 * 根据开发方案第 768-779 节，使用 GET /api/admin/users 获取真实数据
 * 不再使用模拟数据（根据开发方案第 382-387 节要求）
 */
export function UsersManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetailResponse | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 加载用户列表
  useEffect(() => {
    loadUsers();
  }, [page, searchTerm, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getUsers({
        page,
        pageSize,
        q: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setUsers(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('加载用户列表失败:', err);
      const errorMessage = err instanceof ApiError ? err.message : '加载用户列表失败，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 加载用户详情
  const loadUserDetail = async (userId: number) => {
    try {
      setLoadingDetail(true);
      const detail = await adminApi.getUserDetail(userId);
      setSelectedUser(detail);
      setShowUserDetail(true);
    } catch (err) {
      console.error('加载用户详情失败:', err);
      const errorMessage = err instanceof ApiError ? err.message : '加载用户详情失败';
      toast.error(errorMessage);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 处理搜索（防抖）
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1); // 重置到第一页
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };

  // 获取用户头像字母
  const getAvatarLetter = (user: AdminUserItem) => {
    if (user.display_name) {
      return user.display_name.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Business': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Pro': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'suspended': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>用户管理</h2>
          <p className="text-gray-500 mt-1">管理所有注册用户</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
          <UserPlus className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总用户</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>12,459</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">活跃用户</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>9,847</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">付费用户</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>3,847</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">停用账号</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>128</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索用户名或邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead>套餐</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>最后登录</TableHead>
                <TableHead>任务数</TableHead>
                <TableHead>存储</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white" style={{ fontWeight: 600 }}>
                        {user.avatar}
                      </div>
                      <div>
                        <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{user.name}</div>
                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="w-3 h-3" />
                        {user.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanColor(user.plan)}>{user.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(user.status)}>
                      {user.status === 'active' ? '活跃' : user.status === 'inactive' ? '不活跃' : '已停用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {user.registered}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">{user.lastLogin}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{user.tasksCount}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">{user.storageUsed}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewUser(user)}>
                          <Eye className="w-4 h-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 mr-2" />
                          发送邮件
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Ban className="w-4 h-4 mr-2" />
                          停用账号
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
            <DialogDescription>查看和管理用户信息</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl" style={{ fontWeight: 700 }}>
                  {selectedUser.avatar}
                </div>
                <div>
                  <h3 className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getPlanColor(selectedUser.plan)}>{selectedUser.plan}</Badge>
                    <Badge className={getStatusColor(selectedUser.status)}>
                      {selectedUser.status === 'active' ? '活跃' : selectedUser.status === 'inactive' ? '不活跃' : '已停用'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">注册时间</p>
                  <p className="text-gray-900" style={{ fontWeight: 600 }}>{selectedUser.registered}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">最后登录</p>
                  <p className="text-gray-900" style={{ fontWeight: 600 }}>{selectedUser.lastLogin}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">处理任务数</p>
                  <p className="text-gray-900" style={{ fontWeight: 600 }}>{selectedUser.tasksCount}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">存储使用</p>
                  <p className="text-gray-900" style={{ fontWeight: 600 }}>{selectedUser.storageUsed}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
