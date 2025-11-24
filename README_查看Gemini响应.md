# 查看 Gemini 响应内容指南

## 📍 脚本位置

脚本文件：`view_gemini_response.sh`  
项目根目录：`/Users/dengzhaoyu/Desktop/TepVis/AI产品/P-Style/`

## 🚀 运行方法

### 方法 1：在项目根目录运行（推荐）

```bash
# 切换到项目根目录
cd /Users/dengzhaoyu/Desktop/TepVis/AI产品/P-Style

# 运行脚本
./view_gemini_response.sh
```

### 方法 2：使用绝对路径运行（无需切换目录）

```bash
# 在任何目录都可以直接运行
/Users/dengzhaoyu/Desktop/TepVis/AI产品/P-Style/view_gemini_response.sh
```

### 方法 3：使用 bash 运行

```bash
bash /Users/dengzhaoyu/Desktop/TepVis/AI产品/P-Style/view_gemini_response.sh
```

## 📝 响应文件位置

- **Part1 响应**：`/tmp/gemini_response_part1_<timestamp>.json`
- **Part2 响应**：`/tmp/gemini_response_part2_<timestamp>.json`

**注意**：响应文件保存在 `/tmp/` 目录，与脚本位置无关。

## ⚠️ 重要提示

1. **脚本位置**：必须在项目根目录，或使用绝对路径
2. **响应文件位置**：在 `/tmp/` 目录（系统临时目录）
3. **如果提示"未找到响应文件"**：
   - 需要先执行一次 Part1 或 Part2 分析
   - 响应文件会在分析时自动创建

## 🔄 使用流程

1. **执行分析**（前端或测试脚本）
2. **运行查看脚本**：
   ```bash
   cd /Users/dengzhaoyu/Desktop/TepVis/AI产品/P-Style
   ./view_gemini_response.sh
   ```
3. **选择查看方式**（1-5）

