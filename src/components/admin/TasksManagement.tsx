import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Clock, AlertCircle, CheckCircle, XCircle, Loader2, Eye, RefreshCw } from 'lucide-react';
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
import { Progress } from '../ui/progress';

// 模拟任务数据
const mockTasks = [
  {
    id: 'TASK-001',
    user: '张三',
    type: '风格克隆',
    status: 'completed',
    progress: 100,
    createdAt: '2024-06-09 14:30',
    completedAt: '2024-06-09 14:32',
    duration: '2分钟',
    images: 2,
  },
  {
    id: 'TASK-002',
    user: '李四',
    type: '风格克隆',
    status: 'processing',
    progress: 65,
    createdAt: '2024-06-09 14:35',
    completedAt: '-',
    duration: '-',
    images: 2,
  },
  {
    id: 'TASK-003',
    user: '王五',
    type: '风格克隆',
    status: 'failed',
    progress: 40,
    createdAt: '2024-06-09 14:28',
    completedAt: '-',
    duration: '-',
    images: 2,
    error: 'API调用失败',
  },
  {
    id: 'TASK-004',
    user: '赵六',
    type: '风格克隆',
    status: 'pending',
    progress: 0,
    createdAt: '2024-06-09 14:36',
    completedAt: '-',
    duration: '-',
    images: 2,
  },
  {
    id: 'TASK-005',
    user: '陈七',
    type: '风格克隆',
    status: 'completed',
    progress: 100,
    createdAt: '2024-06-09 14:25',
    completedAt: '2024-06-09 14:27',
    duration: '2分钟',
    images: 2,
  },
];

export function TasksManagement() {
  const [statusFilter, setStatusFilter] = useState('all');
  
  const stats = {
    total: 9307,
    completed: 8934,
    processing: 245,
    failed: 128,
    pending: 0,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      completed: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      failed: { label: '失败', className: 'bg-red-100 text-red-700 border-red-200' },
      pending: { label: '等待中', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    };
    const config = configs[status as keyof typeof configs];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredTasks = statusFilter === 'all' 
    ? mockTasks 
    : mockTasks.filter(task => task.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>任务管理</h2>
          <p className="text-gray-500 mt-1">监控所有处理任务</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总任务数</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.total.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.completed.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">处理中</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.processing}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">失败</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.failed}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">成功率</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {((stats.completed / stats.total) * 100).toFixed(1)}%
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="pending">等待中</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="搜索任务 ID 或用户..." className="flex-1" />
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务ID</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>完成时间</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task, index) => (
                <motion.tr
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                        {task.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs" style={{ fontWeight: 600 }}>
                        {task.user.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-900">{task.user}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{task.type}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(task.status)}
                    {task.error && (
                      <p className="text-xs text-red-600 mt-1">{task.error}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <Progress value={task.progress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">{task.progress}%</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{task.createdAt}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{task.completedAt}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{task.duration}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {task.status === 'failed' && (
                        <Button variant="ghost" size="icon" className="text-blue-600">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Processing Queue */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Clock className="w-5 h-5 text-blue-500" />
            实时处理队列
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTasks.filter(t => t.status === 'processing').map((task, index) => (
              <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{task.id}</p>
                      <p className="text-xs text-gray-600">用户: {task.user}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">处理中</Badge>
                </div>
                <Progress value={task.progress} className="h-2" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-600">已处理 {task.images} 张图片</p>
                  <p className="text-xs text-blue-600" style={{ fontWeight: 600 }}>{task.progress}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
