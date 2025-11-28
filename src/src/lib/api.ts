/**
 * API 客户端模块
 * 负责所有前后端通信
 * 
 * 配置说明：
 * - API_BASE_URL: 后端 API 基础地址，根据开发方案要求必须为 http://localhost:8081/api
 * - USE_MOCK_DATA: 是否使用模拟数据（开发环境）
 */
import { toast } from "sonner@2.0.3";

// --- CONFIGURATION ---
const API_BASE_URL = 'http://localhost:8081/api'; // 【强制要求】根据开发方案，后端端口必须为 8081
/**
 * 是否使用模拟数据
 * 注意：设置为 false 时，所有 API 调用都会发送真实请求到后端
 * 设置为 true 时，API 调用会返回模拟数据，不会发送网络请求（用于开发测试）
 * 
 * 【重要】生产环境必须设置为 false，确保使用真实 API
 */
const USE_MOCK_DATA = false; // 【修复】改为 false，确保发送真实 API 请求 

// --- TYPES ---
export interface ApiResponse<T = any> {
  code: number | string;  // 错误码可能是数字（0表示成功）或字符串（错误码常量）
  message: string;
  data: T;
}

/**
 * API 错误类
 * 用于传递错误码和错误消息
 */
export class ApiError extends Error {
  code: string | number;
  message: string;
  
  constructor(code: string | number, message: string) {
    super(message);
    this.code = code;
    this.message = message;
    this.name = 'ApiError';
  }
}

// --- AUTH ---
const getAuthToken = () => localStorage.getItem('accessToken');
export const setAuthToken = (token: string) => localStorage.setItem('accessToken', token);
export const removeAuthToken = () => localStorage.removeItem('accessToken');

