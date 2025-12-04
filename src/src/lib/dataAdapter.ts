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
  color?: any;
  lightroom?: any;
  photoshop?: any;
  preview_image_url?: string;
  image_analysis?: any; // 【新增】OpenCV 图像分析数据
}

/**
 * 将后端返回的数据结构转换为前端期望的扁平结构
 * 根据开发方案第 2180-2248 行实现
 * 
 * @param backendData - 后端返回的数据，格式：
 *   {
 *     sections: {
 *       photoReview: { naturalLanguage: {...}, structured: {...} },
 *       composition: { naturalLanguage: {...}, structured: {...} },
 *       ...
 *     }
 *   }
 * @returns 前端期望的扁平结构：
 *   {
 *     review: { style_summary, comprehensive_review, ... },
 *     composition: { main_structure, ... },
 *     ...
 *   }
 */
export function adaptBackendToFrontend(backendData: BackendResponse | null | undefined): FrontendData {
  if (!backendData) {
    console.warn('[dataAdapter] backendData 为空，返回空对象');
    return {};
  }

  // 【重要】获取 sections（可能直接在 structured_result 中，也可能在顶层）
  // 根据开发方案第 2193-2196 行，sections 在 structured_result.sections 中
  const sections = backendData.sections || backendData.structured_result?.sections || backendData.structured_result || {};
  
  // 【调试日志】记录数据转换开始（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
  console.log('[dataAdapter] 开始转换数据:', {
    hasSections: !!sections,
    sectionsKeys: sections ? Object.keys(sections) : [],
    hasPhotoReview: !!sections.photoReview,
    photoReviewKeys: sections.photoReview ? Object.keys(sections.photoReview) : [],
      photoReviewStructuredKeys: sections.photoReview?.structured ? Object.keys(sections.photoReview.structured) : [],
  });
  }

  const result: FrontendData = {};

  // 1. Review（照片点评）→ results.review
  // 根据开发方案第 2206-2229 行，从 sections.photoReview.structured 提取字段
  if (sections.photoReview) {
    const photoReview = sections.photoReview;
    const structured = photoReview.structured || photoReview;
    
    // 【调试日志】记录从 structured 提取的原始数据（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('[dataAdapter] 从 structured 提取数据:', {
        hasStyleSummary: !!structured.style_summary,
        styleSummaryLength: structured.style_summary ? structured.style_summary.length : 0,
        styleSummaryPreview: structured.style_summary ? structured.style_summary.substring(0, 50) + '...' : 'empty',
        hasPhotographerStyleSummary: !!structured.photographerStyleSummary,
        photographerStyleSummaryLength: structured.photographerStyleSummary ? structured.photographerStyleSummary.length : 0,
        photographerStyleSummaryPreview: structured.photographerStyleSummary ? structured.photographerStyleSummary.substring(0, 50) + '...' : 'empty',
        hasOverviewSummary: !!structured.overviewSummary,
        overviewSummaryLength: structured.overviewSummary ? structured.overviewSummary.length : 0,
        overviewSummaryPreview: structured.overviewSummary ? structured.overviewSummary.substring(0, 50) + '...' : 'empty',
        hasComprehensiveReview: !!structured.comprehensive_review,
        comprehensiveReviewLength: structured.comprehensive_review ? structured.comprehensive_review.length : 0,
        comprehensiveReviewPreview: structured.comprehensive_review ? structured.comprehensive_review.substring(0, 50) + '...' : 'empty',
        structuredKeys: Object.keys(structured),
        structuredKeysCount: Object.keys(structured).length,
        // 【重要】打印所有 structured 的键值对，帮助定位问题
        structuredFull: structured,
      });
    }
    
    // 【重要】提取 review 数据，确保所有字段都有默认值
    // 【修复】优先从 style_summary 提取，如果没有则从 photographerStyleSummary 或 overviewSummary 提取
    const styleSummary = structured.style_summary || structured.photographerStyleSummary || structured.overviewSummary || "";
    
    // 合并 comprehensive_review, master_archetype, visual_signature
    const masterArchetype = structured.master_archetype || "";
    const visualSignature = structured.visual_signature || "";
    // 【修复】优先从 comprehensive_review 提取，如果没有则从 overviewSummary 提取
    const compReview = structured.comprehensive_review || structured.overviewSummary || "";
    
    // 构建合并后的综合点评（保留原始逻辑作为后备，但现在前端会优先使用独立字段）
    let mergedComprehensiveReview = compReview;
    
    // 提取 Color & Emotion 相关的字段
    const emotionDesc = structured.emotion || structured.dimensions?.colorEmotion?.description || "";
    const colorDepth = structured.color_depth_analysis || structured.dimensions?.colorDepth?.description || "";
    const saturationStrategy = structured.saturation_strategy || "";
    const tonalIntent = structured.tonal_intent || "";

    // 构建合并后的情感描述（同样保留作为后备）
    let mergedEmotion = emotionDesc;
    if (colorDepth) mergedEmotion += `\n\n【色彩深度】${colorDepth}`;
    // saturation_strategy 和 tonal_intent 现在单独展示，不再强制合并到 emotion 中，除非 emotion 为空
    if (!mergedEmotion && saturationStrategy) mergedEmotion += `\n\n【饱和度策略】${saturationStrategy}`;

    result.review = {
      style_summary: styleSummary,
      comprehensive_review: mergedComprehensiveReview,
      // 独立字段
      master_archetype: masterArchetype,
      visual_signature: visualSignature,
      saturation_strategy: saturationStrategy,
      tonal_intent: tonalIntent,
      
      pros_evaluation: structured.dimensions?.advantages?.description || structured.pros_evaluation || "",
      visual_subject_analysis: structured.dimensions?.visualGuidance?.description || structured.visual_subject_analysis || "",
      focus_exposure_analysis: structured.dimensions?.focusExposure?.description || structured.focus_exposure_analysis || "",
      emotion: mergedEmotion,
      // 【新增】提取 image_verification 字段（图像验证描述）
      // 用于前端在参考图和用户图下方显示图像内容描述
      image_verification: structured.image_verification || {},
      // 【修复】提取 overlays 数据：支持新旧两种格式
      // 新格式：overlays.reference 和 overlays.user（两套坐标，分别用于参考图和用户图）
      // 旧格式：overlays.visual_subject/focus_exposure/color_depth（一套坐标，向后兼容）
      overlays: (() => {
        // 【修复】提取 overlays 数据：支持新旧两种格式
        // 新格式：overlays.reference 和 overlays.user（两套坐标，分别用于参考图和用户图）
        // 旧格式：overlays.visual_subject/focus_exposure/color_depth（一套坐标，向后兼容）
        const overlaysData = structured.overlays || structured.dimensions?.visualGuidance?.overlays || {};
        
        // 【调试日志】记录 overlays 数据提取过程（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.log('[dataAdapter] 提取 overlays 数据:', {
            hasStructuredOverlays: !!structured.overlays,
            structuredOverlaysType: typeof structured.overlays,
            structuredOverlaysKeys: structured.overlays && typeof structured.overlays === 'object' ? Object.keys(structured.overlays) : [],
            hasDimensionsVisualGuidanceOverlays: !!structured.dimensions?.visualGuidance?.overlays,
            dimensionsVisualGuidanceOverlaysKeys: structured.dimensions?.visualGuidance?.overlays && typeof structured.dimensions.visualGuidance.overlays === 'object' ? Object.keys(structured.dimensions.visualGuidance.overlays) : [],
            finalOverlaysType: typeof overlaysData,
            finalOverlaysKeys: overlaysData && typeof overlaysData === 'object' ? Object.keys(overlaysData) : [],
            hasReference: overlaysData && typeof overlaysData === 'object' ? 'reference' in overlaysData : false,
            hasUser: overlaysData && typeof overlaysData === 'object' ? 'user' in overlaysData : false,
            finalOverlays: overlaysData
          });
        }
        
        // 【修复】如果 overlays 包含 reference 和 user 字段，说明是新格式（两套坐标）
        // 否则是旧格式（一套坐标），需要向后兼容
        if (overlaysData && typeof overlaysData === 'object' && !Array.isArray(overlaysData) && 'reference' in overlaysData && 'user' in overlaysData) {
          // 新格式：返回包含 reference 和 user 的对象
          if (process.env.NODE_ENV === 'development') {
            console.log('[dataAdapter] ✅ 检测到新格式 overlays（两套坐标）:', {
              referenceKeys: overlaysData.reference && typeof overlaysData.reference === 'object' ? Object.keys(overlaysData.reference) : [],
              userKeys: overlaysData.user && typeof overlaysData.user === 'object' ? Object.keys(overlaysData.user) : []
            });
          }
          return overlaysData;
        } else {
          // 旧格式：向后兼容，将同一套坐标同时用于参考图和用户图
          if (process.env.NODE_ENV === 'development') {
            console.warn('[dataAdapter] ⚠️ 检测到旧格式 overlays（只有一套坐标），将同时用于参考图和用户图。建议后端更新为两套坐标格式。');
            console.warn('[dataAdapter] ⚠️ 旧格式 overlays keys:', overlaysData && typeof overlaysData === 'object' ? Object.keys(overlaysData) : []);
          }
          return {
            reference: overlaysData || {},
            user: overlaysData || {}
          };
        }
      })(),
      // 【修复】转换直方图数据格式
      // 数据来源优先级：
      // 1. structured.simulated_histogram_data（顶层字段，优先使用）
      // 2. structured.dimensions?.colorDepth?.histogramData（嵌套在 dimensions 中）
      simulated_histogram_data: (() => {
        const histogramData = structured.simulated_histogram_data || structured.dimensions?.colorDepth?.histogramData;
        if (!histogramData) {
          // 【调试日志】记录直方图数据缺失
          if (process.env.NODE_ENV === 'development') {
            console.warn('[dataAdapter] simulated_histogram_data 不存在:', {
              hasSimulatedHistogramData: !!structured.simulated_histogram_data,
              hasColorDepthHistogramData: !!structured.dimensions?.colorDepth?.histogramData,
              colorDepthKeys: structured.dimensions?.colorDepth ? Object.keys(structured.dimensions.colorDepth) : []
            });
          }
          return undefined;
        }
        
        // 【修复】提取数据点，支持多种数据格式
        // 后端可能返回的格式：
        // 1. { reference: { data_points: [...] }, user: { data_points: [...] } }（新结构）
        // 2. { reference: [...], user: [...] }（旧结构，直接是数组）
        // 3. { reference: { description: "...", data_points: [...] }, user: { description: "...", data_points: [...] } }（带描述的新结构）
        const result: any = {};
        
        // 【调试日志】记录直方图数据格式（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.log('[dataAdapter] 处理直方图数据:', {
            histogramDataType: typeof histogramData,
            histogramDataKeys: Object.keys(histogramData),
            hasReference: !!histogramData.reference,
            referenceType: typeof histogramData.reference,
            referenceIsArray: Array.isArray(histogramData.reference),
            hasUser: !!histogramData.user,
            userType: typeof histogramData.user,
            userIsArray: Array.isArray(histogramData.user),
          });
        }
        
        // 尝试提取描述
        if (histogramData.description) result.description = histogramData.description;

        // 【修复】提取 reference 数据，支持多种格式
        // 新增支持格式：{ description: "...", data_points: [{ value, frequency, channel }] }
        if (Array.isArray(histogramData.reference)) {
          // 格式1：直接是数组
             result.reference = histogramData.reference;
        } else if (histogramData.reference && typeof histogramData.reference === 'object') {
          // 格式2：是对象，可能包含 data_points 或直接是数组
          if (Array.isArray(histogramData.reference.data_points)) {
             // 【修复】处理 data_points 格式：可能是对象数组 [{ value, frequency, channel }] 或数字数组
             const dataPoints = histogramData.reference.data_points;
             if (dataPoints.length > 0 && typeof dataPoints[0] === 'object' && 'value' in dataPoints[0]) {
               // 格式：对象数组 [{ value, frequency, channel }]，需要转换为数字数组
               // 创建一个 256 长度的数组，根据 value 和 frequency 填充
               const histogramArray = new Array(256).fill(0);
               dataPoints.forEach((point: any) => {
                 const value = Math.round(point.value || 0);
                 const frequency = point.frequency || 0;
                 if (value >= 0 && value < 256) {
                   histogramArray[value] = frequency;
                 }
               });
               result.reference = histogramArray;
             } else {
               // 格式：数字数组，直接使用
               result.reference = dataPoints;
             }
             // 如果描述在 reference 对象里
             if (histogramData.reference.description) result.ref_description = histogramData.reference.description;
          } else if (Array.isArray(histogramData.reference)) {
            // 如果 reference 对象本身是数组（不应该发生，但为了安全）
            result.reference = histogramData.reference;
          } else {
            result.reference = [];
          }
        } else if (Array.isArray(histogramData.data_points)) {
          // 【新增】格式3：顶层 data_points（新 Prompt 结构）
          // 处理 data_points 格式：可能是对象数组 [{ value, frequency, channel }] 或数字数组
          const dataPoints = histogramData.data_points;
          if (dataPoints.length > 0 && typeof dataPoints[0] === 'object' && 'value' in dataPoints[0]) {
            // 格式：对象数组 [{ value, frequency, channel }]，需要转换为数字数组
            // 创建一个 256 长度的数组，根据 value 和 frequency 填充
            const histogramArray = new Array(256).fill(0);
            dataPoints.forEach((point: any) => {
              const value = Math.round(point.value || 0);
              const frequency = point.frequency || 0;
              if (value >= 0 && value < 256) {
                histogramArray[value] = frequency;
              }
            });
            result.reference = histogramArray;
          } else {
            // 格式：数字数组，直接使用
            result.reference = dataPoints;
          }
        } else {
             result.reference = [];
        }

        // 【修复】提取 user 数据，支持多种格式
        // 新增支持格式：{ description: "...", data_points: [{ value, frequency, channel }] }
        if (Array.isArray(histogramData.user)) {
          // 格式1：直接是数组
             result.user = histogramData.user;
        } else if (histogramData.user && typeof histogramData.user === 'object') {
          // 格式2：是对象，可能包含 data_points 或直接是数组
          if (Array.isArray(histogramData.user.data_points)) {
             // 【修复】处理 data_points 格式：可能是对象数组 [{ value, frequency, channel }] 或数字数组
             const dataPoints = histogramData.user.data_points;
             if (dataPoints.length > 0 && typeof dataPoints[0] === 'object' && 'value' in dataPoints[0]) {
               // 格式：对象数组 [{ value, frequency, channel }]，需要转换为数字数组
               // 创建一个 256 长度的数组，根据 value 和 frequency 填充
               const histogramArray = new Array(256).fill(0);
               dataPoints.forEach((point: any) => {
                 const value = Math.round(point.value || 0);
                 const frequency = point.frequency || 0;
                 if (value >= 0 && value < 256) {
                   histogramArray[value] = frequency;
                 }
               });
               result.user = histogramArray;
             } else {
               // 格式：数字数组，直接使用
               result.user = dataPoints;
             }
          } else if (Array.isArray(histogramData.user)) {
            // 如果 user 对象本身是数组（不应该发生，但为了安全）
            result.user = histogramData.user;
          } else {
            result.user = [];
          }
        } else {
             result.user = [];
        }
        
        // 【调试日志】记录转换后的直方图数据（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.log('[dataAdapter] 直方图数据转换完成:', {
            hasReference: !!result.reference,
            referenceLength: Array.isArray(result.reference) ? result.reference.length : 0,
            hasUser: !!result.user,
            userLength: Array.isArray(result.user) ? result.user.length : 0,
            hasDescription: !!result.description,
            hasRefDescription: !!result.ref_description,
          });
        }
        
        return result;
      })(),
      // 【修复】转换参数对比表格式：后端返回的是 { dimension, reference, user }
      // 前端期望的是 { param, ref, user, suggest }
      parameter_comparison_table: (() => {
        const table = structured.comparisonTable || structured.parameter_comparison_table;
        if (!Array.isArray(table)) return [];
        
        return table.map((item: any) => {
          // 如果已经是前端期望的格式（有 param, ref, user, suggest），直接返回
          if (item.param && item.ref !== undefined && item.user !== undefined) {
            return item;
          }
          
          // 如果是后端格式（dimension, reference, user），转换为前端格式
          // 支持 ref_feature 和 user_feature 字段
          // 注意：后端没有 suggest 字段，需要从 reference 和 user 推导，或者留空
          return {
            param: item.dimension || item.param || "",
            ref: item.reference || item.ref_feature || item.ref || "",
            user: item.user || item.user_feature || "",
            suggest: item.suggest || ""  // 如果没有 suggest，留空（前端会显示为空）
          };
        });
      })(),
      // 【修复】提取可行性评估数据
      // 后端返回的格式可能是：
      // 1. structured.feasibility.conversion_feasibility (新格式)
      // 2. structured.feasibility (旧格式，直接是对象)
      // 3. photoReview.feasibility (向后兼容)
      feasibility_assessment: (() => {
        const feasibility = structured.feasibility || photoReview.feasibility || structured.feasibility_assessment;
        if (!feasibility) {
          console.warn('[dataAdapter] feasibility_assessment 不存在，使用默认值');
          return {
            score: 0,
            level: "未知",
            recommendation: "暂无建议"
          };
        }
        
        // 如果是新格式（包含 conversion_feasibility）
        if (feasibility.conversion_feasibility) {
          const cf = feasibility.conversion_feasibility;
          return {
            // 【修复】优先使用顶层的 score，如果没有则根据 can_transform 计算
            score: feasibility.score !== undefined ? feasibility.score : (cf.can_transform ? 85 : 0),
            level: cf.difficulty || feasibility.level || feasibility.difficulty || "未知",
            // 【修复】优先使用顶层的 recommendation，如果没有则使用 conversion_feasibility 中的
            recommendation: feasibility.recommendation || cf.recommendation || "暂无建议",
            // 【修复】limitations 格式统一：优先使用字符串格式（Gemini 返回的文本），如果是数组则转换为字符串
            // 根据 Prompt 模版，Gemini 应该输出字符串格式的 limitations（包含限制因素和评分逻辑）
            // 但为了兼容 CV 算法返回的数组格式，需要统一处理
            limitations: (() => {
              const lim = feasibility.limitations || cf.limiting_factors || [];
              if (typeof lim === 'string') {
                // 如果是字符串，直接使用
                return lim;
              } else if (Array.isArray(lim)) {
                // 如果是数组，转换为字符串（用换行符连接）
                return lim.filter(item => item).join('\n');
              } else {
                // 如果是其他类型，转换为字符串
                return String(lim || "");
              }
            })(),
            // 【修复】优先使用顶层的 confidence，如果没有则使用 conversion_feasibility 中的
            confidence: feasibility.confidence !== undefined ? feasibility.confidence : (cf.confidence || 0),
          };
        }
        
        // 如果是旧格式（直接是对象，包含 score, level, recommendation）
        // 【修复】limitations 格式统一：优先使用字符串格式，如果是数组则转换为字符串
        const lim = feasibility.limitations || [];
        let limitationsStr: string;
        if (typeof lim === 'string') {
          limitationsStr = lim;
        } else if (Array.isArray(lim)) {
          limitationsStr = lim.filter(item => item).join('\n');
        } else {
          limitationsStr = String(lim || "");
        }
        
        return {
          score: feasibility.score || 0,
          level: feasibility.level || "未知",
          recommendation: feasibility.recommendation || "暂无建议",
          limitations: limitationsStr,
          confidence: feasibility.confidence || 0,
        };
      })(),
    };
    
    // 【调试日志】记录 review 数据提取结果（仅在开发环境）
    if (process.env.NODE_ENV === 'development' && result.review) {
    console.log('[dataAdapter] review 数据提取完成:', {
      hasReview: !!result.review,
      reviewKeys: result.review ? Object.keys(result.review) : [],
      hasStyleSummary: !!result.review?.style_summary,
        styleSummaryLength: result.review?.style_summary ? result.review.style_summary.length : 0,
        styleSummaryPreview: result.review?.style_summary ? result.review.style_summary.substring(0, 50) + '...' : 'empty',
      hasComprehensiveReview: !!result.review?.comprehensive_review,
        comprehensiveReviewLength: result.review?.comprehensive_review ? result.review.comprehensive_review.length : 0,
        comprehensiveReviewPreview: result.review?.comprehensive_review ? result.review.comprehensive_review.substring(0, 50) + '...' : 'empty',
      hasProsEvaluation: !!result.review?.pros_evaluation,
        prosEvaluationLength: result.review?.pros_evaluation ? result.review.pros_evaluation.length : 0,
        hasOverlays: !!result.review?.overlays,
        overlaysKeys: result.review?.overlays ? Object.keys(result.review.overlays) : [],
        overlaysCount: result.review?.overlays ? Object.keys(result.review.overlays).length : 0,
        hasHistogramData: !!result.review?.simulated_histogram_data,
        histogramDataKeys: result.review?.simulated_histogram_data ? Object.keys(result.review.simulated_histogram_data) : [],
      hasFeasibility: !!result.review?.feasibility_assessment,
    });
    }
  }

  // 2. Composition（构图分析）→ results.composition
  if (sections.composition) {
    const composition = sections.composition;
    const structured = composition.structured || composition;
    
    // 【🔴 关键修复】从 photoReview.structured.module_2_composition 中提取 visual_flow 和 composition_clinic
    // 因为 _format_photo_review 现在将 module_2_composition 放在 photoReview.structured 中
    // 【新增】同时检查 structured 顶层是否有 composition_clinic（_format_photo_review 也会直接添加到顶层）
    const module_2_composition = sections.photoReview?.structured?.module_2_composition || structured.module_2_composition;
    const composition_clinic_from_top = sections.photoReview?.structured?.composition_clinic || structured.composition_clinic; // 【新增】从顶层提取
    
    // 【新增】确保 module_2_composition 数据传递到前端（用于 CompositionAnalysisPanel）
    if (module_2_composition) {
      // 将 module_2_composition 添加到 result.composition 中，供前端使用
      if (!result.composition) {
        result.composition = {};
      }
      result.composition.module_2_composition = module_2_composition;
    }
    
    if (module_2_composition || composition_clinic_from_top) {
      // 【调试日志】记录 module_2_composition 数据（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('[dataAdapter] 🔍 Debug Module 2:', {
          hasModule2: !!module_2_composition,
          module2Keys: module_2_composition ? Object.keys(module_2_composition) : [],
          hasVisualFlow: !!module_2_composition?.visual_flow,
          visualFlowKeys: module_2_composition?.visual_flow ? Object.keys(module_2_composition.visual_flow) : [],
          hasCompositionClinic: !!(module_2_composition?.composition_clinic || composition_clinic_from_top),
          compositionClinicFromModule2: !!module_2_composition?.composition_clinic,
          compositionClinicFromTop: !!composition_clinic_from_top,
          compositionClinicKeys: (module_2_composition?.composition_clinic || composition_clinic_from_top) ? Object.keys(module_2_composition?.composition_clinic || composition_clinic_from_top) : [],
        });
      }
      
      // 如果 structured 中没有 visual_flow，从 module_2_composition 中提取
      if (!structured.visual_flow && module_2_composition?.visual_flow) {
        structured.visual_flow = module_2_composition.visual_flow;
        if (process.env.NODE_ENV === 'development') {
          console.log('[dataAdapter] ✅ 从 module_2_composition 提取 visual_flow');
        }
      }
      
      // 【修复】优先从顶层提取 composition_clinic，如果没有则从 module_2_composition 中提取
      if (!structured.composition_clinic) {
        if (composition_clinic_from_top) {
          structured.composition_clinic = composition_clinic_from_top;
          if (process.env.NODE_ENV === 'development') {
            console.log('[dataAdapter] ✅ 从 structured 顶层提取 composition_clinic');
          }
        } else if (module_2_composition?.composition_clinic) {
          structured.composition_clinic = module_2_composition.composition_clinic;
          if (process.env.NODE_ENV === 'development') {
            console.log('[dataAdapter] ✅ 从 module_2_composition 提取 composition_clinic');
          }
        }
      }
    }
    
    // 【新增】从 photoReview.structured.spatial_analysis 中提取 visual_mass（用于 Composition 的 visual_data）
    // 后端现在将 visual_mass 放在 spatial_analysis 中，而不是直接在 composition.structured 中
    const visual_mass_from_spatial_analysis = sections.photoReview?.structured?.spatial_analysis?.visual_mass as any;
    if (visual_mass_from_spatial_analysis && process.env.NODE_ENV === 'development') {
        console.log('[dataAdapter] ✅ 从 photoReview.structured.spatial_analysis.visual_mass 提取 visual_mass:', {
        hasScore: !!(visual_mass_from_spatial_analysis.score),
        hasCompositionRule: !!(visual_mass_from_spatial_analysis.composition_rule),
        hasCenterPoint: !!(visual_mass_from_spatial_analysis.center_point),
        hasPolygonPoints: !!(visual_mass_from_spatial_analysis.polygon_points),
        });
    }
    
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
          // 【修复】position 应该显示位置坐标，如果有 center_point 则显示坐标，否则显示描述
          position: (() => {
            // 优先从 visual_mass 中提取位置坐标
            const visual_mass = visual_mass_from_spatial_analysis || structured.visual_mass;
            if (visual_mass?.center_point) {
              return `X: ${Math.round(visual_mass.center_point.x)}% Y: ${Math.round(visual_mass.center_point.y)}%`;
            } else if (visual_mass?.center_of_gravity && Array.isArray(visual_mass.center_of_gravity)) {
              const [x, y] = visual_mass.center_of_gravity;
              return `X: ${Math.round(x)}% Y: ${Math.round(y)}%`;
            }
            // 如果没有坐标，则显示描述文本
            return structured.subject_weight?.description || "";
          })(),
          // 【修复】优先使用 structured.subject_weight.score，如果没有则使用默认值 85
          weight_score: structured.subject_weight?.score ?? 85,
          // 【修复】提取 method 字段，如果不存在则使用空字符串
          method: structured.subject_weight?.method || "",
          analysis: structured.subject_weight?.description || "",
        },
        lines: {
          // 【修复】path 应该从 visual_flow.vectors 中提取，转换为路径描述数组
          path: (() => {
            if (structured.visual_flow?.vectors && Array.isArray(structured.visual_flow.vectors)) {
              // 从 vectors 数组中提取路径描述
              return structured.visual_flow.vectors.map((vec: any) => {
                const type = vec.type || 'leading';
                const start = vec.start ? `(${vec.start.x?.toFixed(1)}, ${vec.start.y?.toFixed(1)})` : '';
                const end = vec.end ? `(${vec.end.x?.toFixed(1)}, ${vec.end.y?.toFixed(1)})` : '';
                return `${type}: ${start} → ${end}`;
              });
            }
            // 如果没有 vectors，则从 visual_guidance.path 提取（可能是字符串）
            if (structured.visual_guidance?.path) {
              return Array.isArray(structured.visual_guidance.path) 
                ? structured.visual_guidance.path 
                : [structured.visual_guidance.path];
            }
            return [];
          })(),
          guide: structured.visual_guidance?.analysis,
          // 【新增】视觉流向量数据（用于前端图片上绘制视觉流路径）
          // 【修复】支持新旧两种格式：
          // 1. 新格式：vanishing_point + vectors（X-Ray Vision 格式）
          // 2. 旧格式：entry_point, focal_point, exit_point（向后兼容）
          vectors: structured.visual_flow ? {
            // 新格式支持
            vanishing_point: structured.visual_flow.vanishing_point,
            vectors: structured.visual_flow.vectors,
            // 旧格式支持（向后兼容）
            entry: structured.visual_flow.entry_point ? { label: structured.visual_flow.entry_point.label || "", coords: structured.visual_flow.entry_point.coordinates || [0,0] } : undefined,
            focal: structured.visual_flow.focal_point ? { label: structured.visual_flow.focal_point.label || "", coords: structured.visual_flow.focal_point.coordinates || [0,0] } : undefined,
            exit: structured.visual_flow.exit_point ? { label: structured.visual_flow.exit_point.label || "", coords: structured.visual_flow.exit_point.coordinates || [0,0] } : undefined,
            path: structured.visual_flow.path_vector || []
          } : undefined,
          // 【新增】visual_guidance 的完整数据（包含 analysis 和 path）
          visual_guidance: structured.visual_guidance || {}
        },
        // 【新增】直接传递 visual_flow 数据（用于 VisualVectorsOverlay 组件）
        visual_flow: structured.visual_flow || undefined,
        // 【新增】直接传递 composition_clinic 数据（用于 CompositionClinicPanel 组件）
        composition_clinic: structured.composition_clinic || undefined,
        zones: {
          foreground: structured.spatial_depth?.foreground?.content || (typeof structured.spatial_depth?.foreground === 'string' ? structured.spatial_depth.foreground : "") || "",
          midground: structured.spatial_depth?.midground?.content || (typeof structured.spatial_depth?.midground === 'string' ? structured.spatial_depth.midground : "") || "",
          background: structured.spatial_depth?.background?.content || (typeof structured.spatial_depth?.background === 'string' ? structured.spatial_depth.background : "") || "",
          perspective: "",
          // 【新增】空间深度详细数据（用于前端展示 Z-Depth 分析）
          // 【修复】支持两种数据结构：对象格式（{content, depth_range}）和字符串格式
          // 【修复】depth_range 可能是 0-100 的百分比，需要转换为 0-1 范围（前端期望 0-1）
          details: structured.spatial_depth ? {
            foreground: { 
              content: typeof structured.spatial_depth.foreground === 'string' 
                ? structured.spatial_depth.foreground 
                : (structured.spatial_depth.foreground?.content || ""), 
              range: (() => {
                if (typeof structured.spatial_depth.foreground === 'object' && structured.spatial_depth.foreground?.depth_range) {
                  const range = structured.spatial_depth.foreground.depth_range;
                  // 如果 range 是 0-100 的百分比，转换为 0-1
                  if (Array.isArray(range) && range.length === 2) {
                    const [start, end] = range;
                    // 如果值大于 1，说明是百分比，需要除以 100
                    return [start > 1 ? start / 100 : start, end > 1 ? end / 100 : end];
                  }
                  return range;
                }
                return [0, 0.3]; // 默认前景范围
              })()
            },
            midground: { 
              content: typeof structured.spatial_depth.midground === 'string' 
                ? structured.spatial_depth.midground 
                : (structured.spatial_depth.midground?.content || ""), 
              range: (() => {
                if (typeof structured.spatial_depth.midground === 'object' && structured.spatial_depth.midground?.depth_range) {
                  const range = structured.spatial_depth.midground.depth_range;
                  if (Array.isArray(range) && range.length === 2) {
                    const [start, end] = range;
                    return [start > 1 ? start / 100 : start, end > 1 ? end / 100 : end];
                  }
                  return range;
                }
                return [0.3, 0.7]; // 默认中景范围
              })()
            },
            background: { 
              content: typeof structured.spatial_depth.background === 'string' 
                ? structured.spatial_depth.background 
                : (structured.spatial_depth.background?.content || ""), 
              range: (() => {
                if (typeof structured.spatial_depth.background === 'object' && structured.spatial_depth.background?.depth_range) {
                  const range = structured.spatial_depth.background.depth_range;
                  if (Array.isArray(range) && range.length === 2) {
                    const [start, end] = range;
                    return [start > 1 ? start / 100 : start, end > 1 ? end / 100 : end];
                  }
                  return range;
                }
                return [0.7, 1.0]; // 默认背景范围
              })()
            }
          } : undefined,
          // 【新增】完整的 spatial_depth 数据（用于前端展示）
          spatial_depth: structured.spatial_depth || {}
        },
        proportions: {
          entities: structured.ratios_negative_space?.entity_ratio || "",
          negative: structured.ratios_negative_space?.space_ratio || (structured.negative_space ? `${structured.negative_space.percentage}%` : ""),
          distribution: structured.ratios_negative_space?.distribution || "",
        },
        balance: {
          horizontal: structured.negative_space?.horizontal_balance || "",
          vertical: structured.negative_space?.vertical_balance || "",
          strategy: structured.negative_space ? `Negative Space: ${structured.negative_space.percentage}%` : "",
          // 【新增】留白平衡详细数据
          details: structured.negative_space ? {
             percentage: structured.negative_space.percentage || 0,
             h_balance: structured.negative_space.horizontal_balance || "",
             v_balance: structured.negative_space.vertical_balance || ""
          } : undefined
        },
        style: {
          name: structured.style_class || "",
          method: "",
          features: "",
        },
        // 【优化】Visual Mass 功能所需的数据（使用新的 visual_mass 格式）
        // 【新增】支持显著性遮罩图 URL（优先使用遮罩图，如果没有则使用多边形）
        // 【修复】支持新的字段：score、composition_rule、polygon_points、center_point
        // 【修复】优先从 spatial_analysis.visual_mass 提取，如果没有则从 structured.visual_mass 提取（向后兼容）
        visual_data: (() => {
          // 【优先】从 photoReview.structured.spatial_analysis.visual_mass 提取（后端字段映射后的位置）
          const visual_mass = visual_mass_from_spatial_analysis || structured.visual_mass;
          if (!visual_mass) return undefined;
          
          // 检查是否有有效数据
          const hasData = visual_mass.vertices || visual_mass.polygon_points || visual_mass.saliency_mask_url;
          if (!hasData) return undefined;
          
          return {
          // 【新增】如果提供了显著性遮罩图 URL，优先使用遮罩图方案
          saliency_mask_url: visual_mass.saliency_mask_url || undefined,
          // 【修复】优先使用 polygon_points（新格式），如果没有则使用 vertices（旧格式）
          // 将坐标转换为 SVG polygon points 格式
          subject_poly: (() => {
            const polygonPoints = visual_mass.polygon_points || visual_mass.vertices;
            if (!polygonPoints) return undefined;
            
            // 处理两种格式：
            // 1. polygon_points: [{x: number, y: number}, ...]（新格式）
            // 2. vertices: [[x, y], ...]（旧格式，可能是 0-1 或 0-100）
            if (Array.isArray(polygonPoints) && polygonPoints.length > 0) {
              if (typeof polygonPoints[0] === 'object' && 'x' in polygonPoints[0]) {
                // 新格式：{x, y} 对象数组
                return polygonPoints
                  .map((p: any) => `${p.x},${p.y}`)
                  .join(' ');
              } else if (Array.isArray(polygonPoints[0])) {
                // 旧格式：[x, y] 数组
                return polygonPoints
                  .map((coord: number[]) => {
                    // 如果坐标是 0-1 范围，转换为 0-100；如果已经是 0-100，直接使用
                    const x = coord[0] <= 1 ? coord[0] * 100 : coord[0];
                    const y = coord[1] <= 1 ? coord[1] * 100 : coord[1];
                    return `${x},${y}`;
                  })
                  .join(' ');
              }
            }
            return undefined;
          })(),
          // 【新增】保存完整的 visual_mass 数据（包含所有新字段）
          visual_mass: {
            type: visual_mass.type || 'polygon',
            confidence: visual_mass.confidence || 0.0,
            // 【新增】支持新字段
            score: visual_mass.score ?? (visual_mass.confidence ? Math.round(visual_mass.confidence * 100) : 50),
            composition_rule: visual_mass.composition_rule || 'Unknown',
            // 【新增】支持 center_point（新格式）和 center_of_gravity（旧格式）
            center_point: visual_mass.center_point || (visual_mass.center_of_gravity ? {
              x: visual_mass.center_of_gravity[0] <= 1 ? visual_mass.center_of_gravity[0] * 100 : visual_mass.center_of_gravity[0],
              y: visual_mass.center_of_gravity[1] <= 1 ? visual_mass.center_of_gravity[1] * 100 : visual_mass.center_of_gravity[1]
            } : { x: 50, y: 50 }),
            center_of_gravity: visual_mass.center_of_gravity || (visual_mass.center_point ? [
              visual_mass.center_point.x <= 1 ? visual_mass.center_point.x * 100 : visual_mass.center_point.x,
              visual_mass.center_point.y <= 1 ? visual_mass.center_point.y * 100 : visual_mass.center_point.y
            ] : [50, 50]),
            vertices: visual_mass.vertices || [],
            polygon_points: visual_mass.polygon_points || (visual_mass.vertices ? visual_mass.vertices.map((v: number[]) => ({
              x: v[0] <= 1 ? v[0] * 100 : v[0],
              y: v[1] <= 1 ? v[1] * 100 : v[1]
            })) : []),
            saliency_mask_url: visual_mass.saliency_mask_url || undefined
          }
        };
        })()
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
    
    // 【新增】解析 action_priorities 数据（行动优先级）
    const action_priorities = structured.action_priorities || {};
    
    result.lighting = {
      exposure_control: [
        { 
          param: "曝光", 
          range: basic.exposure?.range || "+0", 
          desc: basic.exposure?.note || "",
          action: basic.exposure?.action || "", // 【新增】动作描述（如："压暗"、"提亮"）
        },
        { 
          param: "对比度", 
          range: basic.contrast?.range || "+0", 
          desc: basic.contrast?.note || "",
          action: basic.contrast?.action || "",
        },
        { 
          param: "高光", 
          range: basic.highlights?.range || "+0", 
          desc: basic.highlights?.note || "",
          action: basic.highlights?.action || "",
        },
        { 
          param: "阴影", 
          range: basic.shadows?.range || "+0", 
          desc: basic.shadows?.note || "",
          action: basic.shadows?.action || "",
        },
        { 
          param: "白色", 
          range: basic.whites?.range || "+0", 
          desc: basic.whites?.note || "",
          action: basic.whites?.action || "",
        },
        { 
          param: "黑色", 
          range: basic.blacks?.range || "+0", 
          desc: basic.blacks?.note || "",
          action: basic.blacks?.action || "",
        },
      ],
      // 【修复】确保曲线点格式统一为对象数组格式 {x, y}，兼容后端传递的两种格式
      tone_curves: structured.toneCurves ? {
        explanation: structured.toneCurves.explanation || "",
        // 转换函数：将可能的 [x, y] 数组格式转换为 {x, y} 对象格式
        points_rgb: (structured.toneCurves.points_rgb || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        points_red: (structured.toneCurves.points_red || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        points_green: (structured.toneCurves.points_green || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        points_blue: (structured.toneCurves.points_blue || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
      } : undefined,
      texture_clarity: [
        { 
          param: "纹理", 
          range: texture.texture?.range || "+0", 
          desc: texture.texture?.note || "",
          action: texture.texture?.action || "",
        },
        { 
          param: "清晰度", 
          range: texture.clarity?.range || "+0", 
          desc: texture.clarity?.note || "",
          action: texture.clarity?.action || "",
        },
        { 
          param: "去雾", 
          range: texture.dehaze?.range || "+0", 
          desc: texture.dehaze?.note || "",
          action: texture.dehaze?.action || "",
        },
      ],
      // 【新增】行动优先级（Top 3 Actions）
      action_priorities: action_priorities.primary_action ? {
        note: action_priorities.note || "",
        primary_action: action_priorities.primary_action || {},
        secondary_action: action_priorities.secondary_action || {},
        tertiary_action: action_priorities.tertiary_action || {},
      } : undefined,
    };
  }

  // 4. Color（色彩方案）→ results.color_scheme
  if (sections.color) {
    const color = sections.color;
    const structured = color.structured || color;
    
    // 【调试日志】记录 color section 的数据结构（详细版本）
    console.log('[dataAdapter] 🔍 Color Section 数据检查（详细）:', {
      hasColor: !!sections.color,
      colorKeys: color ? Object.keys(color) : [],
      hasStructured: !!color.structured,
      structuredKeys: structured ? Object.keys(structured) : [],
      // 【关键】检查 HSL 数据（详细）
      hasHsl: !!structured.hsl,
      hslType: Array.isArray(structured.hsl) ? 'array' : typeof structured.hsl,
      hslIsArray: Array.isArray(structured.hsl),
      hslLength: Array.isArray(structured.hsl) ? structured.hsl.length : 'not array',
      hslSample: Array.isArray(structured.hsl) ? structured.hsl.slice(0, 5) : (structured.hsl ? [structured.hsl] : []),
      // 【新增】检查 HSL 数据的完整内容
      hslFull: Array.isArray(structured.hsl) ? structured.hsl : (structured.hsl ? [structured.hsl] : []),
      // 【新增】检查 HSL 数据的完整 JSON 字符串（用于调试）
      hslFullJson: JSON.stringify(structured.hsl, null, 2).substring(0, 1000), // 只显示前 1000 字符
      // 【关键】检查三个字段是否存在（包括空字符串检查）
      master_style_recap: structured.master_style_recap,
      master_style_recapType: typeof structured.master_style_recap,
      master_style_recapLength: structured.master_style_recap?.length || 0,
      master_style_recapTruthy: !!structured.master_style_recap,
      style_summary_recap: structured.style_summary_recap,
      style_summary_recapType: typeof structured.style_summary_recap,
      style_summary_recapLength: structured.style_summary_recap?.length || 0,
      style_summary_recapTruthy: !!structured.style_summary_recap,
      key_adjustment_strategy: structured.key_adjustment_strategy,
      key_adjustment_strategyType: typeof structured.key_adjustment_strategy,
      key_adjustment_strategyLength: structured.key_adjustment_strategy?.length || 0,
      key_adjustment_strategyTruthy: !!structured.key_adjustment_strategy,
      styleKey: structured.styleKey,
      style_key_points: structured.style_key_points,
      // 【关键】检查原始 raw 数据
      rawPhase1Extraction: structured.phase_1_extraction,
    });
    
    // 转换 HSL 数组为对象格式
    // 【修复】确保 structured.hsl 存在且是数组格式
    const hslArray = Array.isArray(structured.hsl) ? structured.hsl : (structured.hsl ? [structured.hsl] : []);
    
    // 【调试日志】记录 HSL 数组原始数据（强制输出，用于调试）
    console.log('[dataAdapter] 🔴🔴🔴 HSL 数组原始数据（强制输出）:', {
      hasStructuredHsl: !!structured.hsl,
      structuredHslType: typeof structured.hsl,
      structuredHslIsArray: Array.isArray(structured.hsl),
      structuredHslLength: Array.isArray(structured.hsl) ? structured.hsl.length : 'not array',
      structuredHslSample: Array.isArray(structured.hsl) ? structured.hsl.slice(0, 3) : structured.hsl,
      hslArrayLength: hslArray.length,
      hslArraySample: hslArray.slice(0, 3),
      // 【新增】完整输出 structured.hsl 的 JSON 字符串（前 2000 字符）
      structuredHslJson: JSON.stringify(structured.hsl, null, 2).substring(0, 2000),
    });
    
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
    
    // 【调试日志】记录 structured.hsl 的原始数据（在转换之前）
    console.log('[dataAdapter] 🔍 structured.hsl 原始数据检查:', {
      hasStructuredHsl: !!structured.hsl,
      structuredHslType: typeof structured.hsl,
      structuredHslIsArray: Array.isArray(structured.hsl),
      structuredHslLength: Array.isArray(structured.hsl) ? structured.hsl.length : (structured.hsl ? Object.keys(structured.hsl).length : 0),
      structuredHslSample: Array.isArray(structured.hsl) 
        ? structured.hsl.slice(0, 3).map((item: any) => ({
            color: item.color,
            hue: item.hue,
            saturation: item.saturation,
            luminance: item.luminance,
            note: item.note,
          }))
        : (structured.hsl ? Object.keys(structured.hsl).slice(0, 3).map(key => ({
            key,
            data: structured.hsl[key],
          })) : []),
      hslArrayLength: hslArray.length,
      hslArraySample: hslArray.slice(0, 3).map((item: any) => ({
        color: item.color,
        hue: item.hue,
        saturation: item.saturation,
        luminance: item.luminance,
        note: item.note,
      })),
    });
    
    // 【修复】映射 HSL 数据，包括 desc/note 字段（用于前端显示调整原因描述）
    // 【修复】处理字符串格式的 HSL 值（如 "+10"、"-5"），确保正确解析正负号
    hslArray.forEach((item: any) => {
      // 【修复】支持多种颜色名称格式（中文、英文、大小写）
      const itemColor = item.color || "";
      const colorName = colorMap[itemColor] || colorMap[itemColor.toLowerCase()] || itemColor?.toLowerCase();
      
      // 【调试日志】记录颜色映射过程 - 【修复】强制输出所有颜色
      console.log(`[dataAdapter] 🔍 HSL 颜色映射: itemColor="${itemColor}", colorName="${colorName}", inColorMap=${!!colorMap[itemColor]}, hslObjectHasKey=${!!(colorName && hslObject[colorName])}`);
      
      if (colorName && hslObject[colorName]) {
        // 【修复】解析 HSL 值，支持字符串格式（如 "+10"、"-5"）和数字格式
        // 注意：后端返回的格式可能是字符串（如 "+10"）或数字（如 10）
        const parseHslValue = (val: any): number => {
          if (val === null || val === undefined) return 0;
          // 【修复】如果是数字格式，直接返回
          if (typeof val === 'number') return val;
          // 处理字符串格式，支持 "+10"、"-5"、"0" 等
          const str = String(val).trim();
          // 【修复】处理 "+0"、"-0"、"0" 等特殊情况
          if (str === "+0" || str === "-0" || str === "0" || str === "") return 0;
          // 【修复】提取数字部分（保留正负号）
          // 使用正则表达式提取数字部分，支持 "+10"、"-5"、"10" 等格式
          const numberMatch = str.match(/^([+-]?)(\d+\.?\d*)$/);
          if (numberMatch) {
            const sign = numberMatch[1]; // "+"、"-" 或 ""
            const number = parseFloat(numberMatch[2]);
            if (isNaN(number)) return 0;
            // 如果有符号，应用符号；否则返回解析后的数字
            if (sign === '+') return Math.abs(number);
            if (sign === '-') return -Math.abs(number);
            return number;
          }
          // 【向后兼容】如果正则匹配失败，尝试直接解析
          const parsed = parseFloat(str.replace(/[^0-9.-]/g, '') || '0');
          if (isNaN(parsed)) return 0;
          // 如果字符串以 '+' 开头，返回正数；如果以 '-' 开头，返回负数；否则返回解析后的值
          if (str.startsWith('+')) return Math.abs(parsed);
          if (str.startsWith('-')) return -Math.abs(parsed);
          return parsed;
        };
        
        const parsedHue = parseHslValue(item.hue);
        const parsedSat = parseHslValue(item.saturation);
        const parsedLum = parseHslValue(item.luminance);
        
        // 【调试日志】记录每个颜色的解析过程（详细版本）- 【修复】强制输出，不依赖 NODE_ENV
        console.log(`[dataAdapter] 🔴 HSL 颜色 ${colorName} 解析过程:`, {
          itemColor: itemColor,
          colorName: colorName,
          inColorMap: !!colorMap[itemColor],
          originalHue: item.hue,
          originalHueType: typeof item.hue,
          originalSaturation: item.saturation,
          originalSaturationType: typeof item.saturation,
          originalLuminance: item.luminance,
          originalLuminanceType: typeof item.luminance,
          parsedHue: parsedHue,
          parsedSat: parsedSat,
          parsedLum: parsedLum,
          note: item.note || item.desc || "",
          // 【新增】完整的 item JSON
          itemJson: JSON.stringify(item),
        });
        
        hslObject[colorName] = {
          hue: parsedHue,
          saturation: parsedSat,
          luminance: parsedLum,
          // 【新增】提取 desc 或 note 字段（后端在 _format_color_part2 中将 desc 映射到 note）
          desc: item.desc || item.note || "",  // 优先使用 desc，如果没有则使用 note
          note: item.note || item.desc || "",  // 向后兼容：同时提供 note 字段
        };
        
        // 【调试日志】记录解析结果（即使值为 0 也记录，用于调试）- 【修复】强制输出
        console.log(`[dataAdapter] ✅ HSL 颜色 ${colorName} 已更新:`, {
          original: { hue: item.hue, saturation: item.saturation, luminance: item.luminance },
          parsed: { hue: parsedHue, saturation: parsedSat, luminance: parsedLum },
          hslObjectValue: hslObject[colorName],
        });
      } else {
        // 【调试日志】记录未映射的颜色 - 【修复】强制输出
        if (itemColor) {
          console.warn(`[dataAdapter] ⚠️ HSL 颜色未映射: itemColor="${itemColor}", colorName="${colorName}", colorMapKeys=${Object.keys(colorMap).join(', ')}`);
        }
      }
    });
    
    // 【调试日志】记录 HSL 数据转换结果（详细版本）
    console.log('[dataAdapter] 🎨 HSL 数据转换结果:', {
      hslArrayLength: hslArray.length,
      hslArraySample: hslArray.slice(0, 5).map((item: any) => ({
        color: item.color,
        colorType: typeof item.color,
        hue: item.hue,
        saturation: item.saturation,
        luminance: item.luminance,
        note: item.note,
        // 【新增】检查颜色名称是否在 colorMap 中
        inColorMap: !!colorMap[item.color],
        mappedTo: colorMap[item.color] || 'NOT_MAPPED',
      })),
      hslObjectKeys: Object.keys(hslObject),
      hslObjectSample: Object.keys(hslObject).slice(0, 5).map(key => ({
        key,
        data: hslObject[key],
        hasNonZero: (hslObject[key].hue !== 0 || hslObject[key].saturation !== 0 || hslObject[key].luminance !== 0),
      })),
      // 【新增】检查是否有非零值
      hasNonZeroValues: Object.values(hslObject).some((item: any) => 
        (item.hue !== 0 && item.hue !== undefined) || 
        (item.saturation !== 0 && item.saturation !== undefined) || 
        (item.luminance !== 0 && item.luminance !== undefined)
      ),
      // 【新增】检查 colorMap 映射
      colorMapKeys: Object.keys(colorMap),
      // 【新增】检查未映射的颜色
      unmappedColors: hslArray.filter((item: any) => !colorMap[item.color] && item.color).map((item: any) => item.color),
      // 【新增】检查 hslObject 的完整内容（所有颜色通道）
      hslObjectFull: Object.keys(hslObject).reduce((acc, key) => {
        acc[key] = {
          hue: hslObject[key].hue,
          saturation: hslObject[key].saturation,
          luminance: hslObject[key].luminance,
          hasNote: !!(hslObject[key].note || hslObject[key].desc),
        };
        return acc;
      }, {} as any),
    });
    
    // 【关键修复】确保三个字段正确映射，即使后端返回 undefined 也至少是空字符串
    const master_style_recap = structured.master_style_recap || "";
    const style_summary_recap = structured.style_summary_recap || "";
    const key_adjustment_strategy = structured.key_adjustment_strategy || "";
    
    // 【调试日志】记录映射结果
    console.log('[dataAdapter] 🔍 Color Section 字段映射结果:', {
      structuredHasMasterStyleRecap: !!structured.master_style_recap,
      structuredHasStyleSummaryRecap: !!structured.style_summary_recap,
      structuredHasKeyAdjustmentStrategy: !!structured.key_adjustment_strategy,
      mappedMasterStyleRecap: master_style_recap,
      mappedStyleSummaryRecap: style_summary_recap,
      mappedKeyAdjustmentStrategy: key_adjustment_strategy,
      masterStyleRecapLength: master_style_recap.length,
      styleSummaryRecapLength: style_summary_recap.length,
      keyAdjustmentStrategyLength: key_adjustment_strategy.length,
    });
    
    result.color = {
      style_key_points: structured.styleKey || structured.style_key_points || "",
      // 【新增】phase_1_extraction 三个字段，用于前端色彩策略卡片展示
      master_style_recap: master_style_recap,  // 主风格回顾（流派识别）
      style_summary_recap: style_summary_recap,  // 风格总结回顾（Phase 1 核心指导思想）
      key_adjustment_strategy: key_adjustment_strategy,  // 关键调整策略（三大动作）
      // 【调试日志】记录 HSL 对象设置
      // ... (hsl 字段将在下面设置)
      white_balance: {
        temp: {
          // 【修复】色温值计算逻辑：
          // 1. 优先使用用户图的实际色温值（从 image_analysis 获取）
          // 2. 如果没有实际色温值，只保存调整值（range），不计算绝对色温
          // 3. 前端显示时，如果有实际色温值，显示：实际色温 + 调整值 = 最终色温
          // 4. 如果没有实际色温值，只显示调整值（如：-8）
          value: (() => {
            const rangeStr = structured.whiteBalance?.temp?.range || "+0";
            const adjustmentValue = parseFloat(rangeStr.replace(/[^0-9.-]/g, '') || "0");
            
            // 【优先】尝试从 image_analysis 获取用户图的实际色温值
            // image_analysis 结构：{ user: { colors: { color_temperature: { estimated_k: 5200 } } } }
            const userImageTemp = backendData.meta?.image_analysis?.user?.colors?.color_temperature?.estimated_k;
            
            if (userImageTemp && typeof userImageTemp === 'number' && userImageTemp > 1000 && userImageTemp < 20000) {
              // 有实际色温值：实际色温 + 调整值 = 最终色温
              const finalTemp = userImageTemp + adjustmentValue;
              console.log('[dataAdapter] ✅ 使用用户图实际色温值:', {
                userImageTemp,
                adjustmentValue,
                finalTemp,
              });
              return finalTemp;
            } else {
              // 没有实际色温值：返回 null，前端只显示调整值
              console.log('[dataAdapter] ⚠️ 无法获取用户图实际色温值，只保存调整值:', {
                adjustmentValue,
                hasImageAnalysis: !!backendData.meta?.image_analysis,
                imageAnalysisKeys: backendData.meta?.image_analysis ? Object.keys(backendData.meta.image_analysis) : [],
                userColors: backendData.meta?.image_analysis?.user?.colors,
              });
              return null; // 返回 null，前端将只显示调整值
            }
          })(),
          // 【保留】调整值（range），前端用于显示
          range: structured.whiteBalance?.temp?.range || "+0",
          // 【新增】调整值（数值格式），便于前端计算和显示
          adjustment: (() => {
            const rangeStr = structured.whiteBalance?.temp?.range || "+0";
            return parseFloat(rangeStr.replace(/[^0-9.-]/g, '') || "0");
          })(),
          reason: structured.whiteBalance?.temp?.note || "",
          // 【新增】从 range 字符串中解析目标范围（如果有范围格式，如 "+600 ~ +900"）
          target_min: (() => {
            const rangeStr = structured.whiteBalance?.temp?.range || "+0";
            if (rangeStr.includes('~')) {
              const parts = rangeStr.split('~');
              const minStr = parts[0].trim();
              const minValue = parseFloat(minStr.replace(/[^0-9.-]/g, '') || "0");
              return 5500 + minValue;
            }
            return undefined;
          })(),
          target_max: (() => {
            const rangeStr = structured.whiteBalance?.temp?.range || "+0";
            if (rangeStr.includes('~')) {
              const parts = rangeStr.split('~');
              const maxStr = parts[1]?.trim();
              if (maxStr) {
                const maxValue = parseFloat(maxStr.replace(/[^0-9.-]/g, '') || "0");
                return 5500 + maxValue;
              }
            }
            return undefined;
          })(),
        },
        tint: {
          // 【修复】从 range 字符串中解析数值（如 "+10" -> 10，"+10 ~ +25" -> 10）
          value: parseFloat(structured.whiteBalance?.tint?.range?.replace(/[^0-9.-]/g, '') || "0"),
          range: structured.whiteBalance?.tint?.range || "+0",
          reason: structured.whiteBalance?.tint?.note || "",
          // 【新增】从 range 字符串中解析目标范围（如果有范围格式，如 "+10 ~ +25"）
          target_min: (() => {
            const rangeStr = structured.whiteBalance?.tint?.range || "+0";
            if (rangeStr.includes('~')) {
              const parts = rangeStr.split('~');
              const minStr = parts[0].trim();
              return parseFloat(minStr.replace(/[^0-9.-]/g, '') || "0");
            }
            return undefined;
          })(),
          target_max: (() => {
            const rangeStr = structured.whiteBalance?.tint?.range || "+0";
            if (rangeStr.includes('~')) {
              const parts = rangeStr.split('~');
              const maxStr = parts[1]?.trim();
              if (maxStr) {
                return parseFloat(maxStr.replace(/[^0-9.-]/g, '') || "0");
              }
            }
            return undefined;
          })(),
        },
      },
      color_grading: (() => {
        // 【修复】从 structured.grading 提取色彩分级数据
        // 后端 _format_color_part2 已从 lightroom_workflow.color_grading 提取数据并保存到 structured.grading
        const grading = structured.grading || {};
        const colorGrading = {
          highlights: {
            hue: parseFloat(grading.highlights?.hue || "0"),
            saturation: parseFloat(grading.highlights?.saturation || "0"),
            luminance: parseFloat(grading.highlights?.luminance || "0"),  // 【修复】提取明度字段
            reason: grading.highlights?.reason || "",  // 【修复】提取调整原因描述
          },
          midtones: {
            hue: parseFloat(grading.midtones?.hue || "0"),
            saturation: parseFloat(grading.midtones?.saturation || "0"),
            luminance: parseFloat(grading.midtones?.luminance || "0"),  // 【修复】提取明度字段
            reason: grading.midtones?.reason || "",  // 【修复】提取调整原因描述
          },
          shadows: {
            hue: parseFloat(grading.shadows?.hue || "0"),
            saturation: parseFloat(grading.shadows?.saturation || "0"),
            luminance: parseFloat(grading.shadows?.luminance || "0"),  // 【修复】提取明度字段
            reason: grading.shadows?.reason || "",  // 【修复】提取调整原因描述
          },
          balance: parseFloat(grading.balance || "0"),
          blending: parseFloat(grading.blending || "50"),  // 【修复】提取混合滑块值
        };
        
        // 【调试日志】记录色彩分级数据提取结果
        if (process.env.NODE_ENV === 'development') {
          console.log('[dataAdapter] 🎨 色彩分级数据提取:', {
            hasGrading: !!structured.grading,
            highlights: {
              hue: colorGrading.highlights.hue,
              saturation: colorGrading.highlights.saturation,
              luminance: colorGrading.highlights.luminance,
              hasReason: !!colorGrading.highlights.reason,
            },
            midtones: {
              hue: colorGrading.midtones.hue,
              saturation: colorGrading.midtones.saturation,
              luminance: colorGrading.midtones.luminance,
              hasReason: !!colorGrading.midtones.reason,
            },
            shadows: {
              hue: colorGrading.shadows.hue,
              saturation: colorGrading.shadows.saturation,
              luminance: colorGrading.shadows.luminance,
              hasReason: !!colorGrading.shadows.reason,
            },
            balance: colorGrading.balance,
            blending: colorGrading.blending,
            hasNonZeroValues: (
              colorGrading.highlights.hue !== 0 ||
              colorGrading.highlights.saturation !== 0 ||
              colorGrading.midtones.hue !== 0 ||
              colorGrading.midtones.saturation !== 0 ||
              colorGrading.shadows.hue !== 0 ||
              colorGrading.shadows.saturation !== 0
            ),
          });
        }
        
        return colorGrading;
      })(),
      hsl: hslObject,
    };
    
    // 【调试日志】记录 result.color.hsl 设置结果（详细版本）
    console.log('[dataAdapter] ✅ result.color.hsl 已设置:', {
      hasColor: !!result.color,
      hasColorHsl: !!result.color.hsl,
      colorHslKeys: result.color.hsl ? Object.keys(result.color.hsl) : [],
      colorHslSample: result.color.hsl ? Object.keys(result.color.hsl).slice(0, 3).map(key => ({
        key,
        data: result.color.hsl[key],
      })) : [],
      hslObjectKeys: Object.keys(hslObject),
      hslObjectHasNonZero: Object.values(hslObject).some((item: any) => 
        (item.hue !== 0 || item.saturation !== 0 || item.luminance !== 0)
      ),
      // 【新增】检查 hslObject 的完整内容（所有颜色通道的详细数据）
      hslObjectFullDetails: Object.keys(hslObject).reduce((acc, key) => {
        const item = hslObject[key];
        acc[key] = {
          hue: item.hue,
          hueType: typeof item.hue,
          saturation: item.saturation,
          saturationType: typeof item.saturation,
          luminance: item.luminance,
          luminanceType: typeof item.luminance,
          hasNote: !!(item.note || item.desc),
          isNonZero: (item.hue !== 0 || item.saturation !== 0 || item.luminance !== 0),
        };
        return acc;
      }, {} as any),
      // 【新增】检查 hslArray 的原始数据
      hslArrayOriginal: hslArray.slice(0, 5).map((item: any) => ({
        color: item.color,
        hue: item.hue,
        saturation: item.saturation,
        luminance: item.luminance,
        note: item.note,
      })),
    });
  }

  // 5. Lightroom → results.lightroom
  if (sections.lightroom) {
    const lightroom = sections.lightroom;
    const structured = lightroom.structured || lightroom;
    
    // 【调试日志】记录 lightroom structured 的完整结构
    if (process.env.NODE_ENV === 'development') {
      console.log('[dataAdapter] 🔍 Lightroom structured 数据检查:', {
        hasLightroom: !!sections.lightroom,
        hasStructured: !!lightroom.structured,
        structuredKeys: structured ? Object.keys(structured) : [],
        hasSimulatedHistogram: !!structured?.simulatedHistogram,
        simulatedHistogramType: structured?.simulatedHistogram ? typeof structured.simulatedHistogram : 'undefined',
        simulatedHistogramValue: structured?.simulatedHistogram,
        // 【新增】详细检查 simulatedHistogram 的内容
        simulatedHistogramKeys: structured?.simulatedHistogram ? Object.keys(structured.simulatedHistogram) : [],
        hasHistogramData: !!structured?.simulatedHistogram?.histogram_data,
        histogramDataKeys: structured?.simulatedHistogram?.histogram_data ? Object.keys(structured.simulatedHistogram.histogram_data) : [],
        histogramDataLengths: structured?.simulatedHistogram?.histogram_data ? {
          r: structured.simulatedHistogram.histogram_data.r?.length || 0,
          g: structured.simulatedHistogram.histogram_data.g?.length || 0,
          b: structured.simulatedHistogram.histogram_data.b?.length || 0,
          l: structured.simulatedHistogram.histogram_data.l?.length || 0,
        } : null,
      });
    }
    
    // 【修复】优先从 structured.basic 中提取数据（新 Prompt 结构）
    // 如果没有，则从 panels 数组中提取（旧结构）
    const basic = structured.basic || {};
    const panels = structured.panels || [];
    const basicPanel: any = {};
    
    // 【优先】从 structured.basic 中提取数据（新 Prompt 结构）
    // 后端返回格式：{ highlights: { range: "-30", note: "保护高光细节" }, ... }
    if (basic && Object.keys(basic).length > 0) {
      const paramMap: Record<string, string> = {
        "exposure": "exposure",
        "contrast": "contrast",
        "highlights": "highlights",
        "shadows": "shadows",
        "whites": "whites",
        "blacks": "blacks",
        "texture": "texture",
        "clarity": "clarity",
        "dehaze": "dehaze",
        "vibrance": "vibrance",
        "saturation": "saturation",
        "temp": "temp",
        "tint": "tint",
      };
      
      Object.keys(basic).forEach((key) => {
        const param = basic[key];
        if (param && typeof param === 'object') {
          // 【修复】同时支持 "value" 和 "range" 字段（后端可能返回 value，也可能返回 range）
          const valueStr = param.value || param.range || "+0";
          // 【修复】正确解析带正负号的字符串值（如 "+0.8"、"-30"、"+15"）
          let value = 0;
          if (typeof valueStr === 'number') {
            value = valueStr;
          } else {
            const str = String(valueStr).trim();
            if (str.startsWith('+')) {
              // 正数：去掉 "+" 后解析（如 "+0.8" -> 0.8）
              value = parseFloat(str.substring(1)) || 0;
            } else if (str.startsWith('-')) {
              // 负数：直接解析（如 "-30" -> -30）
              value = parseFloat(str) || 0;
            } else {
              // 无符号：直接解析（如 "0.8" -> 0.8）
              value = parseFloat(str) || 0;
            }
          }
          
          basicPanel[key] = {
            value,
            range: valueStr, // 保留原始字符串格式（如 "+0.8"）
            reason: param.reason || param.note || param.purpose || "", // 【修复】支持多种描述字段
            target_min: param.target_min,
            target_max: param.target_max,
          };
          
          // 【调试日志】记录关键参数的提取过程
          if (key === 'exposure' || key === 'whites' || key === 'blacks') {
            console.log(`[dataAdapter] 🔍 从 basic 提取参数 ${key}:`, {
              param,
              valueStr,
              parsedValue: value,
              reason: param.reason || param.note || param.purpose || '',
            });
          }
        }
      });
    }
    
    // 【向后兼容】如果没有从 basic 中提取到数据，则从 panels 数组中提取（旧结构）
    if (Object.keys(basicPanel).length === 0) {
      // 参数名称映射（英文 -> 小写，中文 -> 英文）
      // 【修复】添加 "白色色阶" 和 "黑色色阶" 的映射（后端返回的完整中文名称）
      const paramNameMap: Record<string, string> = {
        "Temp": "temp", "Temperature": "temp", "色温": "temp",
        "Tint": "tint", "色调": "tint",
        "Exposure": "exposure", "曝光": "exposure",
        "Contrast": "contrast", "对比度": "contrast",
        "Highlights": "highlights", "高光": "highlights",
        "Shadows": "shadows", "阴影": "shadows",
        "Whites": "whites", "白色": "whites", "白色色阶": "whites",  // 【修复】添加 "白色色阶" 映射
        "Blacks": "blacks", "黑色": "blacks", "黑色色阶": "blacks",  // 【修复】添加 "黑色色阶" 映射
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
            
            // 【修复】解析数值（支持 "+0.3"、"-20" 等格式）
            // 需要正确处理正负号，不能简单地用 replace 去掉所有非数字字符
            const valueStr = param.value || "+0";
            let value = 0;
            if (typeof valueStr === 'number') {
              value = valueStr;
            } else {
              const str = String(valueStr).trim();
              // 处理字符串格式：支持 "+0.5"、"-20"、"0" 等
              if (str.startsWith('+')) {
                // 正数：去掉 "+" 后解析
                value = parseFloat(str.substring(1)) || 0;
              } else if (str.startsWith('-')) {
                // 负数：直接解析
                value = parseFloat(str) || 0;
              } else {
                // 无符号：直接解析
                value = parseFloat(str) || 0;
              }
            }
            
            // 【调试日志】记录参数解析过程（扩展日志范围，包含所有基础参数）
            if (process.env.NODE_ENV === 'development' && (
              mappedName === 'temp' || mappedName === 'tint' || 
              mappedName === 'exposure' || mappedName === 'contrast' ||
              mappedName === 'highlights' || mappedName === 'shadows' ||
              mappedName === 'whites' || mappedName === 'blacks'
            )) {
              console.log(`[dataAdapter] 🔍 从 panels 解析参数 ${paramName} (${mappedName}):`, {
                valueStr,
                parsedValue: value,
                hasReason: !!(param.reason || param.purpose),
                reason: param.reason || param.purpose || '',
                panelTitle: panel.title || 'N/A',
              });
            }
            
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
    }
    
    // 转换曲线数据
    const curveData = structured.toneCurve || structured.curve || {};
    const curvePoints = Array.isArray(curveData) ? curveData : curveData.points_rgb || [];
    
    // 【新增】从 toneCurves 中提取 explanation（曲线描述）
    const toneCurvesExplanation = structured.toneCurves?.explanation || "";
    
    // 【修复】为 basic_panel 提供默认值，确保所有必需字段都存在，避免前端访问 undefined 导致崩溃
    // 根据 LightroomData 类型定义，basic_panel 必须包含以下字段
    const defaultBasicPanelValue = {
      value: 0,
      range: "+0",
      reason: "",
      target_min: undefined,
      target_max: undefined,
    };
    
    // 定义所有必需的 basic_panel 字段
    const requiredBasicPanelFields = [
      'temp', 'tint', 'exposure', 'contrast', 'highlights', 'shadows',
      'whites', 'blacks', 'texture', 'clarity', 'dehaze', 'vibrance', 'saturation'
    ];
    
    // 确保所有必需字段都有值，如果不存在则使用默认值
    const safeBasicPanel: any = {};
    requiredBasicPanelFields.forEach((field) => {
      safeBasicPanel[field] = basicPanel[field] || { ...defaultBasicPanelValue };
    });
    
    // 【调试日志】记录 basic_panel 数据检查（详细版本）
    console.log('[dataAdapter] 🔍 Lightroom basic_panel 数据检查:', {
      hasBasicPanel: !!basicPanel,
      basicPanelKeys: Object.keys(basicPanel),
      safeBasicPanelKeys: Object.keys(safeBasicPanel),
      missingFields: requiredBasicPanelFields.filter(f => !basicPanel[f]),
      // 【新增】详细记录关键参数的值（包括原始值和解析后的值）
      keyParams: {
        temp: {
          raw: basicPanel.temp,
          safe: safeBasicPanel.temp,
          value: basicPanel.temp?.value ?? safeBasicPanel.temp?.value,
        },
        tint: {
          raw: basicPanel.tint,
          safe: safeBasicPanel.tint,
          value: basicPanel.tint?.value ?? safeBasicPanel.tint?.value,
        },
        exposure: {
          raw: basicPanel.exposure,
          safe: safeBasicPanel.exposure,
          value: basicPanel.exposure?.value ?? safeBasicPanel.exposure?.value,
        },
        contrast: {
          raw: basicPanel.contrast,
          safe: safeBasicPanel.contrast,
          value: basicPanel.contrast?.value ?? safeBasicPanel.contrast?.value,
        },
        highlights: {
          raw: basicPanel.highlights,
          safe: safeBasicPanel.highlights,
          value: basicPanel.highlights?.value ?? safeBasicPanel.highlights?.value,
        },
        shadows: {
          raw: basicPanel.shadows,
          safe: safeBasicPanel.shadows,
          value: basicPanel.shadows?.value ?? safeBasicPanel.shadows?.value,
        },
        whites: {
          raw: basicPanel.whites,
          safe: safeBasicPanel.whites,
          value: basicPanel.whites?.value ?? safeBasicPanel.whites?.value,
        },
        blacks: {
          raw: basicPanel.blacks,
          safe: safeBasicPanel.blacks,
          value: basicPanel.blacks?.value ?? safeBasicPanel.blacks?.value,
        },
      },
    });
    
    // 【调试日志】记录 basic_panel 数据检查
    console.log('[dataAdapter] 🔍 Lightroom basic_panel 数据检查:', {
      hasBasicPanel: !!basicPanel,
      basicPanelKeys: Object.keys(basicPanel),
      safeBasicPanelKeys: Object.keys(safeBasicPanel),
      missingFields: requiredBasicPanelFields.filter(f => !basicPanel[f]),
    });
    
    // 【新增】从 structured 中提取 simulated_histogram 数据（直方图描述、RGB 值和完整的直方图数据）
    // 【修复】支持多种字段名：simulatedHistogram（驼峰）和 simulated_histogram（蛇形）
    // 【修复】正确处理 None/null 值：如果后端返回 None，则使用空对象
    const simulatedHistogramRaw = structured.simulatedHistogram || structured.simulated_histogram;
    const simulatedHistogram = (simulatedHistogramRaw && simulatedHistogramRaw !== null && typeof simulatedHistogramRaw === 'object') ? simulatedHistogramRaw : {};
    
    // 【调试日志】记录 simulated_histogram 数据提取情况
    if (process.env.NODE_ENV === 'development') {
      console.log('[dataAdapter] 📊 simulated_histogram 数据提取:', {
        hasSimulatedHistogram: !!(structured.simulatedHistogram || structured.simulated_histogram),
        hasSimulatedHistogramCamel: !!structured.simulatedHistogram,
        hasSimulatedHistogramSnake: !!structured.simulated_histogram,
        simulatedHistogramValue: structured.simulatedHistogram || structured.simulated_histogram,
        simulatedHistogramKeys: simulatedHistogram ? Object.keys(simulatedHistogram) : [],
        hasDescription: !!simulatedHistogram.description,
        hasRgbValues: !!simulatedHistogram.rgb_values,
        hasHistogramData: !!simulatedHistogram.histogram_data,
        histogramDataKeys: simulatedHistogram.histogram_data ? Object.keys(simulatedHistogram.histogram_data) : [],
        histogramDataLengths: simulatedHistogram.histogram_data ? {
          r: simulatedHistogram.histogram_data.r?.length || 0,
          g: simulatedHistogram.histogram_data.g?.length || 0,
          b: simulatedHistogram.histogram_data.b?.length || 0,
          l: simulatedHistogram.histogram_data.l?.length || 0,
        } : null,
        // 【新增】打印完整的 structured 对象（仅前 500 字符，避免日志过长）
        structuredPreview: JSON.stringify(structured).substring(0, 500),
      });
    }
    
    // 【新增】从 color 中提取白平衡和色彩分级数据，用于 Lightroom 面板显示
    const whiteBalance = result.color?.white_balance;
    const colorGrading = result.color?.color_grading;
    const keyAdjustmentStrategy = result.color?.key_adjustment_strategy || "";
    
    // 【新增】优先使用 simulated_histogram 中的 histogram_data，如果没有则使用 structured.histogram
    // histogram_data 包含完整的 256 个值数组（r, g, b, l），用于前端绘制直方图
    const histogramData = simulatedHistogram.histogram_data || structured.histogram || {};
    
    // 【新增】从直方图数据计算统计信息（avg_l, shadows, highlights）
    // 如果 histogram_data 存在，则根据 l 通道计算统计信息
    const calculateHistogramStats = (lChannel: number[]): { avg_l: number; shadows: number; midtones: number; highlights: number } => {
      // 【调试日志】记录计算过程
      if (process.env.NODE_ENV === 'development') {
        console.log('[dataAdapter] 📊 计算直方图统计信息:', {
          lChannelLength: lChannel?.length || 0,
          lChannelSample: lChannel?.slice(0, 10) || [],
        });
      }
      if (!lChannel || lChannel.length === 0) {
        return { avg_l: 0, shadows: 0, midtones: 0, highlights: 0 };
      }
      
      // 计算总像素数
      const totalPixels = lChannel.reduce((sum, val) => sum + val, 0);
      if (totalPixels === 0) {
        return { avg_l: 0, shadows: 0, midtones: 0, highlights: 0 };
      }
      
      // 计算平均亮度（加权平均）
      let weightedSum = 0;
      for (let i = 0; i < lChannel.length; i++) {
        weightedSum += i * lChannel[i];
      }
      const avg_l = Math.round(weightedSum / totalPixels);
      
      // 计算阴影区域（0-85）的像素占比
      const shadowsPixels = lChannel.slice(0, 86).reduce((sum, val) => sum + val, 0);
      const shadows = Math.round((shadowsPixels / totalPixels) * 100);
      
      // 计算中间调区域（86-170）的像素占比
      const midtonesPixels = lChannel.slice(86, 171).reduce((sum, val) => sum + val, 0);
      const midtones = Math.round((midtonesPixels / totalPixels) * 100);
      
      // 计算高光区域（171-255）的像素占比
      const highlightsPixels = lChannel.slice(171, 256).reduce((sum, val) => sum + val, 0);
      const highlights = Math.round((highlightsPixels / totalPixels) * 100);
      
      // 【调试日志】记录计算结果
      if (process.env.NODE_ENV === 'development') {
        console.log('[dataAdapter] 📊 直方图统计信息计算结果:', {
          avg_l,
          shadows,
          midtones,
          highlights,
        });
      }
      
      return { avg_l, shadows, midtones, highlights };
    };
    
    // 【修复】优先使用 simulated_histogram 中的 histogram_data，如果没有则使用默认值
    // 如果 histogram_data 存在，则计算统计信息；否则使用 structured.histogram 中的统计信息
    const histogramLChannel = histogramData.l || structured.histogram?.l || [];
    const calculatedStats = calculateHistogramStats(histogramLChannel);
    
    // 【调试日志】记录 HSL 数据检查（详细版本）
    if (process.env.NODE_ENV === 'development') {
      console.log('[dataAdapter] 🎨 HSL 数据检查（Lightroom 部分）:', {
        hasColor: !!result.color,
        hasColorHsl: !!result.color?.hsl,
        colorHslType: typeof result.color?.hsl,
        colorHslIsArray: Array.isArray(result.color?.hsl),
        colorHslKeys: result.color?.hsl ? Object.keys(result.color.hsl) : [],
        colorHslSample: result.color?.hsl ? Object.keys(result.color.hsl).slice(0, 5).map(key => ({
          key,
          data: result.color.hsl[key],
          hasNonZero: (result.color.hsl[key].hue !== 0 || result.color.hsl[key].saturation !== 0 || result.color.hsl[key].luminance !== 0),
        })) : [],
        // 【新增】检查 lightroom.hsl
        lightroomHsl: result.lightroom?.hsl,
        lightroomHslType: typeof result.lightroom?.hsl,
        lightroomHslKeys: result.lightroom?.hsl ? Object.keys(result.lightroom.hsl) : [],
      });
    }
    
    result.lightroom = {
      // 【新增】元数据（包含 OpenCV 图像分析数据和校准元数据），供前端 Safety Clamps 使用
      meta: {
        image_analysis: backendData.meta?.image_analysis,
        // 【修复】添加校准元数据，供前端调试和验证使用
        calibration: backendData.meta?.calibration || null,
      },
      // 【新增】色彩分析数据（包含 scene_type 等）
      color: {
        scene_type: sections.color?.structured?.scene_type || sections.photoReview?.structured?.style_classification?.master_archetype || ""
      },
      // 【新增】Part 2 分析数据（色彩匹配协议的 5 个关键字段）
      // scene_type, lighting_strategy, key_colors, dynamic_range_analysis, color_calibration_strategy
      analysis: (() => {
        const analysisData = structured.analysis || {};
        // 【调试日志】记录 analysis 数据提取情况
        console.log('[dataAdapter] 🔍 analysis 数据提取:', {
          hasAnalysis: !!structured.analysis,
          analysisKeys: Object.keys(analysisData),
          scene_type: analysisData.scene_type || 'N/A',
          lighting_strategy: analysisData.lighting_strategy?.substring(0, 50) || 'N/A',
          key_colors: analysisData.key_colors || [],
          dynamic_range_analysis: analysisData.dynamic_range_analysis?.substring(0, 50) || 'N/A',
          color_calibration_strategy: analysisData.color_calibration_strategy?.substring(0, 50) || 'N/A',
        });
        return analysisData;
      })(),
      // 【新增】Phase 1 提取数据
      phase_1_extraction: structured.phase_1_extraction || sections.color?.structured?.phase_1_extraction || {},
      
      // 【修复】优先使用 simulated_histogram 中的 histogram_data，如果没有则使用默认值
      histogram: (histogramData.r && histogramData.r.length > 0) ? {
        r: histogramData.r || [],
        g: histogramData.g || [],
        b: histogramData.b || [],
        l: histogramData.l || [],
        // 【修复】优先使用计算出的统计信息，如果没有则使用 structured.histogram 中的统计信息
        avg_l: calculatedStats.avg_l || structured.histogram?.avg_l || 0,
        shadows: calculatedStats.shadows || structured.histogram?.shadows || 0,
        midtones: calculatedStats.midtones || structured.histogram?.midtones || 0,
        highlights: calculatedStats.highlights || structured.histogram?.highlights || 0,
      } : (structured.histogram || {
        r: [], g: [], b: [], l: [],
        avg_l: 0, shadows: 0, midtones: 0, highlights: 0,
      }),
      // 【新增】添加 simulated_histogram 数据（直方图描述、RGB 值和完整的直方图数据）
      // 【修复】即使没有 description，只要有 histogram_data 就应该创建对象（用于渲染直方图）
      simulated_histogram: (simulatedHistogram.description || simulatedHistogram.histogram_data) ? {
        description: simulatedHistogram.description || "",
        rgb_values: simulatedHistogram.rgb_values || { r: 0, g: 0, b: 0 },
        histogram_data: simulatedHistogram.histogram_data || null, // 【新增】完整的直方图数据（256 个值）
        // 【新增】添加 Stats Grid 和 Palette Strip 的说明
        stats_grid_description: simulatedHistogram.stats_grid_description || "",
        palette_strip_description: simulatedHistogram.palette_strip_description || "",
      } : undefined,
      // 【新增】添加白平衡数据（从 color_scheme 中提取）
      // 【修复】优先从 basic_panel 中提取 temp 和 tint，因为 Gemini 输出的是 lightroom_workflow.basic_panel.temp/tint
      // 如果 basic_panel 中没有值，才使用 whiteBalance（从 color_science_scheme 中提取）
      white_balance: (() => {
        // 【辅助函数】从参数对象中提取数值
        const getParamValue = (param: any): number => {
          if (typeof param === 'number') return param;
          if (param?.value !== undefined) {
            const val = param.value;
            if (typeof val === 'number') return val;
            // 处理字符串格式（如 "+10"、"-5"）
            const str = String(val).trim();
            if (str.startsWith('+')) {
              return parseFloat(str.substring(1)) || 0;
            } else if (str.startsWith('-')) {
              return parseFloat(str) || 0;
            } else {
              return parseFloat(str) || 0;
            }
          }
          return 0;
        };
        
        // 【修复】优先从 basic_panel 中提取 temp 和 tint（Gemini 主要输出路径）
        const tempFromBasic = safeBasicPanel.temp;
        const tintFromBasic = safeBasicPanel.tint;
        
        // 【调试日志】记录 basic_panel 中的 temp 和 tint 数据
        console.log('[dataAdapter] 🔍 检查 basic_panel 中的 temp 和 tint:', {
          hasTemp: !!tempFromBasic,
          hasTint: !!tintFromBasic,
          tempValue: tempFromBasic?.value,
          tempRange: tempFromBasic?.range,
          tempReason: tempFromBasic?.reason,
          tintValue: tintFromBasic?.value,
          tintRange: tintFromBasic?.range,
          tintReason: tintFromBasic?.reason,
        });
        
        // 【修复】由于 safeBasicPanel.temp 和 safeBasicPanel.tint 总是存在（即使值是默认值），
        // 所以 tempFromBasic 和 tintFromBasic 应该总是存在
        // 为了确保万无一失，我们总是构建 white_balance 对象
        console.log('[dataAdapter] 🔍 检查结果:', {
          hasTemp: !!tempFromBasic,
          hasTint: !!tintFromBasic,
          tempFromBasic,
          tintFromBasic,
          whiteBalanceExists: !!whiteBalance,
        });
        
        // 【修复】总是构建 white_balance 对象，确保前端UI可以始终显示色温色调面板
        // 即使 temp 或 tint 是默认值，也应该显示UI
        if (tempFromBasic || tintFromBasic || true) { // 总是为 true，确保总是构建
          console.log('[dataAdapter] ✅ 从 basic_panel 中提取 temp 和 tint:', {
            temp: tempFromBasic,
            tint: tintFromBasic,
            tempValue: tempFromBasic?.value,
            tempRange: tempFromBasic?.range,
            tintValue: tintFromBasic?.value,
            tintRange: tintFromBasic?.range,
          });
          
          // 【修复】构建 white_balance 对象
          // 【重要】getParamValue 函数会从 value 或 range 字段中提取数值
          // 【修复】使用 wbResult 避免与外层 result 变量冲突
          const wbResult = {
            temp: tempFromBasic ? {
              // 【修复】色温值计算逻辑（与 result.color.white_balance 保持一致）：
              // 1. 优先使用用户图的实际色温值（从 image_analysis 获取）
              // 2. 如果没有实际色温值，只保存调整值（range），不计算绝对色温
              value: (() => {
                // 【修复】优先从 value 字段提取，如果没有则从 range 字段提取
                // 如果 value 是数字类型，直接使用；如果是字符串，需要解析
                let tempValueStr: string | number = tempFromBasic.value;
                if (tempValueStr === undefined || tempValueStr === null) {
                  tempValueStr = tempFromBasic.range || "+0";
                }
                // 如果 value 是数字类型（如 0），需要转换为字符串格式
                if (typeof tempValueStr === 'number') {
                  tempValueStr = tempValueStr >= 0 ? `+${tempValueStr}` : `${tempValueStr}`;
                }
                const adjustmentValue = getParamValue({ value: tempValueStr, range: tempValueStr });
                
                // 【优先】尝试从 image_analysis 获取用户图的实际色温值
                const userImageTemp = backendData.meta?.image_analysis?.user?.colors?.color_temperature?.estimated_k;
                
                if (userImageTemp && typeof userImageTemp === 'number' && userImageTemp > 1000 && userImageTemp < 20000) {
                  // 有实际色温值：实际色温 + 调整值 = 最终色温
                  const finalValue = userImageTemp + adjustmentValue;
                  console.log('[dataAdapter] ✅ 使用用户图实际色温值 (lightroom):', {
                    userImageTemp,
                    adjustmentValue,
                    finalValue,
                  });
                  return finalValue;
                } else {
                  // 没有实际色温值：返回 null，前端只显示调整值
                  console.log('[dataAdapter] ⚠️ 无法获取用户图实际色温值 (lightroom)，只保存调整值:', {
                    adjustmentValue,
                    hasImageAnalysis: !!backendData.meta?.image_analysis,
                  });
                  return null; // 返回 null，前端将只显示调整值
                }
              })(),
              range: tempFromBasic.range || (typeof tempFromBasic.value === 'string' ? tempFromBasic.value : (tempFromBasic.value >= 0 ? `+${tempFromBasic.value}` : `${tempFromBasic.value}`)) || "+0",
              // 【新增】调整值（数值格式），便于前端计算和显示
              adjustment: (() => {
                let tempValueStr: string | number = tempFromBasic.value;
                if (tempValueStr === undefined || tempValueStr === null) {
                  tempValueStr = tempFromBasic.range || "+0";
                }
                if (typeof tempValueStr === 'number') {
                  tempValueStr = tempValueStr >= 0 ? `+${tempValueStr}` : `${tempValueStr}`;
                }
                return getParamValue({ value: tempValueStr, range: tempValueStr });
              })(),
              reason: tempFromBasic.reason || tempFromBasic.note || "",
            } : (whiteBalance?.temp || { value: null, range: "+0", adjustment: 0, reason: "" }),
            tint: tintFromBasic ? {
              // 【修复】tint 值是相对值，直接使用（如 "+15" 表示 +15 色调单位）
              value: (() => {
                // 【修复】优先从 value 字段提取，如果没有则从 range 字段提取
                // 如果 value 是数字类型，直接使用；如果是字符串，需要解析
                let tintValueStr: string | number = tintFromBasic.value;
                if (tintValueStr === undefined || tintValueStr === null) {
                  tintValueStr = tintFromBasic.range || "+0";
                }
                // 如果 value 是数字类型（如 0），需要转换为字符串格式
                if (typeof tintValueStr === 'number') {
                  tintValueStr = tintValueStr >= 0 ? `+${tintValueStr}` : `${tintValueStr}`;
                }
                const tintValue = getParamValue({ value: tintValueStr, range: tintValueStr });
                console.log('[dataAdapter] 🔍 色调值提取:', { 
                  tintFromBasic,
                  tintValueStr,
                  tintValue, 
                  range: tintFromBasic.range,
                });
                return tintValue;
              })(),
              range: tintFromBasic.range || (typeof tintFromBasic.value === 'string' ? tintFromBasic.value : (tintFromBasic.value >= 0 ? `+${tintFromBasic.value}` : `${tintFromBasic.value}`)) || "+0",
              reason: tintFromBasic.reason || tintFromBasic.note || "",
            } : (whiteBalance?.tint || { value: 0, range: "+0", reason: "" }),
          };
          
          console.log('[dataAdapter] ✅ 最终 white_balance 对象:', wbResult);
          return wbResult;
        }
        
        // 【备用方案1】如果 basic_panel 中没有值，使用 whiteBalance（从 color_science_scheme 中提取）
        if (whiteBalance) {
          console.log('[dataAdapter] ⚠️ basic_panel 中没有 temp/tint，使用 whiteBalance:', whiteBalance);
          return {
            temp: whiteBalance.temp || { value: 5500, range: "+0", reason: "" },
        tint: whiteBalance.tint || { value: 0, range: "+0", reason: "" },
          };
        }
        
        // 【备用方案2】如果都没有，返回默认值，确保前端UI始终可以显示色温色调面板
        // 【重要】即使没有数据，也应该显示UI组件（使用默认值），而不是完全不显示
        console.log('[dataAdapter] ⚠️ basic_panel 和 whiteBalance 都没有数据，使用默认值');
        return {
          temp: { value: 5500, range: "+0", reason: "默认色温" },
          tint: { value: 0, range: "+0", reason: "默认色调" },
        };
      })(),
      // 【新增】添加色彩分级数据（从 color_scheme 中提取）
      // 【更新】添加 luminance 和 blending 字段
      color_grading: colorGrading ? {
        highlights: {
          hue: colorGrading.highlights?.hue || 0, 
          saturation: colorGrading.highlights?.saturation || 0, 
          luminance: colorGrading.highlights?.luminance || 0,  // 【新增】明度
          reason: colorGrading.highlights?.reason || "",
        },
        midtones: {
          hue: colorGrading.midtones?.hue || 0, 
          saturation: colorGrading.midtones?.saturation || 0, 
          luminance: colorGrading.midtones?.luminance || 0,  // 【新增】明度
          reason: colorGrading.midtones?.reason || "",
        },
        shadows: {
          hue: colorGrading.shadows?.hue || 0, 
          saturation: colorGrading.shadows?.saturation || 0, 
          luminance: colorGrading.shadows?.luminance || 0,  // 【新增】明度
          reason: colorGrading.shadows?.reason || "",
        },
        balance: colorGrading.balance || 0,
        blending: colorGrading.blending || 50,  // 【新增】混合滑块，默认值 50
      } : undefined,
      // 【新增】添加相机校准数据（用于模仿胶片/电影感）
      calibration: structured.calibration ? {
        red_primary: {
          hue: structured.calibration.red_primary?.hue || 0,
          saturation: structured.calibration.red_primary?.saturation || 0,
          note: structured.calibration.red_primary?.note || "",
        },
        green_primary: {
          hue: structured.calibration.green_primary?.hue || 0,
          saturation: structured.calibration.green_primary?.saturation || 0,
          note: structured.calibration.green_primary?.note || "",
        },
        blue_primary: {
          hue: structured.calibration.blue_primary?.hue || 0,
          saturation: structured.calibration.blue_primary?.saturation || 0,
          note: structured.calibration.blue_primary?.note || "",
        },
        shadows_tint: structured.calibration.shadows_tint || 0,
      } : undefined,
      // 【新增】添加关键调整策略（用于 Tactical Brief）
      key_adjustment_strategy: keyAdjustmentStrategy,
      basic_panel: safeBasicPanel, // 【修复】使用安全的 basic_panel，确保所有字段都有默认值
      hsl: (() => {
        // 【修复】确保从 result.color.hsl 中提取 HSL 数据
        const colorHsl = result.color?.hsl;
        if (colorHsl && Object.keys(colorHsl).length > 0) {
          console.log('[dataAdapter] ✅ 从 result.color.hsl 提取 HSL 数据:', {
            colorHslKeys: Object.keys(colorHsl),
            colorHslSample: Object.keys(colorHsl).slice(0, 3).map(key => ({
              key,
              data: colorHsl[key],
            })),
          });
          return colorHsl;
        } else {
          console.warn('[dataAdapter] ⚠️ result.color.hsl 为空或不存在，使用空对象');
          console.warn('[dataAdapter] ⚠️ result.color 状态:', {
            hasColor: !!result.color,
            colorKeys: result.color ? Object.keys(result.color) : [],
            hasColorHsl: !!result.color?.hsl,
            colorHslType: typeof result.color?.hsl,
            colorHslKeys: result.color?.hsl ? Object.keys(result.color.hsl) : [],
            // 【新增】检查 sections.color.structured.hsl 是否直接存在
            sectionsColorStructuredHsl: sections.color?.structured?.hsl,
            sectionsColorStructuredHslType: typeof sections.color?.structured?.hsl,
            sectionsColorStructuredHslIsArray: Array.isArray(sections.color?.structured?.hsl),
            sectionsColorStructuredHslLength: Array.isArray(sections.color?.structured?.hsl) ? sections.color.structured.hsl.length : 'not array',
          });
          return {};
        }
      })(),
      curve: {
        // 【修复】确保曲线点格式统一为对象数组格式 {x, y}
        // 优先使用 toneCurves.points_rgb，如果没有则使用 toneCurve/curve 中的数据
        rgb: (structured.toneCurves?.points_rgb || curvePoints || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        // 【修复】从 toneCurves 中提取单通道曲线点，如果没有则从 rgbCurves 中提取
        red: (structured.toneCurves?.points_red || structured.rgbCurves?.red || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        green: (structured.toneCurves?.points_green || structured.rgbCurves?.green || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        blue: (structured.toneCurves?.points_blue || structured.rgbCurves?.blue || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        reason: toneCurvesExplanation, // 【修复】使用 toneCurves.explanation 作为曲线描述
        analysis: toneCurvesExplanation, // 【新增】同时设置 analysis 字段，用于 AdvancedCurveMonitor 组件
      },
      split_toning: structured.colorGrading ? {
        highlights: {
          hue: parseFloat(structured.colorGrading.highlights?.hue || "0"),
          saturation: parseFloat(structured.colorGrading.highlights?.saturation || "0"),
          // 【修复】从后端数据中提取 reason 字段，而不是硬编码为空字符串
          // 后端在 _format_lightroom 中已提取 split_toning_detail 的 reason 字段
          reason: structured.colorGrading.highlights?.reason || "",
        },
        shadows: {
          hue: parseFloat(structured.colorGrading.shadows?.hue || "0"),
          saturation: parseFloat(structured.colorGrading.shadows?.saturation || "0"),
          // 【修复】从后端数据中提取 reason 字段
          reason: structured.colorGrading.shadows?.reason || "",
        },
        balance: {
          value: parseFloat(structured.colorGrading.balance || "0"),
          // 【修复】从后端数据中提取 reason 字段
          reason: structured.colorGrading.balance?.reason || structured.colorGrading.balance_reason || "",
        },
      } : undefined,
      // 【新增】影调分区分析数据（用于精准仿色）
      tonal_zone_analysis: structured.tonal_zone_analysis || structured.tonalZoneAnalysis || undefined,
      // 【新增】局部调整蒙版数据（用于精准仿色）
      // 【修复】优先从 local_adjustments_masks 提取，如果没有则从 localAdjustments 转换
      local_adjustments_masks: (() => {
        // 如果已经有转换好的格式，直接使用
        if (structured.local_adjustments_masks) {
          console.log('[dataAdapter] ✅ 使用已转换的 local_adjustments_masks');
          return structured.local_adjustments_masks;
        }
        // 如果没有，尝试从 localAdjustments 转换
        const localAdj = structured.localAdjustments || structured.localAdjustmentsMasks;
        if (localAdj && Array.isArray(localAdj) && localAdj.length > 0) {
          console.log('[dataAdapter] ⚠️ 从 localAdjustments 转换局部调整数据:', localAdj.length);
          const masks = localAdj.map((item: any, i: number) => ({
            mask_name: item.name || item.mask_name || `蒙版 ${i + 1}`,
            mask_type: item.type || item.mask_type || 'gradient',
            mask_target: item.description || item.mask_target || '',
            mask_parameters: item.area ? {
              gradient: item.type === 'gradient' ? {
                start_y_percent: item.area.y || 0,
                end_y_percent: (item.area.y || 0) + (item.area.height || 0),
                angle: 0,
              } : undefined,
              radial: item.type === 'radial' ? {
                center_x_percent: item.area.x || 50,
                center_y_percent: item.area.y || 50,
                radius_percent: Math.max(item.area.width || 0, item.area.height || 0) / 2,
                feather: 50,
              } : undefined,
            } : {},
            adjustments: item.adjustments || {},
          }));
          return {
            masks,
            note: `共 ${masks.length} 个局部调整蒙版`,
          };
        }
        console.log('[dataAdapter] ⚠️ 未找到局部调整数据');
        return undefined;
      })(),
      // 【修复】添加曲线数据（curve）到 result.lightroom
      // 从 structured.rgbCurves 或 structured.toneCurves 中提取 RGB 单通道曲线数据
      curve: {
        // 【修复】确保曲线点格式统一为对象数组格式 {x, y}
        // 优先使用 toneCurves.points_rgb，如果没有则使用 toneCurve/curve 中的数据
        rgb: (structured.toneCurves?.points_rgb || curvePoints || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        // 【修复】从 toneCurves 中提取单通道曲线点，如果没有则从 rgbCurves 中提取
        // 【重要】后端返回的字段名是 rgbCurves.red、rgbCurves.green、rgbCurves.blue
        red: (structured.toneCurves?.points_red || structured.rgbCurves?.red || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        green: (structured.toneCurves?.points_green || structured.rgbCurves?.green || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        blue: (structured.toneCurves?.points_blue || structured.rgbCurves?.blue || []).map((p: any) => 
          Array.isArray(p) ? { x: p[0], y: p[1] } : (p.x !== undefined && p.y !== undefined ? p : { x: 0, y: 0 })
        ),
        reason: toneCurvesExplanation, // 【修复】使用 toneCurves.explanation 作为曲线描述
        analysis: toneCurvesExplanation, // 【新增】同时设置 analysis 字段，用于 AdvancedCurveMonitor 组件
      },
    };
    
    // 【调试日志】在 result.lightroom 构建完成后，立即检查 curve 数据
    console.log('[dataAdapter] 🔍 result.lightroom.curve 构建后检查:', {
      hasCurve: !!result.lightroom.curve,
      curveKeys: result.lightroom.curve ? Object.keys(result.lightroom.curve) : [],
      hasRed: !!result.lightroom.curve?.red,
      redLength: result.lightroom.curve?.red?.length || 0,
      hasGreen: !!result.lightroom.curve?.green,
      greenLength: result.lightroom.curve?.green?.length || 0,
      hasBlue: !!result.lightroom.curve?.blue,
      blueLength: result.lightroom.curve?.blue?.length || 0,
      structuredRgbCurves: structured.rgbCurves,
      structuredToneCurves: structured.toneCurves,
    });
    
    // 【调试日志】在 result.lightroom 构建完成后，立即检查 white_balance 的值
    // 【重要】这个日志用于诊断 white_balance 是否正确构建
    const wbAfterBuild = result.lightroom.white_balance;
    console.log('[dataAdapter] 🔍 result.lightroom.white_balance 构建后检查:', {
      hasWhiteBalance: !!wbAfterBuild,
      whiteBalanceType: typeof wbAfterBuild,
      whiteBalanceIsNull: wbAfterBuild === null,
      whiteBalanceIsUndefined: wbAfterBuild === undefined,
      whiteBalanceValue: wbAfterBuild,
      whiteBalanceKeys: wbAfterBuild ? Object.keys(wbAfterBuild) : [],
      tempValue: wbAfterBuild?.temp?.value,
      tintValue: wbAfterBuild?.tint?.value,
      // 【新增】检查 result.lightroom 对象本身
      hasLightroom: !!result.lightroom,
      lightroomKeys: result.lightroom ? Object.keys(result.lightroom) : [],
      whiteBalanceInLightroom: 'white_balance' in (result.lightroom || {}),
    });
    
    // 【修复】如果 white_balance 是 undefined 或 null，强制设置为默认值
    // 这是一个防御性编程措施，确保前端UI始终可以显示色温色调面板
    if (!wbAfterBuild || wbAfterBuild === null || wbAfterBuild === undefined) {
      console.warn('[dataAdapter] ⚠️ white_balance 构建失败，强制设置为默认值');
      result.lightroom.white_balance = {
        temp: { value: 5500, range: "+0", reason: "默认色温（强制设置）" },
        tint: { value: 0, range: "+0", reason: "默认色调（强制设置）" },
      };
    }
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

  // 8. Image Analysis (OpenCV 图像分析数据)
  if (backendData.meta?.image_analysis) {
    result.image_analysis = backendData.meta.image_analysis;
  }

  // 【调试日志】记录数据转换完成（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
  console.log('[dataAdapter] 数据转换完成:', {
    hasReview: !!result.review,
    hasComposition: !!result.composition,
    hasLighting: !!result.lighting,
    hasColor: !!result.color,
    hasLightroom: !!result.lightroom,
    hasPhotoshop: !!result.photoshop,
    resultKeys: Object.keys(result),
      // 【新增】详细记录 review 数据
      reviewStyleSummary: result.review?.style_summary ? `${result.review.style_summary.substring(0, 50)}...` : 'empty',
      reviewComprehensiveReview: result.review?.comprehensive_review ? `${result.review.comprehensive_review.substring(0, 50)}...` : 'empty',
      reviewOverlays: result.review?.overlays ? Object.keys(result.review.overlays) : [],
      reviewHistogramData: result.review?.simulated_histogram_data ? 'exists' : 'missing',
  });
  }

  return result;
}

