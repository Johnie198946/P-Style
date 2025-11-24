import { FullAnalysisData } from '../../types/analysis';

// Extended interface for the new PS requirements
export interface AdvancedPhotoshopData {
    histogram: {
        r: number[]; g: number[]; b: number[]; l: number[];
        avg_l: number; shadows: number; midtones: number; highlights: number;
    };
    cr_base: {
        temp: number; tint: number; exposure: number; contrast: number;
        highlights: number; shadows: number; whites: number; blacks: number;
        texture: number; clarity: number; dehaze: number;
        reason: string;
    };
    curves: {
        rgb: Array<{x: number, y: number}>;
        reason: string;
    };
    hsl: {
        // Simplified for demo, reusing standard HSL structure logic
        red: { h:0, s:0, l:0 }; orange: { h:0, s:0, l:0 }; yellow: { h:0, s:0, l:0 };
        green: { h:0, s:0, l:0 }; aqua: { h:0, s:0, l:0 }; blue: { h:0, s:0, l:0 };
        purple: { h:0, s:0, l:0 }; magenta: { h:0, s:0, l:0 };
        reason: string;
    };
    selective_color: Array<{
        color: string; // "Reds", "Yellows", etc.
        c: number; m: number; y: number; k: number;
        method: "Relative" | "Absolute";
        opacity: number; blend_mode: string;
        reason: string;
    }>;
    local_light: Array<{
        location: string; tool: "Dodge" | "Burn";
        params: string; opacity: number; blend_mode: string;
        reason: string;
    }>;
    atmosphere: {
        hardness: number; opacity: number; flow: number; color: string;
        reason: string;
    };
    sharpen: {
        technique: string; amount: number; radius: number; threshold: number;
        reason: string;
    };
    grain: {
        type: string; amount: number; size: number; roughness: number;
        reason: string;
    };
    vignette: {
        amount: number; midpoint: number; roundness: number; feather: number;
        reason: string;
    };
    levels: {
        black_input: number; white_input: number; gamma: number;
        black_output: number; white_output: number;
        blend_mode: string; opacity: number;
        reason: string;
    };
}

export const MOCK_PS_ADVANCED: AdvancedPhotoshopData = {
    histogram: {
        r: [10, 20, 40, 80, 60, 30], g: [15, 25, 50, 70, 50, 20], b: [20, 30, 60, 90, 40, 10], l: [15, 25, 50, 80, 50, 20],
        avg_l: 128, shadows: 20, midtones: 140, highlights: 210
    },
    cr_base: {
        temp: 4800, tint: 15, exposure: 0.2, contrast: 15,
        highlights: -40, shadows: 25, whites: 10, blacks: -10,
        texture: 20, clarity: 10, dehaze: 5,
        reason: "优化 LR 基础：强化纹理以增加颗粒真实感。"
    },
    curves: {
        rgb: [{x:0, y:0}, {x:60, y:50}, {x:190, y:200}, {x:255, y:255}],
        reason: "细微 S 曲线以在合成后锁定对比度。"
    },
    hsl: {
        red: { h:5, s:10, l:0 }, orange: { h:0, s:15, l:5 }, yellow: { h:-5, s:-10, l:0 },
        green: { h:10, s:-20, l:-5 }, aqua: { h:0, s:0, l:0 }, blue: { h:0, s:20, l:-10 },
        purple: { h:0, s:0, l:0 }, magenta: { h:0, s:0, l:0 },
        reason: "针对肤色（橙色）和电影感蓝色进行调整。"
    },
    selective_color: [
        { color: "Reds", c: -15, m: 5, y: 10, k: 0, method: "Relative", opacity: 100, blend_mode: "Normal", reason: "将红色向金黄色肤色偏移。" },
        { color: "Neutrals", c: 5, m: -2, y: -5, k: 2, method: "Relative", opacity: 80, blend_mode: "Normal", reason: "冷却中性区域的阴影。" },
        { color: "Blacks", c: 10, m: 10, y: 0, k: 5, method: "Absolute", opacity: 100, blend_mode: "Normal", reason: "为最深黑色添加丰富的青蓝色调。" }
    ],
    local_light: [
        { location: "主体眼睛", tool: "Dodge", params: "中间调, +15%", opacity: 40, blend_mode: "Overlay", reason: "增强眼神光。" },
        { location: "背景左上", tool: "Burn", params: "阴影, -20%", opacity: 60, blend_mode: "Soft Light", reason: "引导视线向中心。" }
    ],
    atmosphere: {
        hardness: 0, opacity: 35, flow: 15, color: "#ffaa00",
        reason: "柔和的暖光笔刷模拟实际光源溢出。"
    },
    sharpen: {
        technique: "High Pass", amount: 120, radius: 1.8, threshold: 4,
        reason: "边缘检测锐化以突出主体细节。"
    },
    grain: {
        type: "Soft Film", amount: 18, size: 25, roughness: 40,
        reason: "统一数字图层与有机纹理。"
    },
    vignette: {
        amount: -30, midpoint: 40, roundness: 0, feather: 80,
        reason: "电影宽银幕焦点。"
    },
    levels: {
        black_input: 10, white_input: 245, gamma: 0.95,
        black_output: 5, white_output: 255,
        blend_mode: "Luminosity", opacity: 100,
        reason: "最终动态范围钳制。"
    }
};

