# 开发方案更新总结 - Implementation Specification

## 📋 更新概述

本次更新实现了**"开发者级别的实施规范（Developer-Level Implementation Specification）"**，将理论拆解为**数据结构（JSON Schema）**、**前置计算逻辑（Pre-calc Logic）**和**Prompt指令集（Instruction Set）**三个部分，实现了从"感觉像"到"数据级精准"的升级。

**更新日期**: 2025-01-29  
**核心目标**: 解决 Gemini "眼盲"问题，通过代码层面的量化分析和安全拦截，确保 AI 生成的参数准确可用。

---

## 🏗️ 架构设计

### 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│  第一层：输入端的数据注入 (Input Data Injection)            │
│  - 后端 OpenCV 计算 luma_mean, histogram_dist, color_cast   │
│  - 注入 Prompt 最前面，强制 AI 识别曝光/色温问题            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  第二层：Prompt 核心逻辑与参数映射 (Prompt & Mapping)       │
│  - 伪代码级指令集（Gap Analysis, Anchor Color Locking）     │
│  - 硬映射：Calibration, Tone Curve, HSL, Color Grading      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  第三层：微操控制与安全阀 (Safety Protocols)                 │
│  - 前端代码级拦截：Auto-Exposure, Skin Tone Lock, Clamp     │
│  - 防止 AI 输出极端值（如 Saturation +100）                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 第一层：输入端的数据注入

### 1.1 后端计算逻辑

**文件**: `server_py/app/services/image_analyzer.py`

**计算指标**:
- **`luma_mean` (0-255)**: 全图平均亮度
  - 判定标准: `<60` 为欠曝（需大幅提亮），`>200` 为过曝
- **`histogram_dist`**: 直方图重心
  - 算法: 计算暗部(0-85)、中间调(86-170)、亮部(171-255)的像素占比
- **`color_cast`**: 白平衡偏移
  - 算法: 计算全图 R, G, B 通道的平均值差异（`B_avg - R_avg`）

**实现位置**:
```python
# 在 _run_part2_analysis_job 中调用
image_analysis = compare_images(ref_bytes, user_bytes)
# 返回结构：
# {
#   "user": {
#     "histogram": { "avg_luminance": 45, "distribution": {...} },
#     "colors": { "average_rgb": { "r": 120, "g": 110, "b": 130 } }
#   },
#   "reference": {...},
#   "deltas": {...}
# }
```

### 1.2 Prompt 注入

**文件**: `server_py/app/services/prompt_template.py`

**新增方法**: `_build_input_data_injection_section()`

**输出格式**:
```text
[SYSTEM_DETECTED_METRICS]
- User_Image_Luminance_Mean: 45 (Scale 0-255) -> STATUS: Severely Underexposed.
- User_Image_Histogram: Shadows(70%), Midtones(20%), Highlights(10%).
- Detected_Cast: Cool (Blue dominant) (B-R diff: 10).
```

**作用**: 强制 Gemini 执行："哦，原来用户图这么黑，那我必须把 Exposure 参数拉高到 +2.0 以上"。

---

## 🧠 第二层：Prompt 核心逻辑与参数映射

### 2.1 模块映射表

| Lightroom 模块 | Prompt 指令 | JSON 字段 | 关键逻辑 |
|---------------|------------|-----------|---------|
| **Calibration** | Blue Primary Hue -30~-60 (Anime/Film) | `calibration.blue_primary.hue` | 青橙色调基础 |
| **Tone Curve** | 5点锚定法 (0, 64, 128, 192, 255) | `tone_curve.rgb_points` | 褪色感：起点 y=20-30 |
| **HSL** | 矢量统一（黄→绿，绿→青） | `hsl.yellow.hue`, `hsl.green.hue` | 杂色归拢 |
| **Color Grading** | 高光/阴影色轮方向（Hue 角度） | `color_grading.shadows.hue` | 色调分离 |

### 2.2 认知协议（CoT Protocol）

**已实现**:
1. **Gap Analysis（差距分析）**:
   - Step 1: 基础正常化（Normalization）
   - Step 2: 风格注入（Stylization）
2. **Anchor Color Locking（锚定颜色锁定）**:
   - 识别关键色（天空蓝、植被绿、肤色）
   - 在 Prompt 中明确保护这些颜色
3. **Dynamic Range Matching（动态范围匹配）**:
   - 分析参考图的高调/低调/HDR 特征
   - 调整 Exposure, Contrast, Dehaze 匹配动态范围