// --- MOCK DATA (Full Structure) ---
const FULL_MOCK_DATA = {
  review: {
    comprehensive_review: "参考图展现了极其细腻的高调人像风格。光线漫射柔和，无明显硬影。色彩上，肤色被统一在橙黄色相（Hue 25-35），而环境阴影则注入了冷调青色，形成了经典的冷暖互补。",
    visual_subject_analysis: "主体面部位于视觉中心，利用大光圈带来的浅景深将人物与背景彻底分离。眼神光清晰，是画面的绝对锚点。",
    focus_exposure_analysis: "采用向右曝光（ETTR）策略，整体直方图偏向高光区，但并未死白。阴影部分细节保留完整，呈现出胶片般的宽容度。",
    color_depth_analysis: "色彩过渡极其平滑，没有数码断层。肤色的明度较高，饱和度适中，呈现出通透的质感。",
    emotion: "画面传递出一种宁静、纯洁且略带空气感的夏日氛围。",
    pros_evaluation: "光比控制是本作的灵魂，高光溢出控制得恰到好处。肤色校正非常专业，去除了常见的洋红杂色。",
    style_summary: "高调日系空气感。核心操作：提升黑电平（Black Level），压低高光（Highlights），分离色调（Split Toning）。",
    simulated_histogram_data: { reference: [5, 15, 30, 60, 85, 90, 70, 40, 20, 10], user: [40, 60, 80, 50, 20, 10, 5, 2, 1, 0] },
    parameter_comparison_table: [
      { param: "曝光", ref: "+0.7 EV", user: "-1.0 EV", suggest: "+1.7" },
      { param: "对比度", ref: "-20", user: "+10", suggest: "-30" },
      { param: "色温", ref: "5600K", user: "4800K", suggest: "+800K" }
    ],
    feasibility_assessment: { score: 85, level: "High", limitations: ["光质较硬", "背景杂乱"], recommendation: "Dodge & Burn 重塑光影" },
    overlays: {
        visual_subject: { x: 32, y: 20, w: 35, h: 45 }, 
        focus_exposure: { x: 45, y: 28, w: 12, h: 6 },
        color_depth: { x: 10, y: 10, w: 80, h: 80 }
    }
  },
  composition: { 
    main_structure: "中心构图 + 三分法",
    subject_weight: { description: "主体占比 40%", layers: "前中后三层" },
    visual_guidance: { analysis: "透视引导线", path: "左下 -> 眼神 -> 右上" },
    ratios_negative_space: { entity_ratio: "40%", space_ratio: "60%", distribution: "右侧留白" },
    style_class: "环境人像",
    visual_data: {
        subject_poly: "30,100 35,30 45,20 55,20 65,30 70,100",
        lines: [ {x1:0, y1:100, x2:40, y2:40}, {x1:100, y1:80, x2:60, y2:40} ],
        negative_space: "0,0 100,0 100,100 70,100 65,30 55,20 45,20 35,30 30,100 0,100"
    }
  },
  lighting: { 
    exposure_control: [
      { param: "曝光", range: "+1.65", desc: "原图严重欠曝，需大幅提亮以匹配日系高调风格。" },
      { param: "对比度", range: "-20", desc: "降低全局反差，模拟胶片的柔和过渡，避免暗部死黑。" },
      { param: "高光", range: "-55", desc: "强力压制高光，找回天空和皮肤亮部的层次细节。" },
      { param: "阴影", range: "+45", desc: "大幅提亮暗部，注入空气感，减少视觉压迫。" },
      { param: "白色", range: "+15", desc: "微提白点，确保画面最亮处通透而不灰暗。" },
      { param: "黑色", range: "+25", desc: "提升黑电平，制造'不实黑'的复古胶片质感。" }
    ],
    tone_curves: {
      explanation: "构建S型哑光曲线：暗部输入端上抬(0->30)以消除纯黑；高光端下压(255->240)以获得奶油般的高光滚落。",
      points_rgb: [{x:0,y:30}, {x:60,y:70}, {x:190,y:200}, {x:255,y:240}],
      points_red: [{x:128,y:135}],
      points_blue: [{x:128,y:120}]
    },
    texture_clarity: [
      { param: "纹理", range: "-10", desc: "轻微负向调整，柔化皮肤瑕疵，保留自然质感。" },
      { param: "清晰度", range: "-10", desc: "降低局部反差，营造梦幻的光晕效果。" },
      { param: "去雾", range: "-5", desc: "负值去雾可人为制造镜头眩光和空气散射感。" }
    ]
  },
  color: {
    key_points: "核心目标是统一肤色为健康的橙黄色，并向阴影中注入补色青蓝。",
    white_balance: { temp: { range: "+800", reason: "原图色温偏冷（约4800K），需加暖至5600K以模拟午后阳光。" }, tint: { range: "+10", reason: "轻微偏向洋红，修正皮肤暗部的病态蜡黄感。" } },
    grading: { highlights: { h: 35, s: 10, reason: "高光注入暖橙色，增强阳光感。" }, midtones: { h: 25, s: 5, reason: "保持肤色纯净，不做过多干扰。" }, shadows: { h: 210, s: 15, reason: "阴影注入青蓝色（Teal），与高光形成色彩反差。" }, balance: "-15" },
    hsl_12: [ 
      { color: "Red", h: "+5", s: "-10", l: "+5" }, { color: "Orange", h: "-5", s: "-15", l: "+15" }, { color: "Yellow", h: "-20", s: "-25", l: "+10" },
      { color: "Yellow-Green", h: "0", s: "0", l: "0" }, { color: "Green", h: "-30", s: "-40", l: "-10" }, { color: "Green-Cyan", h: "0", s: "0", l: "0" },
      { color: "Cyan", h: "+10", s: "+15", l: "+5" }, { color: "Cyan-Blue", h: "0", s: "0", l: "0" }, { color: "Blue", h: "-10", s: "-20", l: "-10" },
      { color: "Blue-Purple", h: "0", s: "0", l: "0" }, { color: "Purple", h: "+20", s: "-30", l: "0" }, { color: "Magenta", h: "+10", s: "-10", l: "+5" }
    ]
  },
  lightroom: {
    histogram_data: { r: 120, g: 115, b: 110, l: 118 },
    basic_panel: [
      { label: "Temp", value: "+800", reason: "校正环境色温" }, { label: "Tint", value: "+10", reason: "肤色校正" }, { label: "Exposure", value: "+1.65", reason: "直方图右移，奠定高调基础" },
      { label: "Contrast", value: "-20", reason: "柔化光比，减少生硬过渡" }, { label: "Highlights", value: "-55", reason: "强力压制，保护天空云层细节" }, { label: "Shadows", value: "+45", reason: "提亮暗部，模拟人眼宽容度" },
      { label: "Whites", value: "+15", reason: "微提白点，增加通透感" }, { label: "Blacks", value: "+25", reason: "灰度黑，模拟胶片冲印感" }, { label: "Texture", value: "-10", reason: "人像磨皮基础，柔化毛孔" },
      { label: "Clarity", value: "-10", reason: "降低局部反差，产生柔光效果" }, { label: "Dehaze", value: "-5", reason: "增加空气散射，模拟雾感" }, { label: "Vibrance", value: "+10", reason: "安全饱和度，保护肤色不溢出" }
    ],
    hsl: [], 
    split_toning: { highlights: { h: 35, s: 10 }, shadows: { h: 210, s: 15 }, balance: "-15" },
    tone_curve: { points_rgb: [{x:0,y:30}, {x:60,y:70}, {x:190,y:200}, {x:255,y:240}], reason: "S型哑光曲线：这是日系胶片感的核心，通过抬高黑点（Fade Black）和压低白点（Fade White）来减少数字锐度。" }
  },
  photoshop: {
    steps: [
      { section: "Camera Raw", action: "Apply Preset", params: "Exp+1.65...", blend: "Normal", opacity: "100%", reason: "建立基础影调，对齐参考图直方图。" },
      { section: "Grading", action: "Curves RGB", params: "Midtone Boost", blend: "Normal", opacity: "100%", reason: "单独提亮中间调，使人物肤色更透亮。" },
      { section: "HSL", action: "Hue/Sat", params: "Yellow Sat -10", blend: "Normal", opacity: "100%", reason: "去除环境中的杂色干扰。" },
      { section: "Selective Color", action: "Selective Color", params: "Red(C-5,Y+5)", blend: "Normal", opacity: "80%", reason: "精细调整肤色，使其呈现“白里透红”。" },
      { section: "Dodge & Burn", action: "Curves", params: "Local Contrast", blend: "Overlay", opacity: "30%", reason: "通过中性灰图层重塑面部立体感。" },
      { section: "Glow", action: "Solid Color", params: "#FFA500", blend: "Screen", opacity: "15%", reason: "模拟逆光下的漫射光晕。" },
      { section: "Sharpen", action: "High Pass", params: "Rad 2.0px", blend: "Overlay", opacity: "40%", reason: "增强五官（眼、唇）的锐度。" },
      { section: "Grain", action: "Add Noise", params: "3% Gaussian", blend: "Overlay", opacity: "25%", reason: "打破数码纯净度，增加胶片颗粒感。" },
      { section: "Vignette", action: "Gradient", params: "Reverse Radial", blend: "Multiply", opacity: "10%", reason: "压暗四角，聚拢视线到中心。" },
      { section: "Output", action: "Levels", params: "10-250", blend: "Normal", opacity: "100%", reason: "最终色阶钳制，防止溢出。" }
    ]
  }
};

