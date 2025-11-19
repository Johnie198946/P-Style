/**
 * API 客户端 - 统一封装所有后端接口
 * 根据开发方案第 15 节实现
 * 
 * 功能：
 * - 统一请求格式（{code, message, data}）
 * - 自动附加 JWT Token
 * - 统一错误处理
 * - 支持文件上传（multipart/form-data）
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * API 错误类
 * 用于统一处理后端返回的业务错误
 */
class ApiError extends Error {
  constructor(
    public code: number,      // 错误码（业务错误码或 HTTP 状态码）
    public message: string,    // 错误消息（可展示给用户）
    public data?: any         // 错误附加数据
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 获取认证 Token
 * 根据接口路径决定使用哪个 Token：
 * - 管理后台接口（/api/admin/*）：使用 adminAuthToken
 * - 普通用户接口（其他接口）：使用 accessToken
 * 根据开发方案第 768-779 节，管理后台使用 adminAuthToken，普通用户接口使用 accessToken
 * 
 * @param endpoint - API 端点（如 '/api/photos/upload' 或 '/api/admin/dashboard/metrics'）
 * @returns JWT Token 字符串，如果未登录则返回 null
 */
function getAuthToken(endpoint?: string): string | null {
  if (typeof window === 'undefined') return null;
  
  // 根据接口路径决定使用哪个 Token
  // 如果 endpoint 以 /api/admin 开头，使用管理后台 Token
  // 否则，使用普通用户 Token
  if (endpoint && endpoint.startsWith('/api/admin')) {
    // 管理后台接口：使用 adminAuthToken
    const adminToken = localStorage.getItem('adminAuthToken');
    return adminToken;
  } else {
    // 普通用户接口：使用 accessToken
    // 注意：即使存在 adminAuthToken，普通用户接口也应该使用 accessToken
    // 这样可以避免普通用户接口使用已过期的 adminAuthToken 导致认证失败
    const accessToken = localStorage.getItem('accessToken');
    return accessToken;
  }
}

/**
 * 基础请求函数
 * 封装 fetch，自动附加 Token，统一处理响应格式
 * 
 * @param endpoint - API 端点（如 '/api/analyze/part1'）
 * @param options - fetch 选项（method, body, headers 等）
 * @returns Promise<T> - 返回 data 字段的内容
 * @throws ApiError - 如果 code !== 0 或 HTTP 状态码非 2xx
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 根据接口路径获取对应的 Token（管理后台接口使用 adminAuthToken，普通用户接口使用 accessToken）
  const token = getAuthToken(endpoint);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 自动附加 JWT Token（如果存在）
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 检查 HTTP 状态码（先检查，避免非 JSON 响应时解析失败）
  if (!response.ok) {
    // 401 错误：自动清除 Token 并提示登录（根据注册登录与权限设计方案）
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        // 触发自定义事件，通知其他组件登录状态已改变
        window.dispatchEvent(new CustomEvent('loginStatusChanged'));
      }
      throw new ApiError(401, '请先登录', { requireLogin: true });
    }
    
    // 尝试解析错误响应（可能是 JSON 格式）
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // 如果响应不是 JSON，使用状态文本作为错误消息
      throw new ApiError(response.status, response.statusText || '请求失败', null);
    }
    // 如果后端返回了业务错误码，使用业务错误码
    if (errorData && typeof errorData === 'object' && 'code' in errorData) {
      throw new ApiError(errorData.code, errorData.message || errorData.detail || response.statusText, errorData.data);
    }
    // 否则使用 HTTP 状态码
    throw new ApiError(response.status, response.statusText || '请求失败', errorData);
  }

  // 解析 JSON 响应
  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch (e) {
    // 如果响应不是 JSON 格式，抛出解析错误
    throw new ApiError(502, '服务器返回了无效的响应格式', null);
  }

  // 检查业务错误码（后端返回的 code 字段）
  // 注意：即使 HTTP 状态码是 200，业务错误码也可能非 0
  if (data.code !== 0) {
    throw new ApiError(data.code, data.message, data.data);
  }

  // 返回 data 字段（根据开发方案第 15 节，统一响应格式为 {code, message, data}）
  return data.data;
}

/**
 * 带消息的请求函数
 * 返回完整的响应对象（包含 data 和 message 字段）
 * 用于需要显示后端返回消息的场景（如管理员登录、发送验证码等）
 * 
 * @param endpoint - API 端点（如 '/api/admin/auth/login'）
 * @param options - fetch 选项（method, body, headers 等）
 * @returns Promise<T & { message?: string }> - 返回 data 字段的内容，并附加 message 字段
 * @throws ApiError - 如果 code !== 0 或 HTTP 状态码非 2xx
 */
async function requestWithMessage<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T & { message?: string }> {
  // 根据接口路径获取对应的 Token（管理后台接口使用 adminAuthToken，普通用户接口使用 accessToken）
  const token = getAuthToken(endpoint);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 自动附加 JWT Token（如果存在）
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 检查 HTTP 状态码（先检查，避免非 JSON 响应时解析失败）
  if (!response.ok) {
    // 401 错误：自动清除 Token 并提示登录（根据注册登录与权限设计方案）
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        // 触发自定义事件，通知其他组件登录状态已改变
        window.dispatchEvent(new CustomEvent('loginStatusChanged'));
      }
      throw new ApiError(401, '请先登录', { requireLogin: true });
    }
    
    // 尝试解析错误响应（可能是 JSON 格式）
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // 如果响应不是 JSON，使用状态文本作为错误消息
      throw new ApiError(response.status, response.statusText || '请求失败', null);
    }
    // 如果后端返回了业务错误码，使用业务错误码
    if (errorData && typeof errorData === 'object' && 'code' in errorData) {
      throw new ApiError(errorData.code, errorData.message || errorData.detail || response.statusText, errorData.data);
    }
    // 否则使用 HTTP 状态码
    throw new ApiError(response.status, response.statusText || '请求失败', errorData);
  }

  // 解析 JSON 响应
  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch (e) {
    // 如果响应不是 JSON 格式，抛出解析错误
    throw new ApiError(502, '服务器返回了无效的响应格式', null);
  }

  // 检查业务错误码（后端返回的 code 字段）
  // 注意：即使 HTTP 状态码是 200，业务错误码也可能非 0
  if (data.code !== 0) {
    throw new ApiError(data.code, data.message, data.data);
  }

  // 返回 data 字段的内容，并附加 message 字段（根据开发方案第 15 节，统一响应格式为 {code, message, data}）
  return {
    ...data.data,
    message: data.message,
  };
}

