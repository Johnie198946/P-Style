# LR 面板数据不匹配问题诊断

## 问题描述
前端 LR 面板显示的数据与后端日志中的 Part2 输出完全不匹配。

## 数据流路径

### 1. 后端 Gemini 输出（原始格式）
```json
{
  "lightroom_workflow": {
    "basic_panel": {
      "temp": { "value": "-5", "reason": "微调色温，保持画面清爽，避免发黄" },
      "tint": { "value": "-10", "reason": "向绿色偏移，中和洋红，营造日系胶片感" },
      "exposure": { "value": "+1.35", "reason": "核心操作：大幅提亮以匹配参考图的"高调/过曝"风格" },
      "contrast": { "value": "-35", "reason": "大幅降低对比度，柔化光影过渡" },
      ...
    }
  }
}
```

### 2. 后端格式化（analysis_formatter._format_lightroom）
- **位置**: `server_py/app/services/analysis_formatter.py` 第 2839-2866 行
- **处理逻辑**:
  1. 从 `lightroom_workflow.basic_panel` 提取参数
  2. 调用 `extract_range_value()` 解析值（如 "+1.35" -> "+1.35"）
  3. 转换为中文名称（如 "exposure" -> "曝光"）
  4. 构建 `basic_params` 数组
  5. 在第 3717-3778 行构建 `basic_dict` 对象
  6. 返回 `structured.basic` 字段

**期望输出格式**:
```json
{
  "structured": {
    "basic": {
      "temp": { "value": "-5", "range": "-5", "reason": "..." },
      "tint": { "value": "-10", "range": "-10", "reason": "..." },
      "exposure": { "value": "+1.35", "range": "+1.35", "reason": "..." },
      "contrast": { "value": "-35", "range": "-35", "reason": "..." },
      ...
    }
  }
}
```

### 3. 前端数据适配器（dataAdapter）
- **位置**: `src/src/lib/dataAdapter.ts` 第 1335-1396 行
- **处理逻辑**:
  1. 优先从 `structured.basic` 读取（第 1337 行）
  2. 如果不存在，从 `panels` 数组读取（第 1398 行）
  3. 解析参数值（支持 "+1.35"、"-35" 等格式）
  4. 转换为前端期望的格式

### 4. 前端 LightroomPanel 组件
- **位置**: `src/components/analysis/LightroomPanel.tsx`
- **读取路径**: `data.basic_panel` 或 `data.white_balance`

## 可能的问题点

### 问题 1: 后端格式化时数据丢失
**检查点**: `_format_lightroom` 函数是否正确提取了所有参数？

**验证方法**:
```bash
# 查看后端日志，搜索 "_format_lightroom" 相关日志
grep "_format_lightroom.*提取参数" /tmp/backend_8081.log | tail -n 20
```

### 问题 2: basic_dict 构建失败
**检查点**: `basic_dict` 是否包含所有必需参数？

**验证方法**:
```bash
# 查看 basic_dict 构建日志
grep "_format_lightroom.*构建 basic 字段" /tmp/backend_8081.log | tail -n 5
```

### 问题 3: 前端 dataAdapter 读取路径错误
**检查点**: dataAdapter 是否正确读取了 `structured.basic`？

**验证方法**:
1. 打开浏览器开发者工具
2. 查看 Console 日志，搜索 `[dataAdapter] 🔍 从 basic 提取参数`
3. 检查是否成功提取了参数

### 问题 4: 前端使用了缓存数据
**检查点**: 前端是否使用了旧的缓存数据？

**验证方法**:
1. 清除浏览器缓存
2. 硬刷新页面（Cmd+Shift+R 或 Ctrl+Shift+R）
3. 重新运行分析

## 诊断步骤

### 步骤 1: 检查后端格式化结果
```bash
# 查看最近一次 Part2 分析的格式化日志
grep "【_format_lightroom】✅ 构建 basic 字段完成" /tmp/backend_8081.log | tail -n 1
```

### 步骤 2: 检查数据库中的实际数据
```python
# 运行以下 Python 脚本查看数据库中的 structured_result
python3 -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').absolute()))
from app.models import AnalysisTask
from app.config import get_settings
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
import json

settings = get_settings()
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

task = session.query(AnalysisTask).filter(AnalysisTask.status == 'completed').order_by(desc(AnalysisTask.created_at)).first()

if task and task.structured_result:
    structured = task.structured_result if isinstance(task.structured_result, dict) else json.loads(task.structured_result)
    lightroom = structured.get('sections', {}).get('lightroom', {})
    lightroom_structured = lightroom.get('structured', {})
    basic = lightroom_structured.get('basic', {})
    
    print('=' * 80)
    print('📋 数据库中的 lightroom.structured.basic 数据:')
    print('=' * 80)
    print(json.dumps(basic, ensure_ascii=False, indent=2))
    print('=' * 80)
    print(f'参数数量: {len(basic)}')
    print(f'参数列表: {list(basic.keys())}')
else:
    print('❌ 没有找到已完成的任务或 structured_result 为空')

session.close()
"
```

### 步骤 3: 检查前端接收到的数据
1. 打开浏览器开发者工具
2. 在 Network 标签中查看 `/api/analyze/{taskId}` 的响应
3. 检查 `sections.lightroom.structured.basic` 字段

### 步骤 4: 检查前端 dataAdapter 转换结果
在浏览器 Console 中运行：
```javascript
// 查看 dataAdapter 的转换日志
// 应该能看到类似 "[dataAdapter] 🔍 从 basic 提取参数 exposure: ..." 的日志
```

## 修复建议

如果确认是后端格式化问题，需要检查：
1. `_format_lightroom` 函数是否正确提取了 `basic_panel` 中的所有参数
2. `extract_range_value` 函数是否正确解析了参数值
3. `basic_dict` 构建逻辑是否正确

如果确认是前端问题，需要检查：
1. `dataAdapter` 是否正确读取了 `structured.basic`
2. `LightroomPanel` 是否正确读取了 `data.basic_panel`
3. 是否有数据缓存问题

