import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { contentStore, ContentItem } from '../lib/contentStore';
import { X, ExternalLink } from 'lucide-react';

interface PublishedContentProps {
  position: 'home' | 'results' | 'subscription' | 'user-center' | 'all';
  type?: ContentItem['type'];
  className?: string;
}

export function PublishedContent({ position, type, className = '' }: PublishedContentProps) {
  const [contents, setContents] = useState<ContentItem[]>([]);

  useEffect(() => {
    loadContent();
    const unsubscribe = contentStore.subscribe(loadContent);
    return unsubscribe;
  }, [position, type]);

  const loadContent = () => {
    let items = contentStore.getPublishedContent(position);
    if (type) {
      items = items.filter(item => item.type === type);
    }
    console.log(`🌐 主站内容 [${position}${type ? ` - ${type}` : ''}] - 加载内容:`, items);
    console.log('📦 主站内容 - 所有内容:', contentStore.getAllContent());
    setContents(items);
  };

  if (contents.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {contents.map((content, index) => (
        <ContentCard key={content.id} content={content} index={index} />
      ))}
    </div>
  );
}

interface ContentCardProps {
  content: ContentItem;
  index: number;
}

function ContentCard({ content, index }: ContentCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  // 横幅类型
  if (content.type === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: index * 0.1 }}
        className="relative bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100 overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20px 20px, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1">
            {content.imageUrl && (
              <img 
                src={content.imageUrl} 
                alt={content.title}
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
            )}
            <h3 className="text-gray-900 mb-2" style={{ fontSize: '18px', fontWeight: 600 }}>
              {content.title}
            </h3>
            {content.description && (
              <p className="text-gray-600" style={{ fontSize: '14px' }}>
                {content.description}
              </p>
            )}
            {content.link && (
              <a
                href={content.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 transition-colors"
                style={{ fontSize: '14px', fontWeight: 500 }}
              >
                了解更多
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 hover:bg-white/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </motion.div>
    );
  }

  // 公告类型
  if (content.type === 'announcement') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative bg-amber-50 border border-amber-200 rounded-2xl p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-900" style={{ fontSize: '14px', fontWeight: 600 }}>
                {content.title}
              </span>
            </div>
            {content.content && (
              <p className="text-amber-800" style={{ fontSize: '13px' }}>
                {content.content}
              </p>
            )}
            {content.link && (
              <a
                href={content.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-amber-700 hover:text-amber-800 transition-colors"
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                查看详情
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-amber-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      </motion.div>
    );
  }

  // 功能介绍类型
  if (content.type === 'feature') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all"
      >
        {content.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img 
              src={content.imageUrl} 
              alt={content.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}
        <h3 className="text-gray-900 mb-2" style={{ fontSize: '16px', fontWeight: 600 }}>
          {content.title}
        </h3>
        {content.description && (
          <p className="text-gray-600 mb-3" style={{ fontSize: '13px', fontWeight: 500 }}>
            {content.description}
          </p>
        )}
        {content.content && (
          <p className="text-gray-600" style={{ fontSize: '14px', lineHeight: '1.6' }}>
            {content.content}
          </p>
        )}
        {content.link && (
          <a
            href={content.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 transition-colors"
            style={{ fontSize: '14px', fontWeight: 500 }}
          >
            了解更多
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </motion.div>
    );
  }

  // 图片类型
  if (content.type === 'image') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className="rounded-2xl overflow-hidden"
      >
        {content.link ? (
          <a href={content.link} target="_blank" rel="noopener noreferrer">
            <img 
              src={content.imageUrl} 
              alt={content.title}
              className="w-full h-auto hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <img 
            src={content.imageUrl} 
            alt={content.title}
            className="w-full h-auto"
          />
        )}
        {(content.title || content.description) && (
          <div className="p-4 bg-white border-x border-b border-gray-200">
            {content.title && (
              <h4 className="text-gray-900 mb-1" style={{ fontSize: '14px', fontWeight: 600 }}>
                {content.title}
              </h4>
            )}
            {content.description && (
              <p className="text-gray-600" style={{ fontSize: '13px' }}>
                {content.description}
              </p>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // 文本类型
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border border-gray-200 rounded-2xl p-6"
    >
      <h3 className="text-gray-900 mb-3" style={{ fontSize: '16px', fontWeight: 600 }}>
        {content.title}
      </h3>
      {content.description && (
        <p className="text-gray-600 mb-3" style={{ fontSize: '14px', fontWeight: 500 }}>
          {content.description}
        </p>
      )}
      {content.content && (
        <div className="text-gray-700 whitespace-pre-wrap" style={{ fontSize: '14px', lineHeight: '1.7' }}>
          {content.content}
        </div>
      )}
      {content.link && (
        <a
          href={content.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 transition-colors"
          style={{ fontSize: '14px', fontWeight: 500 }}
        >
          了解更多
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </motion.div>
  );
}