export const MOCK_FULL_DATA: FullAnalysisData = {
    review: {
        style_summary: "赛博朋克新黑色电影",
        comprehensive_review: "该图像展现了现代科幻电影典型的高对比度美学。冷色调的环境填充光与暖色调的实际光源之间的分离创造了引人注目的深度。",
        pros_evaluation: "极佳的动态范围使用。"
    },
    composition: {
        main_structure: "带有引导线的中心透视",
        subject_weight: { description: "主体锚定在下三分之一处，创造出宏大的尺度感。" }
    },
    lighting: {
        exposure_control: [
            { param: "Contrast", range: "+15", desc: "提高对比度以加深黑色并分离高光。" },
            { param: "Highlights", range: "-20", desc: "保护肤色免受过曝影响。" }
        ]
    },
    color_scheme: {
        style_key_points: "青橙色分离与深黑色。",
        white_balance: {
            temp: { value: 4500, range: "-500K", reason: "较冷的色温增强未来感氛围。" },
            tint: { value: 12, range: "+12", reason: "洋红偏移以抵消绿色荧光干扰。" }
        },
        color_grading: {
            highlights: { hue: 40, saturation: 25, reason: "暖色高光增加肤色活力。" },
            midtones: { hue: 190, saturation: 10, reason: "冷色中间调统一氛围。" },
            shadows: { hue: 210, saturation: 30, reason: "深蓝色阴影增加电影质感密度。" },
            balance: -15
        },
        hsl: {
            red: { hue: 0, saturation: 10, luminance: 0 },
            orange: { hue: -5, saturation: 15, luminance: 5 },
            yellow: { hue: -15, saturation: -10, luminance: 0 },
            green: { hue: 0, saturation: -40, luminance: -10 },
            aqua: { hue: 10, saturation: 20, luminance: 0 },
            blue: { hue: 5, saturation: 30, luminance: -5 },
            purple: { hue: 0, saturation: 0, luminance: 0 },
            magenta: { hue: 0, saturation: 10, luminance: 0 }
        }
    },
    lightroom: {
        histogram: { 
            r: [10, 15, 30, 50, 80, 60, 40, 20], 
            g: [12, 18, 35, 55, 75, 55, 35, 15], 
            b: [15, 22, 40, 60, 70, 50, 30, 10], 
            l: [12, 18, 35, 55, 75, 55, 35, 15], 
            avg_l: 120, shadows: 35, midtones: 128, highlights: 210 
        },
        basic_panel: {
            temp: { value: 4500, range: "4200K - 4800K", reason: "较冷白平衡强调霓虹环境。" },
            tint: { value: 12, range: "+10 to +15", reason: "洋红偏移抵消绿色荧光尖峰。" },
            exposure: { value: 0.5, range: "+0.3 to +0.7", reason: "轻微推高中间调可见度而不通过曝。" },
            contrast: { value: 20, range: "+15 to +25", reason: "电影级冲击力，分离主体与背景。" },
            highlights: { value: -30, range: "-40 to -20", reason: "恢复光源中的高光细节。" },
            shadows: { value: 15, range: "+10 to +20", reason: "提升死黑以揭示环境纹理。" },
            whites: { value: 5, range: "0 to +10", reason: "设置真实白点。" },
            blacks: { value: -10, range: "-15 to -5", reason: "锚定黑点以增加深度。" },
            texture: { value: 10, range: "+5 to +15", reason: "增强表面细节（皮肤/织物）。" },
            clarity: { value: 15, range: "+10 to +20", reason: "局部对比度提升以获得'粗砺'感。" },
            dehaze: { value: 5, range: "0 to +10", reason: "轻微穿透大气雾霾。" },
            vibrance: { value: 10, range: "+5 to +15", reason: "保护肤色的同时提升色彩。" },
            saturation: { value: -5, range: "-10 to 0", reason: "整体降低饱和度以获得更可控的调色板。" }
        },
        hsl: {
            red: { hue: 0, saturation: 10, luminance: 0 },
            orange: { hue: -5, saturation: 15, luminance: 5 },
            yellow: { hue: -15, saturation: -10, luminance: 0 },
            green: { hue: 0, saturation: -40, luminance: -10 },
            aqua: { hue: 10, saturation: 20, luminance: 0 },
            blue: { hue: 5, saturation: 30, luminance: -5 },
            purple: { hue: 0, saturation: 0, luminance: 0 },
            magenta: { hue: 0, saturation: 10, luminance: 0 }
        },
        curve: {
            rgb: [{x:0, y:0}, {x:64, y:50}, {x:190, y:200}, {x:255, y:255}], 
            red: [], green: [], blue: [],
            reason: "S 曲线对比度，提升黑色以获得胶片感。"
        },
        split_toning: {
            highlights: { hue: 40, saturation: 20, reason: "暖金色高光补充冷调阴影。" },
            shadows: { hue: 210, saturation: 15, reason: "深青色阴影打造经典电影外观。" },
            balance: { value: 0, reason: "中性平衡以保持肤色。" }
        }
    },
    photoshop: { 
        camera_raw_adjustments: "应用 Lightroom 规格的基本色调映射。",
        curve_refinement: "中间调微对比度调整。",
        hsl_refinement: "针对特定霓虹色相。",
        selective_color: [
            { color: "Cyans", adjustments: { c: 10, m: -5, y: -10, k: 0 }, method: "Relative", reason: "将青色向水鸭蓝偏移。" }
        ],
        local_adjustments: [
            { tool: "Dodge", location: "主体面部", params: "Midtones, 10%", reason: "吸引视线至眼部。" },
            { tool: "Burn", location: "背景角落", params: "Shadows, 15%", reason: "暗角效果。" }
        ],
        atmosphere: {
            technique: "纯色叠加 (Screen 模式)",
            opacity: 30,
            blend_mode: "Screen",
            color: "#00aaff",
            reason: "在光源周围添加大气雾霾。"
        },
        sharpening: {
            technique: "High Pass",
            amount: 60,
            radius: 2.5,
            threshold: 0,
            reason: "增强边缘清晰度。"
        },
        grain: {
            amount: 25,
            size: 20,
            roughness: 50,
            reason: "35mm 胶片模拟。"
        }
    }
};
