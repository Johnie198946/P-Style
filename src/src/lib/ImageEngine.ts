// ============================================================================
// 【ImageEngine】WebGL 图像处理引擎
// 用于实时预览 Lightroom 风格的图像调整
// 支持：曝光、对比度、高光、阴影、白色、黑色、色温、色调、饱和度、自然饱和度
//       色彩分级（阴影/中间调/高光色调）、HSL 调整、曲线
// ============================================================================

export interface FilterParams {
  // 基础调整
  exposure: number;      // -5.0 to +5.0
  contrast: number;      // -100 to +100
  highlights: number;    // -100 to +100
  shadows: number;       // -100 to +100
  whites: number;        // -100 to +100
  blacks: number;        // -100 to +100
  temperature: number;   // -100 to +100 (负=冷/蓝，正=暖/橙)
  tint: number;          // -100 to +100 (负=绿，正=洋红)
  saturation: number;    // -100 to +100
  vibrance: number;      // -100 to +100
  
  // 【新增】存在感面板参数
  texture?: number;      // -100 to +100 纹理/细节
  clarity?: number;      // -100 to +100 清晰度（中间调对比度）
  dehaze?: number;       // -100 to +100 去雾（正值去雾，负值加雾）
  
  // 色彩分级（可选）
  shadowsHue?: number;      // 0-360 阴影色相
  shadowsSat?: number;      // 0-100 阴影饱和度
  shadowsLum?: number;      // 【新增】-100 to +100 阴影明度
  midtonesHue?: number;     // 0-360 中间调色相
  midtonesSat?: number;     // 0-100 中间调饱和度
  midtonesLum?: number;     // 【新增】-100 to +100 中间调明度
  highlightsHue?: number;   // 0-360 高光色相
  highlightsSat?: number;   // 0-100 高光饱和度
  highlightsLum?: number;   // 【新增】-100 to +100 高光明度
  gradingBalance?: number;  // -100 to +100 色彩分级平衡（负=偏阴影，正=偏高光）
  gradingBlending?: number; // 【新增】0-100 色彩分级混合程度
  
  // 【新增】相机校准参数（用于模仿胶片感）
  calibration?: {
    redHue?: number;        // -100 to +100 红原色色相偏移
    redSat?: number;        // -100 to +100 红原色饱和度
    greenHue?: number;      // -100 to +100 绿原色色相偏移
    greenSat?: number;      // -100 to +100 绿原色饱和度
    blueHue?: number;       // -100 to +100 蓝原色色相偏移
    blueSat?: number;       // -100 to +100 蓝原色饱和度
    shadowsTint?: number;   // -100 to +100 阴影色调
  };
  
  // HSL 调整（可选）
  hsl?: {
    red?: { h: number; s: number; l: number };
    orange?: { h: number; s: number; l: number };
    yellow?: { h: number; s: number; l: number };
    green?: { h: number; s: number; l: number };
    cyan?: { h: number; s: number; l: number };
    blue?: { h: number; s: number; l: number };
    purple?: { h: number; s: number; l: number };
    magenta?: { h: number; s: number; l: number };
  };
  
  // 曲线（可选）
  curve?: number[][];           // RGB 主曲线
  curveRed?: number[][];        // 红色通道曲线
  curveGreen?: number[][];      // 绿色通道曲线
  curveBlue?: number[][];       // 蓝色通道曲线
  
  // 高级渲染选项
  enableAces?: boolean;         // 开启电影级 ACES 色调映射
  lutOpacity?: number;          // LUT 强度 (0-1)
}

export const DEFAULT_PARAMS: FilterParams = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  enableAces: false, // 默认关闭，由 UI 控制
  lutOpacity: 0,
};

