import { motion, useMotionValue, animate } from 'motion/react';
import { Upload, X, ImageIcon, Check } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface PhotoUploadZoneProps {
  title: string;
  description: string;
  onImageUpload: (file: File, preview: string) => void;
  image: string | null;
  onRemove: () => void;
  index: number;
}

export function PhotoUploadZone({ title, description, onImageUpload, image, onRemove, index }: PhotoUploadZoneProps) {
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scale = useMotionValue(1);
  const magneticX = useMotionValue(0);
  const magneticY = useMotionValue(0);
  const borderRadius = useMotionValue(16);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );
      
      const threshold = 400;
      
      if (distance < threshold) {
        setIsDraggingGlobal(true);
        const pullStrength = Math.max(0, 1 - distance / threshold);
        const pullX = (e.clientX - centerX) * pullStrength * 0.15;
        const pullY = (e.clientY - centerY) * pullStrength * 0.15;
        
        animate(magneticX, pullX, { type: 'spring', stiffness: 200, damping: 20 });
        animate(magneticY, pullY, { type: 'spring', stiffness: 200, damping: 20 });
        animate(scale, 1 + pullStrength * 0.05, { type: 'spring', stiffness: 200, damping: 20 });
        animate(borderRadius, 16 + pullStrength * 12, { type: 'spring', stiffness: 200, damping: 20 });
      } else {
        setIsDraggingGlobal(false);
        animate(magneticX, 0, { type: 'spring', stiffness: 200, damping: 20 });
        animate(magneticY, 0, { type: 'spring', stiffness: 200, damping: 20 });
        animate(scale, 1, { type: 'spring', stiffness: 200, damping: 20 });
        animate(borderRadius, 16, { type: 'spring', stiffness: 200, damping: 20 });
      }
    };

    const handleDragEnter = () => {
      document.body.classList.add('dragging');
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDraggingGlobal(false);
        animate(magneticX, 0, { type: 'spring', stiffness: 200, damping: 20 });
        animate(magneticY, 0, { type: 'spring', stiffness: 200, damping: 20 });
        animate(scale, 1, { type: 'spring', stiffness: 200, damping: 20 });
        animate(borderRadius, 16, { type: 'spring', stiffness: 200, damping: 20 });
        document.body.classList.remove('dragging');
      }
    };

    const handleDrop = () => {
      setIsDraggingGlobal(false);
      animate(magneticX, 0, { type: 'spring', stiffness: 200, damping: 20 });
      animate(magneticY, 0, { type: 'spring', stiffness: 200, damping: 20 });
      animate(scale, 1, { type: 'spring', stiffness: 200, damping: 20 });
      animate(borderRadius, 16, { type: 'spring', stiffness: 200, damping: 20 });
      document.body.classList.remove('dragging');
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [magneticX, magneticY, scale, borderRadius]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(imageFile, event.target.result as string);
        }
      };
      reader.readAsDataURL(imageFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(file, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <motion.div
        style={{
          scale,
          x: magneticX,
          y: magneticY,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <motion.div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !image && fileInputRef.current?.click()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ borderRadius }}
          className={`relative overflow-hidden border-2 transition-all cursor-pointer ${
            isDraggingGlobal
              ? 'border-blue-400 bg-blue-50 shadow-2xl shadow-blue-200/50'
              : image
              ? 'border-gray-200 bg-white shadow-lg'
              : 'border-dashed border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-100/50 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="aspect-[4/3] flex items-center justify-center p-8">
            {image ? (
              <div className="relative w-full h-full group">
                <img
                  src={image}
                  alt="Uploaded"
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 rounded-lg flex items-center justify-center">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1, opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-3 bg-white rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200 shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
                
                {/* Success indicator */}
                <div className="absolute top-3 right-3 p-2 bg-green-500 rounded-full shadow-lg">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <motion.div
                  animate={{
                    y: isDraggingGlobal ? -8 : isHovered ? -4 : 0,
                    scale: isDraggingGlobal ? 1.15 : isHovered ? 1.05 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className={`p-5 rounded-2xl transition-all duration-300 ${
                    isDraggingGlobal 
                      ? 'bg-blue-100' 
                      : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <Upload className={`w-10 h-10 transition-colors duration-300 ${
                      isDraggingGlobal ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                </motion.div>
                
                <div className="space-y-2">
                  <h4 className="text-gray-900">{title}</h4>
                  <p className="text-gray-500 text-sm max-w-xs">{description}</p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
                      <ImageIcon className="w-3.5 h-3.5" />
                      JPG, PNG, WEBP
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Magnetic glow effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: isDraggingGlobal
              ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 20px 60px -15px rgba(59, 130, 246, 0.3)'
              : '0 0 0 0px rgba(59, 130, 246, 0)',
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
