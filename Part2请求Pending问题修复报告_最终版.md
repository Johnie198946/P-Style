# Part2 请求 Pending 问题修复报告（最终版）

## 问题描述

用户报告：Part2 分析请求在前端显示为 `(pending)` 状态，即使后端日志显示 Gemini 已返回数据（但为英文）。

## 问题分析

### 1. 根本原因

1. **后端同步执行导致前端阻塞**：
   - `POST /api/analyze/part2` 接口同步等待 Gemini API 调用完成
   - Gemini API 调用可能需要 10-30 秒，导致前端请求一直处于 pending 状态
   - 不符合开发方案第 16 节的要求：Part2 接口应立即返回 `{ status: 'processing' }`

2. **新 Prompt 结构不包含 `workflow_execution_summary` 字段**：
   - 新的 Part2 Prompt 结构只包含 `phase_1_extraction.style_summary_recap` 和 `phase_1_extraction.key_adjustment_strategy`
   - 但代码仍然尝试提取 `workflow_execution_summary`，导致提取失败或为空

3. **语言输出问题**：
   - Part2 Prompt 虽然要求中文输出，但约束不够严格
   - Gemini 有时仍会输出英文内容

## 修复方案

### 1. 后端异步执行改造

**文件**: `server_py/app/routes/analyze.py`

**修改内容**:
- 将 `analyze_part2` 接口改为异步执行
- 立即返回 `{ status: 'processing' }`，不等待 Gemini API 调用
- 创建 `_run_part2_analysis_job` 后台任务函数，封装所有实际处理逻辑
- 后台任务使用独立的数据库会话，避免会话冲突

**关键代码**:
```python
@router.post("/part2")
async def analyze_part2(...):
    """Part2 分析接口（异步执行）"""
    # ... 验证用户和任务 ...
    
    # 立即返回 processing 状态，并在后台执行实际分析
    asyncio.create_task(
        _run_part2_analysis_job(
            task_id=taskId,
            user_id=current_user.id,
            db_session=db,
        )
    )
    return success_response(data={"taskId": taskId, "stage": "part2", "status": "processing"})

async def _run_part2_analysis_job(task_id: str, user_id: int, db_session: Session):
    """后台执行 Part2 分析任务的实际逻辑"""
    db: Session = next(get_db())  # 使用新的数据库会话
    try:
        # 1. 设置任务状态为 processing
        task_service.update_task_status(db, task_id, "processing")
        
        # 2. 调用 Gemini API
        # 3. 格式化数据
        # 4. 更新数据库（状态为 completed）
    except Exception as e:
        # 5. 如果失败，设置状态为 failed
        task_service.update_task_status(db, task_id, "failed", f"Part2 后台分析失败: {str(e)}")
    finally:
        db.close()
```

### 2. 修复 `workflow_execution_summary` 提取逻辑

**文件**: `server_py/app/routes/analyze.py`

**修改内容**:
- 新 Prompt 结构不包含 `workflow_execution_summary` 字段
- 从 `phase_1_extraction` 中组合 `style_summary_recap` 和 `key_adjustment_strategy` 作为替代
- 保持向后兼容，优先尝试从旧格式中提取

**关键代码**:
```python
# 8. 从 Gemini 响应中提取 workflow_execution_summary
workflow_execution_summary = ""
if isinstance(gemini_json, dict):
    # 优先从旧格式中提取（向后兼容）
    phase_1_extraction = gemini_json.get("phase_1_extraction", {})
    if isinstance(phase_1_extraction, dict):
        workflow_execution_summary = phase_1_extraction.get("workflow_execution_summary", "")
    if not workflow_execution_summary:
        workflow_execution_summary = gemini_json.get("workflow_execution_summary", "")

# 如果仍然为空，从新格式中组合
if not workflow_execution_summary and isinstance(gemini_json, dict):
    phase_1_extraction = gemini_json.get("phase_1_extraction", {})
    if isinstance(phase_1_extraction, dict):
        style_summary_recap = phase_1_extraction.get("style_summary_recap", "")
        key_adjustment_strategy = phase_1_extraction.get("key_adjustment_strategy", "")
        if style_summary_recap or key_adjustment_strategy:
            workflow_execution_summary = f"{style_summary_recap}\n\n{key_adjustment_strategy}".strip()
```

### 3. 强化 Part2 Prompt 中文输出要求

**文件**: `server_py/app/services/prompt_template.py`

