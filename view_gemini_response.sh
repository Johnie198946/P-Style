#!/bin/bash
# 查看 Gemini 完整响应的便捷脚本

echo "=========================================="
echo "Gemini 响应查看工具"
echo "=========================================="
echo ""

# 查找最新的 Gemini 响应文件
PART1_FILES=$(ls -t /tmp/gemini_response_part1_*.json 2>/dev/null | head -5)
PART2_FILES=$(ls -t /tmp/gemini_response_part2_*.json 2>/dev/null | head -5)

if [ -z "$PART1_FILES" ] && [ -z "$PART2_FILES" ]; then
    echo "❌ 未找到 Gemini 响应文件"
    echo ""
    echo "提示："
    echo "1. 确保后端服务正在运行"
    echo "2. 执行一次 Part1 或 Part2 分析"
    echo "3. 响应文件会保存在 /tmp/gemini_response_part1_*.json 或 /tmp/gemini_response_part2_*.json"
    exit 1
fi

echo "选择查看方式："
echo "1. 查看最新的 Part1 响应（格式化 JSON）"
echo "2. 查看最新的 Part1 响应（原始内容）"
echo "3. 查看最新的 Part2 响应（格式化 JSON）"
echo "4. 查看最新的 Part2 响应（原始内容）"
echo "5. 列出所有响应文件"
echo ""
read -p "请选择 (1-5): " choice

case $choice in
    1)
        LATEST=$(ls -t /tmp/gemini_response_part1_*.json 2>/dev/null | head -1)
        if [ -z "$LATEST" ]; then
            echo "❌ 未找到 Part1 响应文件"
            exit 1
        fi
        echo ""
        echo "=== 最新的 Part1 响应（格式化 JSON）==="
        echo "文件: $LATEST"
        echo ""
        python3 -m json.tool "$LATEST" 2>/dev/null || cat "$LATEST"
        ;;
    2)
        LATEST=$(ls -t /tmp/gemini_response_part1_*.json 2>/dev/null | head -1)
        if [ -z "$LATEST" ]; then
            echo "❌ 未找到 Part1 响应文件"
            exit 1
        fi
        echo ""
        echo "=== 最新的 Part1 响应（原始内容）==="
        echo "文件: $LATEST"
        echo "大小: $(wc -c < "$LATEST") 字符"
        echo ""
        cat "$LATEST"
        ;;
    3)
        LATEST=$(ls -t /tmp/gemini_response_part2_*.json 2>/dev/null | head -1)
        if [ -z "$LATEST" ]; then
            echo "❌ 未找到 Part2 响应文件"
            exit 1
        fi
        echo ""
        echo "=== 最新的 Part2 响应（格式化 JSON）==="
        echo "文件: $LATEST"
        echo ""
        python3 -m json.tool "$LATEST" 2>/dev/null || cat "$LATEST"
        ;;
    4)
        LATEST=$(ls -t /tmp/gemini_response_part2_*.json 2>/dev/null | head -1)
        if [ -z "$LATEST" ]; then
            echo "❌ 未找到 Part2 响应文件"
            exit 1
        fi
        echo ""
        echo "=== 最新的 Part2 响应（原始内容）==="
        echo "文件: $LATEST"
        echo "大小: $(wc -c < "$LATEST") 字符"
        echo ""
        cat "$LATEST"
        ;;
    5)
        echo ""
        echo "=== 所有 Part1 响应文件 ==="
        ls -lth /tmp/gemini_response_part1_*.json 2>/dev/null | head -10
        echo ""
        echo "=== 所有 Part2 响应文件 ==="
        ls -lth /tmp/gemini_response_part2_*.json 2>/dev/null | head -10
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac
