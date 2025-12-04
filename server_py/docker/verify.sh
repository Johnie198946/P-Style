#!/bin/bash
# ===============================================
# Darktable Docker 服务验证脚本
# 用途：验证构建和启动是否成功
# ===============================================

set -e

echo "=========================================="
echo "Darktable Docker 服务验证"
echo "=========================================="

# 1. 检查镜像是否存在
echo -e "\n[1/5] 检查 Docker 镜像..."
if docker images | grep -q "pstyle-darktable"; then
    echo "✅ 镜像已构建"
    docker images | grep "pstyle-darktable" | head -1
else
    echo "❌ 镜像未找到，请先运行: docker-compose build"
    exit 1
fi

# 2. 检查容器是否运行
echo -e "\n[2/5] 检查容器状态..."
if docker ps | grep -q "pstyle-darktable"; then
    echo "✅ 容器正在运行"
    docker ps | grep "pstyle-darktable"
else
    echo "⚠️  容器未运行，尝试启动..."
    docker-compose up -d
    sleep 3
    if docker ps | grep -q "pstyle-darktable"; then
        echo "✅ 容器已启动"
    else
        echo "❌ 容器启动失败，请检查日志: docker-compose logs"
        exit 1
    fi
fi

# 3. 检查 Darktable CLI
echo -e "\n[3/5] 检查 Darktable CLI..."
if docker exec pstyle-darktable darktable-cli --version > /dev/null 2>&1; then
    echo "✅ Darktable CLI 可用"
    docker exec pstyle-darktable darktable-cli --version
else
    echo "❌ Darktable CLI 不可用"
    exit 1
fi

# 4. 检查脚本文件
echo -e "\n[4/5] 检查渲染脚本..."
if docker exec pstyle-darktable test -x /app/render_script.sh && \
   docker exec pstyle-darktable test -x /app/render_solo.sh; then
    echo "✅ 渲染脚本已就绪"
else
    echo "❌ 渲染脚本缺失或不可执行"
    exit 1
fi

# 5. 检查存储目录
echo -e "\n[5/5] 检查存储目录..."
STORAGE_DIRS=("uploads" "rendered" "xmp" "cache/rendered" "styles")
for dir in "${STORAGE_DIRS[@]}"; do
    if [ -d "../storage/$dir" ]; then
        echo "✅ ../storage/$dir 存在"
    else
        echo "⚠️  ../storage/$dir 不存在，正在创建..."
        mkdir -p "../storage/$dir"
    fi
done

# 总结
echo -e "\n=========================================="
echo "✅ 所有检查通过！"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 查看容器日志: docker-compose logs -f"
echo "2. 测试渲染 API: curl http://localhost:8000/api/render/health"
echo "3. 进入容器: docker exec -it pstyle-darktable /bin/bash"
echo ""

