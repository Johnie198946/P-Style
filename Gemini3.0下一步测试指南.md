# Gemini 3.0 下一步测试指南

## 📋 当前状态

✅ **代码迁移完成**
- 模型已更新为 `gemini-3-pro-preview`
- 代码已支持 `thinking_level` 参数
- 基础 API 调用测试通过

✅ **基础测试完成**
- 简单文本任务测试通过
- 时延测试完成（获得性能基准）

## 🎯 下一步测试任务

### 1. 完整功能测试（推荐优先）

#### 1.1 Part1 分析测试

**测试目的**：验证 Part1 分析功能是否正常

**测试方法**：
```bash
cd server_py

# 如果有测试图片
python3 scripts/test_part1_part2_integration.py \
  --source /path/to/source.jpg \
  --target /path/to/target.jpg \
  --part part1 \
  --thinking-level high
```

**验证点**：
- ✅ API 调用成功
- ✅ JSON 解析成功
- ✅ 结果格式化成功
- ✅ 包含必需字段：`photoReview`、`composition`、`lighting`、`color`
- ✅ 构图七段分析完整

#### 1.2 Part2 分析测试

**测试目的**：验证 Part2 分析功能是否正常

**测试方法**：
```bash
cd server_py

# 需要源图和目标图
python3 scripts/test_part1_part2_integration.py \
  --source /path/to/source.jpg \
  --target /path/to/target.jpg \
  --part part2 \
  --thinking-level high
```

**验证点**：
- ✅ API 调用成功
- ✅ JSON 解析成功
- ✅ 结果格式化成功
- ✅ 包含必需字段：`lightroom`、`photoshop`、`color`
- ✅ Lightroom 参数格式正确（字符串，带正负号）
- ✅ 曲线、HSL、色彩分级等复杂结构完整

#### 1.3 完整流程测试（Part1 + Part2）

**测试方法**：
```bash
cd server_py

python3 scripts/test_part1_part2_integration.py \
  --source /path/to/source.jpg \
  --target /path/to/target.jpg \
  --part full \
  --thinking-level high
```

### 2. 性能测试（需要测试图片）

#### 2.1 Part1 时延测试

```bash
cd server_py

# 测试 high thinking level
python3 scripts/test_gemini_latency.py \
  --scenario part1 \
  --image /path/to/test.jpg \
  --thinking-level high

# 测试 low thinking level
python3 scripts/test_gemini_latency.py \
  --scenario part1 \
  --image /path/to/test.jpg \
  --thinking-level low
```

#### 2.2 Part2 时延测试

```bash
cd server_py

# 测试 high thinking level
python3 scripts/test_gemini_latency.py \
  --scenario part2 \
  --image /path/to/test.jpg \
  --thinking-level high

# 测试 low thinking level
python3 scripts/test_gemini_latency.py \
  --scenario part2 \
  --image /path/to/test.jpg \
  --thinking-level low
```

#### 2.3 性能对比分析

对比不同思考水平的性能：
- `thinking_level="high"` vs `"low"`
- 不同任务复杂度的影响
- 网络延迟的影响

### 3. 前端集成测试

#### 3.1 启动服务

```bash
# 启动后端
cd server_py
python3 run.py

# 启动前端（另一个终端）
cd ..
npm run dev
```

#### 3.2 测试流程

1. **上传图片**：
   - 上传源图（必填）
   - 上传目标图（可选）

2. **Part1 分析**：
   - 点击"开始 AI 分析"
   - 检查返回结果是否正确
   - 检查前端展示是否正常

3. **Part2 分析**：
   - 点击"查看详细方案"
   - 检查返回结果是否正确
   - 检查前端展示是否正常

4. **Part3 风格模拟**：
   - 确认使用 `gemini-2.5-flash-image`（不变）
   - 检查功能是否正常

### 4. SDK 支持确认

#### 4.1 检查 SDK 版本

```bash
pip show google-genai
```

#### 4.2 查看 SDK 文档

- 检查是否支持 `thinking_level` 参数
- 如果支持，查看如何设置
- 更新代码以实际设置该参数

#### 4.3 更新代码（如果 SDK 支持）

如果 SDK 支持 `thinking_level`，更新 `gemini_service.py`：

```python
# 在 generate_text 方法中
if thinking_level:
    # 根据 SDK 文档设置 thinking_level
    config_params["thinking_level"] = thinking_level
```

## 📊 测试数据收集

### 需要收集的数据

1. **时延数据**：
   - TTFB（Time To First Byte）
   - 总时间（Total Time）
   - 不同思考水平的对比

2. **功能数据**：
   - API 调用成功率
   - JSON 解析成功率
   - 结果格式化成功率
   - 字段完整性

3. **性能数据**：
   - 响应大小
   - Token 消耗（如果可获取）
   - 错误率

### 测试报告位置

- **时延测试报告**：`server_py/test_reports/gemini_latency_report.json`
- **功能测试日志**：控制台输出

## ⚠️ 注意事项

1. **测试图片**：
   - 需要准备测试图片（JPG/PNG 格式）
   - 建议准备不同尺寸和类型的图片
   - 图片大小建议 < 10MB

2. **API Key 权限**：
   - 确保 API Key 有权限访问 `gemini-3-pro-preview`
   - 检查 API 配额和速率限制

3. **成本控制**：
   - 测试会产生 API 调用费用
   - 建议控制测试次数
   - 监控成本变化

4. **网络环境**：
   - 确保网络连接稳定
   - 如果使用代理，确保代理正常

## 🚀 快速开始

### 如果没有测试图片

1. **使用在线图片**：
   - 下载一张测试图片到本地
   - 使用该图片进行测试

2. **创建简单测试**：
   - 可以使用 `verify_gemini3_migration.py` 进行基础验证
   - 该脚本不需要图片，只测试 API 调用

### 如果有测试图片

1. **运行完整功能测试**：
   ```bash
   cd server_py
   python3 scripts/test_part1_part2_integration.py \
     --source /path/to/source.jpg \
     --target /path/to/target.jpg \
     --part full
   ```

2. **运行时延测试**：
   ```bash
   cd server_py
   python3 scripts/test_gemini_latency.py \
     --scenario all \
     --image /path/to/test.jpg
   ```

## 📝 测试检查清单

- [ ] Part1 分析功能测试
- [ ] Part2 分析功能测试
- [ ] Part1 时延测试（high/low thinking level）
- [ ] Part2 时延测试（high/low thinking level）
- [ ] 前端集成测试
- [ ] SDK 支持确认
- [ ] 性能对比分析
- [ ] 错误处理测试
- [ ] 边界情况测试

## 📚 相关文档

- [Gemini 3.0 迁移方案](./Gemini3.0迁移方案.md)
- [Gemini 时延测试方案](./Gemini时延测试方案.md)
- [Gemini 3.0 测试结果报告](./Gemini3.0测试结果报告.md)
- [Gemini 3.0 迁移和测试总结](./Gemini3.0迁移和测试总结.md)

---

**当前状态**：✅ 代码迁移完成，基础测试通过  
**下一步**：进行完整功能测试和性能测试

