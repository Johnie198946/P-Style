#!/bin/bash
# 查看 Gemini Part1 和 Part2 原始输出脚本
# 使用方法: ./show_gemini_output.sh [task_id]
# 如果不提供 task_id，将列出最近的任务

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

# 运行 Python 脚本
python3 view_gemini_output.py "$@"


