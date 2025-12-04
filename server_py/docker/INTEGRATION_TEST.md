# 高保真渲染服务集成测试指南

## 📋 测试清单

### 1. 基础环境验证 ✅

- [x] Docker 镜像构建成功
- [x] 容器运行正常
- [x] Darktable CLI 可用
- [x] 渲染脚本就绪
- [x] 存储目录已创建

### 2. 后端 API 测试

#### 2.1 健康检查

```bash
# 启动后端服务后测试
curl http://localhost:8081/api/render/health
```

**预期响应**：
```json
{
  "status": "healthy",
  "docker_available": true,
  "message": "Docker 和 Darktable 容器可用"
}
```

#### 2.2 完整渲染测试

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
      "shadows": "+60"
    },
    "use_cache": true
  }'
```

**预期响应**：
```json
{
  "success": true,
  "message": "渲染成功",
  "rendered_url": "/static/rendered/hifi_xxx.jpg",
  "cache_hit": false,
  "render_time_ms": 2500
}
```

#### 2.3 SOLO 模式渲染测试

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

### 3. 前端集成测试

#### 3.1 服务可用性检查

在浏览器控制台执行：
```javascript
import { hifiRenderService } from './src/lib/hifiRenderService';

// 检查服务可用性
const health = await hifiRenderService.checkHealth();
console.log('服务状态:', health);
```

#### 3.2 UI 功能测试

1. **打开 Lightroom 面板**
   - 确认 "HQ RENDER" 按钮显示
   - 确认按钮状态（可用/不可用）

2. **点击 HQ RENDER 按钮**
   - 确认加载状态显示
   - 确认渲染完成后图片更新

3. **SOLO 模式测试**
   - 点击某个参数的 SOLO 按钮
   - 确认触发 SOLO 渲染（如果启用）

### 4. 端到端测试流程

#### 步骤 1：准备测试图片

```bash
# 将测试图片放到上传目录
cp /path/to/test.jpg server_py/storage/uploads/test_image.jpg
```

#### 步骤 2：启动后端服务

```bash
cd server_py
# 确保 Docker 容器运行
docker-compose -f docker/docker-compose.yml up -d

# 启动后端服务
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
```

#### 步骤 3：测试 API

```bash
# 健康检查
curl http://localhost:8081/api/render/health

# 完整渲染
curl -X POST http://localhost:8081/api/render/high-fidelity \
  -H "Content-Type: application/json" \
  -d '{"image_path": "test_image.jpg", "basic": {"exposure": "+0.5"}}'
```

#### 步骤 4：前端测试

1. 打开前端应用
2. 上传测试图片
3. 等待 AI 分析完成
4. 打开预览模式
5. 点击 "HQ RENDER" 按钮
6. 等待渲染完成
7. 验证渲染结果

## 🔍 故障排查

### 问题 1：健康检查返回 degraded

**可能原因**：
- Docker 容器未运行
- 容器名称不匹配

**解决方案**：
```bash
# 检查容器状态
docker ps | grep pstyle-darktable

# 重启容器
cd server_py/docker
docker-compose restart
```

### 问题 2：渲染失败 - 图片不存在

**可能原因**：
- 图片路径错误
- 图片未上传到正确目录

**解决方案**：
```bash
# 检查图片是否存在
ls -la server_py/storage/uploads/

# 检查路径映射
docker exec pstyle-darktable ls -la /app/input/
```

### 问题 3：前端 API 调用失败

**可能原因**：
- API 基础 URL 配置错误
- CORS 问题
- 认证 Token 缺失

**解决方案**：
1. 检查 `src/src/lib/api.ts` 中的 `API_BASE_URL`
2. 检查后端 CORS 配置
3. 确保用户已登录

### 问题 4：渲染结果不正确

**可能原因**：
- XMP 参数映射错误
- Darktable 版本兼容性问题

**解决方案**：
1. 检查 XMP 文件内容
2. 查看 Darktable 日志
3. 验证参数映射逻辑

## 📊 性能基准

| 操作 | 预期时间 | 说明 |
|------|---------|------|
| 健康检查 | < 100ms | 本地 Docker 检查 |
| 缓存命中渲染 | < 200ms | 从缓存加载 |
| 首次渲染 | 2-5s | 1920px 宽度 |
| SOLO 渲染 | 1-3s | 单个参数 |

## ✅ 验收标准

- [ ] 健康检查 API 正常响应
- [ ] 完整渲染 API 成功返回图片 URL
- [ ] SOLO 渲染 API 正常工作
- [ ] 前端 UI 正确显示渲染按钮
- [ ] 渲染完成后图片正确显示
- [ ] 缓存机制正常工作
- [ ] 错误处理正确显示

## 🚀 生产环境部署检查

- [ ] Docker 镜像已推送到镜像仓库
- [ ] 环境变量配置正确
- [ ] 存储目录权限正确
- [ ] 日志记录正常
- [ ] 监控告警配置
- [ ] 备份策略已制定