/**
 * 上传文件请求
 * 用于 multipart/form-data 请求（图片上传等）
 * 
 * @param endpoint - API 端点
 * @param formData - FormData 对象（包含文件和表单字段）
 * @param signal - 可选的 AbortSignal，用于取消请求
 * @param timeout - 可选的超时时间（毫秒），默认 120 秒（2 分钟）
 * @returns Promise<T> - 返回 data 字段的内容
 * @throws ApiError - 如果上传失败
 */
async function uploadRequest<T = any>(
  endpoint: string,
  formData: FormData,
  signal?: AbortSignal,
  timeout: number = 120000  // 默认 120 秒（2 分钟）
): Promise<T> {
  // 根据接口路径获取对应的 Token（管理后台接口使用 adminAuthToken，普通用户接口使用 accessToken）
  const token = getAuthToken(endpoint);
  const headers: HeadersInit = {};

  // 注意：multipart/form-data 不需要手动设置 Content-Type，浏览器会自动添加 boundary

  // 自动附加 JWT Token（如果存在）
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 创建 AbortController（如果外部没有提供 signal）
  // 用于实现超时控制
  const controller = signal ? null : new AbortController();
  const abortSignal = signal || controller?.signal;
  
  // 设置超时（如果外部没有提供 signal）
  let timeoutId: NodeJS.Timeout | null = null;
  if (controller && timeout > 0) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: abortSignal,  // 支持请求取消和超时
    });

    // 清除超时定时器（请求已完成）
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 检查 HTTP 状态码（先检查，避免非 JSON 响应时解析失败）
    if (!response.ok) {
      // 401 错误：自动清除 Token 并提示登录（根据注册登录与权限设计方案）
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('userData');
          // 触发自定义事件，通知其他组件登录状态已改变
          window.dispatchEvent(new CustomEvent('loginStatusChanged'));
        }
        // 401 错误直接抛出，不继续解析响应（与其他 request 函数保持一致）
        throw new ApiError(401, '请先登录', { requireLogin: true });
      }
      
      // 尝试解析错误响应（可能是 JSON 格式）
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // 如果响应不是 JSON，使用状态文本作为错误消息
        throw new ApiError(response.status, response.statusText || '上传失败', null);
      }
      // 如果后端返回了业务错误码，使用业务错误码
      if (errorData && typeof errorData === 'object' && 'code' in errorData) {
        throw new ApiError(errorData.code, errorData.message || response.statusText, errorData.data);
      }
      // 否则使用 HTTP 状态码
      throw new ApiError(response.status, response.statusText || '上传失败', errorData);
    }

    // 解析 JSON 响应
    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch (e) {
      // 如果响应不是 JSON 格式，抛出解析错误
      throw new ApiError(502, '服务器返回了无效的响应格式', null);
    }

    // 检查业务错误码（后端返回的 code 字段）
    if (data.code !== 0) {
      throw new ApiError(data.code, data.message, data.data);
    }

    return data.data;
  } catch (error: any) {
    // 清除超时定时器（如果存在）
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // 处理 AbortError（请求被取消或超时）
    if (error.name === 'AbortError') {
      // 判断是超时还是手动取消
      if (controller?.signal.aborted && !signal) {
        // 超时
        throw new ApiError(504, '请求超时，请稍后重试', null);
      } else {
        // 手动取消
        throw new ApiError(499, '请求已取消', null);
      }
    }
    
    // 重新抛出其他错误
    throw error;
  }
}

