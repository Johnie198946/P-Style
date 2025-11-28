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
 * 【修复】支持任意长度的 histogram_data 数组：
 * - 后端已进行插值扩展，但前端也需要容错处理
 * - 如果数据长度不是256，进行前端插值扩展
 * - 确保数据归一化到 0-100 范围
 */
export const ProfessionalHistogram: React.FC<HistogramProps> = ({ r, g, b, l, className }) => {
    // 【调试日志】记录接收到的数据
    if (process.env.NODE_ENV === 'development') {
        console.log('[ProfessionalHistogram] 📈 接收到的数据:', {
            rLength: r?.length || 0,
            gLength: g?.length || 0,
            bLength: b?.length || 0,
            lLength: l?.length || 0,
            rSample: r?.slice(0, 5) || [],
            gSample: g?.slice(0, 5) || [],
            bSample: b?.slice(0, 5) || [],
            lSample: l?.slice(0, 5) || [],
        });
    }
    
    /**
     * 【修复】前端插值函数：将任意长度的直方图数据插值扩展到256个值
     * 如果后端已经做了插值（256个值），则直接使用；否则进行前端插值
     */
    const interpolateHistogram = (data: number[] = [], targetLength: number = 256): number[] => {
        if (!data || data.length === 0) return [];
        
        // 如果已经是目标长度，直接返回
        if (data.length === targetLength) return data;
        
        // 如果数据长度大于目标长度，进行降采样
        if (data.length > targetLength) {
            const step = data.length / targetLength;
            return Array.from({ length: targetLength }, (_, i) => {
                const sourceIndex = Math.floor(i * step);
                return data[sourceIndex] || 0;
            });
        }
        
        // 如果数据长度小于目标长度，进行线性插值
        const result: number[] = [];
        const sourceLength = data.length;
        
        for (let i = 0; i < targetLength; i++) {
            // 计算在源数组中的位置（浮点数）
            const sourcePos = (i / (targetLength - 1)) * (sourceLength - 1);
            // 获取相邻两个点的索引
            const idxLow = Math.floor(sourcePos);
            const idxHigh = Math.min(idxLow + 1, sourceLength - 1);
            // 计算插值权重
            const weight = sourcePos - idxLow;
            // 线性插值
            const interpolatedValue = data[idxLow] * (1 - weight) + data[idxHigh] * weight;
            result.push(interpolatedValue);
        }
        
        return result;
    };
    
    /**
     * 【修复】归一化函数：确保数据在 0-100 范围内
     * 如果数据已经归一化，则直接使用；否则进行归一化
     */
    const normalizeData = (data: number[]): number[] => {
        if (!data || data.length === 0) return [];
        
        // 找到最大值
        const max = Math.max(...data);
        
        // 如果最大值已经小于等于100，假设已经归一化
        if (max <= 100) return data;
        
        // 否则进行归一化
        return data.map(val => (val / max) * 100);
    };
    
    // 【修复】处理每个通道的数据：先插值到256，再归一化
    const processedR = useMemo(() => {
        const result = normalizeData(interpolateHistogram(r || []));
        if (process.env.NODE_ENV === 'development' && result.length > 0) {
            console.log('[ProfessionalHistogram] ✅ R 通道处理完成:', { 
                originalLength: r?.length || 0, 
                processedLength: result.length,
                maxValue: Math.max(...result),
                sample: result.slice(0, 5)
            });
        }
        return result;
    }, [r]);
    const processedG = useMemo(() => {
        const result = normalizeData(interpolateHistogram(g || []));
        if (process.env.NODE_ENV === 'development' && result.length > 0) {
            console.log('[ProfessionalHistogram] ✅ G 通道处理完成:', { 
                originalLength: g?.length || 0, 
                processedLength: result.length,
                maxValue: Math.max(...result),
                sample: result.slice(0, 5)
            });
        }
        return result;
    }, [g]);
    const processedB = useMemo(() => {
        const result = normalizeData(interpolateHistogram(b || []));
        if (process.env.NODE_ENV === 'development' && result.length > 0) {
            console.log('[ProfessionalHistogram] ✅ B 通道处理完成:', { 
                originalLength: b?.length || 0, 
                processedLength: result.length,
                maxValue: Math.max(...result),
                sample: result.slice(0, 5)
            });
        }
        return result;
    }, [b]);
    const processedL = useMemo(() => {
        const result = normalizeData(interpolateHistogram(l || []));
        if (process.env.NODE_ENV === 'development' && result.length > 0) {
            console.log('[ProfessionalHistogram] ✅ L 通道处理完成:', { 
                originalLength: l?.length || 0, 
                processedLength: result.length,
                maxValue: Math.max(...result),
                sample: result.slice(0, 5)
            });
        }
        return result;
    }, [l]);
    
    /**
     * 【修复】生成平滑的 SVG 路径
     * 使用线性插值连接数据点，形成平滑的直方图形状
     */
    const generatePath = (data: number[], height: number, width: number) => {
        if (!data || data.length === 0) return "";
        
        // 确保数据长度为256（标准直方图格式）
        const normalizedData = data.length === 256 ? data : interpolateHistogram(data, 256);
        
        const stepX = width / (normalizedData.length - 1);
        
        let d = `M 0 ${height}`; // Start bottom left
        
        normalizedData.forEach((val, i) => {
            const x = i * stepX;
            // 数据已归一化到 0-100，直接使用
            const y = height - (val / 100) * height; // Invert Y
            if (i === 0) {
                d += ` L ${x} ${y}`;
            } else {
                // 使用直线连接，形成平滑的直方图形状
                d += ` L ${x} ${y}`;
            }
        });
        
        d += ` L ${width} ${height} Z`; // Close path
        return d;
    };

    // 【修复】检查是否有有效数据
    const hasData = processedR.length > 0 || processedG.length > 0 || processedB.length > 0 || processedL.length > 0;
    
    // 【调试日志】记录最终渲染状态
    if (process.env.NODE_ENV === 'development') {
        console.log('[ProfessionalHistogram] 🎨 最终渲染状态:', {
            hasData,
            processedRLength: processedR.length,
            processedGLength: processedG.length,
            processedBLength: processedB.length,
            processedLLength: processedL.length,
            willRenderR: processedR.length > 0,
            willRenderG: processedG.length > 0,
            willRenderB: processedB.length > 0,
            willRenderL: processedL.length > 0,
        });
    }

    return (
        <div className={cn("relative w-full h-32 bg-[#050505] border border-white/10 rounded overflow-hidden select-none", className)}>
            {/* Grid System */}
            <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-20">
                <div className="border-r border-white/30 h-full"></div>
                <div className="border-r border-white/30 h-full"></div>
                <div className="border-r border-white/30 h-full"></div>
            </div>
            <div className="absolute inset-0 grid grid-rows-4 pointer-events-none opacity-20">
                <div className="border-b border-white/30 w-full"></div>
                <div className="border-b border-white/30 w-full"></div>
                <div className="border-b border-white/30 w-full"></div>
            </div>

            {/* 【修复】Channels Layered with Screen Blend Mode - 使用处理后的数据 */}
            {hasData ? (
                <div className="absolute inset-0 mix-blend-screen opacity-90 pt-2 px-1">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* Red Channel */}
                        {processedR.length > 0 && <path d={generatePath(processedR, 100, 100)} fill="#ff0000" fillOpacity="0.6" className="mix-blend-screen" />}
                        {/* Green Channel */}
                        {processedG.length > 0 && <path d={generatePath(processedG, 100, 100)} fill="#00ff00" fillOpacity="0.6" className="mix-blend-screen" />}
                        {/* Blue Channel */}
                        {processedB.length > 0 && <path d={generatePath(processedB, 100, 100)} fill="#0000ff" fillOpacity="0.6" className="mix-blend-screen" />}
                        {/* White/Luma Channel (Optional overlay) */}
                        {processedL.length > 0 && <path d={generatePath(processedL, 100, 100)} fill="white" fillOpacity="0.1" stroke="white" strokeWidth="0.5" fill="none" />}
                    </svg>
                </div>
            ) : (
                // 【新增】无数据时的占位提示
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-[9px] font-mono text-white/30 mb-1">NO DATA</div>
                        <div className="text-[7px] font-mono text-white/20">等待直方图数据...</div>
                    </div>
                </div>
            )}

            {/* Metadata Overlay */}
            <div className="absolute top-1 left-1 text-[8px] font-mono text-white/40 tracking-tighter">
                RGB_PARADE // 8-BIT
            </div>
            
            {/* Zone Markers */}
            <div className="absolute bottom-0 w-full flex justify-between px-2 text-[7px] font-mono text-white/20">
                <span>BLACKS</span>
                <span>SHADOWS</span>
                <span>EXP</span>
                <span>HILIGHT</span>
                <span>WHITES</span>
            </div>
        </div>
    );
};