// --- CLIENT ---
/**
 * API 客户端统一封装函数
 * 负责所有 HTTP 请求的统一处理，包括错误处理、日志记录等
 * 
 * @param endpoint - API 端点路径（不包含 base URL）
 * @param options - Fetch API 选项
 * @returns Promise<T> - API 响应数据
 */
async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  if (options.body instanceof FormData) delete (headers as any)['Content-Type'];

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  // 【日志】记录请求信息（开发环境）
  if (!USE_MOCK_DATA) {
    console.log(`[API Request] ${options.method || 'GET'} ${fullUrl}`, {
      headers: { ...headers, Authorization: token ? 'Bearer ***' : undefined },
      body: options.body instanceof FormData ? '[FormData]' : options.body
    });
  }

  try {
    const response = await fetch(fullUrl, { ...options, headers });
    
    // 【日志】记录响应状态
    if (!USE_MOCK_DATA) {
      console.log(`[API Response] ${options.method || 'GET'} ${fullUrl}`, {
        status: response.status,
        statusText: response.statusText
      });
    }
    
    // 【错误处理】检查响应状态
    if (!response.ok) {
      // 【重要】对于非 2xx 响应，尝试解析 JSON 错误信息
      // 如果解析失败（如网络错误、CORS 错误），则抛出通用错误
      let errorMessage = `请求失败: ${response.status} ${response.statusText}`;
      let errorCode: string | number = 'UNKNOWN_ERROR';
      
      try {
        const errorJson: ApiResponse = await response.json();
        errorMessage = errorJson.message || errorMessage;
        errorCode = errorJson.code || errorCode;
      } catch (parseError) {
        // JSON 解析失败，可能是网络错误或 CORS 错误
        console.error(`[API Error] 无法解析错误响应:`, parseError);
        if (response.status === 0 || response.statusText === '') {
          // 这通常是 CORS 错误或网络错误
          errorMessage = '网络请求失败，请检查后端服务是否运行或 CORS 配置是否正确';
          errorCode = 'NETWORK_ERROR';
        }
      }
      
      // 401 未授权：对于登录接口，不应该跳转（因为用户正在登录）
      // 只有在已登录状态下访问需要认证的接口时，才需要跳转到登录页
      // 登录接口本身返回 401 是正常的（如密码错误），应该直接抛出错误，让前端处理
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        // 只有在非登录/注册接口返回 401 时，才清除 token 并跳转
        removeAuthToken();
        window.location.href = '/login';
        throw new ApiError(errorCode, 'Session expired');
      }
      
      // 其他错误：抛出 ApiError
      throw new ApiError(errorCode, errorMessage);
    }
    
    const resJson: ApiResponse<T> = await response.json();
    
    // 【日志】记录响应数据（开发环境，敏感信息已脱敏）
    if (!USE_MOCK_DATA) {
      console.log(`[API Response Data] ${options.method || 'GET'} ${fullUrl}`, {
        code: resJson.code,
        message: resJson.message,
        hasData: !!resJson.data
      });
    }
    
    if (resJson.code !== 0) { 
      // 【重要】根据错误码决定是否显示 toast
      // 某些错误（如 EMAIL_NOT_REGISTERED）需要前端特殊处理，不在这里显示 toast
      // 让调用方根据错误码决定如何处理
      // 使用 ApiError 类，确保错误码正确传递
      const error = new ApiError(resJson.code, resJson.message);
      throw error;
    }
    return resJson.data;
  } catch (error: any) {
    // 【日志】记录错误信息
    console.error(`[API Error] ${options.method || 'GET'} ${fullUrl}:`, error);
    
    // 【错误处理】处理网络错误和超时错误
    if (error.name === 'AbortError' || error.name === 'TypeError' && error.message === 'Failed to fetch') {
      // 网络错误或超时错误
      if (error.name === 'AbortError') {
        throw new ApiError('TIMEOUT_ERROR', '请求超时，请检查网络连接或稍后重试');
      } else {
        throw new ApiError('NETWORK_ERROR', '网络连接失败，请检查您的网络设置或后端服务是否运行');
      }
    }
    
    // 重新抛出 ApiError（如果已经是 ApiError，直接抛出）
    if (error instanceof ApiError) {
      throw error;
    }
    
    // 对于其他未知错误，包装成 ApiError
    throw new ApiError('UNKNOWN_ERROR', error.message || '未知 API 错误');
  }
}