// ==================== 认证相关 ====================

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  // 传统注册（邮箱+密码）
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    return request<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 传统登录（邮箱+密码）
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 发送验证码（注册或登录）
  // 注意：此接口返回完整的响应对象（包含 message），以便前端显示后端返回的提示消息
  sendVerificationCode: async (email: string, type: 'register' | 'login'): Promise<{ message?: string; email_sent?: boolean; dev_mode?: boolean }> => {
    // 使用 requestWithMessage 获取完整响应（包含 message 字段）
    return requestWithMessage<{ email_sent?: boolean; dev_mode?: boolean }>('/api/auth/send-verification-code', {
      method: 'POST',
      body: JSON.stringify({ email, type }),
    });
  },

  // 使用验证码注册
  registerWithCode: async (data: {
    email: string;
    code: string;
    password: string;
    display_name?: string;
  }): Promise<LoginResponse> => {
    return request<LoginResponse>('/api/auth/register-with-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 使用验证码登录
  loginWithCode: async (data: {
    email: string;
    code: string;
  }): Promise<LoginResponse> => {
    return request<LoginResponse>('/api/auth/login-with-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMe: async (): Promise<{ user: User; subscriptionSummary: any }> => {
    return request('/api/auth/me');
  },
};

// ==================== 上传相关 ====================

export interface UploadResponse {
  uploadId: string;
  source_image_url: string;
  target_image_url: string | null;
  similarity_score: number;
}

export const uploadApi = {
  uploadPhotos: async (
    sourceImage: File,
    targetImage?: File,
    signal?: AbortSignal
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('sourceImage', sourceImage);
    if (targetImage) {
      formData.append('targetImage', targetImage);
    }
    return uploadRequest<UploadResponse>('/api/photos/upload', formData, signal);
  },
};

// ==================== 分析相关 ====================

export interface FeasibilityResult {
  feasibilityScore: number;
  difficulty: string;
  confidence: number;
  dealBreakers: string[];
  dominantFactors: Array<{
    name: string;
    score: number;
    weight: number;
    reason: string;
  }>;
  recommendedActions: Array<{
    action: string;
    why: string;
  }>;
  metrics: Record<string, number>;
  explanation: string;
}

export interface AnalyzePart1Response {
  taskId: string;
  stage: string;
  status: string;
  structuredAnalysis: any;
  naturalLanguage: string;
  protocolVersion: string;
}

export interface AnalyzePart2Response {
  taskId: string;
  stage: string;
  status: string;
  structuredAnalysis: any;
  naturalLanguage: string;
}

export interface TaskDetail {
  task: {
    id: string;
    status: string;
    feasibility_result: FeasibilityResult | null;
    created_at: string;
  };
  structuredResult: any;
}

export const analyzeApi = {
  feasibility: async (
    sourceImage: string,
    targetImage: string,
    taskId?: string,
    signal?: AbortSignal
  ): Promise<FeasibilityResult> => {
    const formData = new FormData();
    formData.append('sourceImage', sourceImage);
    formData.append('targetImage', targetImage);
    if (taskId) {
      formData.append('taskId', taskId);
    }
    return uploadRequest<FeasibilityResult>('/api/analyze/feasibility', formData, signal);
  },

  part1: async (
    sourceImage: string,
    targetImage?: string,
    optionalStyle?: string,
    signal?: AbortSignal
  ): Promise<AnalyzePart1Response> => {
    const formData = new FormData();
    formData.append('sourceImage', sourceImage);
    if (targetImage) {
      formData.append('targetImage', targetImage);
    }
    if (optionalStyle) {
      formData.append('optional_style', optionalStyle);
    }
    return uploadRequest<AnalyzePart1Response>('/api/analyze/part1', formData, signal);
  },

  part2: async (taskId: string): Promise<AnalyzePart2Response> => {
    const formData = new FormData();
    formData.append('taskId', taskId);
    return uploadRequest<AnalyzePart2Response>('/api/analyze/part2', formData);
  },

  getTask: async (taskId: string): Promise<TaskDetail> => {
    return request<TaskDetail>(`/api/analyze/${taskId}`);
  },

  getHistory: async (limit = 20, page = 1): Promise<{
    items: Array<{
      taskId: string;
      created_at: string;
      status: string;
      feasibilityScore: number | null;
    }>;
    page: number;
    pageSize: number;
  }> => {
    return request(`/api/analyze/history?limit=${limit}&page=${page}`);
  },
};

// ==================== 风格模拟相关 ====================

export interface StyleSimulationResponse {
  originalImage: string;
  processedImage: string;
  stylePrompt: string;
  processingTime: number;
}

export const simulateApi = {
  simulateStyle: async (taskId: string): Promise<StyleSimulationResponse> => {
    const formData = new FormData();
    formData.append('taskId', taskId);
    return uploadRequest<StyleSimulationResponse>('/api/simulate/style', formData);
  },
};

// ==================== 导出相关 ====================

export const exportApi = {
  exportXmp: (taskId: string, token: string): string => {
    return `${API_BASE_URL}/api/export/xmp?taskId=${taskId}&token=${token}`;
  },

  exportJsx: (taskId: string, token: string): string => {
    return `${API_BASE_URL}/api/export/jsx?taskId=${taskId}&token=${token}`;
  },

  exportJson: (taskId: string, token: string): string => {
    return `${API_BASE_URL}/api/export/json?taskId=${taskId}&token=${token}`;
  },

  exportPdf: (taskId: string, token: string): string => {
    return `${API_BASE_URL}/api/export/pdf?taskId=${taskId}&token=${token}`;
  },
};

// ==================== 用户相关 ====================

export interface UsageData {
  analysisUsed: number;
  analysisLimit: number;
  generationUsed: number;
  generationLimit: number;
  period: string;
}

export interface ReportItem {
  taskId: string;
  created_at: string;
  feasibilityScore: number | null;
  difficulty: string | null;
  preview_image_url: string | null;
  status: string;
}

export const userApi = {
  getMe: async (): Promise<{
    user: User;
    subscriptionSummary: any;
  }> => {
    return request('/api/user/me');
  },

  getUsage: async (month?: string): Promise<UsageData> => {
    const url = month ? `/api/user/usage?month=${month}` : '/api/user/usage';
    return request<UsageData>(url);
  },

  getReports: async (page = 1, pageSize = 20): Promise<{
    items: ReportItem[];
    page: number;
    pageSize: number;
    total: number;
  }> => {
    return request(`/api/user/reports?page=${page}&pageSize=${pageSize}`);
  },

  updateProfile: async (data: {
    display_name?: string;
    avatar_url?: string;
  }): Promise<void> => {
    return request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data: {
    old_password: string;
    new_password: string;
  }): Promise<void> => {
    return request('/api/user/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ==================== 管理员相关 ====================

export interface AdminLoginResponse {
  mfaToken: string;
  email_sent?: boolean;  // 邮件是否发送成功（开发环境可能为 false）
  dev_mode?: boolean;    // 是否为开发环境（开发环境且邮件未发送时为 true）
}

export interface AdminVerifyMfaResponse {
  adminAuthToken: string;
  user: User;
}

// ==================== 管理后台接口类型定义 ====================

/**
 * Dashboard 指标响应
 */
export interface DashboardMetricsResponse {
  users: {
    total: number;
    active: number;
    recent7Days: number;
  };
  tasks: {
    total: number;
    completed: number;
    recent7Days: number;
  };
  subscriptions: {
    total: number;
  };
  payments: {
    total: number;
    successful: number;
  };
}

/**
 * 用户列表项
 */
export interface AdminUserItem {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
  status: string;
  created_at: string;
}

/**
 * 用户列表响应
 */
export interface AdminUsersResponse {
  items: AdminUserItem[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 用户详情响应
 */
export interface AdminUserDetailResponse {
  user: {
    id: number;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    role: string;
    status: string;
    created_at: string;
  };
  stats: {
    taskCount: number;
  };
  subscription: {
    plan_id: number | null;
    status: string | null;
  };
}

/**
 * 任务列表项
 */
export interface AdminTaskItem {
  taskId: string;
  userId: number | null;
  status: string;
  part2_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 任务列表响应
 */
export interface AdminTasksResponse {
  items: AdminTaskItem[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 任务详情响应
 */
export interface AdminTaskDetailResponse {
  task: {
    id: string;
    userId: number | null;
    status: string;
    part2_completed: boolean;
    created_at: string;
  };
  gemini_result: any;
  structured_result: any;
  feasibility_result: any;
  meta: {
    warnings: string[];
    protocolVersion: string;
  };
}

/**
 * 订阅计划项
 */
export interface AdminPlanItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  period: string;
  features: any;
  is_active: boolean;
}

/**
 * 订阅计划列表响应
 */
export interface AdminPlansResponse {
  items: AdminPlanItem[];
}

/**
 * 支付订单项
 */
export interface AdminPaymentItem {
  id: number;
  order_no: string;
  user_id: number | null;
  plan_id: number | null;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  created_at: string;
}

/**
 * 支付订单列表响应
 */
export interface AdminPaymentsResponse {
  items: AdminPaymentItem[];
  page: number;
  pageSize: number;
  total: number;
}

export const adminApi = {
  // 管理员登录第一步：用户名/邮箱+密码
  // 支持通过用户名（display_name）或邮箱（email）登录
  // 注意：此接口返回完整的响应对象（包含 message），以便前端显示后端返回的提示消息
  login: async (data: { username: string; password: string }): Promise<AdminLoginResponse & { message?: string }> => {
    // 使用 requestWithMessage 获取完整响应（包含 message 字段）
    return requestWithMessage<AdminLoginResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 管理员登录第二步：MFA Token + 验证码
  verifyMfa: async (data: { mfaToken: string; code: string }): Promise<AdminVerifyMfaResponse> => {
    return request<AdminVerifyMfaResponse>('/api/admin/auth/verify-mfa', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Dashboard 运营概览指标
  // 根据开发方案第 768-779 节，Dashboard 使用 GET /api/admin/dashboard/metrics
  getDashboardMetrics: async (): Promise<DashboardMetricsResponse> => {
    return request<DashboardMetricsResponse>('/api/admin/dashboard/metrics');
  },

  // 用户管理列表
  // 根据开发方案第 768-779 节，用户管理使用 GET /api/admin/users
  getUsers: async (params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
  }): Promise<AdminUsersResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.q) queryParams.append('q', params.q);
    if (params?.status) queryParams.append('status', params.status);
    const query = queryParams.toString();
    return request<AdminUsersResponse>(`/api/admin/users${query ? `?${query}` : ''}`);
  },

  // 用户详情
  // 根据开发方案第 768-779 节，用户详情使用 GET /api/admin/users/{userId}
  getUserDetail: async (userId: number): Promise<AdminUserDetailResponse> => {
    return request<AdminUserDetailResponse>(`/api/admin/users/${userId}`);
  },

  // 更新用户状态
  // 根据开发方案第 768-779 节，更新用户状态使用 PATCH /api/admin/users/{userId}/status
  updateUserStatus: async (userId: number, status: string): Promise<void> => {
    return request(`/api/admin/users/${userId}/status?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
    });
  },

  // 任务管理列表
  // 根据开发方案第 768-779 节，任务管理使用 GET /api/admin/tasks
  getTasks: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    q?: string;
  }): Promise<AdminTasksResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.q) queryParams.append('q', params.q);
    const query = queryParams.toString();
    return request<AdminTasksResponse>(`/api/admin/tasks${query ? `?${query}` : ''}`);
  },

  // 任务详情
  // 根据开发方案第 768-779 节，任务详情使用 GET /api/admin/tasks/{taskId}
  getTaskDetail: async (taskId: string): Promise<AdminTaskDetailResponse> => {
    return request<AdminTaskDetailResponse>(`/api/admin/tasks/${taskId}`);
  },

  // 重试失败的任务
  // 根据开发方案第 768-779 节，重试任务使用 POST /api/admin/tasks/{taskId}/retry
  retryTask: async (taskId: string): Promise<void> => {
    return request(`/api/admin/tasks/${taskId}/retry`, {
      method: 'POST',
    });
  },

  // 订阅计划列表
  // 根据开发方案第 768-779 节，订阅管理使用 GET /api/admin/plans
  getPlans: async (): Promise<AdminPlansResponse> => {
    return request<AdminPlansResponse>('/api/admin/plans');
  },

  // 支付订单列表
  // 根据开发方案第 768-779 节，支付管理使用 GET /api/admin/payments
  getPayments: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    method?: string;
    q?: string;
  }): Promise<AdminPaymentsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.method) queryParams.append('method', params.method);
    if (params?.q) queryParams.append('q', params.q);
    const query = queryParams.toString();
    return request<AdminPaymentsResponse>(`/api/admin/payments${query ? `?${query}` : ''}`);
  },
};

export { ApiError };

