/**
 * 高保真渲染服务 (High-Fidelity Render Service)
 * 用途：调用后端 RawTherapee CLI 生成高质量预览图
 */

import { apiClient } from './api';

// ==================== 类型定义 ====================

/** 基本面板参数 */
export interface BasicPanelParams {
  exposure?: string;
  contrast?: string;
  highlights?: string;
  shadows?: string;
  whites?: string;
  blacks?: string;
  texture?: string;
  clarity?: string;
  dehaze?: string;
  vibrance?: string;
  saturation?: string;
}

/** HSL 通道参数 */
export interface HSLChannelParams {
  hue?: string;
  saturation?: string;
  luminance?: string;
}

/** 色彩分级区域参数 */
export interface ColorGradingZoneParams {
  hue?: number;
  saturation?: number;
  luminance?: number;
}

/** 色彩分级参数 */
export interface ColorGradingParams {
  shadows?: ColorGradingZoneParams;
  midtones?: ColorGradingZoneParams;
  highlights?: ColorGradingZoneParams;
  blending?: number;
  balance?: number;
}

/** 校准原色参数 */
export interface CalibrationPrimaryParams {
  hue?: string;
  saturation?: string;
}

/** 相机校准参数 */
export interface CalibrationParams {
  red_primary?: CalibrationPrimaryParams;
  green_primary?: CalibrationPrimaryParams;
  blue_primary?: CalibrationPrimaryParams;
  shadows_tint?: string;
}

/** 白平衡参数 */
export interface WhiteBalanceParams {
  temp?: number;
  tint?: number;
}

/** 高保真渲染请求 */
export interface HiFiRenderRequest {
  image_path?: string; // 【修复】改为可选，如果提供 task_id 则不需要
  task_id?: string; // 【新增】任务 ID，用于从数据库查询实际文件路径
  basic?: BasicPanelParams;
  hsl?: Record<string, HSLChannelParams>;
  colorGrading?: ColorGradingParams;
  calibration?: CalibrationParams;
  whiteBalance?: WhiteBalanceParams;
  use_cache?: boolean;
}

/** 高保真渲染响应 */
export interface HiFiRenderResponse {
  success: boolean;
  message: string;
  rendered_url: string | null;
  cache_hit: boolean;
  render_time_ms: number | null;
}

/** 渲染服务健康状态 */
export interface RenderHealthStatus {
  status: 'healthy' | 'degraded';
  rawtherapee_available: boolean;
  render_engine: string;
  message: string;
}

/** SOLO 模式渲染请求 */
export interface SoloRenderRequest extends HiFiRenderRequest {
  solo_param: string;
}

/** SOLO 模式渲染响应 */
export interface SoloRenderResponse {
  success: boolean;
  message: string;
  solo_param: string;
  rendered_url: string | null;
  cache_hit: boolean;
  render_time_ms: number | null;
}

/** 批量 SOLO 渲染响应 */
export interface BatchSoloRenderResponse {
  total: number;
  success_count: number;
  results: Record<string, SoloRenderResponse>;
}

// ==================== 服务类 ====================

class HiFiRenderService {
  private isAvailable: boolean | null = null;
  private lastHealthCheck: number = 0;
  private readonly healthCheckInterval = 30000; // 30秒

  /**
   * 检查高保真渲染服务是否可用
   */
  async checkHealth(): Promise<RenderHealthStatus> {
    try {
      const response = await apiClient<RenderHealthStatus>('/render/health', {
        method: 'GET'
      });
      this.isAvailable = response.rawtherapee_available;
      this.lastHealthCheck = Date.now();
      return response;
    } catch (error) {
      console.warn('[HiFiRender] 健康检查失败:', error);
      this.isAvailable = false;
      return {
        status: 'degraded',
        rawtherapee_available: false,
        render_engine: 'python (fallback)',
        message: '无法连接到渲染服务'
      };
    }
  }

  /**
   * 获取服务可用性（带缓存）
   */
  async getAvailability(): Promise<boolean> {
    const now = Date.now();
    if (this.isAvailable === null || now - this.lastHealthCheck > this.healthCheckInterval) {
      await this.checkHealth();
    }
    return this.isAvailable ?? false;
  }

  /**
   * 执行高保真渲染
   */
  async render(request: HiFiRenderRequest): Promise<HiFiRenderResponse> {
    console.log('[HiFiRender] 开始高保真渲染:', request.image_path);
    
    try {
      const response = await apiClient<HiFiRenderResponse>(
        '/render/high-fidelity',
        {
          method: 'POST',
          body: JSON.stringify(request)
        }
      );
      
      console.log('[HiFiRender] 渲染完成:', {
        success: response.success,
        cache_hit: response.cache_hit,
        render_time_ms: response.render_time_ms
      });
      
      // 【修复】将相对路径转换为完整的后端 URL
      // 如果 rendered_url 是相对路径（以 / 开头），则拼接后端基础 URL
      if (response.rendered_url && response.rendered_url.startsWith('/')) {
        // 从 API_BASE_URL 中提取协议和域名（例如：http://localhost:8081）
        const backendBaseUrl = 'http://localhost:8081'; // 根据开发方案，后端端口为 8081
        response.rendered_url = `${backendBaseUrl}${response.rendered_url}`;
        console.log('[HiFiRender] 转换后的渲染 URL:', response.rendered_url);
      }
      
      return response;
    } catch (error: any) {
      console.error('[HiFiRender] 渲染失败:', error);
      return {
        success: false,
        message: error.message || '渲染失败',
        rendered_url: null,
        cache_hit: false,
        render_time_ms: null
      };
    }
  }