// --- EXPORTS ---
const api = {
  /**
   * 认证相关 API
   * 根据开发方案第 740-753 行实现
   */
  auth: {
    /**
     * 密码登录
     * @param credentials - { email: string, password: string }
     * 【修复】添加超时控制，防止登录请求卡住
     */
    login: async (credentials: any) => {
      if (USE_MOCK_DATA) return { accessToken: 'mock_jwt', user: { id: 1, name: 'Demo User' } };
      
      // 【超时控制】登录接口超时设置为 30 秒，防止请求卡住
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 秒超时
      
      try {
        const result = await apiClient('/auth/login', { 
          method: 'POST', 
          body: JSON.stringify(credentials),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', '登录请求超时（超过 30 秒），请检查网络连接或后端服务是否正常运行');
        }
        throw error;
      }
    },
    /**
     * 注册
     * @param data - { email: string, password: string, code: string }
     * 【修复】添加超时控制，防止注册请求卡住
     */
    register: async (data: any) => {
      if (USE_MOCK_DATA) return { accessToken: 'mock_jwt', user: { id: 1, name: 'Demo User' } };
      
      // 【超时控制】注册接口超时设置为 30 秒
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 秒超时
      
      try {
        const result = await apiClient('/auth/register', { 
          method: 'POST', 
          body: JSON.stringify(data),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', '注册请求超时（超过 30 秒），请检查网络连接或后端服务是否正常运行');
        }
        throw error;
      }
    },
    /**
     * 发送验证码
     * @param data - { type: 'register' | 'login', email: string }
     * 根据开发方案第 743、750 行实现
     * 
     * 注意：
     * - 后端接口路径：POST /api/auth/send-verification-code
     * - 后端只支持 email，不支持 phone（根据 server_py/app/routes/auth.py 第 38-41 行）
     * - 请求体格式：{ type: 'register' | 'login', email: string }
     */
    sendVerificationCode: async (data: { type: 'register' | 'login', email: string }) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, message: 'Code sent' };
      }
      
      // 【日志】记录请求
      console.log('[API] 发送验证码请求:', data);
      
      return apiClient('/auth/send-verification-code', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    },
    /**
     * 验证码登录
     * @param data - { email: string, code: string }
     * 根据开发方案第 751 行实现
     * 【修复】添加超时控制，防止登录请求卡住
     */
    loginWithCode: async (data: { email: string, code: string }) => {
      if (USE_MOCK_DATA) return { accessToken: 'mock_jwt', user: { id: 1, name: 'Demo User' } };
      
      // 【超时控制】验证码登录接口超时设置为 30 秒
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 秒超时
      
      try {
        const result = await apiClient('/auth/login-with-code', { 
        method: 'POST', 
          body: JSON.stringify(data),
          signal: controller.signal
      });
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', '登录请求超时（超过 30 秒），请检查网络连接或后端服务是否正常运行');
        }
        throw error;
      }
    },
    /**
     * 获取当前用户信息
     * 根据开发方案第 752 行实现
     */
    me: async () => {
      if (USE_MOCK_DATA) return { id: 1, name: 'Demo User', role: 'user' };
      return apiClient('/user/me');
    }
  },
  photos: {
    upload: async (formData: FormData) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { 
          uploadId: 'mock_upload_123', 
          source_image_url: URL.createObjectURL(formData.get('sourceImage') as Blob),
          target_image_url: formData.get('targetImage') ? URL.createObjectURL(formData.get('targetImage') as Blob) : null
        };
      }
      return apiClient('/photos/upload', { method: 'POST', body: formData });
    },
  },
  analyze: {
    /**
     * Part1 分析接口
     * 根据开发方案第 1508-1515 行，前端超时设置为 200 秒（3分20秒），确保覆盖后端 180 秒超时
     * 
     * @param uploadId - 上传记录 ID
     * @returns Part1 分析结果
     */
    part1: async (uploadId: string) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        return { 
          taskId: 'mock_task_456', 
          status: 'part1_completed',
          structuredAnalysis: FULL_MOCK_DATA
        };
      }
      
      // 【超时控制】Part1 分析可能需要 60-70 秒，后端超时设置为 180 秒
      // 前端超时设置为 200 秒（3分20秒），确保覆盖后端超时时间，并留出网络延迟缓冲
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 200000); // 200 秒（3分20秒）超时
      
      try {
        const result = await apiClient('/analyze/part1', { 
          method: 'POST', 
          body: JSON.stringify({ uploadId }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', 'Part1 分析请求超时（超过 3 分20秒），请稍后重试');
        }
        throw error;
      }
    },
    part2: async (taskId: string) => {
        if (USE_MOCK_DATA) return { status: 'processing' };
        return apiClient('/analyze/part2', { method: 'POST', body: JSON.stringify({ taskId }) });
    },
    getTask: async (taskId: string) => {
        if (USE_MOCK_DATA) return { status: 'completed', structured_result: FULL_MOCK_DATA };
        return apiClient(`/analyze/${taskId}`);
    },
    history: async (page: number = 1, limit: number = 20) => {
        if (USE_MOCK_DATA) return { tasks: [], total: 0, page, limit };
        return apiClient(`/analyze/history?page=${page}&limit=${limit}`);
    },
    /**
     * AI 诊断接口
     * 根据色彩雷达和AI诊断功能完整设计方案实现
     * @param data - {
     *   imageUrl: string,  // 图片 URL 或 base64（低分辨率，建议 512x512）
     *   histogramData: { r: number[], g: number[], b: number[], l: number[], avgL: number, shadows: number, midtones: number, highlights: number },
     *   dominantColors: Array<{ h: number, s: number, v: number, hex: string }>,
     *   taskId?: string  // 可选，关联已有分析任务
     * }
     * @returns 诊断结果 { scores, critique, suggestions, issues, processingTime }
     */
    diagnosis: async (data: {
      imageUrl: string;
      histogramData: {
        r: number[];
        g: number[];
        b: number[];
        l: number[];
        avgL: number;
        shadows: number;
        midtones: number;
        highlights: number;
      };
      dominantColors: Array<{ h: number; s: number; v: number; hex: string }>;
      taskId?: string;
    }) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          scores: { exposure: 8.5, color: 7.2, composition: 9.0, mood: 8.8 },
          critique: "高光部分细节丢失严重，建议降低曝光。画面整体偏暖，色温可以适当降低。构图采用了三分法，视觉重心在左下角，留白比例合适。",
          suggestions: [
            "尝试将色温滑块向左移动 -500K",
            "降低高光值以恢复天空细节",
            "提升阴影值以增加暗部层次"
          ],
          issues: [
            { type: "exposure", severity: "high", description: "高光溢出", region: "sky" }
          ],
          processingTime: 2.0
        };
      }
      
      // 【日志】记录请求
      console.log('[API] AI 诊断请求:', {
        imageUrl: data.imageUrl.substring(0, 50) + '...',
        histogramDataKeys: Object.keys(data.histogramData),
        dominantColorsCount: data.dominantColors.length
      });
      
      // 【超时控制】AI 诊断可能需要 70+ 秒，且两个请求同时处理时总时间可能更长
      // 根据后端日志，单个请求耗时约 34-35 秒，两个请求同时处理时可能需要 70+ 秒
      // 考虑到网络延迟和 Gemini API 响应时间波动，设置 180 秒（3 分钟）超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 180000); // 180 秒（3 分钟）超时
      
      try {
        const result = await apiClient('/analyze/diagnosis', {
          method: 'POST',
          body: JSON.stringify(data),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', 'AI 诊断请求超时（超过 3 分钟），请稍后重试');
        }
        throw error;
      }
    }
  },
  simulate: {
    style: async (taskId: string, colorGradingSchema?: any) => {
        if (USE_MOCK_DATA) return { preview_image_url: null, status: 'completed' };
        return apiClient('/simulate/style', { 
            method: 'POST', 
            body: JSON.stringify({ taskId, colorGradingSchema }) 
        });
    }
  },
  export: {
    xmp: async (taskId: string) => {
        const token = getAuthToken();
        const url = `/export/xmp?taskId=${taskId}${token ? `&token=${token}` : ''}`;
        // 下载文件
        window.open(`${API_BASE_URL}${url}`, '_blank');
        return { success: true };
    },
    jsx: async (taskId: string) => {
        const token = getAuthToken();
        const url = `/export/jsx?taskId=${taskId}${token ? `&token=${token}` : ''}`;
        window.open(`${API_BASE_URL}${url}`, '_blank');
        return { success: true };
    },
    json: async (taskId: string) => {
        const token = getAuthToken();
        const url = `/export/json?taskId=${taskId}${token ? `&token=${token}` : ''}`;
        window.open(`${API_BASE_URL}${url}`, '_blank');
        return { success: true };
    },
    pdf: async (taskId: string) => {
        const token = getAuthToken();
        const url = `/export/pdf?taskId=${taskId}${token ? `&token=${token}` : ''}`;
        window.open(`${API_BASE_URL}${url}`, '_blank');
        return { success: true };
    }
  }
};

export { api };
export default api;
