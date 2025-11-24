#!/bin/bash
# 测试 Part2 API 接口
# 用于验证后端接口是否正常工作

echo "=========================================="
echo "Part2 API 接口测试脚本"
echo "=========================================="
echo ""

# 检查后端服务是否运行
if ! curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "❌ 后端服务未运行，请先启动后端服务"
    exit 1
fi

echo "✅ 后端服务正在运行"
echo ""

# 提示用户需要提供 taskId 和 token
echo "注意：此脚本需要有效的 taskId 和 JWT Token"
echo "请从浏览器开发者工具的 Network 标签中获取："
echo "  1. taskId：从 Part1 响应中获取"
echo "  2. Token：从请求头 Authorization: Bearer <token> 中获取"
echo ""
read -p "请输入 taskId: " TASK_ID
read -p "请输入 JWT Token (Bearer 后面的部分): " TOKEN

if [ -z "$TASK_ID" ] || [ -z "$TOKEN" ]; then
    echo "❌ taskId 和 Token 不能为空"
    exit 1
fi

echo ""
echo "正在发送 Part2 请求..."
echo "taskId: $TASK_ID"
echo ""

# 发送 Part2 请求
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "taskId=$TASK_ID" \
    http://localhost:8081/api/analyze/part2)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP 状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Part2 请求成功"
    echo ""
    echo "请查看后端日志确认后台任务是否开始执行："
    echo "  tail -f /tmp/backend_8081.log | grep -E 'Part2|part2'"
else
    echo "❌ Part2 请求失败"
    echo ""
    echo "请查看后端日志了解详细错误："
    echo "  tail -n 50 /tmp/backend_8081.log"
fi

