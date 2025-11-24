import React, { useMemo } from 'react';
import { cn } from '../ui/utils';

interface HistogramProps {
    r?: number[];
    g?: number[];
    b?: number[];
    l?: number[];
    className?: string;
}

export const ProfessionalHistogram: React.FC<HistogramProps> = ({ r, g, b, l, className }) => {
    // Helper to generate smooth SVG path from data points
    const generatePath = (data: number[], height: number, width: number) => {
        if (!data || data.length === 0) return "";
        
        // Simple smoothing (Catmull-Rom or just basic cubic bezier adaptation for visual smoothness)
        // For this scale, a simple line to point mapping with some smoothing is enough
        // We'll assume data is 0-100 normalized or close to it.
        
        const stepX = width / (data.length - 1);
        
        let d = `M 0 ${height}`; // Start bottom left
        
        data.forEach((val, i) => {
            const x = i * stepX;
            const y = height - (val / 100) * height; // Invert Y
            if (i === 0) {
                d += ` L ${x} ${y}`;
            } else {
                // Simple line for now, could be C (bezier) for smoother look
                d += ` L ${x} ${y}`;
            }
        });
        
        d += ` L ${width} ${height} Z`; // Close path
        return d;
    };

    // Generate dummy smooth data if real data is too jagged or low res for the "Pro" look
    // In a real app, we would interpolate the input arrays.
    const smoothData = (input: number[] = []) => {
        if (input.length > 20) return input;
        // Mock interpolation for smoother curves if input is sparse
        const output = [];
        for (let i = 0; i < 100; i++) {
             // Create a multi-peak distribution based on input summary
             // This is just visual filler if real data is sparse
             output.push(Math.random() * 50 + 20); 
        }
        return input.length ? input : output;
    };

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

            {/* Channels Layered with Screen Blend Mode */}
            <div className="absolute inset-0 mix-blend-screen opacity-90 pt-2 px-1">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    {/* Red Channel */}
                    {r && <path d={generatePath(r, 100, 100)} fill="#ff0000" fillOpacity="0.6" className="mix-blend-screen" />}
                    {/* Green Channel */}
                    {g && <path d={generatePath(g, 100, 100)} fill="#00ff00" fillOpacity="0.6" className="mix-blend-screen" />}
                    {/* Blue Channel */}
                    {b && <path d={generatePath(b, 100, 100)} fill="#0000ff" fillOpacity="0.6" className="mix-blend-screen" />}
                    {/* White/Luma Channel (Optional overlay) */}
                    {l && <path d={generatePath(l, 100, 100)} fill="white" fillOpacity="0.1" stroke="white" strokeWidth="0.5" fill="none" />}
                </svg>
            </div>

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