export class ImageEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private curveLUT: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null; // 3D LUT (2D Strip)
  
  private uLocations: { [key: string]: WebGLUniformLocation | null } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    console.log('[ImageEngine] 初始化 WebGL...');
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('[ImageEngine] WebGL 不支持！');
      throw new Error("WebGL not supported");
    }
    this.gl = gl;
    console.log('[ImageEngine] WebGL context 获取成功');
    this.initShaders();
    this.initCurveLUT();
    console.log('[ImageEngine] 初始化完成，program:', !!this.program);
  }

  public loadImage(img: HTMLImageElement) {
    console.log('[ImageEngine] loadImage 调用，图片尺寸:', img.naturalWidth, 'x', img.naturalHeight);
    this.canvas.width = img.naturalWidth;
    this.canvas.height = img.naturalHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
    this.texture = texture;
    console.log('[ImageEngine] 纹理创建成功');
  }

  // 【优化】初始化 RGBA 曲线 LUT 纹理
  // R 通道：RGB 主曲线（应用于所有通道）
  // G 通道：红色通道曲线
  // B 通道：绿色通道曲线
  // A 通道：蓝色通道曲线
  private initCurveLUT() {
    const lut = new Uint8Array(256 * 4); // RGBA, 256 像素
    for (let i = 0; i < 256; i++) {
      lut[i * 4 + 0] = i; // R: RGB 主曲线
      lut[i * 4 + 1] = i; // G: 红色通道
      lut[i * 4 + 2] = i; // B: 绿色通道
      lut[i * 4 + 3] = i; // A: 蓝色通道
    }
    
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 256, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, lut);
    this.curveLUT = texture;
  }

  // 【修复】标准化曲线点格式，支持 {x, y} 对象和 [x, y] 数组两种格式
  private normalizeCurvePoints(points: any[]): Array<{x: number, y: number}> {
    if (!points || points.length === 0) return [];
    
    return points.map((p: any) => {
      if (Array.isArray(p)) {
        return { x: p[0], y: p[1] };
      }
      if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        return { x: p.x, y: p.y };
      }
      return null;
    }).filter((p): p is {x: number, y: number} => p !== null);
  }

  // 【修复】更新曲线 LUT，支持 RGB 主曲线和独立的 R/G/B 通道曲线
  // 分通道曲线会叠加到主曲线上
  private updateCurveLUT(rgbCurve?: any[], rCurve?: any[], gCurve?: any[], bCurve?: any[]) {
    if (!this.curveLUT) return;
    
    const lut = new Uint8Array(256 * 4);
    
    // 标准化所有曲线点
    const normRgb = this.normalizeCurvePoints(rgbCurve || []);
    const normR = this.normalizeCurvePoints(rCurve || []);
    const normG = this.normalizeCurvePoints(gCurve || []);
    const normB = this.normalizeCurvePoints(bCurve || []);
    
    const hasRgb = normRgb.length >= 2;
    const hasR = normR.length >= 2;
    const hasG = normG.length >= 2;
    const hasB = normB.length >= 2;
    
    console.log('[ImageEngine] 曲线数据状态:', { hasRgb, hasR, hasG, hasB });
    
    for (let i = 0; i < 256; i++) {
      // 初始化为线性
      let valR = i;
      let valG = i;
      let valB = i;
      
      // 1. 应用 RGB 主曲线 (影响所有通道)
      if (hasRgb) {
        const sorted = [...normRgb].sort((a, b) => a.x - b.x);
        const val = this.interpolateCurve(sorted, i);
        valR = val;
        valG = val;
        valB = val;
      }
      
      // 2. 应用各通道独立曲线 (叠加在主曲线结果之上吗？通常是独立的查找表)
      // 在 Shader 中，通常先应用 RGB 主曲线，再分别应用通道曲线，或者由 Shader 分别查找
      // 这里我们构建 LUT 的方式是：
      // R通道存放：对 Red 通道的映射值（综合了 RGB 曲线和 R 曲线？）
      // 不，Shader 中很难串联两次 LUT 查找（需要两次采样）。
      // 更好的方式是：LUT 的 R/G/B 通道分别存储该颜色通道的最终映射值。
      // 即：OutputR = CurveR(CurveRGB(InputR))
      
      // 计算复合映射
      if (hasR) {
        // 如果有 RGB 曲线，先映射 RGB，再映射 R
        // 如果没有 RGB 曲线，valR = i
        const sortedR = [...normR].sort((a, b) => a.x - b.x);
        valR = this.interpolateCurve(sortedR, valR);
      }
      
      if (hasG) {
        const sortedG = [...normG].sort((a, b) => a.x - b.x);
        valG = this.interpolateCurve(sortedG, valG);
      }
      
      if (hasB) {
        const sortedB = [...normB].sort((a, b) => a.x - b.x);
        valB = this.interpolateCurve(sortedB, valB);
      }
      
      // 写入 LUT
      lut[i * 4 + 0] = Math.max(0, Math.min(255, Math.round(valR))); // R 通道映射
      lut[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(valG))); // G 通道映射
      lut[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(valB))); // B 通道映射
      lut[i * 4 + 3] = 255; // Alpha
    }
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.curveLUT);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 256, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, lut);
    
    console.log('[ImageEngine] 曲线 LUT 已更新 (RGB+通道复合)');
  }

  // 【修复】使用 {x, y} 对象格式的插值函数
  private interpolateCurve(points: Array<{x: number, y: number}>, x: number): number {
    if (points.length < 2) return x;
    
    let i = 0;
    while (i < points.length - 1 && points[i + 1].x < x) {
      i++;
    }
    
    if (i >= points.length - 1) {
      return points[points.length - 1].y;
    }
    
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const t = (x - p1.x) / (p2.x - p1.x || 1);
    const t2 = t * t;
    const t3 = t2 * t;
    
    // 【修复】使用 .y 属性而不是 [1] 索引
    const v = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    
    return Math.max(0, Math.min(255, v));
  }

  // 【新增】加载 LUT 纹理 (支持 standard 2D strip layouts, e.g. 512x512 for 64^3)
  public loadLUT(url: string) {
    console.log('[ImageEngine] Loading LUT from:', url);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      if (!this.gl) return;
      
      const texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
      
      this.lutTexture = texture;
      console.log('[ImageEngine] LUT texture loaded successfully');
    };
    img.onerror = (e) => {
      console.error('[ImageEngine] Failed to load LUT:', e);
    };
    img.src = url;
  }

  public render(params: FilterParams) {
    if (!this.gl || !this.program || !this.texture) {
      console.warn('[ImageEngine] render 跳过 - gl:', !!this.gl, 'program:', !!this.program, 'texture:', !!this.texture);
      return;
    }
    console.log('[ImageEngine] render 调用，参数:', params);

    // 【修复】更新曲线 LUT（使用复合曲线逻辑）
    // 只要有任何曲线数据，就更新 LUT
    if ((params.curve && params.curve.length >= 2) || 
        (params.curveRed && params.curveRed.length >= 2) ||
        (params.curveGreen && params.curveGreen.length >= 2) ||
        (params.curveBlue && params.curveBlue.length >= 2)) {
      this.updateCurveLUT(params.curve, params.curveRed, params.curveGreen, params.curveBlue);
    } else {
      // 重置为默认曲线
      this.updateCurveLUT(undefined, undefined, undefined, undefined);
    }

    this.gl.useProgram(this.program);

    // Bind image texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.uLocations.u_image, 0);

    // Bind curve LUT texture
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.curveLUT);
    this.gl.uniform1i(this.uLocations.u_curveLUT, 1);

    // Bind optional 3D LUT texture
    if (this.lutTexture && (params.lutOpacity || 0) > 0) {
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.lutTexture);
        this.gl.uniform1i(this.uLocations.u_lutTexture, 2);
    }
    
    // Set advanced render flags
    this.gl.uniform1f(this.uLocations.u_enableAces, params.enableAces ? 1.0 : 0.0);
    this.gl.uniform1f(this.uLocations.u_lutOpacity, params.lutOpacity || 0.0);

    // 基础调整
    this.gl.uniform1f(this.uLocations.u_exposure, params.exposure);
    this.gl.uniform1f(this.uLocations.u_contrast, params.contrast / 100);
    this.gl.uniform1f(this.uLocations.u_highlights, params.highlights / 100);
    this.gl.uniform1f(this.uLocations.u_shadows, params.shadows / 100);
    this.gl.uniform1f(this.uLocations.u_whites, params.whites / 100);
    this.gl.uniform1f(this.uLocations.u_blacks, params.blacks / 100);
    this.gl.uniform1f(this.uLocations.u_temperature, params.temperature / 100);
    this.gl.uniform1f(this.uLocations.u_tint, params.tint / 100);
    this.gl.uniform1f(this.uLocations.u_saturation, params.saturation / 100);
    this.gl.uniform1f(this.uLocations.u_vibrance, params.vibrance / 100);
    
    // 【调试日志】高光/阴影/白色/黑色 参数（Adobe ACR v2 算法）
    console.log('[ImageEngine] 影调控制参数（ACR v2）:', {
      highlights: params.highlights,
      highlightsNorm: (params.highlights / 100).toFixed(3),
      shadows: params.shadows,
      shadowsNorm: (params.shadows / 100).toFixed(3),
      whites: params.whites,
      whitesNorm: (params.whites / 100).toFixed(3),
      blacks: params.blacks,
      blacksNorm: (params.blacks / 100).toFixed(3),
      algorithmNote: '使用 Knee 压缩 + Gamma 曲线 + 饱和度补偿',
    });
    
    // 【新增】存在感参数
    this.gl.uniform1f(this.uLocations.u_texture, (params.texture || 0) / 100);
    this.gl.uniform1f(this.uLocations.u_clarity, (params.clarity || 0) / 100);
    this.gl.uniform1f(this.uLocations.u_dehaze, (params.dehaze || 0) / 100);
    
    console.log('[ImageEngine] 存在感参数:', {
      texture: params.texture || 0,
      clarity: params.clarity || 0,
      dehaze: params.dehaze || 0,
    });

    // 色彩分级
    const shadowsGrade = [(params.shadowsHue || 0) / 360, (params.shadowsSat || 0) / 100];
    const midtonesGrade = [(params.midtonesHue || 0) / 360, (params.midtonesSat || 0) / 100];
    const highlightsGrade = [(params.highlightsHue || 0) / 360, (params.highlightsSat || 0) / 100];
    
    console.log('[ImageEngine] 色彩分级 uniforms:', {
      shadowsGrade,
      midtonesGrade,
      highlightsGrade,
    });
    
    this.gl.uniform2f(this.uLocations.u_shadowsGrade, shadowsGrade[0], shadowsGrade[1]);
    this.gl.uniform2f(this.uLocations.u_midtonesGrade, midtonesGrade[0], midtonesGrade[1]);
    this.gl.uniform2f(this.uLocations.u_highlightsGrade, highlightsGrade[0], highlightsGrade[1]);
    
    // 色彩分级平衡：-100~+100 → -1~+1
    const gradingBalance = (params.gradingBalance || 0) / 100;
    this.gl.uniform1f(this.uLocations.u_gradingBalance, gradingBalance);
    
    // 【新增】色彩分级混合：0~100 → 0~1
    const gradingBlending = (params.gradingBlending || 50) / 100;
    this.gl.uniform1f(this.uLocations.u_gradingBlending, gradingBlending);
    
    // 【新增】色彩分级明度
    this.gl.uniform1f(this.uLocations.u_shadowsLum, (params.shadowsLum || 0) / 100);
    this.gl.uniform1f(this.uLocations.u_midtonesLum, (params.midtonesLum || 0) / 100);
    this.gl.uniform1f(this.uLocations.u_highlightsLum, (params.highlightsLum || 0) / 100);
    
    console.log('[ImageEngine] 色彩分级明度:', {
      shadowsLum: params.shadowsLum || 0,
      midtonesLum: params.midtonesLum || 0,
      highlightsLum: params.highlightsLum || 0,
    });
    
    // 【新增】相机校准
    const calib = params.calibration || {};
    this.gl.uniform3f(this.uLocations.u_calibRed, calib.redHue || 0, calib.redSat || 0, 0);
    this.gl.uniform3f(this.uLocations.u_calibGreen, calib.greenHue || 0, calib.greenSat || 0, 0);
    this.gl.uniform3f(this.uLocations.u_calibBlue, calib.blueHue || 0, calib.blueSat || 0, 0);
    this.gl.uniform1f(this.uLocations.u_calibShadowsTint, calib.shadowsTint || 0);
    
    console.log('[ImageEngine] 相机校准:', {
      red: { hue: calib.redHue || 0, sat: calib.redSat || 0 },
      green: { hue: calib.greenHue || 0, sat: calib.greenSat || 0 },
      blue: { hue: calib.blueHue || 0, sat: calib.blueSat || 0 },
      shadowsTint: calib.shadowsTint || 0,
    });
    
    // 【调试】显示 balance 的计算效果
    const midpoint = Math.max(0.05, Math.min(0.95, 0.5 - gradingBalance * 0.45));
    console.log('[ImageEngine] 色彩分级平衡:', {
      inputBalance: params.gradingBalance,
      normalizedBalance: gradingBalance.toFixed(2),
      midpoint: midpoint.toFixed(2),
      shadowRange: `0% - ${(midpoint * 100).toFixed(0)}%`,
      highlightRange: `${(midpoint * 100).toFixed(0)}% - 100%`,
      effect: gradingBalance > 0 ? '高光色调影响更多' : gradingBalance < 0 ? '阴影色调影响更多' : '均衡',
    });

    // 是否启用曲线（检查任何曲线）
    const useCurve = (params.curve && params.curve.length >= 2) ||
                     (params.curveRed && params.curveRed.length >= 2) ||
                     (params.curveGreen && params.curveGreen.length >= 2) ||
                     (params.curveBlue && params.curveBlue.length >= 2);
    this.gl.uniform1f(this.uLocations.u_useCurve, useCurve ? 1.0 : 0.0);
    console.log('[ImageEngine] useCurve:', useCurve);

    // 【新增】HSL 调整 - 传递 8 个颜色通道的调整值
    // 每个通道: [hue_shift, sat_mult, lum_mult]
    console.log('[ImageEngine] params.hsl 原始数据:', params.hsl);
    
    const hslRed = params.hsl?.red || { h: 0, s: 0, l: 0 };
    const hslOrange = params.hsl?.orange || { h: 0, s: 0, l: 0 };
    const hslYellow = params.hsl?.yellow || { h: 0, s: 0, l: 0 };
    const hslGreen = params.hsl?.green || { h: 0, s: 0, l: 0 };
    const hslCyan = params.hsl?.cyan || { h: 0, s: 0, l: 0 };
    const hslBlue = params.hsl?.blue || { h: 0, s: 0, l: 0 };
    const hslPurple = params.hsl?.purple || { h: 0, s: 0, l: 0 };
    const hslMagenta = params.hsl?.magenta || { h: 0, s: 0, l: 0 };
    
    console.log('[ImageEngine] HSL 各通道:', { hslRed, hslYellow, hslGreen, hslBlue });
    
    // 检查是否有任何 HSL 调整（只要有任何非零值就启用）
    const hasHslAdjust = !!(params.hsl && (
      (hslRed.h !== 0 || hslRed.s !== 0 || hslRed.l !== 0) ||
      (hslOrange.h !== 0 || hslOrange.s !== 0 || hslOrange.l !== 0) ||
      (hslYellow.h !== 0 || hslYellow.s !== 0 || hslYellow.l !== 0) ||
      (hslGreen.h !== 0 || hslGreen.s !== 0 || hslGreen.l !== 0) ||
      (hslCyan.h !== 0 || hslCyan.s !== 0 || hslCyan.l !== 0) ||
      (hslBlue.h !== 0 || hslBlue.s !== 0 || hslBlue.l !== 0) ||
      (hslPurple.h !== 0 || hslPurple.s !== 0 || hslPurple.l !== 0) ||
      (hslMagenta.h !== 0 || hslMagenta.s !== 0 || hslMagenta.l !== 0)
    ));
    
    console.log('[ImageEngine] hasHslAdjust:', hasHslAdjust);
    
    this.gl.uniform1f(this.uLocations.u_useHsl, hasHslAdjust ? 1.0 : 0.0);
    
    // 传递每个颜色通道的 HSL 调整值
    // 【重要】h, s, l 都是调整量（-100 到 +100），需要转换为 shader 期望的范围
    // h: 色相偏移，-100~+100 对应 -0.28~+0.28（约 ±100°/360°）
    // s: 饱和度调整，-100~+100 对应 -1~+1
    // l: 明度调整，-100~+100 对应 -1~+1
    this.gl.uniform3f(this.uLocations.u_hslRed, hslRed.h / 360, hslRed.s / 100, hslRed.l / 100);
    this.gl.uniform3f(this.uLocations.u_hslOrange, hslOrange.h / 360, hslOrange.s / 100, hslOrange.l / 100);
    this.gl.uniform3f(this.uLocations.u_hslYellow, hslYellow.h / 360, hslYellow.s / 100, hslYellow.l / 100);
    this.gl.uniform3f(this.uLocations.u_hslGreen, hslGreen.h / 360, hslGreen.s / 100, hslGreen.l / 100);
    this.gl.uniform3f(this.uLocations.u_hslCyan, hslCyan.h / 360, hslCyan.s / 100, hslCyan.l / 100);
    this.gl.uniform3f(this.uLocations.u_hslBlue, hslBlue.h / 360, hslBlue.s / 100, hslBlue.l / 100);
    this.gl.uniform3f(this.uLocations.u_hslPurple, hslPurple.h / 360, hslPurple.s / 100, hslPurple.l / 100);
    this.gl.uniform3f(this.uLocations.u_hslMagenta, hslMagenta.h / 360, hslMagenta.s / 100, hslMagenta.l / 100);
    
    console.log('[ImageEngine] HSL uniforms 值:', {
      red: [hslRed.h / 360, hslRed.s / 100, hslRed.l / 100],
      yellow: [hslYellow.h / 360, hslYellow.s / 100, hslYellow.l / 100],
      green: [hslGreen.h / 360, hslGreen.s / 100, hslGreen.l / 100],
    });

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  private initShaders() {
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    // 【简化的片段着色器】兼容 WebGL 1.0
    const fsSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform sampler2D u_curveLUT;
      uniform sampler2D u_lutTexture; // 【新增】LUT 纹理

      // 基础参数
      uniform float u_exposure;
      uniform float u_contrast;
      uniform float u_highlights;
      uniform float u_shadows;
      uniform float u_whites;
      uniform float u_blacks;
      uniform float u_temperature;
      uniform float u_tint;
      uniform float u_saturation;
      uniform float u_vibrance;
      
      // 【新增】存在感参数
      uniform float u_texture;
      uniform float u_clarity;
      uniform float u_dehaze;

      // 色彩分级
      uniform vec2 u_shadowsGrade;
      uniform vec2 u_midtonesGrade;
      uniform vec2 u_highlightsGrade;
      uniform float u_gradingBalance;
      uniform float u_gradingBlending;
      // 【新增】色彩分级明度
      uniform float u_shadowsLum;
      uniform float u_midtonesLum;
      uniform float u_highlightsLum;
      
      // 【新增】相机校准
      uniform vec3 u_calibRed;    // [hue, sat, 0]
      uniform vec3 u_calibGreen;  // [hue, sat, 0]
      uniform vec3 u_calibBlue;   // [hue, sat, 0]
      uniform float u_calibShadowsTint;

      // 曲线
      uniform float u_useCurve;
      
      // HSL 调整
      uniform float u_useHsl;
      uniform vec3 u_hslRed;
      uniform vec3 u_hslOrange;
      uniform vec3 u_hslYellow;
      uniform vec3 u_hslGreen;
      uniform vec3 u_hslCyan;
      uniform vec3 u_hslBlue;
      uniform vec3 u_hslPurple;
      uniform vec3 u_hslMagenta;

      // 【新增】高级渲染选项
      uniform float u_enableAces;
      uniform float u_lutOpacity;

      // 计算亮度
      float luminance(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }

      // HSL 转 RGB 辅助函数
      float hue2rgb(float p, float q, float t) {
        if (t < 0.0) t += 1.0;
        if (t > 1.0) t -= 1.0;
        if (t < 0.16667) return p + (q - p) * 6.0 * t;
        if (t < 0.5) return q;
        if (t < 0.66667) return p + (q - p) * (0.66667 - t) * 6.0;
        return p;
      }

      // 计算颜色权重的平滑函数 (余弦窗口)
      float getHslWeight(float centerHue, float currentHue, float width) {
        float diff = abs(currentHue - centerHue);
        if (diff > 180.0) diff = 360.0 - diff;
        if (diff > width) return 0.0;
        return 0.5 * (1.0 + cos(3.1415926 * diff / width));
      }

      // HSL 转 RGB
      vec3 hsl2rgb(float h, float s, float l) {
        if (s < 0.001) {
          return vec3(l);
        }
        float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
        float p = 2.0 * l - q;
        return vec3(
          hue2rgb(p, q, h + 0.33333),
          hue2rgb(p, q, h),
          hue2rgb(p, q, h - 0.33333)
        );
      }

      // 【新增】ACES 电影级色调映射 (Narkowicz fit)
      vec3 aces_tonemap(vec3 x) {
        const float a = 2.51;
        const float b = 0.03;
        const float c = 2.43;
        const float d = 0.59;
        const float e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      // 【新增】LUT 采样函数 (Standard 8x8 grid for 64^3 LUT, 512x512 texture)
      vec3 sampleLUT(sampler2D lut, vec3 color) {
        float blueColor = color.b * 63.0;
        
        vec2 quad1;
        quad1.y = floor(floor(blueColor) / 8.0);
        quad1.x = floor(blueColor) - (quad1.y * 8.0);

        vec2 quad2;
        quad2.y = floor(ceil(blueColor) / 8.0);
        quad2.x = ceil(blueColor) - (quad2.y * 8.0);

        // 纹理坐标计算 (假设 512x512 纹理)
        // 每个块 64x64
        float size = 512.0;
        float blockSize = 64.0;
        
        vec2 texPos1;
        texPos1.x = (quad1.x * blockSize + 0.5 + color.r * 63.0) / size;
        texPos1.y = (quad1.y * blockSize + 0.5 + color.g * 63.0) / size;

        vec2 texPos2;
        texPos2.x = (quad2.x * blockSize + 0.5 + color.r * 63.0) / size;
        texPos2.y = (quad2.y * blockSize + 0.5 + color.g * 63.0) / size;

        vec3 newColor1 = texture2D(lut, texPos1).rgb;
        vec3 newColor2 = texture2D(lut, texPos2).rgb;

        return mix(newColor1, newColor2, fract(blueColor));
      }

      void main() {
        vec4 texColor = texture2D(u_image, v_texCoord);
        vec3 rgb = texColor.rgb;

        // ========== 1. 白平衡 ==========
        float tempStrength = u_temperature * 0.2; 
        if (u_temperature > 0.0) {
            rgb.r *= (1.0 + tempStrength);
            rgb.g *= (1.0 + tempStrength * 0.4);
            rgb.b *= (1.0 - tempStrength);
        } else {
            rgb.r *= (1.0 + tempStrength);
            rgb.g *= (1.0 - tempStrength * 0.2);
            rgb.b *= (1.0 - tempStrength);
        }
        
        float tintStrength = u_tint * 0.15;
        rgb.g *= (1.0 - tintStrength);
        rgb.r *= (1.0 + tintStrength * 0.5);
        rgb.b *= (1.0 + tintStrength * 0.5);

        // ========== 2. 曝光 ==========
        rgb *= pow(2.0, u_exposure);

        // ========== 3. 对比度 ==========
        rgb = (rgb - 0.5) * (1.0 + u_contrast) + 0.5;

        // ========== 4. 高光/阴影/白色/黑色 ==========
        // 【重构 v2】深度参考 Adobe Lightroom ACR (Adobe Camera Raw) 算法
        // 
        // Adobe ACR 核心技术要点：
        // 1. 高光恢复 (Highlight Recovery)：
        //    - 利用未过曝通道重建过曝通道（通道间插值）
        //    - 使用 "膝点压缩" (Knee Compression) 平滑过渡
        //    - 保持色彩比例，恢复真实细节
        // 2. 阴影恢复 (Fill Light)：
        //    - 使用 Gamma 幂函数提亮（非线性）
        //    - 保持局部对比度，防止整体变灰
        //    - 饱和度自适应补偿
        
        float lum = luminance(rgb);
        
        // ===============================================
        // 高光恢复 (Highlights Recovery) - Adobe ACR 风格
        // ===============================================
        // 
        // Adobe 的高光算法不是简单的乘法压缩，而是：
        // 1. 识别过曝区域（RGB 中有通道接近或超过 1.0）
        // 2. 利用未过曝通道的信息"重建"过曝通道
        // 3. 使用膝点曲线平滑过渡，避免色调断裂
        // 4. 增强局部对比度以恢复细节纹理
        
        if (abs(u_highlights) > 0.001) {
          float highlightAmt = u_highlights;
          
          // 计算每个通道相对于 "安全阈值" 的过曝程度
          // Adobe 的安全阈值约为 0.8（RAW 处理中约为 80% 的曝光）
          float safeThreshold = 0.75;
          
          // 计算通道过曝程度（0 = 未过曝，1 = 完全过曝）
          vec3 overexposure = clamp((rgb - safeThreshold) / (1.0 - safeThreshold), 0.0, 1.0);
          float maxOverexposure = max(max(overexposure.r, overexposure.g), overexposure.b);
          
          // 高光遮罩：基于亮度 + 过曝程度的复合遮罩
          // 这样既影响高亮区域，又对过曝区域有特殊处理
          float highlightMask = smoothstep(0.4, 0.85, lum);
          highlightMask = max(highlightMask, maxOverexposure * 0.8);
          
          if (highlightAmt < 0.0) {
            // 【降低高光】- 恢复高光细节
            float recoveryStrength = -highlightAmt; // 0 到 1
            
            // === 方法 1：通道间重建 (Channel Reconstruction) ===
            // Adobe 的核心技术：利用未过曝通道重建过曝通道
            float minChannel = min(min(rgb.r, rgb.g), rgb.b);
            float maxChannel = max(max(rgb.r, rgb.g), rgb.b);
            
            // 只有当存在明显的通道差异时才进行重建
            if (maxChannel > safeThreshold && maxChannel > minChannel * 1.1) {
              // 计算"基准亮度"：使用最小通道作为细节参考
              // （最小通道通常保留了更多细节信息）
              float baseDetail = minChannel / max(maxChannel, 0.001);
              
              // 计算重建目标：将过曝通道"拉回"到安全范围
              // 使用 knee 曲线：在阈值以下线性，以上压缩
              vec3 target = rgb;
              float kneeFactor = recoveryStrength * 1.5;
              
              // 对每个通道单独应用 knee 压缩
              // Knee 公式：output = threshold + (input - threshold) / (1 + k * (input - threshold))
              if (rgb.r > safeThreshold) {
                float excess = rgb.r - safeThreshold;
                target.r = safeThreshold + excess / (1.0 + kneeFactor * excess);
              }
              if (rgb.g > safeThreshold) {
                float excess = rgb.g - safeThreshold;
                target.g = safeThreshold + excess / (1.0 + kneeFactor * excess);
              }
              if (rgb.b > safeThreshold) {
                float excess = rgb.b - safeThreshold;
                target.b = safeThreshold + excess / (1.0 + kneeFactor * excess);
              }
              
              // === 方法 2：细节恢复 (Detail Recovery) ===
              // 通过增强局部对比度来恢复高光细节
              // 这模拟了 Adobe 的 "恢复" 功能
              float detailBoost = recoveryStrength * highlightMask * 0.3;
              vec3 midGray = vec3(0.5);
              target = midGray + (target - midGray) * (1.0 + detailBoost);
              
              // === 饱和度补偿 ===
              // 压缩高光会降低色彩饱和度，需要补偿
              // Adobe 的处理方式：保持原始饱和度比例
              float origSat = maxChannel - minChannel;
              float newMax = max(max(target.r, target.g), target.b);
              float newMin = min(min(target.r, target.g), target.b);
              float newSat = newMax - newMin;
              
              if (newSat > 0.001 && origSat > newSat) {
                // 补偿丢失的饱和度
                float satRatio = origSat / max(newSat, 0.001);
                satRatio = min(satRatio, 1.0 + recoveryStrength * 0.3); // 限制补偿量
                float targetLum = luminance(target);
                target = vec3(targetLum) + (target - vec3(targetLum)) * satRatio;
              }
              
              // 应用高光恢复
              rgb = mix(rgb, target, highlightMask * recoveryStrength);
            } else {
              // 如果没有明显过曝，使用简化的压缩
              float simpleCompress = 1.0 - recoveryStrength * highlightMask * 0.35;
              vec3 compressed = mix(vec3(lum), rgb, simpleCompress);
              compressed = vec3(lum) + (compressed - vec3(lum)); // 保持亮度
              rgb = mix(rgb, compressed, highlightMask * recoveryStrength * 0.7);
            }
          } else {
            // 【增加高光】- 提亮高光区域
            float boostStrength = highlightAmt;
            
            // 使用 S 曲线提亮高光，保持自然过渡
            float boost = 1.0 + boostStrength * highlightMask * 0.6;
            vec3 boosted = rgb * boost;
            
            // 软限制：使用渐近曲线防止过曝
            // 公式：x / (1 + max(0, x - 1) * k)
            vec3 excess = max(boosted - 1.0, vec3(0.0));
            boosted = boosted / (1.0 + excess * 0.7);
            
            rgb = mix(rgb, boosted, highlightMask);
          }
        }
        
        // 重新计算亮度（高光处理后）
        lum = luminance(rgb);
        
        // ===============================================
        // 阴影恢复 (Shadows / Fill Light) - Adobe ACR 风格
        // ===============================================
        //
        // Adobe 的阴影提亮算法核心：
        // 1. 使用 Gamma 曲线（幂函数）而非线性加法
        // 2. 保持局部对比度，防止"洗灰"
        // 3. 保护纯黑和高光区域
        // 4. 自适应饱和度补偿
        
        if (abs(u_shadows) > 0.001) {
          float shadowAmt = u_shadows;
          
          // 阴影遮罩：使用更精确的亮度范围
          // Adobe 的阴影影响范围约 0% - 50% 亮度
          float shadowMask = 1.0 - smoothstep(0.0, 0.55, lum);
          
          // 添加 "脚趾" 保护：保护最暗的 5% 区域
          // 这防止纯黑被过度提亮（保持画面的"锚点"）
          float toeProtect = smoothstep(0.0, 0.08, lum);
          
          if (shadowAmt > 0.0) {
            // 【提亮阴影】- Fill Light 算法
            float liftStrength = shadowAmt;
            
            // === 方法 1：Gamma 曲线提亮 ===
            // Adobe 的核心技术：使用幂函数而非加法
            // 公式：output = input^(1/gamma)，gamma > 1 时提亮暗部
            // 
            // 这种方法的优点：
            // - 暗部提亮幅度大
            // - 中间调影响小
            // - 保持相对对比度
            float gamma = 1.0 + liftStrength * shadowMask * toeProtect * 0.8;
            vec3 gammaCorrected = pow(max(rgb, vec3(0.001)), vec3(1.0 / gamma));
            
            // === 方法 2：对比度保持 ===
            // 简单的 gamma 提亮会降低局部对比度
            // Adobe 通过增强局部对比度来补偿
            float contrastBoost = liftStrength * shadowMask * 0.15;
            float localMid = lum;
            gammaCorrected = localMid + (gammaCorrected - localMid) * (1.0 + contrastBoost);
            
            // === 方法 3：饱和度自适应补偿 ===
            // 提亮暗部会显著降低饱和度，Adobe 会智能补偿
            // 补偿量与提亮程度成正比
            float origSat = max(max(rgb.r, rgb.g), rgb.b) - min(min(rgb.r, rgb.g), rgb.b);
            float newLum = luminance(gammaCorrected);
            float satCompensation = liftStrength * shadowMask * toeProtect * 0.25;
            
            // 只对有饱和度的像素进行补偿
            if (origSat > 0.01) {
              gammaCorrected = vec3(newLum) + (gammaCorrected - vec3(newLum)) * (1.0 + satCompensation);
            }
            
            // 应用阴影提亮
            rgb = mix(rgb, gammaCorrected, shadowMask * toeProtect);
          } else {
            // 【降低阴影】- 让暗部更暗（crush blacks）
            float crushStrength = -shadowAmt;
            
            // 使用 gamma 曲线压暗：gamma > 1
            float gamma = 1.0 + crushStrength * shadowMask * 0.6;
            vec3 crushed = pow(max(rgb, vec3(0.001)), vec3(gamma));
            
            // 应用阴影压暗
            rgb = mix(rgb, crushed, shadowMask);
          }
        }
        
        // 重新计算亮度（阴影处理后）
        lum = luminance(rgb);
        
        // ===============================================
        // 白色/黑色 (Whites/Blacks) - 直方图端点控制
        // ===============================================
        // 
        // 这两个参数控制直方图的端点，影响范围更窄
        // 白色：约 85%-100% 亮度
        // 黑色：约 0%-15% 亮度
        
        // 白色：只影响最亮的区域
        float whiteMask = smoothstep(0.75, 1.0, lum);
        if (abs(u_whites) > 0.001) {
          if (u_whites > 0.0) {
            // 提亮白色：扩展高光范围
            float whiteBoost = u_whites * 0.3 * whiteMask;
            vec3 boosted = rgb * (1.0 + whiteBoost);
            // 软限制：使用渐近曲线防止过曝
            boosted = 1.0 - exp(-boosted * 1.2);
            rgb = mix(rgb, boosted, whiteMask * 0.85);
          } else {
            // 降低白色：压缩高光峰值
            float whiteCompress = 1.0 + u_whites * 0.35 * whiteMask;
            vec3 compressed = rgb * whiteCompress;
            rgb = mix(rgb, compressed, whiteMask);
          }
        }
        
        // 重新计算亮度
        lum = luminance(rgb);
        
        // 黑色：只影响最暗的区域
        float blackMask = 1.0 - smoothstep(0.0, 0.18, lum);
        if (abs(u_blacks) > 0.001) {
          if (u_blacks < 0.0) {
            // 【压暗黑色】：让黑色更深（锚定黑点）
            // Adobe 的黑色控制主要用于设置"黑点"，防止画面发灰
            float crushStrength = -u_blacks;
            
            // 使用 gamma 曲线压暗最暗区域
            float blackGamma = 1.0 + crushStrength * blackMask * 0.5;
            vec3 crushed = pow(max(rgb, vec3(0.001)), vec3(blackGamma));
            
            // 混合应用
            rgb = mix(rgb, crushed, blackMask);
          } else {
            // 【提亮黑色】：提升暗部（类似"褪色/胶片"效果）
            // 这是 Adobe 的 "Blacks" 正值功能，用于创建"褪色"外观
            float liftStrength = u_blacks;
            
            // 使用加法提亮最暗区域（创建"雾感"/"褪色感"）
            // 与阴影不同，黑色的提亮更直接，不需要保持对比度
            float blackLift = liftStrength * blackMask * 0.12;
            vec3 lifted = rgb + vec3(blackLift);
            
            // 限制最大提亮量，避免最暗区域完全消失
            lifted = min(lifted, rgb + vec3(0.15));
            
            rgb = mix(rgb, lifted, blackMask);
          }
        }

        // ========== 5. 曲线 ==========
        if (u_useCurve > 0.5) {
          float lutR = texture2D(u_curveLUT, vec2(clamp(rgb.r, 0.0, 1.0), 0.5)).r;
          float lutG = texture2D(u_curveLUT, vec2(clamp(rgb.g, 0.0, 1.0), 0.5)).g;
          float lutB = texture2D(u_curveLUT, vec2(clamp(rgb.b, 0.0, 1.0), 0.5)).b;
          rgb.r = lutR;
          rgb.g = lutG;
          rgb.b = lutB;
        }

        // ========== 6. HSL 调整 ==========
        if (u_useHsl > 0.5) {
          float maxC = max(rgb.r, max(rgb.g, rgb.b));
          float minC = min(rgb.r, min(rgb.g, rgb.b));
          float hue = 0.0;
          float sat = 0.0;
          float lumHsl = (maxC + minC) * 0.5;
          
          if (maxC > minC) {
            float d = maxC - minC;
            sat = lumHsl > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
            if (maxC == rgb.r) hue = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);
            else if (maxC == rgb.g) hue = (rgb.b - rgb.r) / d + 2.0;
            else hue = (rgb.r - rgb.g) / d + 4.0;
            hue /= 6.0;
          }
          
          float hue360 = hue * 360.0;
          float wRed = getHslWeight(0.0, hue360, 40.0) + getHslWeight(360.0, hue360, 40.0);
          float wOrange = getHslWeight(30.0, hue360, 30.0);
          float wYellow = getHslWeight(60.0, hue360, 40.0);
          float wGreen = getHslWeight(120.0, hue360, 60.0);
          float wCyan = getHslWeight(180.0, hue360, 40.0);
          float wBlue = getHslWeight(240.0, hue360, 40.0);
          float wPurple = getHslWeight(270.0, hue360, 40.0);
          float wMagenta = getHslWeight(300.0, hue360, 40.0);
          
          float hueShift = wRed * u_hslRed.x + wOrange * u_hslOrange.x + wYellow * u_hslYellow.x + wGreen * u_hslGreen.x + wCyan * u_hslCyan.x + wBlue * u_hslBlue.x + wPurple * u_hslPurple.x + wMagenta * u_hslMagenta.x;
          float satMult = 1.0 + wRed * u_hslRed.y + wOrange * u_hslOrange.y + wYellow * u_hslYellow.y + wGreen * u_hslGreen.y + wCyan * u_hslCyan.y + wBlue * u_hslBlue.y + wPurple * u_hslPurple.y + wMagenta * u_hslMagenta.y;
          float lumMult = 1.0 + wRed * u_hslRed.z + wOrange * u_hslOrange.z + wYellow * u_hslYellow.z + wGreen * u_hslGreen.z + wCyan * u_hslCyan.z + wBlue * u_hslBlue.z + wPurple * u_hslPurple.z + wMagenta * u_hslMagenta.z;
          
          hue = fract(hue + hueShift * 0.5);
          sat = clamp(sat + (satMult - 1.0) * sat * 0.5, 0.0, 1.0);
          lumHsl = clamp(lumHsl + (lumMult - 1.0) * 0.3, 0.0, 1.0);
          rgb = hsl2rgb(hue, sat, lumHsl);
        }

        // ========== 7. 色彩分级 ==========
        float lumForGrade = luminance(rgb);
        float balanceMidpoint = clamp(0.5 - u_gradingBalance * 0.45, 0.05, 0.95);
        
        if (u_shadowsGrade.y > 0.001) {
          float shadowWeight = 1.0 - smoothstep(0.0, balanceMidpoint, lumForGrade);
          vec3 shadowColor = hsl2rgb(u_shadowsGrade.x, 1.0, 0.5);
          float intensity = shadowWeight * u_shadowsGrade.y * 0.15;
          rgb = mix(rgb, rgb * (1.0 + (shadowColor - 0.5) * 2.0), intensity);
        }
        
        if (u_midtonesGrade.y > 0.001) {
          float midWeight = max(0.0, (1.0 - abs(lumForGrade - 0.5) * 2.5));
          midWeight *= midWeight;
          vec3 midColor = hsl2rgb(u_midtonesGrade.x, 1.0, 0.5);
          float intensity = midWeight * u_midtonesGrade.y * 0.12;
          rgb = mix(rgb, rgb * (1.0 + (midColor - 0.5) * 2.0), intensity);
        }
        
        if (u_highlightsGrade.y > 0.001) {
          float highlightWeight = smoothstep(balanceMidpoint, 1.0, lumForGrade);
          vec3 highlightColor = hsl2rgb(u_highlightsGrade.x, 1.0, 0.5);
          float intensity = highlightWeight * u_highlightsGrade.y * 0.15;
          rgb = mix(rgb, rgb * (1.0 + (highlightColor - 0.5) * 2.0), intensity);
        }

        // ========== 7.5 色彩分级明度调整 ==========
        // 阴影明度
        if (abs(u_shadowsLum) > 0.001) {
          float shadowLumWeight = 1.0 - smoothstep(0.0, balanceMidpoint, lumForGrade);
          rgb += vec3(shadowLumWeight * u_shadowsLum * 0.2);
        }
        // 中间调明度
        if (abs(u_midtonesLum) > 0.001) {
          float midLumWeight = max(0.0, (1.0 - abs(lumForGrade - 0.5) * 2.5));
          midLumWeight *= midLumWeight;
          rgb += vec3(midLumWeight * u_midtonesLum * 0.15);
        }
        // 高光明度
        if (abs(u_highlightsLum) > 0.001) {
          float highLumWeight = smoothstep(balanceMidpoint, 1.0, lumForGrade);
          rgb += vec3(highLumWeight * u_highlightsLum * 0.2);
        }
        
        // ========== 8. 存在感参数（Texture/Clarity/Dehaze）==========
        // Clarity（清晰度）：增强中间调对比度
        if (abs(u_clarity) > 0.001) {
          float clarityLum = luminance(rgb);
          // 中间调权重
          float clarityWeight = max(0.0, (1.0 - abs(clarityLum - 0.5) * 2.0));
          clarityWeight *= clarityWeight;
          // 应用局部对比度
          float clarityContrast = u_clarity * 0.008 * clarityWeight;
          rgb = (rgb - 0.5) * (1.0 + clarityContrast) + 0.5;
        }
        
        // Dehaze（去雾）：增加对比度和饱和度
        if (abs(u_dehaze) > 0.001) {
          // 去雾效果：增加对比度 + 增加暗部对比 + 轻微增加饱和度
          float dehazeStrength = u_dehaze * 0.01;
          // 对比度增强
          rgb = (rgb - 0.5) * (1.0 + dehazeStrength * 0.5) + 0.5;
          // 暗部加深
          float dehazeLum = luminance(rgb);
          float dehazeShadowMask = 1.0 - smoothstep(0.0, 0.4, dehazeLum);
          rgb -= vec3(dehazeShadowMask * dehazeStrength * 0.3);
          // 饱和度微调
          float dehazeFinalLum = luminance(rgb);
          rgb = mix(vec3(dehazeFinalLum), rgb, 1.0 + dehazeStrength * 0.3);
        }

        // ========== 9. 饱和度/自然饱和度 ==========
        float finalLum = luminance(rgb);
        rgb = mix(vec3(finalLum), rgb, 1.0 + u_saturation);
        float currentSat = max(rgb.r, max(rgb.g, rgb.b)) - min(rgb.r, min(rgb.g, rgb.b));
        float vibranceAmount = u_vibrance * (1.0 - currentSat);
        rgb = mix(vec3(finalLum), rgb, 1.0 + vibranceAmount);
        
        // ========== 9.5 相机校准（简化实现）==========
        // 注：完整的相机校准需要更复杂的色彩空间转换，这里使用简化的色相偏移方法
        if (abs(u_calibRed.x) > 0.001 || abs(u_calibRed.y) > 0.001 ||
            abs(u_calibGreen.x) > 0.001 || abs(u_calibGreen.y) > 0.001 ||
            abs(u_calibBlue.x) > 0.001 || abs(u_calibBlue.y) > 0.001) {
          // 转换到 HSL 进行校准调整
          float calibMaxC = max(rgb.r, max(rgb.g, rgb.b));
          float calibMinC = min(rgb.r, min(rgb.g, rgb.b));
          float calibHue = 0.0;
          float calibSat = 0.0;
          float calibLum = (calibMaxC + calibMinC) * 0.5;
          
          if (calibMaxC > calibMinC) {
            float d = calibMaxC - calibMinC;
            calibSat = calibLum > 0.5 ? d / (2.0 - calibMaxC - calibMinC) : d / (calibMaxC + calibMinC);
            if (calibMaxC == rgb.r) calibHue = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);
            else if (calibMaxC == rgb.g) calibHue = (rgb.b - rgb.r) / d + 2.0;
            else calibHue = (rgb.r - rgb.g) / d + 4.0;
            calibHue /= 6.0;
          }
          
          float calibHue360 = calibHue * 360.0;
          // 红色区域权重
          float calibWRed = getHslWeight(0.0, calibHue360, 60.0) + getHslWeight(360.0, calibHue360, 60.0);
          // 绿色区域权重
          float calibWGreen = getHslWeight(120.0, calibHue360, 60.0);
          // 蓝色区域权重
          float calibWBlue = getHslWeight(240.0, calibHue360, 60.0);
          
          // 应用校准色相偏移
          float calibHueShift = calibWRed * u_calibRed.x * 0.003 + 
                               calibWGreen * u_calibGreen.x * 0.003 + 
                               calibWBlue * u_calibBlue.x * 0.003;
          calibHue = fract(calibHue + calibHueShift);
          
          // 应用校准饱和度调整
          float calibSatMult = 1.0 + calibWRed * u_calibRed.y * 0.01 + 
                              calibWGreen * u_calibGreen.y * 0.01 + 
                              calibWBlue * u_calibBlue.y * 0.01;
          calibSat = clamp(calibSat * calibSatMult, 0.0, 1.0);
          
          rgb = hsl2rgb(calibHue, calibSat, calibLum);
        }
        
        // 阴影色调（用于阴影区域的绿/洋红偏移）
        if (abs(u_calibShadowsTint) > 0.001) {
          float calibShadowLum = luminance(rgb);
          float calibShadowWeight = 1.0 - smoothstep(0.0, 0.4, calibShadowLum);
          float tintShift = u_calibShadowsTint * 0.002;
          rgb.g -= calibShadowWeight * tintShift;
          rgb.r += calibShadowWeight * tintShift * 0.5;
          rgb.b += calibShadowWeight * tintShift * 0.5;
        }

        // ========== 10. LUT 应用 ==========
        // 在 ACES 之前还是之后？通常 LUT 用于风格化，ACES 用于色调映射。
        // 如果 LUT 是 Log 到 Rec709，则在最前面。如果 LUT 是风格化，通常在中间。
        // 这里假设 LUT 是风格化 LUT (sRGB -> sRGB)，放在最后但在 ACES 之前 (如果 ACES 是作为 output transform)
        // 或者 LUT 已经包含了 Tone Mapping。
        // 我们把它放在这里：
        if (u_lutOpacity > 0.0) {
            vec3 lutColor = sampleLUT(u_lutTexture, clamp(rgb, 0.0, 1.0));
            rgb = mix(rgb, lutColor, u_lutOpacity);
        }

        // ========== 10. ACES 色调映射 ==========
        if (u_enableAces > 0.5) {
            rgb = aces_tonemap(rgb);
            // ACES 输出通常需要 gamma 矫正吗？ACES Narkowicz 近似输出是线性的吗？
            // Narkowicz 近似通常输出 linear-ish，但为了显示在屏幕上，可能需要 gamma 矫正。
            // 但如果之前的管线是 sRGB，应用 ACES 后可能变得太暗。
            // 这里我们假设 ACES 只是作为一种"Soft Clip"的高光处理手段。
        }

        // 输出
        rgb = clamp(rgb, 0.0, 1.0);
        gl_FragColor = vec4(rgb, texColor.a);
      }
    `;

    console.log('[ImageEngine] 编译顶点着色器...');
    const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    console.log('[ImageEngine] 编译片段着色器...');
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    
    if (!vs || !fs) {
      console.error("[ImageEngine] 着色器创建失败！vs:", !!vs, "fs:", !!fs);
      return;
    }
    console.log('[ImageEngine] 着色器编译成功');

    const program = this.createProgram(vs, fs);
    if (!program) {
      console.error("[ImageEngine] Program 创建失败！");
      return;
    }
    console.log('[ImageEngine] Program 创建成功');

    this.program = program;
    this.gl.useProgram(program);

    // Uniform locations
    this.uLocations = {
      u_image: this.gl.getUniformLocation(program, 'u_image'),
      u_curveLUT: this.gl.getUniformLocation(program, 'u_curveLUT'),
      u_exposure: this.gl.getUniformLocation(program, 'u_exposure'),
      u_contrast: this.gl.getUniformLocation(program, 'u_contrast'),
      u_highlights: this.gl.getUniformLocation(program, 'u_highlights'),
      u_shadows: this.gl.getUniformLocation(program, 'u_shadows'),
      u_whites: this.gl.getUniformLocation(program, 'u_whites'),
      u_blacks: this.gl.getUniformLocation(program, 'u_blacks'),
      u_temperature: this.gl.getUniformLocation(program, 'u_temperature'),
      u_tint: this.gl.getUniformLocation(program, 'u_tint'),
      u_saturation: this.gl.getUniformLocation(program, 'u_saturation'),
      u_vibrance: this.gl.getUniformLocation(program, 'u_vibrance'),
      // 【新增】存在感参数
      u_texture: this.gl.getUniformLocation(program, 'u_texture'),
      u_clarity: this.gl.getUniformLocation(program, 'u_clarity'),
      u_dehaze: this.gl.getUniformLocation(program, 'u_dehaze'),
      // 色彩分级
      u_shadowsGrade: this.gl.getUniformLocation(program, 'u_shadowsGrade'),
      u_midtonesGrade: this.gl.getUniformLocation(program, 'u_midtonesGrade'),
      u_highlightsGrade: this.gl.getUniformLocation(program, 'u_highlightsGrade'),
      u_gradingBalance: this.gl.getUniformLocation(program, 'u_gradingBalance'),
      u_gradingBlending: this.gl.getUniformLocation(program, 'u_gradingBlending'),
      // 【新增】色彩分级明度
      u_shadowsLum: this.gl.getUniformLocation(program, 'u_shadowsLum'),
      u_midtonesLum: this.gl.getUniformLocation(program, 'u_midtonesLum'),
      u_highlightsLum: this.gl.getUniformLocation(program, 'u_highlightsLum'),
      // 【新增】相机校准
      u_calibRed: this.gl.getUniformLocation(program, 'u_calibRed'),
      u_calibGreen: this.gl.getUniformLocation(program, 'u_calibGreen'),
      u_calibBlue: this.gl.getUniformLocation(program, 'u_calibBlue'),
      u_calibShadowsTint: this.gl.getUniformLocation(program, 'u_calibShadowsTint'),
      u_useCurve: this.gl.getUniformLocation(program, 'u_useCurve'),
      // HSL 调整
      u_useHsl: this.gl.getUniformLocation(program, 'u_useHsl'),
      u_hslRed: this.gl.getUniformLocation(program, 'u_hslRed'),
      u_hslOrange: this.gl.getUniformLocation(program, 'u_hslOrange'),
      u_hslYellow: this.gl.getUniformLocation(program, 'u_hslYellow'),
      u_hslGreen: this.gl.getUniformLocation(program, 'u_hslGreen'),
      u_hslCyan: this.gl.getUniformLocation(program, 'u_hslCyan'),
      u_hslBlue: this.gl.getUniformLocation(program, 'u_hslBlue'),
      u_hslPurple: this.gl.getUniformLocation(program, 'u_hslPurple'),
      u_hslMagenta: this.gl.getUniformLocation(program, 'u_hslMagenta'),
      // 高级渲染选项
      u_enableAces: this.gl.getUniformLocation(program, 'u_enableAces'),
      u_lutOpacity: this.gl.getUniformLocation(program, 'u_lutOpacity'),
      u_lutTexture: this.gl.getUniformLocation(program, 'u_lutTexture'),
    };

    // Setup Geometry
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]), this.gl.STATIC_DRAW);

    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0,
    ]), this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(program, "a_position");
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    const texCoordLocation = this.gl.getAttribLocation(program, "a_texCoord");
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  private createShader(type: number, source: string) {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader) {
    const program = this.gl.createProgram();
    if (!program) return null;
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error("Program link error:", this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }
}
