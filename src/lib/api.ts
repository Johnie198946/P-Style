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
 * 从 localStorage 读取 accessToken（JWT）
 * 
 * @returns JWT Token 字符串，如果未登录则返回 null
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
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
  const token = getAuthToken();
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
 * 上传文件请求
 * 用于 multipart/form-data 请求（图片上传等）
 * 
 * @param endpoint - API 端点
 * @param formData - FormData 对象（包含文件和表单字段）
 * @returns Promise<T> - 返回 data 字段的内容
 * @throws ApiError - 如果上传失败
 */
async function uploadRequest<T = any>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {};

  // 注意：multipart/form-data 不需要手动设置 Content-Type，浏览器会自动添加 boundary

  // 自动附加 JWT Token（如果存在）
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  // 检查 HTTP 状态码（先检查，避免非 JSON 响应时解析失败）
  if (!response.ok) {
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
  sendVerificationCode: async (email: string, type: 'register' | 'login'): Promise<void> => {
    return request('/api/auth/send-verification-code', {
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
    targetImage?: File
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('sourceImage', sourceImage);
    if (targetImage) {
      formData.append('targetImage', targetImage);
    }
    return uploadRequest<UploadResponse>('/api/photos/upload', formData);
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
    taskId?: string
  ): Promise<FeasibilityResult> => {
    const formData = new FormData();
    formData.append('sourceImage', sourceImage);
    formData.append('targetImage', targetImage);
    if (taskId) {
      formData.append('taskId', taskId);
    }
    return uploadRequest<FeasibilityResult>('/api/analyze/feasibility', formData);
  },

  part1: async (
    sourceImage: string,
    targetImage?: string,
    optionalStyle?: string
  ): Promise<AnalyzePart1Response> => {
    const formData = new FormData();
    formData.append('sourceImage', sourceImage);
    if (targetImage) {
      formData.append('targetImage', targetImage);
    }
    if (optionalStyle) {
      formData.append('optional_style', optionalStyle);
    }
    return uploadRequest<AnalyzePart1Response>('/api/analyze/part1', formData);
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
}

export interface AdminVerifyMfaResponse {
  adminAuthToken: string;
  user: User;
}

export const adminApi = {
  // 管理员登录第一步：邮箱+密码
  login: async (data: { email: string; password: string }): Promise<AdminLoginResponse> => {
    return request<AdminLoginResponse>('/api/admin/auth/login', {
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
};

export { ApiError };

