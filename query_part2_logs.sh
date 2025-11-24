#!/bin/bash
# 实时监控 Part2 请求和后台任务的日志

echo "=========================================="
echo "Part2 请求和后台任务日志监控"
echo "=========================================="
echo ""
echo "正在监控后端日志文件: /tmp/backend_8081.log"
echo "按 Ctrl+C 退出"
echo ""
echo "----------------------------------------"
echo ""

# 实时跟踪日志文件，过滤 Part2 相关日志
tail -f /tmp/backend_8081.log 2>/dev/null | grep --line-buffered -E "Part2|part2|analyze_part2|_run_part2|workflow_execution|workflow_final|workflow_alignment|taskId|task_id" | while read line; do
    # 高亮显示关键信息
    echo "$(date '+%H:%M:%S') | $line"
done
