#!/bin/bash
# 重启后端服务脚本
# 用于确保后端服务使用最新代码

echo "=========================================="
echo "后端服务重启脚本"
echo "=========================================="
echo ""

# 1. 查找并停止现有的后端进程
echo "【步骤 1】查找现有后端进程..."
BACKEND_PID=$(lsof -ti:8081 2>/dev/null | head -1)
if [ -n "$BACKEND_PID" ]; then
    echo "发现后端进程 PID: $BACKEND_PID"
    echo "正在停止..."
    kill $BACKEND_PID 2>/dev/null
    sleep 2
    # 如果进程仍在运行，强制杀死
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "进程仍在运行，强制停止..."
        kill -9 $BACKEND_PID 2>/dev/null
        sleep 1
    fi
    echo "✅ 后端进程已停止"
else
    echo "✅ 未发现运行中的后端进程"
fi

# 2. 检查代码语法
echo ""
echo "【步骤 2】检查代码语法..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/server_py" || exit 1
if python3 -m py_compile app/routes/analyze.py 2>&1; then
    echo "✅ 代码语法检查通过"
else
    echo "❌ 代码语法检查失败，请先修复错误"
    exit 1
fi

# 3. 启动后端服务
echo ""
echo "【步骤 3】启动后端服务..."
cd "$SCRIPT_DIR/server_py" || exit 1
nohup python3 run.py > /tmp/backend_startup.log 2>&1 &
NEW_PID=$!
sleep 3

# 4. 验证服务是否启动成功
if kill -0 $NEW_PID 2>/dev/null; then
    echo "✅ 后端服务已启动，PID: $NEW_PID"
    echo "日志文件: /tmp/backend_8081.log"
    echo "启动日志: /tmp/backend_startup.log"
    echo ""
    echo "等待服务就绪..."
    sleep 2
    if curl -s http://localhost:8081/health > /dev/null 2>&1; then
        echo "✅ 后端服务健康检查通过"
    else
        echo "⚠️  后端服务可能尚未完全启动，请稍后检查"
    fi
else
    echo "❌ 后端服务启动失败，请查看日志: /tmp/backend_startup.log"
    exit 1
fi

echo ""
echo "=========================================="
echo "后端服务重启完成"
echo "=========================================="