### 2.3 JSON 输出模板

**文件**: `server_py/app/services/prompt_template.py` → `PART2_TEMPLATE`

**关键字段**:
```json
{
  "phase_1_extraction": {
    "master_style_recap": "日系冬日极简",
    "style_summary_recap": "Phase 1 核心指导思想",
    "key_adjustment_strategy": "三大关键调整动作"
  },
  "lightroom_workflow": {
    "basic_panel": {
      "exposure": { "value": "+0.5", "reason": "优先修正亮度差" },
      "contrast": { "value": "-5", "reason": "⚠️绝对禁止超过±10" }
    },
    "tone_curve": {
      "rgb_points": [[0,30], [60,65], [128,128], [190,200], [255,250]]
    },
    "calibration": {
      "blue_primary": { "hue": -50, "saturation": +50, "note": "胶片感核心" }
    }
  }
}
```

---

## 🛡️ 第三层：微操控制与安全阀

### 3.1 前端安全拦截

**文件**: `src/components/analysis/LightroomPanel.tsx`

**实现位置**: `filterParams` 计算逻辑（`useMemo`）

#### 3.1.1 Auto-Exposure Override（自动曝光补偿）

**逻辑**:
```typescript
// 如果全图平均亮度极低 (< 50/255)，强制曝光补偿至少 +1.0 EV
if (lumaMean < 50) {
  const minExposure = 1.0;
  if (rawVal < minExposure) {
    rawVal = minExposure; // 覆盖 AI 建议
  }
}
```

**触发条件**: `userMetrics.histogram.avg_luminance < 50`

#### 3.1.2 Skin Tone Lock（肤色保护锁）

**逻辑**:
```typescript
// 判断场景类型
const sceneDesc = (
  data.color?.scene_type || 
  data.analysis?.scene_type || 
  data.phase_1_extraction?.master_style_recap || 
  ""
).toLowerCase();
const isPortrait = sceneDesc.includes('portrait') || sceneDesc.includes('人像');

// 如果检测到人像，强制重置 Orange HSL 参数
if (isPortrait) {
  // Hue: 限制在 -5 到 +5 之间（防止偏绿/偏紫）
  h = Math.max(-5, Math.min(5, h));
  // Saturation: 限制 > -10（防止死灰）
  s = Math.max(-10, s);
}
```

**触发条件**: 场景描述包含 "portrait" 或 "人像"

#### 3.1.3 Dynamic Range Clamp（动态范围压缩）

**逻辑**:
```typescript
// 饱和度限制在 -40 到 +40，防止 AI 输出 +100 这种毁图参数
saturation: Math.max(-40, Math.min(40, rawSaturation))
```

**限制范围**: 
- **Saturation**: `-40 ~ +40`（用户指定）
- **Contrast**: `-50 ~ +50`（已有）
- **Blacks**: `-60 ~ +100`（已有）

---

## 🔄 数据流

### 完整数据流图

```
用户上传图片
    ↓
后端 OpenCV 分析 (image_analyzer.py)
    ↓
计算 luma_mean, histogram_dist, color_cast
    ↓
注入 Prompt (_build_input_data_injection_section)
    ↓
Gemini API 调用 (get_part2_prompt)
    ↓
返回 JSON 参数
    ↓
保存到数据库 (structured_result.meta.image_analysis)
    ↓
前端 Data Adapter (dataAdapter.ts)
    ↓
提取 meta.image_analysis, color.scene_type
    ↓
LightroomPanel 接收数据
    ↓
Safety Clamps 拦截 (filterParams)
    ↓
最终渲染 (LivePreviewCanvas)
```

### 关键数据传递

**后端 → 前端**:
```typescript
// backend: server_py/app/routes/analyze.py
structured_result["meta"]["image_analysis"] = image_analysis

// frontend: src/src/lib/dataAdapter.ts
result.lightroom.meta = {
  image_analysis: backendData.meta?.image_analysis
}
result.lightroom.color = {
  scene_type: sections.color?.structured?.scene_type || "..."
}

// frontend: src/components/analysis/LightroomPanel.tsx
const userMetrics = data.meta?.image_analysis?.user;
const lumaMean = userMetrics?.histogram?.avg_luminance ?? 128;
const sceneDesc = data.color?.scene_type || data.analysis?.scene_type || "";
```

---

## 📝 代码变更清单

### 后端变更

1. **`server_py/app/services/prompt_template.py`**:
   - ✅ 新增 `_build_input_data_injection_section()` 方法
   - ✅ 更新 `get_part2_prompt()` 调用注入方法
   - ✅ 保持 `PART2_TEMPLATE` 的伪代码级结构