**修改内容**:
- 在 Prompt 开头添加显式的"【重要】语言要求"部分
- 明确要求所有文本字段（`reason`、`description`、`text`、`explanation`）必须使用简体中文
- 禁止使用英文，如果输出英文将被视为格式错误

**关键代码**:
```python
## 【重要】语言要求 (Language Requirement)

**你必须使用简体中文（Chinese Simplified）输出所有文本内容**，包括：
- 所有 `reason` 字段（解释字段）
- 所有 `description` 字段（描述字段）
- 所有 `text` 字段（文本字段）
- 所有自然语言说明

**禁止使用英文**。如果发现任何英文文本，将被视为格式错误。
```

### 4. 添加详细日志记录

**文件**: `server_py/app/routes/analyze.py`

**修改内容**:
- 在 `_run_part2_analysis_job` 的每个关键步骤添加详细日志
- 记录 Gemini 响应解析、数据格式化、数据库更新等过程
- 保存 Gemini 完整响应到临时文件，便于调试

**关键日志点**:
- `【Part2 请求开始】`
- `【Part2 后台任务开始】`
- `【Part2 任务状态已设置为 processing】`
- `Part2 Gemini API 调用完成`
- `Part2 格式化成功`
- `Part2 数据库更新完成`
- `【Part2 后台任务成功】` / `【Part2 后台任务失败】`

### 5. 添加任务状态管理

**文件**: `server_py/app/services/task_service.py`

**修改内容**:
- 添加 `update_task_status` 方法，允许后台任务更新任务状态
- 支持设置 `status` 和 `status_reason`（失败原因）

**文件**: `server_py/app/models.py`

**修改内容**:
- 在 `AnalysisTask` 模型中添加 `status_reason` 字段，用于记录失败原因

### 6. 更新开发方案文档

**文件**: `开发方案.md`

**修改内容**:
- 在"前端状态与轮询"部分明确说明 Part2 接口应立即返回 `{ status: 'processing' }`
- 添加"后端实现"说明，描述异步执行机制
- 记录 `_run_part2_analysis_job` 后台任务的实现细节

## 测试验证

### 1. 前端轮询机制

前端 `ThemeCardsGrid.tsx` 已实现轮询机制：
- 轮询间隔：3 秒
- 最大轮询时长：2 分钟（40 次）
- 检查状态：`taskDetail.task.status === 'completed' || taskDetail.task.status === 'part2_completed'`

### 2. 日志监控脚本

创建了 `query_part2_logs.sh` 脚本，用于实时监控 Part2 请求和后台任务的日志：

```bash
./query_part2_logs.sh
```

## 修复后的流程

1. **前端触发 Part2 分析**：
   - 用户点击"查看详细方案"按钮
   - 调用 `POST /api/analyze/part2`

2. **后端立即返回**：
   - 验证用户和任务
   - 检查用量限制
   - **立即返回** `{ status: 'processing' }`
   - 提交后台任务到 `asyncio.create_task`

3. **后台任务执行**：
   - 设置任务状态为 `processing`
   - 提取 `style_summary` 从 Part1 结果
   - 调用 Gemini API（Part2 Prompt）
   - 解析和格式化 Gemini 响应
   - 更新数据库（状态为 `completed`）

4. **前端轮询获取结果**：
   - 每 3 秒调用 `GET /api/analyze/{taskId}`
   - 检查 `status === 'completed'`
   - 停止轮询，展示 Part2 结果

## 注意事项

1. **数据库会话管理**：
   - 后台任务必须使用新的数据库会话（`next(get_db())`）
   - 不能直接重用 `Depends` 注入的会话

2. **错误处理**：
   - 后台任务失败时，必须将任务状态更新为 `failed`
   - 记录详细的错误信息到 `status_reason` 字段

3. **日志记录**：
   - 所有关键步骤都应记录日志
   - Gemini 完整响应保存到 `/tmp/gemini_response_part2_{timestamp}.json`

4. **向后兼容**：
   - `workflow_execution_summary` 提取逻辑保持向后兼容
   - 如果新格式不包含此字段，会从 `phase_1_extraction` 中组合生成

## 相关文件

- `server_py/app/routes/analyze.py` - Part2 接口和后台任务
- `server_py/app/services/prompt_template.py` - Part2 Prompt 模板
- `server_py/app/services/analysis_formatter.py` - 数据格式化
- `server_py/app/services/task_service.py` - 任务状态管理
- `server_py/app/models.py` - 数据库模型
- `开发方案.md` - 开发方案文档
- `query_part2_logs.sh` - 日志监控脚本

## 修复日期

2025-11-21