  /**
   * 执行 SOLO 模式渲染（仅应用指定的参数）
   * 与前端 LightroomPanel 的 SOLO 按钮对应
   */
  async renderSolo(request: SoloRenderRequest): Promise<SoloRenderResponse> {
    console.log('[HiFiRender] 开始 SOLO 模式渲染:', request.solo_param);
    
    try {
      const response = await apiClient<SoloRenderResponse>(
        '/render/solo',
        {
          method: 'POST',
          body: JSON.stringify(request)
        }
      );
      
      console.log('[HiFiRender] SOLO 渲染完成:', {
        solo_param: response.solo_param,
        success: response.success,
        cache_hit: response.cache_hit
      });
      
      return response;
    } catch (error: any) {
      console.error('[HiFiRender] SOLO 渲染失败:', error);
      return {
        success: false,
        message: error.message || 'SOLO 渲染失败',
        solo_param: request.solo_param,
        rendered_url: null,
        cache_hit: false,
        render_time_ms: null
      };
    }
  }

  /**
   * 批量执行多个 SOLO 模式渲染
   */
  async renderBatchSolo(
    imagePath: string,
    filterParams: any,
    soloParams: string[]
  ): Promise<BatchSoloRenderResponse> {
    console.log('[HiFiRender] 开始批量 SOLO 渲染:', soloParams);
    
    try {
      const request = {
        ...this.buildRequestFromFilterParams(imagePath, filterParams),
        solo_params: soloParams
      };
      
      const response = await apiClient<BatchSoloRenderResponse>(
        '/render/solo/batch',
        {
          method: 'POST',
          body: JSON.stringify(request)
        }
      );
      
      console.log('[HiFiRender] 批量 SOLO 渲染完成:', {
        total: response.total,
        success_count: response.success_count
      });
      
      return response;
    } catch (error: any) {
      console.error('[HiFiRender] 批量 SOLO 渲染失败:', error);
      return {
        total: soloParams.length,
        success_count: 0,
        results: {}
      };
    }
  }

  /**
   * 从 FilterParams 构建渲染请求
   * 【修复】支持通过 taskId 获取实际文件路径，避免 blob URL 问题
   */
  buildRequestFromFilterParams(
    imagePath: string,
    filterParams: any,
    taskId?: string | null
  ): HiFiRenderRequest {
    // 构建基本面板参数
    const basic: BasicPanelParams = {
      exposure: String(filterParams.exposure ?? 0),
      contrast: String(filterParams.contrast ?? 0),
      highlights: String(filterParams.highlights ?? 0),
      shadows: String(filterParams.shadows ?? 0),
      whites: String(filterParams.whites ?? 0),
      blacks: String(filterParams.blacks ?? 0),
      texture: String(filterParams.texture ?? 0),
      clarity: String(filterParams.clarity ?? 0),
      dehaze: String(filterParams.dehaze ?? 0),
      vibrance: String(filterParams.vibrance ?? 0),
      saturation: String(filterParams.saturation ?? 0),
    };

    // 构建白平衡参数
    const whiteBalance: WhiteBalanceParams = {
      temp: filterParams.temperature ?? 0,
      tint: filterParams.tint ?? 0,
    };

    // 构建 HSL 参数
    const hsl: Record<string, HSLChannelParams> = {};
    const hslColors = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
    
    for (const color of hslColors) {
      const hueKey = `hsl${color.charAt(0).toUpperCase() + color.slice(1)}Hue`;
      const satKey = `hsl${color.charAt(0).toUpperCase() + color.slice(1)}Sat`;
      const lumKey = `hsl${color.charAt(0).toUpperCase() + color.slice(1)}Lum`;
      
      if (filterParams[hueKey] !== undefined || 
          filterParams[satKey] !== undefined || 
          filterParams[lumKey] !== undefined) {
        hsl[color] = {
          hue: String(filterParams[hueKey] ?? 0),
          saturation: String(filterParams[satKey] ?? 0),
          luminance: String(filterParams[lumKey] ?? 0),
        };
      }
    }

    // 构建色彩分级参数
    const colorGrading: ColorGradingParams = {
      shadows: {
        hue: filterParams.gradingShadowsHue ?? 0,
        saturation: filterParams.gradingShadowsSat ?? 0,
        luminance: filterParams.gradingShadowsLum ?? 0,
      },
      midtones: {
        hue: filterParams.gradingMidtonesHue ?? 0,
        saturation: filterParams.gradingMidtonesSat ?? 0,
        luminance: filterParams.gradingMidtonesLum ?? 0,
      },
      highlights: {
        hue: filterParams.gradingHighlightsHue ?? 0,
        saturation: filterParams.gradingHighlightsSat ?? 0,
        luminance: filterParams.gradingHighlightsLum ?? 0,
      },
      blending: filterParams.gradingBlending ?? 50,
      balance: filterParams.gradingBalance ?? 0,
    };

    return {
      // 【修复】如果提供了 taskId，优先使用 taskId，image_path 作为备用
      // 这样后端可以从数据库查询实际文件路径，避免 blob URL 问题
      task_id: taskId || undefined,
      image_path: taskId ? undefined : imagePath, // 如果有 taskId，不传递 image_path
      basic,
      whiteBalance,
      hsl: Object.keys(hsl).length > 0 ? hsl : undefined,
      colorGrading,
      use_cache: true,
    };
  }
}

// 导出单例
export const hifiRenderService = new HiFiRenderService();

// 导出类型
export type { HiFiRenderService };

