import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Calendar,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { subscriptionUsersStore, SubscriptionUser } from '../../lib/subscriptionUsersStore';

export function SubscriptionUsersList() {
  const [users, setUsers] = useState<SubscriptionUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    trialUsers: 0,
    expiredUsers: 0,
    totalRevenue: 0,
    avgRevenuePerUser: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    loadUsers();
    const unsubscribe = subscriptionUsersStore.subscribe(loadUsers);
    return unsubscribe;
  }, []);

  const loadUsers = () => {
    const allUsers = subscriptionUsersStore.getAllUsers();
    setUsers(allUsers);
    setStats(subscriptionUsersStore.getStats());
    console.log('👥 订阅用户列表 - 加载用户:', allUsers.length);
  };

  const handleReset = () => {
    if (confirm('确定要恢复默认用户数据吗？这将清除所有自定义修改。')) {
      subscriptionUsersStore.resetToDefaults();
      setSearchQuery('');
      setStatusFilter('all');
      setPlanFilter('all');
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`确定要删除用户"${name}"吗？`)) {
      subscriptionUsersStore.deleteUser(id);
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredUsers, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-users-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesPlan = planFilter === 'all' || user.planId === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'trial':
        return <Clock className="w-4 h-4" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: '活跃' },
      trial: { variant: 'secondary', label: '试用' },
      expired: { variant: 'destructive', label: '已过期' },
      cancelled: { variant: 'outline', label: '已取消' },
    };

    const config = variants[status] || { variant: 'outline', label: status };

    return (
      <Badge variant={config.variant as any} className="gap-1">
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">总用户数</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              活跃用户 {stats.activeUsers} 人
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">总收入</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              人均 ¥{stats.avgRevenuePerUser.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">试用用户</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              转化率 {stats.conversionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">过期/取消</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiredUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              需要跟进转化
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>订阅用户列表</CardTitle>
              <p className="text-sm text-gray-500">
                共 {filteredUsers.length} 个用户
                {(searchQuery || statusFilter !== 'all' || planFilter !== 'all') && 
                  ` (已筛选，总计 ${users.length} 个)`
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                导出数据
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                恢复默认
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索用户名或邮箱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="trial">试用</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="计划筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部计划</SelectItem>
                  <SelectItem value="plan_free">免费版</SelectItem>
                  <SelectItem value="plan_pro">专业版</SelectItem>
                  <SelectItem value="plan_business">企业版</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>计划</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>分析次数</TableHead>
                    <TableHead>总消费</TableHead>
                    <TableHead>开始日期</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        {searchQuery || statusFilter !== 'all' || planFilter !== 'all'
                          ? '没有找到符合条件的用户'
                          : '暂无用户数据'
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.planName}</Badge>
                          {user.autoRenew && (
                            <div className="text-xs text-green-600 mt-1">自动续费</div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{user.analysisCount}</div>
                          <div className="text-xs text-gray-500">次分析</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">¥{user.totalSpent}</div>
                          {user.paymentMethod && (
                            <div className="text-xs text-gray-500">{user.paymentMethod}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(user.startDate)}</div>
                          {user.endDate && (
                            <div className="text-xs text-gray-500">
                              至 {formatDate(user.endDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(user.lastLoginDate)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                编辑信息
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CreditCard className="w-4 h-4 mr-2" />
                                账单记录
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除用户
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination placeholder */}
            {filteredUsers.length > 10 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-500">
                  显示 1-{Math.min(10, filteredUsers.length)} 条，共 {filteredUsers.length} 条
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    上一页
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
