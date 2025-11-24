/**
 * 数据适配器 - 将后端 protocolVersion 2025-02 格式转换为前端期望的扁平结构
 * 根据开发方案第 2118-2309 节实现
 */

export interface BackendResponse {
  protocolVersion?: string;
  stage?: string;
  meta?: any;
  sections?: {
    photoReview?: any;
    composition?: any;
    lighting?: any;
    color?: any;
    lightroom?: any;
    photoshop?: any;
  };
  structured_result?: any; // 向后兼容：可能直接是 sections
}

export interface FrontendData {
  review?: any;
  composition?: any;
  lighting?: any;
  color_scheme?: any;
  lightroom?: any;
  photoshop?: any;
  preview_image_url?: string;
}

/**
 * 将后端返回的数据结构转换为前端期望的扁平结构
 */
export function adaptBackendToFrontend(backendData: BackendResponse | null | undefined): FrontendData {
  if (!backendData) return {};

  // 获取 sections（可能直接在 structured_result 中，也可能在顶层）
  const sections = backendData.sections || backendData.structured_result?.sections || backendData.structured_result || {};

  const result: FrontendData = {};

  // 1. Review（照片点评）→ results.review
  if (sections.photoReview) {
    const photoReview = sections.photoReview;
    const structured = photoReview.structured || photoReview;
    
    result.review = {
      style_summary: structured.overviewSummary || structured.photographerStyleSummary || structured.style_summary || "",
      comprehensive_review: structured.overviewSummary || structured.comprehensive_review || "",
      pros_evaluation: structured.dimensions?.advantages?.description || structured.pros_evaluation || "",
      visual_subject_analysis: structured.dimensions?.visualGuidance?.description || structured.visual_subject_analysis,
      focus_exposure_analysis: structured.dimensions?.focusExposure?.description || structured.focus_exposure_analysis,
      emotion: structured.dimensions?.colorEmotion?.description || structured.emotion,
      overlays: structured.dimensions?.visualGuidance?.overlays || structured.overlays,
      simulated_histogram_data: structured.dimensions?.colorDepth?.histogramData || structured.simulated_histogram_data,
      parameter_comparison_table: structured.comparisonTable || structured.parameter_comparison_table,
      feasibility_assessment: structured.feasibility || photoReview.feasibility || structured.feasibility_assessment,
    };
  }

  // 2. Composition（构图分析）→ results.composition
  if (sections.composition) {
    const composition = sections.composition;
    const structured = composition.structured || composition;
    
    // 检测新结构（5字段）或旧结构（7段）
    if (structured.main_structure || structured.subject_weight || structured.visual_guidance) {
      // 新结构（5字段）
      result.composition = {
        main_structure: structured.main_structure || "",
        subject_weight: structured.subject_weight || { description: "" },
        visual_guidance: structured.visual_guidance || { analysis: "", path: "" },
        ratios_negative_space: structured.ratios_negative_space || structured.ratios_negative_space || {},
        style_class: structured.style_class || "",
        // 向后兼容：转换为前端期望的结构
        structure: {
          visual_frame: structured.main_structure || "",
          geometry: "",
          balance: "",
        },
        subject: {
          position: structured.subject_weight?.description || "",
          weight_score: 85,
          method: "",
          analysis: structured.subject_weight?.description || "",
        },
        lines: {
          path: structured.visual_guidance?.path ? [structured.visual_guidance.path] : [],
          guide: structured.visual_guidance?.analysis,
        },
        zones: {
          foreground: "",
          midground: "",
          background: "",
          perspective: "",
        },
        proportions: {
          entities: structured.ratios_negative_space?.entity_ratio || "",
          negative: structured.ratios_negative_space?.space_ratio || "",
          distribution: structured.ratios_negative_space?.distribution || "",
        },
        balance: {
          horizontal: "",
          vertical: "",
          strategy: "",
        },
        style: {
          name: structured.style_class || "",
          method: "",
          features: "",
        },
      };
    } else if (structured.advanced_sections) {
      // 旧结构（7段）
      result.composition = {
        main_structure: structured.advanced_sections["画面主结构分析"] || "",
        subject_weight: { description: structured.advanced_sections["主体位置与视觉权重"] || "" },
        visual_guidance: { analysis: structured.advanced_sections["线条与方向引导"] || "" },
        ratios_negative_space: { 
          entity_ratio: "",
          space_ratio: structured.advanced_sections["比例与留白"] || "",
        },
        style_class: structured.advanced_sections["构图风格归类与改进建议"] || "",
        // 向后兼容
        structure: {
          visual_frame: structured.advanced_sections["画面主结构分析"] || "",
          geometry: "",
          balance: "",
        },
        subject: {
          position: "",
          weight_score: 85,
          method: "",
          analysis: structured.advanced_sections["主体位置与视觉权重"] || "",
        },
        lines: {
          path: [],
          guide: structured.advanced_sections["线条与方向引导"] || "",
        },
        zones: {
          foreground: structured.advanced_sections["空间层次与分区"] || "",
          midground: "",
          background: "",
          perspective: "",
        },
        proportions: {
          entities: "",
          negative: structured.advanced_sections["比例与留白"] || "",
          distribution: "",
        },
        balance: {
          horizontal: "",
          vertical: "",
          strategy: structured.advanced_sections["视觉平衡与动势"] || "",
        },
        style: {
          name: structured.advanced_sections["构图风格归类与改进建议"] || "",
          method: "",
          features: "",
        },
      };
    } else {
      // 向后兼容：直接使用原始数据
      result.composition = composition;
    }
  }

  // 3. Lighting（光影参数）→ results.lighting
  if (sections.lighting) {
    const lighting = sections.lighting;
    const structured = lighting.structured || lighting;
    
    // 转换 basic 和 texture 数据
    const basic = structured.basic || {};
    const texture = structured.texture || {};
    
    result.lighting = {
      exposure_control: [
        { param: "曝光", range: basic.exposure?.range || "+0", desc: basic.exposure?.note || "" },
        { param: "对比度", range: basic.contrast?.range || "+0", desc: basic.contrast?.note || "" },
        { param: "高光", range: basic.highlights?.range || "+0", desc: basic.highlights?.note || "" },
        { param: "阴影", range: basic.shadows?.range || "+0", desc: basic.shadows?.note || "" },
        { param: "白色", range: basic.whites?.range || "+0", desc: basic.whites?.note || "" },
        { param: "黑色", range: basic.blacks?.range || "+0", desc: basic.blacks?.note || "" },
      ],
      tone_curves: structured.toneCurves ? {
        explanation: structured.toneCurves.explanation || "",
        points_rgb: structured.toneCurves.points_rgb || [],
        points_red: structured.toneCurves.points_red || [],
        points_blue: structured.toneCurves.points_blue || [],
      } : undefined,
      texture_clarity: [
        { param: "纹理", range: texture.texture?.range || "+0", desc: texture.texture?.note || "" },
        { param: "清晰度", range: texture.clarity?.range || "+0", desc: texture.clarity?.note || "" },
        { param: "去雾", range: texture.dehaze?.range || "+0", desc: texture.dehaze?.note || "" },
      ],
    };
  }

  // 4. Color（色彩方案）→ results.color_scheme
  if (sections.color) {
    const color = sections.color;
    const structured = color.structured || color;
    
    // 转换 HSL 数组为对象格式
    const hslArray = structured.hsl || [];
    const hslObject: any = {
      red: { hue: 0, saturation: 0, luminance: 0 },
      orange: { hue: 0, saturation: 0, luminance: 0 },
      yellow: { hue: 0, saturation: 0, luminance: 0 },
      green: { hue: 0, saturation: 0, luminance: 0 },
      aqua: { hue: 0, saturation: 0, luminance: 0 },
      blue: { hue: 0, saturation: 0, luminance: 0 },
      purple: { hue: 0, saturation: 0, luminance: 0 },
      magenta: { hue: 0, saturation: 0, luminance: 0 },
    };
    
    // 颜色名称映射
    const colorMap: Record<string, keyof typeof hslObject> = {
      "红": "red", "Red": "red",
      "橙": "orange", "Orange": "orange",
      "黄": "yellow", "Yellow": "yellow",
      "绿": "green", "Green": "green",
      "青": "aqua", "Aqua": "aqua", "Cyan": "aqua",
      "蓝": "blue", "Blue": "blue",
      "紫": "purple", "Purple": "purple",
      "洋红": "magenta", "Magenta": "magenta",
    };
    
    hslArray.forEach((item: any) => {
      const colorName = colorMap[item.color] || item.color?.toLowerCase();
      if (colorName && hslObject[colorName]) {
        hslObject[colorName] = {
          hue: parseFloat(item.hue) || 0,
          saturation: parseFloat(item.saturation) || 0,
          luminance: parseFloat(item.luminance) || 0,
        };
      }
    });
    
    result.color_scheme = {
      style_key_points: structured.styleKey || structured.style_key_points || "",
      white_balance: {
        temp: {
          value: parseFloat(structured.whiteBalance?.temp?.range?.replace(/[^0-9.-]/g, '') || "0"),
          range: structured.whiteBalance?.temp?.range || "+0",
          reason: structured.whiteBalance?.temp?.note || "",
        },
        tint: {
          value: parseFloat(structured.whiteBalance?.tint?.range?.replace(/[^0-9.-]/g, '') || "0"),
          range: structured.whiteBalance?.tint?.range || "+0",
          reason: structured.whiteBalance?.tint?.note || "",
        },
      },
      color_grading: {
        highlights: {
          hue: parseFloat(structured.grading?.highlights?.hue || "0"),
          saturation: parseFloat(structured.grading?.highlights?.saturation || "0"),
          reason: "",
        },
        midtones: {
          hue: parseFloat(structured.grading?.midtones?.hue || "0"),
          saturation: parseFloat(structured.grading?.midtones?.saturation || "0"),
          reason: "",
        },
        shadows: {
          hue: parseFloat(structured.grading?.shadows?.hue || "0"),
          saturation: parseFloat(structured.grading?.shadows?.saturation || "0"),
          reason: "",
        },
        balance: parseFloat(structured.grading?.balance || "0"),
      },
      hsl: hslObject,
    };
  }

  // 5. Lightroom → results.lightroom
  if (sections.lightroom) {
    const lightroom = sections.lightroom;
    const structured = lightroom.structured || lightroom;
    
    // 转换 panels 数组为 basic_panel 对象
    const panels = structured.panels || [];
    const basicPanel: any = {};
    
    // 参数名称映射（英文 -> 小写，中文 -> 英文）
    const paramNameMap: Record<string, string> = {
      "Temp": "temp", "Temperature": "temp", "色温": "temp",
      "Tint": "tint", "色调": "tint",
      "Exposure": "exposure", "曝光": "exposure",
      "Contrast": "contrast", "对比度": "contrast",
      "Highlights": "highlights", "高光": "highlights",
      "Shadows": "shadows", "阴影": "shadows",
      "Whites": "whites", "白色": "whites",
      "Blacks": "blacks", "黑色": "blacks",
      "Texture": "texture", "纹理": "texture",
      "Clarity": "clarity", "清晰度": "clarity",
      "Dehaze": "dehaze", "去雾": "dehaze",
      "Vibrance": "vibrance", "自然饱和度": "vibrance",
      "Saturation": "saturation", "饱和度": "saturation",
    };
    
    // 遍历所有面板，合并参数到 basic_panel
    panels.forEach((panel: any) => {
      if (panel.params && Array.isArray(panel.params)) {
        panel.params.forEach((param: any) => {
          const paramName = param.name || param.label || "";
          const mappedName = paramNameMap[paramName] || paramName.toLowerCase();
          
          // 解析数值（支持 "+0.3"、"-20" 等格式）
          const valueStr = param.value || "+0";
          const value = parseFloat(valueStr.replace(/[^0-9.-]/g, '') || "0");
          
          // 如果参数已存在，保留第一个（或合并逻辑）
          if (!basicPanel[mappedName]) {
            basicPanel[mappedName] = {
              value,
              range: valueStr,
              reason: param.reason || param.purpose || "",
              target_min: param.target_min,
              target_max: param.target_max,
            };
          }
        });
      }
    });
    
    // 转换曲线数据
    const curveData = structured.toneCurve || structured.curve || {};
    const curvePoints = Array.isArray(curveData) ? curveData : curveData.points_rgb || [];
    
    result.lightroom = {
      histogram: structured.histogram || {
        r: [], g: [], b: [], l: [],
        avg_l: 0, shadows: 0, midtones: 0, highlights: 0,
      },
      basic_panel: basicPanel,
      hsl: result.color_scheme?.hsl || {},
      curve: {
        rgb: curvePoints.map((p: any) => Array.isArray(p) ? { x: p[0], y: p[1] } : p),
        red: structured.rgbCurves?.red || [],
        green: structured.rgbCurves?.green || [],
        blue: structured.rgbCurves?.blue || [],
        reason: "",
      },
      split_toning: structured.colorGrading ? {
        highlights: {
          hue: parseFloat(structured.colorGrading.highlights?.hue || "0"),
          saturation: parseFloat(structured.colorGrading.highlights?.saturation || "0"),
          reason: "",
        },
        shadows: {
          hue: parseFloat(structured.colorGrading.shadows?.hue || "0"),
          saturation: parseFloat(structured.colorGrading.shadows?.saturation || "0"),
          reason: "",
        },
        balance: {
          value: parseFloat(structured.colorGrading.balance || "0"),
          reason: "",
        },
      } : undefined,
    };
  }

  // 6. Photoshop → results.photoshop
  if (sections.photoshop) {
    const photoshop = sections.photoshop;
    const structured = photoshop.structured || photoshop;
    const steps = structured.steps || [];
    
    result.photoshop = {
      camera_raw_adjustments: steps.find((s: any) => s.title?.includes("Camera Raw"))?.description || "",
      curve_refinement: steps.find((s: any) => s.title?.includes("Curve"))?.description || "",
      hsl_refinement: steps.find((s: any) => s.title?.includes("HSL"))?.description || "",
      selective_color: steps
        .filter((s: any) => s.title?.includes("Selective Color") || s.title?.includes("选择性"))
        .map((s: any) => ({
          color: s.params?.find((p: any) => p.name === "color")?.value || "",
          adjustments: {
            c: parseFloat(s.params?.find((p: any) => p.name === "c")?.value || "0"),
            m: parseFloat(s.params?.find((p: any) => p.name === "m")?.value || "0"),
            y: parseFloat(s.params?.find((p: any) => p.name === "y")?.value || "0"),
            k: parseFloat(s.params?.find((p: any) => p.name === "k")?.value || "0"),
          },
          method: s.params?.find((p: any) => p.name === "method")?.value || "Relative",
          reason: s.details || s.description || "",
        })),
      local_adjustments: steps
        .filter((s: any) => s.title?.includes("Dodge") || s.title?.includes("Burn") || s.title?.includes("Brush"))
        .map((s: any) => ({
          tool: s.title?.includes("Dodge") ? "Dodge" : s.title?.includes("Burn") ? "Burn" : "Brush",
          location: s.params?.find((p: any) => p.name === "location")?.value || "",
          params: s.params?.map((p: any) => `${p.name}=${p.value}`).join(", ") || "",
          reason: s.details || s.description || "",
        })),
      atmosphere: {
        technique: steps.find((s: any) => s.title?.includes("Atmosphere") || s.title?.includes("Glow"))?.title || "",
        opacity: parseFloat(steps.find((s: any) => s.title?.includes("Atmosphere"))?.opacity || "0"),
        blend_mode: steps.find((s: any) => s.title?.includes("Atmosphere"))?.blendMode || "",
        color: steps.find((s: any) => s.title?.includes("Atmosphere"))?.params?.find((p: any) => p.name === "color")?.value || "",
        reason: steps.find((s: any) => s.title?.includes("Atmosphere"))?.details || "",
      },
      sharpening: {
        technique: steps.find((s: any) => s.title?.includes("Sharpen"))?.title || "High Pass",
        amount: parseFloat(steps.find((s: any) => s.title?.includes("Sharpen"))?.params?.find((p: any) => p.name === "amount")?.value || "0"),
        radius: parseFloat(steps.find((s: any) => s.title?.includes("Sharpen"))?.params?.find((p: any) => p.name === "radius")?.value || "0"),
        threshold: parseFloat(steps.find((s: any) => s.title?.includes("Sharpen"))?.params?.find((p: any) => p.name === "threshold")?.value || "0"),
        reason: steps.find((s: any) => s.title?.includes("Sharpen"))?.details || "",
      },
      grain: {
        amount: parseFloat(steps.find((s: any) => s.title?.includes("Grain"))?.params?.find((p: any) => p.name === "amount")?.value || "0"),
        size: parseFloat(steps.find((s: any) => s.title?.includes("Grain"))?.params?.find((p: any) => p.name === "size")?.value || "0"),
        roughness: parseFloat(steps.find((s: any) => s.title?.includes("Grain"))?.params?.find((p: any) => p.name === "roughness")?.value || "0"),
        reason: steps.find((s: any) => s.title?.includes("Grain"))?.details || "",
      },
    };
  }

  // 7. Preview Image URL（Part3 生成的图片）
  if (backendData.meta?.preview_image_url || sections.preview_image_url) {
    result.preview_image_url = backendData.meta?.preview_image_url || sections.preview_image_url;
  }

  return result;
}

