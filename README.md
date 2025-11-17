# P-Style 照片风格克隆系统

## 项目结构

```
P-Style/
├── server_py/          # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py     # 应用入口
│   │   ├── config.py   # 配置管理
│   │   ├── db.py       # 数据库连接
│   │   ├── models.py   # 数据模型
│   │   ├── routes/     # API 路由
│   │   ├── services/   # 业务服务
│   │   └── middleware/ # 中间件
│   └── run.py          # 启动脚本
├── src/                # React 前端
│   ├── components/     # 组件
│   ├── lib/            # 工具库
│   └── App.tsx         # 主应用
└── 开发方案.md          # 详细开发文档
```

## 快速开始

### 后端启动

1. 安装依赖：
```bash
cd server_py
pip install -r requirements.txt
```

2. 配置环境变量（创建 `.env` 文件）：
```env
GEMINI_API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///./photostyle.db
HTTP_PROXY=http://127.0.0.1:7890  # ClashX 代理地址
HTTPS_PROXY=http://127.0.0.1:7890
```

3. 启动服务：
```bash
python run.py
```

服务将在 `http://localhost:8081` 启动。

### 前端启动

1. 安装依赖：
```bash
npm install
```

2. 配置 API 地址（`.env` 文件）：
```env
VITE_API_BASE_URL=http://localhost:8081
```

3. 启动开发服务器：
```bash
npm run dev
```

**注意**：前端将自动运行在 `http://localhost:3001`（根据开发方案要求，不允许使用其他端口）。

## 核心功能

- ✅ 用户注册/登录（JWT 认证）
- ✅ 图片上传
- ✅ 复刻可行性评估（CV 算法）
- ✅ Part1 基础分析（Gemini）
- ✅ Part2 详细参数分析（Gemini）
- ✅ Part3 风格模拟（Gemini Flash Image）
- ✅ 用户个人中心（资料、订阅、用量、历史报告）
- ⏳ Admin 管理后台（待实现）

## API 文档

主要接口：

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/photos/upload` - 上传图片
- `POST /api/analyze/feasibility` - 可行性评估
- `POST /api/analyze/part1` - Part1 分析
- `POST /api/analyze/part2` - Part2 分析
- `POST /api/simulate/style` - 风格模拟
- `GET /api/user/me` - 获取用户信息
- `GET /api/user/usage` - 获取资源用量
- `GET /api/user/reports` - 获取历史报告

详细 API 文档请参考 `开发方案.md`。

## 技术栈

- **后端**: Python 3.10+, FastAPI, SQLAlchemy, OpenCV, Pillow
- **前端**: React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **AI**: Google Gemini 2.5 Pro / Flash Image
- **数据库**: SQLite (开发) / MySQL (生产)

## 开发状态

当前版本已完成核心功能实现，Admin 管理后台待完善。
