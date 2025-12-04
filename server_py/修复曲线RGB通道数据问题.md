# 修复 LR 面板曲线 RGB 通道数据缺失问题

## 问题描述
LR 面板中的曲线（红色通道、绿色通道、蓝色通道）没有数据显示。

## 问题定位

### 1. 后端字段名映射错误
- **位置**：`server_py/app/services/analysis_formatter.py` 第 3004-3006 行
- **问题**：后端使用了错误的字段名 `red_channel`、`green_channel`、`blue_channel`
- **实际**：Gemini 输出的字段名是 `red_points`、`green_points`、`blue_points`（见 `prompt_template.py` 第 373-375 行）

### 2. `_convert_lightroom_workflow_to_structured` 函数缺少单通道曲线数据提取
- **位置**：`server_py/app/routes/analyze.py` 第 1030-1040 行
- **问题**：只提取了 `rgb_points`，但没有提取单通道曲线数据，也没有设置 `rgbCurves` 字段

### 3. 前端 `result.lightroom.curve` 字段缺失
- **位置**：`src/src/lib/dataAdapter.ts` 第 1754-2129 行
- **问题**：`result.lightroom` 对象中没有 `curve` 字段，只有 `result.color.curve` 字段

## 修复方案

### 1. 修复后端字段名映射（analysis_formatter.py）
```python
# 【修复前】
rgb_curves = {
    "red": normalize_channel_points(tone_curve_obj.get("red_channel", [])),
    "green": normalize_channel_points(tone_curve_obj.get("green_channel", [])),
    "blue": normalize_channel_points(tone_curve_obj.get("blue_channel", [])),
}

# 【修复后】
rgb_curves = {
    "red": normalize_channel_points(
        tone_curve_obj.get("red_points", []) or tone_curve_obj.get("red_channel", [])
    ),
    "green": normalize_channel_points(
        tone_curve_obj.get("green_points", []) or tone_curve_obj.get("green_channel", [])
    ),
    "blue": normalize_channel_points(
        tone_curve_obj.get("blue_points", []) or tone_curve_obj.get("blue_channel", [])
    ),
}
```

### 2. 修复 `_convert_lightroom_workflow_to_structured` 函数（analyze.py）
添加了单通道曲线数据提取逻辑，并设置 `rgbCurves` 字段。

### 3. 修复前端 `dataAdapter.ts`
在 `result.lightroom` 对象中添加了 `curve` 字段，从 `structured.rgbCurves` 提取数据。

## 数据流

1. **Gemini 输出**：`lightroom_workflow.tone_curve.red_points`、`green_points`、`blue_points`
2. **后端提取**：`_format_lightroom` → `structured.rgbCurves.red/green/blue`
3. **后端转换**：`_convert_lightroom_workflow_to_structured` → `result.rgbCurves.red/green/blue`
4. **前端适配**：`dataAdapter.ts` → `result.lightroom.curve.red/green/blue`
5. **前端显示**：`LightroomPanel.tsx` → `AdvancedCurveMonitor` 组件

## 修改的文件

1. `server_py/app/services/analysis_formatter.py` - 修复字段名映射，添加日志
2. `server_py/app/routes/analyze.py` - 添加单通道曲线数据提取
3. `src/src/lib/dataAdapter.ts` - 添加 `result.lightroom.curve` 字段

## 测试建议

1. 检查后端日志，确认 RGB 通道曲线数据已正确提取
2. 检查前端控制台，确认 `result.lightroom.curve` 数据存在
3. 检查 LR 面板，确认红色、绿色、蓝色通道曲线正常显示

