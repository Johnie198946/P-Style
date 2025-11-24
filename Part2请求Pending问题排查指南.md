# Part2 请求 Pending 问题排查指南

## 问题现象

前端 Part2 请求显示为 `(pending)` 状态，无法完成。

## 排查步骤

### 1. 检查后端服务状态

```bash
# 检查后端服务是否运行
curl http://localhost:8081/health

# 检查后端进程
lsof -ti:8081
```

**预期结果**：返回 `{"status":"ok"}` 和进程 PID

### 2. 检查后端日志

```bash
# 实时查看 Part2 相关日志
tail -f /tmp/backend_8081.log | grep -E "Part2|part2"

# 或使用日志监控脚本
./query_part2_logs.sh
```

**关键日志点**：
- `【请求中间件】Part2 接口请求` - 请求到达中间件
- `【Part2 请求开始】` - 请求进入路由处理函数
- `【Part2 用户验证完成】` - 用户验证通过
- `【Part2 任务已提交后台】` - 后台任务已提交
- `【Part2 请求完成】` - 响应已返回
- `【Part2 后台任务开始】` - 后台任务开始执行

### 3. 检查前端请求

**浏览器开发者工具**：
1. 打开 Network 标签
2. 找到 `part2` 请求
3. 检查：
   - **Status**：应该是 `200 OK` 或 `(pending)`
   - **Request Headers**：确认 `Authorization: Bearer <token>` 存在
   - **Request Payload**：确认 `taskId` 字段存在
   - **Response**：如果请求完成，查看响应内容

**浏览器 Console**：
- 查看是否有 `[ThemeCardsGrid]` 相关的日志
- 查看是否有错误信息

### 4. 可能的问题原因

#### 问题 1：请求未到达后端

**症状**：
- 后端日志中没有 `【请求中间件】Part2 接口请求` 或 `【Part2 请求开始】`
- 浏览器 Network 标签显示请求为 `(pending)` 或 `(canceled)`

**可能原因**：
1. **CORS 问题**：检查浏览器 Console 是否有 CORS 错误
2. **网络问题**：检查网络连接
3. **前端请求被取消**：检查是否有其他操作导致请求被取消（如页面跳转、组件卸载）

**解决方案**：
- 检查后端 CORS 配置（`server_py/app/main.py`）
- 检查前端 API 配置（`src/lib/api.ts` 中的 `API_BASE_URL`）
- 检查前端代码中是否有 `AbortController` 取消请求的逻辑

#### 问题 2：请求到达后端但未返回

**症状**：
- 后端日志中有 `【Part2 请求开始】` 但没有 `【Part2 请求完成】`
- 浏览器 Network 标签显示请求为 `(pending)`

**可能原因**：
1. **用户验证失败**：检查日志中是否有认证错误
2. **任务不存在**：检查 `taskId` 是否正确
3. **用量限制**：检查用户是否超出分析次数限制
4. **代码异常**：检查日志中是否有异常堆栈

**解决方案**：
- 查看后端日志中的错误信息
- 检查 `taskId` 是否有效
- 检查用户订阅和用量限制

#### 问题 3：请求返回但前端未处理

**症状**：
- 后端日志中有 `【Part2 请求完成】`
- 浏览器 Network 标签显示请求为 `200 OK`，但前端仍然 pending

**可能原因**：
1. **响应解析失败**：检查响应格式是否正确
2. **前端代码错误**：检查浏览器 Console 是否有 JavaScript 错误
3. **响应格式不匹配**：检查响应是否符合前端期望的格式

**解决方案**：
- 检查浏览器 Console 中的错误信息
- 检查 Network 标签中的响应内容
- 检查前端代码中的响应处理逻辑

### 5. 使用测试脚本验证

```bash
# 运行测试脚本
./test_part2_api.sh

# 需要提供：
# 1. taskId（从 Part1 响应中获取）
# 2. JWT Token（从浏览器请求头中获取）
```

### 6. 手动测试接口

```bash
# 使用 curl 手动测试（需要替换 TASK_ID 和 TOKEN）
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "taskId=YOUR_TASK_ID" \
  http://localhost:8081/api/analyze/part2
```

**预期响应**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "taskId": "uuid",
    "stage": "part2",
    "status": "processing"
  }
}
```

## 常见问题与解决方案

### Q1: 后端日志中没有 Part2 请求记录

**A**: 可能原因：
1. 请求被前端取消（检查浏览器 Network 标签）
2. CORS 问题（检查浏览器 Console）
3. 网络问题（检查网络连接）

**解决方案**：
- 检查浏览器 Console 中的错误信息
- 检查 CORS 配置
- 使用测试脚本手动测试接口

### Q2: 后端日志显示请求开始但没有完成

**A**: 可能原因：
1. 用户验证失败
2. 任务不存在
3. 用量限制
4. 代码异常

**解决方案**：
- 查看后端日志中的详细错误信息
- 检查 `taskId` 是否有效
- 检查用户订阅状态

### Q3: 后端返回 200 但前端仍然 pending

**A**: 可能原因：
1. 响应解析失败
2. 前端代码错误
3. 响应格式不匹配

**解决方案**：
- 检查浏览器 Console 中的错误信息
- 检查 Network 标签中的响应内容
- 检查前端代码中的响应处理逻辑

## 相关文件

- `server_py/app/routes/analyze.py` - Part2 接口实现
- `src/components/ThemeCardsGrid.tsx` - 前端 Part2 触发逻辑
- `src/lib/api.ts` - 前端 API 客户端
- `restart_backend.sh` - 后端服务重启脚本
- `query_part2_logs.sh` - Part2 日志监控脚本
- `test_part2_api.sh` - Part2 接口测试脚本

