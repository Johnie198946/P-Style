import React, { useMemo } from 'react';
import { cn } from '../ui/utils';

interface HistogramProps {
    r?: number[];
    g?: number[];
    b?: number[];
    l?: number[];
    className?: string;
}

/**
 * 【专业直方图组件】
 * 功能：显示 RGB 和亮度通道的直方图分布
 * 
 * 【设计原则】：
 * 1. 平滑曲线：使用高斯平滑 + 贝塞尔曲线，避免"刺猬"效果
 * 2. 专业外观：参考 Lightroom/Premiere 的直方图设计
 * 3. 性能优化：使用 useMemo 缓存计算结果
 */
export const ProfessionalHistogram: React.FC<HistogramProps> = ({ r, g, b, l, className }) => {
    
    /**
     * 【高斯平滑函数】对直方图数据进行平滑处理
     * 使用滑动窗口平均，消除噪点和锯齿
     * @param data 原始数据
     * @param windowSize 平滑窗口大小（越大越平滑）
     */
    const gaussianSmooth = (data: number[], windowSize: number = 5): number[] => {
        if (!data || data.length === 0) return [];
        
        const result: number[] = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;
        
            // 高斯权重（简化版：距离越近权重越大）
            for (let j = -halfWindow; j <= halfWindow; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < data.length) {
                    // 高斯权重：中心点权重最大
                    const weight = 1 - Math.abs(j) / (halfWindow + 1);
                    sum += data[idx] * weight;
                    count += weight;
                }
            }
            
            result.push(count > 0 ? sum / count : 0);
        }
        
        return result;
    };
    
    /**
     * 【重采样函数】将数据重采样到指定数量的点
     * 用于减少数据点数量，提高渲染性能
     */
    const resample = (data: number[], targetPoints: number = 64): number[] => {
        if (!data || data.length === 0) return [];
        if (data.length <= targetPoints) return data;
        
        const result: number[] = [];
        const step = data.length / targetPoints;
        
        for (let i = 0; i < targetPoints; i++) {
            const startIdx = Math.floor(i * step);
            const endIdx = Math.floor((i + 1) * step);
            
            // 取区间内的最大值（保留峰值特征）
            let maxVal = 0;
            for (let j = startIdx; j < endIdx && j < data.length; j++) {
                maxVal = Math.max(maxVal, data[j]);
            }
            result.push(maxVal);
        }
        
        return result;
    };
    
    /**
     * 【归一化函数】确保数据在 0-100 范围内
     */
    const normalizeData = (data: number[]): number[] => {
        if (!data || data.length === 0) return [];
        
        const max = Math.max(...data);
        if (max === 0) return data.map(() => 0);
        
        // 归一化到 0-100
        return data.map(val => (val / max) * 100);
    };
    
    /**
     * 【数据处理管道】
     * 1. 重采样到 64 个点
     * 2. 高斯平滑（窗口大小 7）
     * 3. 再次平滑（窗口大小 5）
     * 4. 归一化到 0-100
     */
    const processData = (data: number[] | undefined): number[] => {
        if (!data || data.length === 0) return [];
        
        // 步骤1：重采样到 64 个点
        let processed = resample(data, 64);
        
        // 步骤2：第一次高斯平滑（去除大噪点）
        processed = gaussianSmooth(processed, 7);
        
        // 步骤3：第二次高斯平滑（进一步平滑）
        processed = gaussianSmooth(processed, 5);
        
        // 步骤4：归一化
        processed = normalizeData(processed);
        
        return processed;
    };
    
    // 处理每个通道的数据
    const processedR = useMemo(() => processData(r), [r]);
    const processedG = useMemo(() => processData(g), [g]);
    const processedB = useMemo(() => processData(b), [b]);
    const processedL = useMemo(() => processData(l), [l]);
    
    /**
     * 【生成平滑 SVG 路径】使用 Catmull-Rom 样条转贝塞尔曲线
     * 生成专业级平滑曲线，类似 Lightroom 直方图
     */
    const generateSmoothPath = (data: number[], height: number, width: number): string => {
        if (!data || data.length < 2) return "";
        
        const points: { x: number; y: number }[] = data.map((val, i) => ({
            x: (i / (data.length - 1)) * width,
            y: height - (val / 100) * height * 0.95 // 留 5% 顶部空间
        }));
        
        // 起始点（左下角）
        let d = `M 0 ${height}`;
        
        // 移动到第一个数据点
        d += ` L ${points[0].x} ${points[0].y}`;
        
        // 使用 Catmull-Rom 样条生成平滑曲线
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            
            // Catmull-Rom 转贝塞尔控制点
            const tension = 0.3; // 张力系数，越小越平滑
            
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }
        
        // 闭合路径（右下角 → 左下角）
        d += ` L ${width} ${height} Z`;
        
        return d;
    };
    
    /**
     * 【生成描边路径】只绘制曲线，不填充
     */
    const generateStrokePath = (data: number[], height: number, width: number): string => {
        if (!data || data.length < 2) return "";
        
        const points: { x: number; y: number }[] = data.map((val, i) => ({
            x: (i / (data.length - 1)) * width,
            y: height - (val / 100) * height * 0.95
        }));
        
        let d = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            
            const tension = 0.3;
            
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        
        return d;
    };

    // 检查是否有有效数据
    const hasData = processedR.length > 0 || processedG.length > 0 || processedB.length > 0 || processedL.length > 0;

    return (
        <div className={cn("relative w-full h-32 bg-[#050505] border border-white/10 rounded overflow-hidden select-none", className)}>
            {/* 背景网格 */}
            <div className="absolute inset-0 pointer-events-none">
                {/* 垂直网格线 */}
                <div className="absolute inset-0 flex justify-between px-0">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-px h-full bg-white/10" />
                    ))}
                </div>
                {/* 水平网格线 */}
                <div className="absolute inset-0 flex flex-col justify-between py-0">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="w-full h-px bg-white/10" />
                    ))}
            </div>
            </div>

            {/* 直方图曲线 */}
            {hasData ? (
                <div className="absolute inset-0 pt-3 pb-4 px-1">
                    <svg 
                        className="w-full h-full" 
                        preserveAspectRatio="none" 
                        viewBox="0 0 100 100"
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            {/* 红色渐变 */}
                            <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ff0000" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#ff0000" stopOpacity="0.2" />
                            </linearGradient>
                            {/* 绿色渐变 */}
                            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#00ff00" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#00ff00" stopOpacity="0.2" />
                            </linearGradient>
                            {/* 蓝色渐变 */}
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#0066ff" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#0066ff" stopOpacity="0.2" />
                            </linearGradient>
                            {/* 亮度渐变 */}
                            <linearGradient id="lumaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>
                        
                        {/* 蓝色通道（最底层） */}
                        {processedB.length > 0 && (
                            <path 
                                d={generateSmoothPath(processedB, 100, 100)} 
                                fill="url(#blueGradient)" 
                                className="mix-blend-screen"
                            />
                        )}
                        
                        {/* 绿色通道 */}
                        {processedG.length > 0 && (
                            <path 
                                d={generateSmoothPath(processedG, 100, 100)} 
                                fill="url(#greenGradient)" 
                                className="mix-blend-screen"
                            />
                        )}
                        
                        {/* 红色通道 */}
                        {processedR.length > 0 && (
                            <path 
                                d={generateSmoothPath(processedR, 100, 100)} 
                                fill="url(#redGradient)" 
                                className="mix-blend-screen"
                            />
                        )}
                        
                        {/* 亮度通道（描边） */}
                        {processedL.length > 0 && (
                            <path 
                                d={generateStrokePath(processedL, 100, 100)} 
                                fill="none"
                                stroke="rgba(255,255,255,0.6)"
                                strokeWidth="0.8"
                            />
                        )}
                </svg>
            </div>
            ) : (
                // 无数据时的占位提示
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-[9px] font-mono text-white/30 mb-1">NO DATA</div>
                        <div className="text-[7px] font-mono text-white/20">等待直方图数据...</div>
                    </div>
                </div>
            )}

            {/* 顶部标签 */}
            <div className="absolute top-1 left-1 text-[8px] font-mono text-white/40 tracking-tighter">
                RGB_PARADE // 8-BIT
            </div>
            
            {/* 底部刻度 */}
            <div className="absolute bottom-0 w-full flex justify-between px-1 text-[7px] font-mono text-white/30">
                <span>0</span>
                <span>128</span>
                <span>255</span>
            </div>
        </div>
    );
};
