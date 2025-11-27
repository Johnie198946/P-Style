import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * 主色调颜色接口
 */
export interface DominantColor {
  h: number;  // 色相 (0-360)
  s: number;  // 饱和度 (0-1)
  v: number;  // 明度 (0-1)
  hex: string;  // HEX 颜色值
}

interface VectorscopeProps {
  imageSrc: string | null;
  width?: number;
  height?: number;
  className?: string;
  /**
   * 主色调提取完成回调
   * 当色彩雷达分析完成并提取出主色调后，会调用此回调
   */
  onDominantColorsExtracted?: (colors: DominantColor[]) => void;
  hoverColor?: {r:number, g:number, b:number, hex:string} | null;
}

export const Vectorscope: React.FC<VectorscopeProps> = ({
  imageSrc,
  width = 256,
  height = 256,
  className,
  onDominantColorsExtracted,
  hoverColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<HTMLCanvasElement>(null); // 【新增】交互层，用于显示鼠标悬停点

  /**
   * RGB 转 HSV 色彩空间转换函数
   * @param r - 红色通道 (0-255)
   * @param g - 绿色通道 (0-255)
   * @param b - 蓝色通道 (0-255)
   * @returns HSV 对象 { h: 0-360, s: 0-1, v: 0-1 }
   */
  const rgbToHsv = useCallback((r: number, g: number, b: number): { h: number, s: number, v: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / diff + 2) / 6;
      } else {
        h = ((r - g) / diff + 4) / 6;
      }
    }
    
    const s = max === 0 ? 0 : diff / max;
    const v = max;
    
    return { h: h * 360, s, v };
  }, []);

  /**
   * HSV 转 RGB 色彩空间转换函数
   * @param h - 色相 (0-360)
   * @param s - 饱和度 (0-1)
   * @param v - 明度 (0-1)
   * @returns RGB 对象 { r: 0-255, g: 0-255, b: 0-255 }
   */
  const hsvToRgb = useCallback((h: number, s: number, v: number): { r: number, g: number, b: number } => {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }, []);

  /**
   * 从热力图中提取主色调（使用简化的 K-Means 方法）
   * @param heatmapGrid - 热力图数组 [36][10]
   * @param k - 聚类数量（默认 5）
   * @returns 主色调列表
   */
  const extractDominantColors = useCallback((heatmapGrid: number[][], k: number = 5): DominantColor[] => {
    // 找到热力图中值最大的 k 个区域
    const candidates: Array<{ angleIdx: number, satIdx: number, value: number }> = [];
    
    for (let i = 0; i < heatmapGrid.length; i++) {
      for (let j = 0; j < heatmapGrid[i].length; j++) {
        if (heatmapGrid[i][j] > 0) {
          candidates.push({
            angleIdx: i,
            satIdx: j,
            value: heatmapGrid[i][j]
          });
        }
      }
    }
    
    // 按值排序，取前 k 个
    candidates.sort((a, b) => b.value - a.value);
    const topK = candidates.slice(0, k);
    
    // 转换为 HSV 和 HEX
    return topK.map(candidate => {
      const h = (candidate.angleIdx / 36) * 360;
      const s = Math.min(1, (candidate.satIdx / 10) + 0.1); // 稍微增加饱和度，避免过于灰暗
      const v = 0.8; // 固定明度
      
      // HSV 转 RGB，再转 HEX
      const rgb = hsvToRgb(h, s, v);
      const hex = `#${[rgb.r, rgb.g, rgb.b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('')}`;
      
      return { h, s, v, hex };
    });
  }, [hsvToRgb]);

  // Draw the Graticule (The grid and targets) only once
  // 【重要】网格层（overlay）应该在信号层（canvas）之上，但必须透明，不能遮挡信号
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 【重要】确保 overlay Canvas 尺寸正确设置
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 10;

    // 【重要】清空 overlay 层（只绘制网格线，不填充背景）
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;

    // Draw Circles
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2); // 75% Saturation
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();

    // Draw Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Skin Tone Line (123 degrees approx in standard vectorscope land, essentially between Red and Yellow)
    // In standard digital vectorscope, Skin tone is roughly at 10-11 o'clock.
    // Angle for skin tone line is approx 123 degrees from pure Blue (if Blue is 0). 
    // Simplified: It's roughly -33 degrees from Y (North).
    ctx.beginPath();
    const skinAngle = (Math.PI / 180) * -33; // Adjust based on UV/IQ rotation
    // Actually standard I-line. Let's visualize it at approx 11 o'clock position.
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(skinAngle - Math.PI / 2) * radius,
      cy + Math.sin(skinAngle - Math.PI / 2) * radius
    );
    ctx.strokeStyle = "rgba(255, 105, 180, 0.5)"; // Pink for skin
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Color Targets (R, G, B, C, M, Y)
    const targets = [
      { label: "R", angle: -105, color: "#ff3333" }, // Approximate angles for Rec.709
      { label: "M", angle: -45, color: "#ff33ff" },
      { label: "B", angle: 15, color: "#3333ff" },
      { label: "C", angle: 75, color: "#33ffff" },
      { label: "G", angle: 135, color: "#33ff33" },
      { label: "Y", angle: 195, color: "#ffff33" },
    ];

    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    targets.forEach((t) => {
      const rad = ((t.angle - 90) * Math.PI) / 180;
      const tx = cx + Math.cos(rad) * (radius * 0.85);
      const ty = cy + Math.sin(rad) * (radius * 0.85);
      
      // Box
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(tx - 6, ty - 6, 12, 12);
      
      ctx.fillStyle = t.color;
      ctx.fillText(t.label, tx, ty);
    });

  }, [width, height]);

  /**
   * 绘制色彩雷达信号（使用 HSV 色彩空间）
   * 根据设计方案，使用 HSV 转换替代原来的 YCbCr 转换
   * 实现降维处理：36角度 x 10饱和度圈层
   * 
   * 【重要】色彩雷达是前端实时计算，不使用硬编码模拟数据
   * 数据来源：从 imageSrc 图片中实时提取像素数据，进行 HSV 转换和降维处理
   */
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) {
      // 【日志】记录图片源为空的情况
      if (!imageSrc) {
        console.warn('[Vectorscope] imageSrc 为空，无法渲染色彩雷达');
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error('[Vectorscope] 无法获取 Canvas 上下文');
      return;
    }

    // 【日志】记录开始处理
    console.log('[Vectorscope] 开始处理图片，imageSrc:', imageSrc.substring(0, 50) + '...');

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    // 【错误处理】图片加载失败
    img.onerror = (error) => {
      console.error('[Vectorscope] 图片加载失败:', error);
      console.error('[Vectorscope] 图片 URL:', imageSrc);
      // 【重要】确保 Canvas 尺寸正确设置，然后重新获取上下文
      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }
      const errorCtx = canvas.getContext("2d");
      if (!errorCtx) {
        console.error('[Vectorscope] 无法获取 Canvas 上下文（错误处理）');
        return;
      }
      // 清空画布，显示错误状态
      errorCtx.fillStyle = "#000000";
      errorCtx.fillRect(0, 0, width, height);
      errorCtx.fillStyle = "#ff0000";
      errorCtx.font = "12px monospace";
      errorCtx.textAlign = "center";
      errorCtx.textBaseline = "middle";
      errorCtx.fillText("图片加载失败", width / 2, height / 2);
    };

    img.onload = () => {
      // 【日志】记录图片加载成功
      console.log('[Vectorscope] 图片加载成功，尺寸:', img.width, 'x', img.height);
      
      // 【重要】确保 Canvas 尺寸正确设置
      // 【关键修复】设置 canvas.width 或 canvas.height 会清空 Canvas 内容！
      // 因此必须在设置尺寸之前，或者只在第一次设置时设置尺寸
      // 这里我们检查尺寸，如果不对则设置（会清空，但这是必要的）
      let needResize = false;
      if (canvas.width !== width) {
        canvas.width = width;
        needResize = true;
        console.log('[Vectorscope] Canvas 宽度已设置为:', width);
      }
      if (canvas.height !== height) {
        canvas.height = height;
        needResize = true;
        console.log('[Vectorscope] Canvas 高度已设置为:', height);
      }
      
      // 【重要】重新获取上下文（因为设置尺寸后上下文可能失效）
      const currentCtx = canvas.getContext("2d");
      if (!currentCtx) {
        console.error('[Vectorscope] 无法重新获取 Canvas 上下文');
        return;
      }
      
      // 清空画布（使用黑色背景）
      currentCtx.fillStyle = "#000000";
      currentCtx.fillRect(0, 0, width, height);
      
      // 【日志】记录 Canvas 状态
      console.log('[Vectorscope] Canvas 尺寸:', canvas.width, 'x', canvas.height, '需要调整:', needResize);

      // 创建临时 Canvas 用于读取像素数据
      // 降采样以提高性能（最大 512x512）
      const tempCanvas = document.createElement("canvas");
      const maxSize = 512;
      const scaleFactor = Math.min(1, maxSize / Math.max(img.width, img.height));
      const drawW = Math.floor(img.width * scaleFactor);
      const drawH = Math.floor(img.height * scaleFactor);
      
      tempCanvas.width = drawW;
      tempCanvas.height = drawH;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        console.error('[Vectorscope] 无法创建临时 Canvas 上下文');
        return;
      }
      
      tempCtx.drawImage(img, 0, 0, drawW, drawH);
      const imageData = tempCtx.getImageData(0, 0, drawW, drawH);
      const data = imageData.data;

      // 【日志】记录像素数据
      const totalPixels = data.length / 4;
      console.log('[Vectorscope] 像素数据提取完成，总像素数:', totalPixels, '降采样尺寸:', drawW, 'x', drawH);

      // 渲染设置
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) - 10;
      
      // 【日志】记录渲染设置
      console.log('[Vectorscope] 渲染中心:', cx, cy, '半径:', radius);
      
      // 降维处理：36角度 x 10饱和度圈层
      // 【重要】这是实时计算，不是硬编码模拟数据
      // 根据设计逻辑：将圆盘划分为 36个角度扇区 x 10个饱和度圈层 的网格，统计落入每个格子的像素数量
      const ANGLE_SECTORS = 36; // 每10度一个扇区（360度 / 36 = 10度/扇区）
      const SATURATION_LAYERS = 10; // 10个饱和度圈层（从圆心到边缘，离圆心越远饱和度越高）
      
      // 初始化热力图网格 [36][10]
      const heatmapGrid: number[][] = Array(ANGLE_SECTORS)
        .fill(0)
        .map(() => Array(SATURATION_LAYERS).fill(0));
      
      // 【日志】记录开始处理像素
      const startTime = performance.now();
      
      // 遍历所有像素，进行 HSV 转换和降维处理
      // 【重要】这是从实际图片像素数据中实时计算，不是硬编码数据
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // RGB 转 HSV（替代原来的 YCbCr 转换）
        const { h, s, v } = rgbToHsv(r, g, b);
        
        // 计算扇区索引（0-35）
        // 【修正】色相角度与雷达图方向对齐
        // 在 HSV 模型中，0度是红色（3点钟方向），但在 Canvas 中 0 弧度也是3点钟方向
        // 然而，雷达图的习惯布局可能是：红色在顶部或其他位置
        // 如果发现点位偏移，可能需要调整这里的角度计算，例如 (h - 90) 或其他偏移
        // 目前 Canvas 的 arc 方法 0 是 3点钟方向，顺时针增加
        // hsvToRgb 中的 h 是 0-360
        // 假设 h=0 是红色，在 Canvas 0弧度处
        const angleIndex = Math.floor((h / 360) * ANGLE_SECTORS) % ANGLE_SECTORS;
        // 计算饱和度层索引（0-9）
        const satIndex = Math.min(SATURATION_LAYERS - 1, Math.floor(s * SATURATION_LAYERS));
        
        // 累加像素数量到热力图网格
        if (angleIndex >= 0 && angleIndex < ANGLE_SECTORS && 
            satIndex >= 0 && satIndex < SATURATION_LAYERS) {
          heatmapGrid[angleIndex][satIndex]++;
        }
      }

      // 【日志】记录处理完成
      const processingTime = performance.now() - startTime;
      console.log('[Vectorscope] 像素处理完成，耗时:', processingTime.toFixed(2), 'ms');

      // 提取主色调（在绘制之前，以便传递给回调）
      const dominantColors = extractDominantColors(heatmapGrid, 5);
      console.log('[Vectorscope] 主色调提取完成，数量:', dominantColors.length, dominantColors);
      if (onDominantColorsExtracted) {
        onDominantColorsExtracted(dominantColors);
      }

      // 找到最大值，用于归一化
      let maxValue = 0;
      for (let i = 0; i < heatmapGrid.length; i++) {
        for (let j = 0; j < heatmapGrid[i].length; j++) {
          maxValue = Math.max(maxValue, heatmapGrid[i][j]);
        }
      }
      if (maxValue === 0) {
        console.warn('[Vectorscope] 警告：热力图网格全为0，可能是图片数据异常');
        maxValue = 1;
      } else {
        console.log('[Vectorscope] 热力图最大值:', maxValue, '（用于归一化）');
      }

      // 绘制极坐标热力图
      // 【重要】使用正确的扇形绘制方法：从圆心开始，绘制外圆弧，然后绘制内圆弧（反向），最后闭合路径
      let drawnCount = 0; // 记录实际绘制的扇形数量
      for (let angleIdx = 0; angleIdx < ANGLE_SECTORS; angleIdx++) {
        for (let satIdx = 0; satIdx < SATURATION_LAYERS; satIdx++) {
          const value = heatmapGrid[angleIdx][satIdx];
          if (value === 0) continue;
          
          // 计算极坐标
          const angle = (angleIdx / ANGLE_SECTORS) * Math.PI * 2;
          const angleStep = (Math.PI * 2 / ANGLE_SECTORS);
          const innerRadius = (satIdx / SATURATION_LAYERS) * radius;
          const outerRadius = ((satIdx + 1) / SATURATION_LAYERS) * radius;
          
          // 计算强度（归一化，使用对数缩放以增强视觉效果）
          const intensity = Math.min(1, Math.log(value + 1) / Math.log(maxValue + 1));
          
          // 【修复】正确的扇形绘制方法
          // 1. 移动到圆心
          // 2. 画一条线到外圆弧起点
          // 3. 画外圆弧（从 angle 到 angle + angleStep）
          // 4. 画内圆弧（反向，从 angle + angleStep 到 angle）
          // 5. 闭合路径（自动连接到圆心）
          currentCtx.beginPath();
          currentCtx.moveTo(cx, cy); // 移动到圆心
          currentCtx.lineTo(
            cx + Math.cos(angle) * outerRadius,
            cy + Math.sin(angle) * outerRadius
          ); // 画线到外圆弧起点
          currentCtx.arc(cx, cy, outerRadius, angle, angle + angleStep, false); // 画外圆弧
          currentCtx.arc(cx, cy, innerRadius, angle + angleStep, angle, true); // 画内圆弧（反向）
          currentCtx.closePath(); // 闭合路径（连接到圆心）
          
          // 根据强度设置颜色（高饱和度区域高亮）
          // 【重要】使用更明显的颜色，确保可见性
          // 使用青色系，高饱和度区域更亮
          // 增强亮度和对比度，确保在黑色背景上可见
          const alpha = Math.max(0.3, intensity * 0.9); // 最小 alpha 0.3，确保可见
          const brightness = Math.max(50, Math.min(255, intensity * 255)); // 最小亮度 50，确保可见
          currentCtx.fillStyle = `rgba(0, ${brightness}, ${brightness}, ${alpha})`;
          currentCtx.fill();
          
          // 【调试】记录前几个扇形的绘制信息
          if (drawnCount < 5) {
            console.log(`[Vectorscope] 扇形 ${drawnCount + 1}: angle=${angle.toFixed(2)}, innerR=${innerRadius.toFixed(2)}, outerR=${outerRadius.toFixed(2)}, intensity=${intensity.toFixed(3)}, brightness=${brightness}, alpha=${alpha.toFixed(3)}`);
          }
          
          drawnCount++;
        }
      }
      
      // 【日志】记录实际绘制的扇形数量
      console.log('[Vectorscope] 实际绘制的扇形数量:', drawnCount, '/', ANGLE_SECTORS * SATURATION_LAYERS);
      
      // 【日志】记录渲染完成
      console.log('[Vectorscope] ✅ 色彩雷达渲染完成');
    };

  }, [imageSrc, width, height]); // 【优化】移除函数依赖项，避免重复执行

  // 【新增】绘制鼠标悬停点
  useEffect(() => {
    const canvas = interactionRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    if (!hoverColor) return;
    
    // 计算位置
    const { h, s } = rgbToHsv(hoverColor.r, hoverColor.g, hoverColor.b);
    
    // 映射到极坐标
    // 【修正】交互点的位置计算需要与热力图绘制逻辑一致
    // HSV h: 0-360 (0=Red, 120=Green, 240=Blue)
    // Canvas 0弧度 = 3点钟方向
    // 如果需要旋转对齐，请在此处调整 angle
    const angle = (h / 360) * Math.PI * 2;
    const radius = (width / 2) * s; // Max radius is width/2
    const cx = width / 2;
    const cy = height / 2;
    
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    
    // 绘制标记
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 绘制连接线
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    
  }, [hoverColor, width, height, rgbToHsv]);

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden border border-white/10 shadow-inner ${className}`}
      style={{ width, height, minWidth: width, minHeight: height }}
    >
      {/* The Signal Layer - 色彩雷达信号层（热力图） */}
      {/* 【重要】信号层在底层（z-10），绘制热力图数据 */}
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="absolute inset-0 z-10"
        style={{ width: '100%', height: '100%', display: 'block', position: 'absolute' }}
      />
      {/* The Graticule Layer (Grid) - 网格和参考线层 */}
      {/* 【重要】网格层在上层（z-20），只绘制透明的网格线，不遮挡信号层 */}
      <canvas 
        ref={overlayRef} 
        width={width} 
        height={height} 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{ width: '100%', height: '100%', display: 'block', position: 'absolute' }}
      />
      {/* 【新增】交互层（z-30），用于显示鼠标悬停点 */}
      <canvas 
        ref={interactionRef} 
        width={width} 
        height={height} 
        className="absolute inset-0 z-30 pointer-events-none"
        style={{ width: '100%', height: '100%', display: 'block', position: 'absolute' }}
      />
      {/* 标签：显示色彩雷达类型 */}
      <div className="absolute top-2 left-2 z-30 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-green-400 border border-green-900/50">
        COLOR RADAR (HSV)
      </div>
    </div>
  );
};
