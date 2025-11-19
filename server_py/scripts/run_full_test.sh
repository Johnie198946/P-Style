#!/bin/bash
# Part1/Part2 完整功能测试脚本
# 使用方法: ./run_full_test.sh <参考图路径> <用户图路径> [thinking_level]

SOURCE_IMAGE=$1
TARGET_IMAGE=$2
THINKING_LEVEL=${3:-high}

if [ -z "$SOURCE_IMAGE" ] || [ -z "$TARGET_IMAGE" ]; then
    echo "使用方法: $0 <参考图路径> <用户图路径> [thinking_level]"
    echo "示例: $0 /path/to/source.jpg /path/to/target.jpg high"
    exit 1
fi

cd "$(dirname "$0")/.."

echo "=========================================="
echo "Gemini 3.0 完整功能测试"
echo "=========================================="
echo "参考图: $SOURCE_IMAGE"
echo "用户图: $TARGET_IMAGE"
echo "思考水平: $THINKING_LEVEL"
echo "=========================================="
echo ""

python3 scripts/test_with_images.py \
  --source "$SOURCE_IMAGE" \
  --target "$TARGET_IMAGE" \
  --part full \
  --thinking-level "$THINKING_LEVEL"