2. **`server_py/app/routes/analyze.py`**:
   - ✅ 在 `_run_part2_analysis_job()` 中调用 `compare_images()`
   - ✅ 将 `image_analysis` 注入到 `structured_result.meta.image_analysis`

3. **`server_py/app/services/image_analyzer.py`**:
   - ✅ 已实现 `analyze_image()` 和 `compare_images()` 方法
   - ✅ 计算 `avg_luminance`, `distribution`, `color_temperature`

### 前端变更

1. **`src/src/lib/dataAdapter.ts`**:
   - ✅ 提取 `meta.image_analysis` 到 `result.lightroom.meta`
   - ✅ 提取 `color.scene_type` 到 `result.lightroom.color`
   - ✅ 提取 `analysis` 和 `phase_1_extraction` 字段

2. **`src/types/analysis.ts`**:
   - ✅ 更新 `LightroomData` 接口，添加 `meta`, `color`, `analysis`, `phase_1_extraction` 字段

3. **`src/components/analysis/LightroomPanel.tsx`**:
   - ✅ 实现 Auto-Exposure Override（基于 `lumaMean < 50`）
   - ✅ 实现 Skin Tone Lock（基于 `isPortrait` 判断）
   - ✅ 实现 Dynamic Range Clamp（Saturation `±40`）

---

## ✅ 验证清单

### 功能验证

- [x] 后端计算 `luma_mean`, `histogram_dist`, `color_cast`
- [x] Prompt 注入 `[SYSTEM_DETECTED_METRICS]` 段落
- [x] 前端接收 `meta.image_analysis` 数据
- [x] Auto-Exposure Override 触发（当 `lumaMean < 50`）
- [x] Skin Tone Lock 触发（当场景包含 "portrait"）
- [x] Dynamic Range Clamp 生效（Saturation 限制在 `±40`）

### 数据流验证

- [x] 后端 `image_analysis` → `structured_result.meta.image_analysis`
- [x] 前端 `dataAdapter` → `result.lightroom.meta`
- [x] `LightroomPanel` 读取 `data.meta?.image_analysis?.user`

### 类型安全验证

- [x] TypeScript 编译通过（无 lint 错误）
- [x] `LightroomData` 接口包含所有新字段

---

## 🎯 预期效果

### 问题解决

1. **Gemini "眼盲"问题**:
   - ✅ 通过 `[SYSTEM_DETECTED_METRICS]` 强制 AI 识别曝光问题
   - ✅ 代码级 Auto-Exposure Override 兜底

2. **参数极端值问题**:
   - ✅ Saturation 限制在 `±40`
   - ✅ Contrast 限制在 `±50`（已有）
   - ✅ 肤色保护（Orange HSL 限制）

3. **风格化过度问题**:
   - ✅ Skin Tone Lock 防止人像偏色
   - ✅ 动态范围匹配确保基础正常化

### 精度提升

- **曝光判断**: 从"感觉偏暗" → "量化数据：luma_mean=45，需 +2.0 EV"
- **色温判断**: 从"偏冷" → "B-R diff=10，Cool (Blue dominant)"
- **参数生成**: 从"拍脑袋" → "基于直方图匹配曲线和量化差值"

---

## 📚 相关文档

- **原始规范**: 用户提供的 "Developer-Level Implementation Specification"
- **Prompt 模板**: `server_py/app/services/prompt_template.py`
- **图像分析**: `server_py/app/services/image_analyzer.py`
- **前端实现**: `src/components/analysis/LightroomPanel.tsx`

---

## 🔮 后续优化建议

1. **更精细的场景识别**:
   - 使用 CV 模型检测人像（而非文本匹配）
   - 支持更多场景类型（风景、建筑、静物等）

2. **自适应安全阈值**:
   - 根据参考图风格动态调整 Saturation 限制
   - 日系风格：`-40 ~ +20`，欧美风格：`-20 ~ +40`

3. **实时预览反馈**:
   - 当 Safety Clamp 触发时，在 UI 上显示警告
   - 提示用户："AI 建议的曝光值过低，已自动提升至 +1.0 EV"

4. **量化分析可视化**:
   - 在 Signal Monitor 中显示 `luma_mean` 和 `histogram_dist`
   - 用颜色标记欠曝/过曝区域

---

**文档版本**: v1.0  
**最后更新**: 2025-01-29  
**维护者**: AI Assistant

