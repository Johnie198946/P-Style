import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Camera, Upload, X, Check } from 'lucide-react';

interface UserAvatarProps {
  position?: 'fixed' | 'absolute';
}

export function UserAvatar({ position = 'fixed' }: UserAvatarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 从本地存储加载头像
  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = () => {
    if (previewUrl) {
      setAvatarUrl(previewUrl);
      localStorage.setItem('userAvatar', previewUrl);
      setShowUploadDialog(false);
      setPreviewUrl(null);
      setUploadedFile(null);
      setShowMenu(false);
    }
  };

  const handleCancelUpload = () => {
    setShowUploadDialog(false);
    setPreviewUrl(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    localStorage.removeItem('userAvatar');
    setShowMenu(false);
  };

  return (
    <>
      <div className={`${position} top-6 right-6 z-50`} ref={menuRef}>
        {/* Avatar Button */}
        <motion.button
          onClick={() => setShowMenu(!showMenu)}
          className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white shadow-lg hover:shadow-xl transition-all group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="User Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          
          {/* Hover ring effect */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-100 transition-opacity animate-ping" />
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-14 right-0 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden"
            >
              {/* User Info */}
              <div className="p-4 border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="User Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div 
                      className="text-gray-900"
                      style={{ fontSize: '14px', fontWeight: 600 }}
                    >
                      用户
                    </div>
                    <div 
                      className="text-gray-500"
                      style={{ fontSize: '12px' }}
                    >
                      user@example.com
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowUploadDialog(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100/80 transition-colors text-left"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                  <span 
                    className="text-gray-700"
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    更换头像
                  </span>
                </button>

                {avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100/80 transition-colors text-left"
                  >
                    <X className="w-4 h-4 text-red-600" />
                    <span 
                      className="text-red-600"
                      style={{ fontSize: '14px', fontWeight: 500 }}
                    >
                      移除头像
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Dialog */}
      <AnimatePresence>
        {showUploadDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelUpload}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-6"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 
                      className="text-gray-900"
                      style={{ fontSize: '20px', fontWeight: 700 }}
                    >
                      更换头像
                    </h3>
                    <button
                      onClick={handleCancelUpload}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Preview Area */}
                  <div className="flex flex-col items-center gap-6">
                    {/* Avatar Preview */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-gray-100 shadow-lg">
                        {previewUrl ? (
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt="Current Avatar" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-16 h-16 text-white" />
                        )}
                      </div>
                      
                      {/* Upload Button Overlay */}
                      {!previewUrl && (
                        <motion.button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Camera className="w-8 h-8 text-white" />
                        </motion.button>
                      )}
                    </div>

                    {/* Upload Button or Instructions */}
                    {!previewUrl ? (
                      <div className="text-center space-y-4">
                        <p className="text-gray-600 text-sm">
                          上传一张照片作为你的头像
                        </p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                          style={{ fontSize: '14px', fontWeight: 600 }}
                        >
                          <Upload className="w-4 h-4" />
                          选择图片
                        </button>
                        <p className="text-gray-400 text-xs">
                          支持 JPG、PNG 格式，建议尺寸 400x400 像素
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 w-full">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                          style={{ fontSize: '14px', fontWeight: 500 }}
                        >
                          重新选择
                        </button>
                        <button
                          onClick={handleSaveAvatar}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                          style={{ fontSize: '14px', fontWeight: 600 }}
                        >
                          <Check className="w-4 h-4" />
                          保存
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
