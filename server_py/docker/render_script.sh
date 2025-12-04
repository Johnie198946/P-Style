#!/bin/bash
# ===============================================
# Darktable CLI 完整渲染脚本
# 用途：应用所有 LR 参数生成高保真预览图
# ===============================================

set -e  # 遇到错误立即退出

INPUT_IMAGE="${1:-/app/input/image.jpg}"
XMP_FILE="${2:-/app/xmp/style.xmp}"
OUTPUT_IMAGE="${3:-/app/output/rendered.jpg}"
OUTPUT_WIDTH="${4:-1920}"
OUTPUT_HEIGHT="${5:-0}"  # 0 表示按比例计算

echo "=========================================="
echo "Darktable CLI 高保真渲染"
echo "=========================================="
echo "输入图片: ${INPUT_IMAGE}"
echo "XMP 文件: ${XMP_FILE}"
echo "输出图片: ${OUTPUT_IMAGE}"
echo "输出尺寸: ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}"
echo "=========================================="

# 检查输入文件是否存在
if [ ! -f "${INPUT_IMAGE}" ]; then
    echo "错误: 输入图片不存在: ${INPUT_IMAGE}"
    exit 1
fi

# 确保输出目录存在
OUTPUT_DIR=$(dirname "${OUTPUT_IMAGE}")
mkdir -p "${OUTPUT_DIR}"

# 【修复】检查 XMP 文件是否存在
if [ ! -f "${XMP_FILE}" ]; then
    echo "错误: XMP 文件不存在: ${XMP_FILE}"
    exit 1
fi

# 【修复】构建 darktable-cli 命令
# Darktable CLI 用法：darktable-cli input.jpg input.xmp output.jpg [options]
# XMP 文件作为第二个参数传递
CLI_ARGS=(
    "${INPUT_IMAGE}"
    "${XMP_FILE}"  # XMP sidecar 文件（第二个参数）
    "${OUTPUT_IMAGE}"
    "--width" "${OUTPUT_WIDTH}"
    "--hq" "true"
    "--apply-custom-presets" "true"
)

# 如果指定了高度，添加高度参数
if [ "${OUTPUT_HEIGHT}" -gt 0 ]; then
    CLI_ARGS+=("--height" "${OUTPUT_HEIGHT}")
fi

# 执行渲染
echo "开始渲染..."
START_TIME=$(date +%s%3N)

darktable-cli "${CLI_ARGS[@]}" 2>&1

END_TIME=$(date +%s%3N)
RENDER_TIME=$((END_TIME - START_TIME))

# 检查输出文件是否生成
if [ -f "${OUTPUT_IMAGE}" ]; then
    # 获取输出文件信息
    FILE_SIZE=$(ls -lh "${OUTPUT_IMAGE}" | awk '{print $5}')
    IMAGE_INFO=$(identify -format "%wx%h" "${OUTPUT_IMAGE}" 2>/dev/null || echo "N/A")
    
    echo "=========================================="
    echo "渲染成功！"
    echo "输出文件: ${OUTPUT_IMAGE}"
    echo "文件大小: ${FILE_SIZE}"
    echo "图片尺寸: ${IMAGE_INFO}"
    echo "渲染耗时: ${RENDER_TIME} ms"
    echo "=========================================="
    
    # 【修复】不再需要清理临时 XMP 文件（因为不再复制到输入目录）
    
    exit 0
else
    echo "错误: 渲染失败，输出文件未生成"
    exit 1
fi
