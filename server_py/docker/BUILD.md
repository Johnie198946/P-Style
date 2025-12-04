# Darktable Docker 镜像构建说明

## 前置条件

1. **Docker** 已安装并运行
2. **网络连接**正常（需要访问 GitHub 和 Debian 软件源）
3. **磁盘空间**至少 5GB 可用空间
4. **构建时间**：首次构建约需 10-15 分钟

## 构建步骤

### 1. 进入 Docker 目录

```bash
cd server_py/docker
```

### 2. 构建镜像

```bash
# 标准构建（使用缓存）
docker-compose build

# 或强制重新构建（不使用缓存）
docker-compose build --no-cache
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 验证服务

```bash
# 检查容器状态
docker-compose ps

# 检查 Darktable 版本
docker exec pstyle-darktable darktable-cli --version

# 测试健康检查
curl http://localhost:8000/api/render/health
```

## 常见问题

### 问题 1：网络连接超时

**症状**：构建时出现 `Unable to connect to deb.debian.org` 错误

**解决方案**：
1. 检查网络连接
2. 如果在中国大陆，Dockerfile 已配置使用清华大学镜像源
3. 如果仍有问题，可以尝试使用代理：
   ```bash
   export HTTP_PROXY=http://your-proxy:port
   export HTTPS_PROXY=http://your-proxy:port
   docker-compose build
   ```

### 问题 2：CA 证书错误

**症状**：出现 `Certificate verification failed` 错误

**解决方案**：Dockerfile 已自动处理，如果仍有问题，请确保系统时间正确。

### 问题 3：构建时间过长

**说明**：从源码编译 Darktable 需要较长时间（10-15 分钟），这是正常的。

**优化建议**：
- 使用多核 CPU 可以加快编译速度
- 确保有足够的 RAM（建议至少 4GB）

### 问题 4：磁盘空间不足

**症状**：构建失败，提示磁盘空间不足

**解决方案**：
```bash
# 清理 Docker 未使用的资源
docker system prune -a

# 检查磁盘空间
df -h
```

## 验证清单

构建完成后，请验证以下项目：

- [ ] 镜像构建成功：`docker images | grep pstyle-darktable`
- [ ] 容器运行正常：`docker-compose ps`
- [ ] Darktable CLI 可用：`docker exec pstyle-darktable darktable-cli --version`
- [ ] 脚本有执行权限：`ls -la render_script.sh render_solo.sh`
- [ ] 存储目录已创建：`ls -la ../storage/`

## 下一步

构建成功后，可以：

1. **测试渲染功能**：调用 `/api/render/high-fidelity` API
2. **测试 SOLO 模式**：调用 `/api/render/solo` API
3. **查看日志**：`docker-compose logs -f`

## 故障排除

如果遇到问题，请：

1. 查看构建日志：`docker-compose build 2>&1 | tee build.log`
2. 查看容器日志：`docker-compose logs`
3. 检查容器状态：`docker inspect pstyle-darktable`

