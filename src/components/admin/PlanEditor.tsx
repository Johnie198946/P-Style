import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Plus, Trash2, Star, Zap, Crown, Loader2 } from 'lucide-react';
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
import { SubscriptionPlan, SubscriptionFeature } from '../../lib/subscriptionStore';

interface PlanEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: SubscriptionPlan) => void;
  initialPlan?: SubscriptionPlan;
}

const getDefaultPlan = (): SubscriptionPlan => ({
  id: `plan_${Date.now()}`,
  name: '',
  nameEn: '',
  price: 0,
  period: 'month',
  periodDisplay: '每月',
  description: '',
  icon: 'zap',
  color: 'from-indigo-500 to-purple-600',
  popular: false,
  features: [],
  limits: {
    monthlyAnalysis: 100,
    exportQuality: '4K',
    batchProcessing: false,
    apiAccess: false,
    teamCollaboration: false,
    prioritySupport: false,
    customTraining: false,
  },
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function PlanEditor({ isOpen, onClose, onSave, initialPlan }: PlanEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<SubscriptionPlan>(getDefaultPlan());
  const [newFeatureText, setNewFeatureText] = useState('');

  // 当 initialPlan 或 isOpen 改变时，更新表单数据
  useEffect(() => {
    if (isOpen) {
      if (initialPlan) {
        console.log('📝 计划编辑器 - 加载现有计划:', initialPlan);
        setFormData(initialPlan);
      } else {
        console.log('📝 计划编辑器 - 创建新计划');
        setFormData(getDefaultPlan());
      }
      setNewFeatureText('');
    }
  }, [initialPlan, isOpen]);

  const handleSave = async () => {
    if (!formData.name || !formData.nameEn || !formData.description) {
      alert('请填写所有必填字段');
      return;
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 更新时间戳
    const updatedPlan = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('💾 计划编辑器 - 保存计划:', updatedPlan);
    onSave(updatedPlan);
    setIsSaving(false);
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    
    const newFeature: SubscriptionFeature = {
      id: `feature_${Date.now()}`,
      text: newFeatureText,
      enabled: true,
    };
    
    setFormData({
      ...formData,
      features: [...formData.features, newFeature],
    });
    setNewFeatureText('');
  };

  const handleRemoveFeature = (id: string) => {
    setFormData({
      ...formData,
      features: formData.features.filter(f => f.id !== id),
    });
  };

  const handleToggleFeature = (id: string) => {
    setFormData({
      ...formData,
      features: formData.features.map(f =>
        f.id === id ? { ...f, enabled: !f.enabled } : f
      ),
    });
  };

  const iconOptions = [
    { value: 'star', label: '星星', icon: <Star className="w-5 h-5" /> },
    { value: 'zap', label: '闪电', icon: <Zap className="w-5 h-5" /> },
    { value: 'crown', label: '皇冠', icon: <Crown className="w-5 h-5" /> },
  ];

  const colorOptions = [
    { value: 'from-gray-500 to-gray-600', label: '灰色' },
    { value: 'from-indigo-500 to-purple-600', label: '靛紫色' },
    { value: 'from-blue-500 to-blue-600', label: '蓝色' },
    { value: 'from-amber-500 to-orange-600', label: '橙色' },
    { value: 'from-green-500 to-green-600', label: '绿色' },
    { value: 'from-red-500 to-red-600', label: '红色' },
  ];

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
                {initialPlan ? '编辑订阅计划' : '新建订阅计划'}
              </h3>
              <p className="text-gray-500 mt-1" style={{ fontSize: '13px' }}>
                配置订阅计划的价格、功能和限制
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                <Card className="border-gray-200">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                      基本信息
                    </h4>

                    <div className="space-y-2">
                      <Label htmlFor="name">计划名称（中文）*</Label>
                      <Input
                        id="name"
                        placeholder="例如：专业版"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nameEn">计划名称（英文）*</Label>
                      <Input
                        id="nameEn"
                        placeholder="例如：Pro"
                        value={formData.nameEn}
                        onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">描述 *</Label>
                      <Textarea
                        id="description"
                        placeholder="简短描述这个计划适合什么用户"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">价格（¥）</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="periodDisplay">计费周期</Label>
                        <Select 
                          value={formData.periodDisplay} 
                          onValueChange={(value) => {
                            const periodMap: Record<string, string> = {
                              '每月': 'month',
                              '每年': 'year',
                              '永久': 'lifetime',
                            };
                            setFormData({ 
                              ...formData, 
                              periodDisplay: value,
                              period: periodMap[value] || 'month',
                            });
                          }}
                        >
                          <SelectTrigger id="periodDisplay">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="每月">每月</SelectItem>
                            <SelectItem value="每年">每年</SelectItem>
                            <SelectItem value="永久">永久</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>图标</Label>
                        <Select 
                          value={formData.icon} 
                          onValueChange={(value) => setFormData({ ...formData, icon: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  {option.icon}
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>颜色主题</Label>
                        <Select 
                          value={formData.color} 
                          onValueChange={(value) => setFormData({ ...formData, color: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="popular"
                        checked={formData.popular}
                        onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="popular" className="cursor-pointer">
                        标记为"最受欢迎"
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="isActive" className="cursor-pointer">
                        启用此计划
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Limits */}
                <Card className="border-gray-200">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                      功能限制
                    </h4>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyAnalysis">每月分析次数（-1表示无限）</Label>
                      <Input
                        id="monthlyAnalysis"
                        type="number"
                        value={formData.limits.monthlyAnalysis}
                        onChange={(e) => setFormData({
                          ...formData,
                          limits: { ...formData.limits, monthlyAnalysis: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exportQuality">导出画质</Label>
                      <Select 
                        value={formData.limits.exportQuality} 
                        onValueChange={(value) => setFormData({
                          ...formData,
                          limits: { ...formData.limits, exportQuality: value }
                        })}
                      >
                        <SelectTrigger id="exportQuality">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1080p">1080p</SelectItem>
                          <SelectItem value="2K">2K</SelectItem>
                          <SelectItem value="4K">4K</SelectItem>
                          <SelectItem value="8K">8K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'batchProcessing', label: '批量处理' },
                        { key: 'apiAccess', label: 'API 访问' },
                        { key: 'teamCollaboration', label: '团队协作' },
                        { key: 'prioritySupport', label: '优先支持' },
                        { key: 'customTraining', label: '定制训练' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={key}
                            checked={formData.limits[key as keyof typeof formData.limits] as boolean}
                            onChange={(e) => setFormData({
                              ...formData,
                              limits: { ...formData.limits, [key]: e.target.checked }
                            })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor={key} className="cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Features */}
              <div className="space-y-4">
                <Card className="border-gray-200">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                      功能特性列表
                    </h4>

                    <div className="flex gap-2">
                      <Input
                        placeholder="输入功能特性..."
                        value={newFeatureText}
                        onChange={(e) => setNewFeatureText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFeature();
                          }
                        }}
                      />
                      <Button onClick={handleAddFeature} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {formData.features.map((feature) => (
                        <div
                          key={feature.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={feature.enabled}
                            onChange={() => handleToggleFeature(feature.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`flex-1 ${!feature.enabled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {feature.text}
                          </span>
                          <button
                            onClick={() => handleRemoveFeature(feature.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {formData.features.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p style={{ fontSize: '14px' }}>暂无功能特性</p>
                        <p style={{ fontSize: '12px' }}>请添加至少一个功能特性</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                      预览
                    </h4>
                    
                    <div className="p-4 bg-white border border-gray-200 rounded-xl">
                      <div className={`w-full h-2 rounded-full bg-gradient-to-r ${formData.color} mb-4`} />
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-gray-900" style={{ fontSize: '18px', fontWeight: 600 }}>
                          {formData.name || '计划名称'}
                        </h5>
                        <span className="text-gray-900" style={{ fontSize: '24px', fontWeight: 700 }}>
                          {formData.price === 0 ? '免费' : `¥${formData.price}`}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3" style={{ fontSize: '13px' }}>
                        {formData.description || '计划描述'}
                      </p>
                      <div className="space-y-2">
                        {formData.features.slice(0, 3).map((feature) => (
                          <div key={feature.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            </div>
                            {feature.text}
                          </div>
                        ))}
                        {formData.features.length > 3 && (
                          <p className="text-xs text-gray-500 ml-6">
                            +{formData.features.length - 3} 更多功能...
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
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
                  保存计划
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
