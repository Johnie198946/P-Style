# 🚀 下一步操作指南

## ✅ 当前状态

- ✅ Docker 镜像已构建并运行
- ✅ 后端 API 端点已实现并测试通过
- ✅ 前端服务已集成
- ✅ 健康检查 API 正常工作

## 📋 下一步任务清单

### 阶段 1：功能测试（立即开始）

#### 1.1 完整渲染流程测试

**目标**：验证从上传图片到生成高保真预览的完整流程

**步骤**：

1. **准备测试图片**
   ```bash
   # 将测试图片放到上传目录
   cp /path/to/your/test.jpg server_py/storage/uploads/test_image.jpg
   ```

2. **获取认证 Token**
   - 登录前端应用
   - 从浏览器控制台获取 Token：
     ```javascript
     localStorage.getItem('accessToken')
     ```

3. **测试完整渲染 API**
   ```bash
   curl -X POST http://localhost:8081/api/render/high-fidelity \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "image_path": "test_image.jpg",
       "basic": {
         "exposure": "+0.8",
         "contrast": "+10",
         "highlights": "-40",
         "shadows": "+60",
         "whites": "+30",
         "blacks": "-15"
       },
       "hsl": {
         "green": {
           "hue": "+15",
           "saturation": "+20",
           "luminance": "+10"
         },
         "blue": {
           "hue": "-10",
           "saturation": "+30",
           "luminance": "-20"
         }
       },
       "use_cache": true
     }'
   ```

4. **验证结果**
   - 检查响应中的 `rendered_url`
   - 访问渲染后的图片 URL
   - 检查 `server_py/storage/rendered/` 目录

#### 1.2 SOLO 模式测试

**目标**：验证单独参数预览功能

**步骤**：

1. **测试单个 SOLO 参数**
   ```bash
   curl -X POST http://localhost:8081/api/render/solo \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "image_path": "test_image.jpg",
       "solo_param": "hsl_green",
       "hsl": {
         "green": {
           "hue": "+15",
           "saturation": "+20",
           "luminance": "+10"
         }
       }
     }'
   ```

2. **测试批量 SOLO 渲染**
   ```bash
   curl -X POST http://localhost:8081/api/render/solo/batch \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "image_path": "test_image.jpg",
       "solo_params": ["exposure", "hsl_green", "grading_shadows"],
       "basic": {"exposure": "+0.8"},
       "hsl": {"green": {"hue": "+15"}},
       "colorGrading": {"shadows": {"hue": 210, "saturation": 10}}
     }'
   ```

#### 1.3 前端 UI 测试

**目标**：验证前端集成是否正常工作

**步骤**：

1. **启动前端应用**
   ```bash
   cd src
   npm run dev
   ```

2. **测试流程**
   - 打开应用并登录
   - 上传测试图片
   - 等待 AI 分析完成
   - 打开 Lightroom 面板
   - 点击 "PREVIEW MODE" 按钮
   - 确认 "HQ RENDER" 按钮显示
   - 点击 "HQ RENDER" 按钮
   - 等待渲染完成
   - 验证渲染结果是否正确显示

3. **检查控制台**
   - 打开浏览器开发者工具
   - 查看 Network 标签页，确认 API 请求
   - 查看 Console 标签页，确认日志输出

### 阶段 2：参数校准（测试完成后）

#### 2.1 参数映射验证

**目标**：确保 LR 参数正确映射到 Darktable

**方法**：

1. **对比测试**
   - 在 Lightroom 中应用相同参数
   - 使用 Darktable CLI 渲染相同参数
   - 对比两张图片的差异

2. **调整映射系数**
   - 如果发现差异，调整 `DarktableXmpGenerator` 中的映射逻辑
   - 记录调整后的系数

#### 2.2 XMP 文件验证

**目标**：确保生成的 XMP 文件正确

**步骤**：

1. **查看生成的 XMP 文件**
   ```bash
   # XMP 文件位置
   ls -la server_py/storage/xmp/
   
   # 查看 XMP 内容
   cat server_py/storage/xmp/*.xmp
   ```

2. **手动测试 XMP**
   ```bash
   # 在容器中手动测试
   docker exec -it pstyle-darktable /app/render_script.sh \
     /app/input/test_image.jpg \
     /app/xmp/test.xmp \
     /app/output/test_manual.jpg
   ```

### 阶段 3：性能优化（可选）

#### 3.1 渲染速度优化

- 如果渲染时间 > 5 秒，考虑：
  - 降低输出分辨率
  - 优化 XMP 生成逻辑
  - 使用 GPU 加速（如果有）

#### 3.2 缓存优化

- 监控缓存命中率
- 调整缓存策略
- 实现缓存预热

## 🔍 故障排查

### 问题 1：API 返回 404

**解决方案**：
- 确认路由前缀为 `/api/render`
- 检查后端服务是否运行
- 查看后端日志

### 问题 2：渲染失败

**检查清单**：
- [ ] Docker 容器是否运行
- [ ] 图片路径是否正确
- [ ] XMP 文件是否生成
- [ ] 查看容器日志：`docker-compose logs -f`

### 问题 3：前端按钮不显示

**检查清单**：
- [ ] 预览模式是否开启
- [ ] 服务可用性检查是否通过
- [ ] 查看浏览器控制台错误

## 📊 测试检查清单

### API 测试
- [ ] 健康检查端点正常
- [ ] 完整渲染端点正常
- [ ] SOLO 渲染端点正常
- [ ] 错误处理正常

### 功能测试
- [ ] 基本面板参数渲染正确
- [ ] HSL 参数渲染正确
- [ ] 色彩分级参数渲染正确
- [ ] 校准参数渲染正确

### 前端测试
- [ ] HQ RENDER 按钮显示
- [ ] 渲染状态正确显示
- [ ] 渲染结果正确展示
- [ ] 错误提示正确显示

## 🎯 成功标准

1. **功能完整性**
   - 所有 API 端点正常工作
   - 渲染结果与预期一致
   - 前端 UI 交互正常

2. **性能要求**
   - 健康检查 < 100ms
   - 缓存命中渲染 < 200ms
   - 首次渲染 < 5s

3. **稳定性**
   - 错误处理完善
   - 日志记录完整
   - 异常情况有提示

## 📝 测试记录模板

```markdown
## 测试记录 - [日期]

### 测试环境
- Darktable 版本: 4.2.1
- 测试图片: [图片名称]
- 测试参数: [参数列表]

### 测试结果
- [ ] 健康检查: ✅/❌
- [ ] 完整渲染: ✅/❌
- [ ] SOLO 渲染: ✅/❌
- [ ] 前端 UI: ✅/❌

### 发现的问题
1. [问题描述]
2. [问题描述]

### 下一步行动
1. [行动计划]
2. [行动计划]
```

---

**开始测试前，请确保**：
1. ✅ Docker 容器运行正常
2. ✅ 后端服务运行在端口 8081
3. ✅ 前端应用可以正常访问
4. ✅ 已准备好测试图片

