import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Image, Download, Trash2, Eye, Filter, Calendar, Plus, Edit, Globe, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ContentEditor, ContentItem as EditorContentItem } from './ContentEditor';
import { contentStore, ContentItem } from '../../lib/contentStore';

// 模拟内容数据
const mockContent = [
  {
    id: 1,
    type: 'source',
    user: '张三',
    taskId: 'TASK-001',
    uploadDate: '2024-06-09 14:30',
    size: '2.3 MB',
    dimensions: '1920x1080',
    format: 'JPG',
  },
  {
    id: 2,
    type: 'target',
    user: '张三',
    taskId: 'TASK-001',
    uploadDate: '2024-06-09 14:30',
    size: '1.8 MB',
    dimensions: '1920x1080',
    format: 'JPG',
  },
  {
    id: 3,
    type: 'result',
    user: '张三',
    taskId: 'TASK-001',
    uploadDate: '2024-06-09 14:32',
    size: '3.5 MB',
    dimensions: '1920x1080',
    format: 'PDF',
  },
  {
    id: 4,
    type: 'source',
    user: '李四',
    taskId: 'TASK-002',
    uploadDate: '2024-06-09 14:35',
    size: '3.1 MB',
    dimensions: '2048x1536',
    format: 'PNG',
  },
  {
    id: 5,
    type: 'target',
    user: '李四',
    taskId: 'TASK-002',
    uploadDate: '2024-06-09 14:35',
    size: '2.7 MB',
    dimensions: '2048x1536',
    format: 'PNG',
  },
];

