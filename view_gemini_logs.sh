#!/bin/bash
# 查看 Gemini 返回内容的便捷脚本

LOG_FILE="/tmp/backend_8081.log"

echo "=========================================="
echo "Gemini 响应日志查看工具"
echo "=========================================="
echo ""

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ 日志文件不存在: $LOG_FILE"
    echo "提示：请确保后端服务正在运行"
    exit 1
fi

echo "选择查看方式："
echo "1. 查看最近的 Part1 Gemini 原始响应（前 500 字符）"
echo "2. 查看最近的 Part1 Gemini 原始响应（完整内容）"
echo "3. 查看所有 Gemini 相关日志"
echo "4. 实时监控 Gemini 响应"
echo "5. 查看最近的 Part1 请求完整流程"
echo ""
read -p "请选择 (1-5): " choice

case $choice in
    1)
        echo ""
        echo "=== 最近的 Part1 Gemini 原始响应（前 500 字符）==="
        tail -1000 "$LOG_FILE" | grep -A 2 "Part1 Gemini 原始响应长度" | head -10
        ;;
    2)
        echo ""
        echo "=== 最近的 Part1 Gemini 原始响应（完整内容）==="
        # 查找最近的 Part1 响应
        LINE=$(grep -n "Part1 Gemini 原始响应长度" "$LOG_FILE" | tail -1 | cut -d: -f1)
        if [ -z "$LINE" ]; then
            echo "未找到 Part1 Gemini 响应"
        else
            # 显示该行及后续的调试日志
            sed -n "${LINE},$((LINE+5))p" "$LOG_FILE"
        fi
        ;;
    3)
        echo ""
        echo "=== 所有 Gemini 相关日志（最近 50 条）==="
        grep "Gemini" "$LOG_FILE" | tail -50
        ;;
    4)
        echo ""
        echo "=== 实时监控 Gemini 响应（按 Ctrl+C 退出）==="
        tail -f "$LOG_FILE" | grep --line-buffered "Gemini"
        ;;
    5)
        echo ""
        echo "=== 最近的 Part1 请求完整流程 ==="
        tail -200 "$LOG_FILE" | grep -E "Part1|Gemini|格式化|structured_result" | tail -30
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac
