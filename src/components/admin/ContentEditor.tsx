import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Trash2,
  Eye,
  Plus,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface ContentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: ContentItem) => void;
  initialContent?: ContentItem;
}

export interface ContentItem {
  id?: string;
  type: 'hero' | 'upload_section' | 'banner' | 'feature' | 'announcement';
  title: string;
  subtitle?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  link?: string;
  position?: string;
  isPublished: boolean;
  publishDate?: string;
  updatedDate?: string;
}

const getDefaultContent = (): ContentItem => ({
  type: 'hero',
  title: '',
  subtitle: '',
  description: '',
  content: '',
  imageUrl: '',
  link: '',
  position: 'home',
  isPublished: false,
});

export function ContentEditor({ isOpen, onClose, onSave, initialContent }: ContentEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<ContentItem>(getDefaultContent());
  const [imagePreview, setImagePreview] = useState('');

  // 当 initialContent 或 isOpen 改变时，更新表单数据
  useEffect(() => {
    if (isOpen) {
      if (initialContent) {
        console.log('📝 内容编辑器 - 加载现有内容:', initialContent);
        setFormData(initialContent);
        setImagePreview(initialContent.imageUrl || '');
      } else {
        console.log('📝 内容编辑器 - 创建新内容');
        setFormData(getDefaultContent());
        setImagePreview('');
      }
    }
  }, [initialContent, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // 在实际应用中，这里应该上传到云存储服务
      // 现在我们使用本地预览
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData({ ...formData, imageUrl: result });
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('图片上传失败');
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.title.trim()) {
      alert('请输入标题');
      return;
    }

    if (formData.type === 'image' && !formData.imageUrl) {
      alert('请上传图片');
      return;
    }

    setIsSaving(true);

    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const contentToSave: ContentItem = {
      ...formData,
      id: formData.id || `content_${Date.now()}`,
      updatedDate: new Date().toISOString(),
      publishDate: formData.isPublished && !formData.publishDate 
        ? new Date().toISOString() 
        : formData.publishDate,
    };

    console.log('💾 内容编辑器 - 保存内容:', contentToSave);
    onSave(contentToSave);
    setIsSaving(false);
  };

  const handlePreview = () => {
    // TODO: 实现预览功能
    alert('预览功能开发中...');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>
                {initialContent ? '编辑内容' : '新建内容'}
              </h3>
              <p className="text-gray-500 mt-1" style={{ fontSize: '13px' }}>
                编辑后保存将立即在主站生效
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-6">
              {/* Content Type */}
              <div className="space-y-2">
                <Label htmlFor="type">内容类型</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="选择内容类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">首页Hero标题</SelectItem>
                    <SelectItem value="upload_section">上传区标题</SelectItem>
                    <SelectItem value="banner">横幅广告</SelectItem>
                    <SelectItem value="feature">功能介绍</SelectItem>
                    <SelectItem value="announcement">公告通知</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label htmlFor="position">显示位置</Label>
                <Select 
                  value={formData.position} 
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="选择显示位置" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">首页</SelectItem>
                    <SelectItem value="results">结果页</SelectItem>
                    <SelectItem value="subscription">订阅页</SelectItem>
                    <SelectItem value="user-center">用户中心</SelectItem>
                    <SelectItem value="all">全站显示</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  {formData.type === 'hero' ? '主标题（第一行）' : '标题'} *
                </Label>
                <Input
                  id="title"
                  placeholder={formData.type === 'hero' ? '例如：照片风格' : '输入标题'}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Subtitle (only for hero type) */}
              {formData.type === 'hero' && (
                <div className="space-y-2">
                  <Label htmlFor="subtitle">副标题（第二行）</Label>
                  <Input
                    id="subtitle"
                    placeholder="例如：克隆工具"
                    value={formData.subtitle || ''}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {formData.type === 'hero' || formData.type === 'upload_section' ? '描述文字' : '描述'}
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    formData.type === 'hero' 
                      ? '例如：上传参考照片和目标照片，AI 将智能分析...' 
                      : formData.type === 'upload_section'
                      ? '例如：上传源照片和目标照片，AI将分析...'
                      : '输入简短描述'
                  }
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={formData.type === 'hero' || formData.type === 'upload_section' ? 3 : 2}
                />
              </div>

              {/* Content (for announcement and feature types) */}
              {(formData.type === 'announcement' || formData.type === 'feature') && (
                <div className="space-y-2">
                  <Label htmlFor="content">正文内容</Label>
                  <Textarea
                    id="content"
                    placeholder="输入正文内容"
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                  />
                </div>
              )}

              {/* Image Upload */}
              {(formData.type === 'banner' || formData.type === 'feature') && (
                <div className="space-y-2">
                  <Label>图片</Label>
                  <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                    <CardContent className="p-6">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <div className="relative rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-auto max-h-96 object-contain"
                            />
                            <button
                              onClick={() => {
                                setImagePreview('');
                                setFormData({ ...formData, imageUrl: '' });
                              }}
                              className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById('image-upload')?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            更换图片
                          </Button>
                        </div>
                      ) : (
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center cursor-pointer py-8"
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
                          )}
                          <p className="text-gray-700 mb-1" style={{ fontSize: '14px', fontWeight: 500 }}>
                            {uploadingImage ? '上传中...' : '点击上传图片'}
                          </p>
                          <p className="text-gray-500" style={{ fontSize: '12px' }}>
                            支持 JPG、PNG、GIF，最大 5MB
                          </p>
                        </label>
                      )}
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Link */}
              <div className="space-y-2">
                <Label htmlFor="link">链接地址（可选）</Label>
                <Input
                  id="link"
                  placeholder="https://..."
                  value={formData.link || ''}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                />
              </div>

              {/* Publish Status */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <Label htmlFor="isPublished" className="text-gray-900 cursor-pointer">
                    立即发布
                  </Label>
                  <p className="text-gray-500 mt-0.5" style={{ fontSize: '12px' }}>
                    选中后内容将立即在主站显示
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              预览
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存并发布
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