export function ContentManagement() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | undefined>(undefined);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // 加载内容
  useEffect(() => {
    loadContent();
    const unsubscribe = contentStore.subscribe(loadContent);
    return unsubscribe;
  }, []);

  const loadContent = () => {
    const allContent = contentStore.getAllContent();
    console.log('📝 内容管理 - 加载内容:', allContent);
    setContents(allContent);
  };

  const stats = {
    totalContent: contents.length,
    published: contents.filter(c => c.isPublished).length,
    draft: contents.filter(c => !c.isPublished).length,
    banners: contents.filter(c => c.type === 'banner').length,
    features: contents.filter(c => c.type === 'feature').length,
  };

  const getTypeBadge = (type: string) => {
    const configs = {
      text: { label: '文本', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      image: { label: '图片', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      banner: { label: '横幅', className: 'bg-green-100 text-green-700 border-green-200' },
      feature: { label: '功能', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      announcement: { label: '公告', className: 'bg-red-100 text-red-700 border-red-200' },
    };
    const config = configs[type as keyof typeof configs] || { label: type, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPositionBadge = (position: string) => {
    const labels: Record<string, string> = {
      home: '首页',
      results: '结果页',
      subscription: '订阅页',
      'user-center': '用户中心',
      all: '全站',
    };
    return labels[position] || position;
  };

  const filteredContent = contents.filter(item => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleNewContent = () => {
    setEditingContent(undefined);
    setShowEditor(true);
  };

  const handleEditContent = (content: ContentItem) => {
    setEditingContent(content);
    setShowEditor(true);
  };

  const handleSaveContent = (content: EditorContentItem) => {
    contentStore.saveContent(content as ContentItem);
    setShowEditor(false);
    setEditingContent(undefined);
  };

  const handleDeleteContent = (id: string) => {
    if (confirm('确定要删除这个内容吗？')) {
      contentStore.deleteContent(id);
    }
  };

  const handleBatchDelete = () => {
    if (confirm(`确定要删除选中的 ${selectedItems.length} 个内容吗？`)) {
      selectedItems.forEach(id => contentStore.deleteContent(id));
      setSelectedItems([]);
    }
  };

  const handleTogglePublish = (id: string, isPublished: boolean) => {
    const content = contentStore.getContentById(id);
    if (content) {
      contentStore.saveContent({ ...content, isPublished });
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('⚠️ 警告：这将删除所有自定义内容并恢复到默认设置。此操作不可撤销！\n\n确定要继续吗？')) {
      contentStore.resetToDefaults();
      alert('✅ 已恢复默认内容！主站将立即同步更新。');
    }
  };

  const handleClearAll = () => {
    if (confirm('⚠️ 危险操作：这将清空所有内容！\n\n确定要继续吗？')) {
      if (confirm('⚠️ 最后确认：数据将被永久删除且无法恢复！')) {
        contentStore.clearAll();
        alert('✅ 已清空所有数据！');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>内容发布管理</h2>
          <p className="text-gray-500 mt-1">
            管理主站显示的内容，包括文案、图片、横幅等
            <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="ml-3 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {showDebugInfo ? '隐藏' : '显示'}调试信息
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <Button variant="outline" onClick={handleBatchDelete} className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              删除 ({selectedItems.length})
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={handleResetToDefaults}
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            恢复默认
          </Button>
          <Button 
            onClick={handleNewContent}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建内容
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
              <p><strong>内容总数:</strong> {contents.length}</p>
              <p><strong>已发布:</strong> {stats.published}</p>
              <p><strong>草稿:</strong> {stats.draft}</p>
              <p><strong>横幅:</strong> {stats.banners}</p>
              <p><strong>功能介绍:</strong> {stats.features}</p>
              <p><strong>LocalStorage Key:</strong> quantanova_content_items</p>
              <details className="mt-4">
                <summary className="cursor-pointer text-yellow-900 font-medium hover:text-yellow-700">
                  查看原始数据 JSON
                </summary>
                <pre className="mt-2 p-4 bg-white rounded text-xs overflow-auto max-h-64 border border-yellow-200">
                  {JSON.stringify(contents, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">总内容数</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.totalContent}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已发布</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.published}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">草稿</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.draft}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Edit className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">横幅</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.banners}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Image className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">功能</p>
                <h3 className="text-2xl text-gray-900 mt-1" style={{ fontWeight: 700 }}>
                  {stats.features}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Image className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="筛选类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="text">文本内容</SelectItem>
                <SelectItem value="image">图片内容</SelectItem>
                <SelectItem value="banner">横幅广告</SelectItem>
                <SelectItem value="feature">功能介绍</SelectItem>
                <SelectItem value="announcement">公告通知</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="搜索标题或描述..." 
              className="flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              更多筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContent.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`border-gray-200 hover:shadow-lg transition-all ${
              selectedItems.includes(item.id) ? 'ring-2 ring-blue-500' : ''
            }`}>
              <CardContent className="p-0">
                {/* Preview */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Checkbox */}
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-2 right-2">
                    {getTypeBadge(item.type)}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute bottom-2 right-2">
                    <Badge className={item.isPublished 
                      ? 'bg-green-500 text-white border-green-500' 
                      : 'bg-gray-500 text-white border-gray-500'
                    }>
                      {item.isPublished ? '已发布' : '草稿'}
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="text-gray-900 mb-1 line-clamp-2" style={{ fontSize: '14px', fontWeight: 600 }}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-gray-600 text-xs line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">显示位置</span>
                      <span className="text-gray-900">{getPositionBadge(item.position)}</span>
                    </div>
                    {item.publishDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.publishDate).toLocaleDateString('zh-CN')}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 h-8"
                      onClick={() => handleEditContent(item)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      <span className="text-xs">编辑</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 h-8"
                      onClick={() => handleTogglePublish(item.id, !item.isPublished)}
                    >
                      {item.isPublished ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          <span className="text-xs">取消发布</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3 h-3 mr-1" />
                          <span className="text-xs">发布</span>
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-red-600"
                      onClick={() => handleDeleteContent(item.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredContent.length === 0 && (
        <Card className="border-gray-200">
          <CardContent className="p-12">
            <div className="text-center">
              <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
                暂无内容
              </h3>
              <p className="text-gray-500 mb-4" style={{ fontSize: '14px' }}>
                点击"新建内容"按钮创建第一个内容
              </p>
              <Button 
                onClick={handleNewContent}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建内容
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Editor */}
      <ContentEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingContent(undefined);
        }}
        onSave={handleSaveContent}
        initialContent={editingContent as EditorContentItem}
      />
    </div>
  );
}