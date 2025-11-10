import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft } from 'lucide-react';
import { SubscriptionPage } from './user/SubscriptionPage';
import { UsagePage } from './user/UsagePage';
import { GalleryPage } from './user/GalleryPage';

interface UserCenterProps {
  isOpen: boolean;
  onClose: () => void;
  initialPage?: 'subscription' | 'usage' | 'gallery';
}

export function UserCenter({ isOpen, onClose, initialPage = 'subscription' }: UserCenterProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const pages = {
    subscription: { title: '我的订阅', component: SubscriptionPage },
    usage: { title: '资源用量', component: UsagePage },
    gallery: { title: '我的仿色', component: GalleryPage },
  };

  const CurrentPageComponent = pages[currentPage].component;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-4xl bg-white shadow-2xl z-[201] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-8 py-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h1 className="text-gray-900" style={{ fontSize: '24px', fontWeight: 600 }}>
                    {pages[currentPage].title}
                  </h1>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 px-8 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                {(Object.keys(pages) as Array<keyof typeof pages>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setCurrentPage(key)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      currentPage === key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                    style={{ fontSize: '14px', fontWeight: currentPage === key ? 600 : 500 }}
                  >
                    {pages[key].title}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <CurrentPageComponent />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
