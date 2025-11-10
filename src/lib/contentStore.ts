// 内容数据存储服务
// 在生产环境中，这应该连接到真实的后端API或数据库

export interface ContentItem {
  id: string;
  type: 'hero' | 'upload_section' | 'banner' | 'feature' | 'announcement';
  title: string;
  subtitle?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  link?: string;
  position: string;
  isPublished: boolean;
  publishDate?: string;
  updatedDate?: string;
}

const STORAGE_KEY = 'quantanova_content_items';

// 初始化默认内容
const DEFAULT_CONTENT: ContentItem[] = [
  {
    id: 'hero_main',
    type: 'hero',
    title: '照片风格',
    subtitle: '克隆工具',
    description: '上传参考照片和目标照片，AI 将智能分析并生成专业的 Photoshop 和 Camera Raw 调整方案',
    position: 'home',
    isPublished: true,
    publishDate: new Date().toISOString(),
  },
  {
    id: 'upload_section_main',
    type: 'upload_section',
    title: '上传你的照片',
    description: '上传源照片和目标照片，AI将分析并生成专业的调整方案',
    position: 'home',
    isPublished: true,
    publishDate: new Date().toISOString(),
  },
];

class ContentStore {
  private listeners: Set<() => void> = new Set();

  // 获取所有内容
  getAllContent(): ContentItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // 如果没有存储的内容，初始化默认内容
      this.saveAllContent(DEFAULT_CONTENT);
      return DEFAULT_CONTENT;
    } catch (error) {
      console.error('Failed to load content:', error);
      return DEFAULT_CONTENT;
    }
  }

  // 获取已发布的内容
  getPublishedContent(position?: string): ContentItem[] {
    const allContent = this.getAllContent();
    let filtered = allContent.filter(item => item.isPublished);
    
    if (position) {
      filtered = filtered.filter(item => 
        item.position === position || item.position === 'all'
      );
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.publishDate || 0).getTime();
      const dateB = new Date(b.publishDate || 0).getTime();
      return dateB - dateA; // 最新的在前面
    });
  }

  // 根据ID获取内容
  getContentById(id: string): ContentItem | null {
    const allContent = this.getAllContent();
    return allContent.find(item => item.id === id) || null;
  }

  // 根据类型获取内容
  getContentByType(type: ContentItem['type'], position?: string): ContentItem[] {
    let content = this.getPublishedContent(position);
    return content.filter(item => item.type === type);
  }

  // 保存内容
  saveContent(content: ContentItem): void {
    const allContent = this.getAllContent();
    const existingIndex = allContent.findIndex(item => item.id === content.id);
    
    if (existingIndex >= 0) {
      allContent[existingIndex] = content;
      console.log('📝 ContentStore - 更新内容:', content.title);
    } else {
      allContent.push(content);
      console.log('📝 ContentStore - 新建内容:', content.title);
    }
    
    this.saveAllContent(allContent);
    this.notifyListeners();
    console.log('✅ ContentStore - 内容已保存，通知监听者');
  }

  // 删除内容
  deleteContent(id: string): void {
    const allContent = this.getAllContent();
    const deletedItem = allContent.find(item => item.id === id);
    const filtered = allContent.filter(item => item.id !== id);
    this.saveAllContent(filtered);
    this.notifyListeners();
    console.log('🗑️ ContentStore - 删除内容:', deletedItem?.title || id);
  }

  // 保存所有内容到存储
  private saveAllContent(content: ContentItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    } catch (error) {
      console.error('Failed to save content:', error);
    }
  }

  // 订阅内容变化
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知所有监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // 批量更新内容发布状态
  batchUpdatePublishStatus(ids: string[], isPublished: boolean): void {
    const allContent = this.getAllContent();
    const updated = allContent.map(item => {
      if (ids.includes(item.id)) {
        return {
          ...item,
          isPublished,
          publishDate: isPublished && !item.publishDate 
            ? new Date().toISOString() 
            : item.publishDate,
        };
      }
      return item;
    });
    this.saveAllContent(updated);
    this.notifyListeners();
  }

  // 清空所有内容（仅用于测试）
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }

  // 重置为默认内容
  resetToDefaults(): void {
    console.log('🔄 ContentStore - 恢复默认内容');
    this.saveAllContent(DEFAULT_CONTENT);
    this.notifyListeners();
    console.log('✅ ContentStore - 默认内容已恢复');
  }
}

// 导出单例实例
export const contentStore = new ContentStore();
