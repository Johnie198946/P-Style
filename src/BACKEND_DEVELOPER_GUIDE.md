# 📘 后端开发指南 - 照片风格克隆 Web 应用

## 🎯 项目概述

这是一个照片风格克隆的 Web 应用，用户上传两张照片（源照片和目标照片），通过 AI 分析后给出详细的 Photoshop 和 Adobe Camera Raw (Lightroom) 调整方案。

### 核心功能
1. **照片上传与管理**
2. **AI 分析服务**（两阶段分析）
3. **用户头像管理**
4. **分析结果存储与检索**
5. **风格模拟**

---

## 📊 前端设计总结

### 技术栈
- **框架**: React + TypeScript
- **UI 库**: Tailwind CSS + Shadcn/ui
- **动画**: Motion (Framer Motion)
- **图标**: Lucide React
- **状态管理**: React Hooks (useState, useEffect)
- **本地存储**: LocalStorage (用户头像)

### 页面流程

```
用户进入应用
    ↓
[主页 - 上传照片]
  • 左侧: 源照片 (参考风格)
  • 右侧: 目标照片 (需要调整)
  • 相似度检测
    ↓
点击"开始分析"
    ↓
[Loading 动画]
  • 全屏模态框
  • 背景虚化
  • 动画效果
    ↓
[结果页 - 第一阶段]
  • 照片点评
  • 构图分析 (7维度)
  • 光影参数
  • 色彩方案
  • [获取完整方案] 按钮
    ↓
点击"获取完整方案"
    ↓
[Loading 动画]
    ↓
[结果页 - 第二阶段]
  • 照片点评
  • 构图分析
  • 光影参数
  • 色彩方案
  • Lightroom 调整方案 ⭐ 新增
  • Photoshop 后期方案 ⭐ 新增
  • [风格模拟] 按钮
```

### UI/UX 特点

#### 1. 磁性拖拽上传
- 鼠标拖拽文件时，上传区域会"吸引"文件
- 磁性效果参考：https://www.designspells.com/spells/magnetic-drop-targets

#### 2. 两阶段分析流程
- **第一阶段**：基础分析（快速返回）
  - 照片点评
  - 构图分析（7维度专业分析）
  - 光影参数
  - 色彩方案
  
- **第二阶段**：完整方案（深度分析）
  - 第一阶段的所有内容
  - Lightroom 完整参数
  - Photoshop 详细步骤

#### 3. 构图分析 - 7维度专业分析
根据专业摄影师的标准，提供以下7个维度的分析：
1. **画面主结构分析**
2. **主体位置与视觉权重**
3. **线条与方向引导**
4. **空间层次与分区**
5. **比例与留白**
6. **视觉平衡与动势**
7. **构图风格归类与改进建议**

#### 4. 详细的调整方案
每个方案必须包含：
- **量化数据**（具体的数值范围）
- **参数说明**（每个参数的作用）
- **调整步骤**（操作顺序）
- **专业建议**（注意事项）

#### 5. 设计风格
完全模仿 [DesignSpells.com](https://www.designspells.com) 的风格：
- 现代简约
- 渐变色 + 毛玻璃效果
- 流畅的动画
- 卡片式设计

---

## 🔌 API 接口设计

### 1. 照片上传接口

#### 端点
```
POST /api/photos/upload
```

#### 请求格式
```typescript
Content-Type: multipart/form-data

{
  sourcePhoto: File,      // 源照片（参考风格）
  targetPhoto: File,      // 目标照片（需要调整）
  userId?: string         // 用户ID（可选）
}
```

#### 响应格式
```typescript
{
  success: boolean,
  data: {
    uploadId: string,           // 上传任务ID
    sourcePhotoUrl: string,     // 源照片URL
    targetPhotoUrl: string,     // 目标照片URL
    similarity: number,         // 相似度 (0-100)
    uploadTime: string          // 上传时间
  },
  message?: string
}
```

#### 业务逻辑
1. **接收文件**
   - 验证文件格式（JPEG, PNG, WEBP）
   - 验证文件大小（建议限制 10MB）
   - 生成唯一的文件名

2. **存储文件**
   - 存储到对象存储服务（如 AWS S3, 阿里云 OSS）
   - 生成可访问的 URL
   - 可选：生成缩略图

3. **计算相似度**
   - 使用图像哈希算法（pHash, dHash）
   - 或使用深度学习模型（如 Inception, ResNet）
   - 返回相似度分数 (0-100)

4. **记录上传信息**
   - 保存到数据库
   - 关联用户ID
   - 记录上传时间

---

### 2. 第一阶段分析接口

#### 端点
```
POST /api/analysis/stage1
```

#### 请求格式
```typescript
{
  uploadId: string,           // 上传任务ID
  sourcePhotoUrl: string,     // 源照片URL
  targetPhotoUrl: string      // 目标照片URL
}
```

#### 响应格式
```typescript
{
  success: boolean,
  data: {
    analysisId: string,       // 分析任务ID
    review: ReviewData,       // 照片点评
    composition: CompositionData,  // 构图分析
    lighting: LightingData,   // 光影参数
    color: ColorData          // 色彩方案
  },
  message?: string
}
```

#### 数据结构详细说明

##### ReviewData（照片点评）
```typescript
interface ReviewData {
  overall: string;            // 整体评价
  strengths: string[];        // 优点列表
  weaknesses: string[];       // 不足列表
  suggestions: string[];      // 改进建议
  technicalScore: number;     // 技术评分 (0-100)
  artisticScore: number;      // 艺术评分 (0-100)
  emotion: string;            // 情感基调
}
```

##### CompositionData（构图分析 - 7维度）
```typescript
interface CompositionData {
  // 1. 画面主结构分析
  mainStructure: {
    type: string;             // 构图类型（如：三分法、黄金分割、对称）
    description: string;      // 详细描述
    effectiveness: number;    // 有效性评分 (0-100)
  };
  
  // 2. 主体位置与视觉权重
  subjectPlacement: {
    position: string;         // 主体位置
    visualWeight: number;     // 视觉权重 (0-100)
    focusPoint: {
      x: number;              // 焦点X坐标 (0-1)
      y: number;              // 焦点Y坐标 (0-1)
    };
    analysis: string;         // 分析说明
  };
  
  // 3. 线条与方向引导
  linesAndDirection: {
    leadingLines: string[];   // 引导线类型
    direction: string;        // 主要方向
    effectiveness: number;    // 引导效果 (0-100)
    suggestions: string[];    // 优化建议
  };
  
  // 4. 空间层次与分区
  spatialLayers: {
    foreground: string;       // 前景描述
    middleground: string;     // 中景描述
    background: string;       // 背景描述
    depthScore: number;       // 深度感评分 (0-100)
    layerBalance: number;     // 层次平衡 (0-100)
  };
  
  // 5. 比例与留白
  proportionAndSpace: {
    subjectRatio: number;     // 主体占比 (0-100)
    negativeSpace: number;    // 留白占比 (0-100)
    balance: string;          // 平衡评价
    recommendations: string[]; // 建议
  };
  
  // 6. 视觉平衡与动势
  balanceAndDynamics: {
    balanceType: string;      // 平衡类型（对称/不对称）
    balanceScore: number;     // 平衡评分 (0-100)
    dynamicElements: string[]; // 动态元素
    tension: number;          // 张力值 (0-100)
  };
  
  // 7. 构图风格归类与改进建议
  styleAndImprovements: {
    style: string;            // 构图风格（如：极简主义、古典）
    strengths: string[];      // 优势
    improvements: string[];   // 改进建议
    alternativeStyles: string[]; // 可选风格
  };
}
```

##### LightingData（光影参数）
```typescript
interface LightingData {
  // 光源分析
  lightSource: {
    type: string;             // 光源类型（自然光/人造光）
    direction: string;        // 光线方向
    quality: string;          // 光线质量（硬光/软光）
    colorTemperature: number; // 色温 (K)
  };
  
  // 曝光参数
  exposure: {
    overall: string;          // 整体曝光评价
    highlights: number;       // 高光 (-100 to 100)
    shadows: number;          // 阴影 (-100 to 100)
    contrast: number;         // 对比度 (-100 to 100)
    histogram: {
      shadows: number;        // 阴影分布 (0-100)
      midtones: number;       // 中间调分布 (0-100)
      highlights: number;     // 高光分布 (0-100)
    };
  };
  
  // 明暗层次
  tonalRange: {
    dynamicRange: number;     // 动态范围 (EV)
    blackPoint: number;       // 黑点 (0-255)
    whitePoint: number;       // 白点 (0-255)
    midtoneValue: number;     // 中间调值 (0-255)
  };
  
  // 调整建议
  adjustments: {
    exposure: number;         // 曝光补偿 (-2 to +2 EV)
    highlights: number;       // 高光调整 (-100 to 100)
    shadows: number;          // 阴影调整 (-100 to 100)
    whites: number;           // 白色色阶 (-100 to 100)
    blacks: number;           // 黑色色阶 (-100 to 100)
    contrast: number;         // 对比度 (-100 to 100)
  };
}
```

##### ColorData（色彩方案）
```typescript
interface ColorData {
  // 主色调分析
  dominantColors: Array<{
    hex: string;              // 十六进制颜色
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
    percentage: number;       // 占比 (0-100)
    name: string;             // 颜色名称
  }>;
  
  // 色彩和谐度
  colorHarmony: {
    scheme: string;           // 配色方案（互补/类似/三角）
    harmony: number;          // 和谐度 (0-100)
    temperature: string;      // 色温倾向（冷/暖/中性）
  };
  
  // HSL 调整
  hslAdjustments: {
    red: { hue: number; saturation: number; luminance: number };
    orange: { hue: number; saturation: number; luminance: number };
    yellow: { hue: number; saturation: number; luminance: number };
    green: { hue: number; saturation: number; luminance: number };
    aqua: { hue: number; saturation: number; luminance: number };
    blue: { hue: number; saturation: number; luminance: number };
    purple: { hue: number; saturation: number; luminance: number };
    magenta: { hue: number; saturation: number; luminance: number };
  };
  
  // 整体色彩调整
  globalAdjustments: {
    temperature: number;      // 色温 (-100 to 100)
    tint: number;             // 色调 (-100 to 100)
    vibrance: number;         // 自然饱和度 (-100 to 100)
    saturation: number;       // 饱和度 (-100 to 100)
  };
}
```

#### 业务逻辑

1. **获取照片**
   - 从对象存储下载照片
   - 或直接使用URL访问

2. **调用 AI 分析服务**
   - 使用 GPT-4 Vision 或其他多模态大模型
   - 提供详细的 Prompt（见下方 Prompt 指南）

3. **解析 AI 响应**
   - 提取结构化数据
   - 验证数据完整性
   - 格式化为标准格式

4. **存储分析结果**
   - 保存到数据库
   - 关联 uploadId
   - 记录分析时间

---

### 3. 第二阶段分析接口

#### 端点
```
POST /api/analysis/stage2
```

#### 请求格式
```typescript
{
  analysisId: string,         // 第一阶段的分析ID
  uploadId: string,           // 上传任务ID
  sourcePhotoUrl: string,     // 源照片URL
  targetPhotoUrl: string      // 目标照片URL
}
```

#### 响应格式
```typescript
{
  success: boolean,
  data: {
    // 包含第一阶段的所有数据
    review: ReviewData,
    composition: CompositionData,
    lighting: LightingData,
    color: ColorData,
    
    // 新增的第二阶段数据
    lightroom: LightroomData,     // Lightroom 调整方案
    photoshop: PhotoshopData,     // Photoshop 后期方案
    lightroom_extra?: any         // Lightroom 额外数据（曲线等）
  },
  message?: string
}
```

#### 数据结构详细说明

##### LightroomData（Lightroom 调整方案）
```typescript
interface LightroomData {
  // 基本调整 (Basic Panel)
  basic: {
    treatment: string;          // 处理方式 (Color/Black & White)
    temperature: number;        // 色温 (-100 to 100)
    tint: number;               // 色调 (-100 to 100)
    exposure: number;           // 曝光 (-5 to +5)
    contrast: number;           // 对比度 (-100 to 100)
    highlights: number;         // 高光 (-100 to 100)
    shadows: number;            // 阴影 (-100 to 100)
    whites: number;             // 白色色阶 (-100 to 100)
    blacks: number;             // 黑色色阶 (-100 to 100)
    texture: number;            // 纹理 (-100 to 100)
    clarity: number;            // 清晰度 (-100 to 100)
    dehaze: number;             // 去朦胧 (-100 to 100)
    vibrance: number;           // 自然饱和度 (-100 to 100)
    saturation: number;         // 饱和度 (-100 to 100)
  };
  
  // 色调曲线 (Tone Curve)
  toneCurve: {
    parametric: {
      highlights: number;       // 高光 (-100 to 100)
      lights: number;           // 亮部 (-100 to 100)
      darks: number;            // 暗部 (-100 to 100)
      shadows: number;          // 阴影 (-100 to 100)
    };
    pointCurve?: {
      red: Array<{ x: number; y: number }>;
      green: Array<{ x: number; y: number }>;
      blue: Array<{ x: number; y: number }>;
      rgb: Array<{ x: number; y: number }>;
    };
  };
  
  // HSL/颜色 (HSL/Color Panel)
  hsl: {
    hue: {
      red: number;              // -100 to 100
      orange: number;
      yellow: number;
      green: number;
      aqua: number;
      blue: number;
      purple: number;
      magenta: number;
    };
    saturation: {
      red: number;
      orange: number;
      yellow: number;
      green: number;
      aqua: number;
      blue: number;
      purple: number;
      magenta: number;
    };
    luminance: {
      red: number;
      orange: number;
      yellow: number;
      green: number;
      aqua: number;
      blue: number;
      purple: number;
      magenta: number;
    };
  };
  
  // 分离色调 (Split Toning)
  splitToning: {
    highlights: {
      hue: number;              // 0-360
      saturation: number;       // 0-100
    };
    shadows: {
      hue: number;
      saturation: number;
    };
    balance: number;            // -100 to 100
  };
  
  // 细节 (Detail Panel)
  detail: {
    sharpening: {
      amount: number;           // 0-150
      radius: number;           // 0.5-3.0
      detail: number;           // 0-100
      masking: number;          // 0-100
    };
    noiseReduction: {
      luminance: number;        // 0-100
      luminanceDetail: number;  // 0-100
      luminanceContrast: number; // 0-100
      color: number;            // 0-100
      colorDetail: number;      // 0-100
      colorSmoothness: number;  // 0-100
    };
  };
  
  // 镜头校正 (Lens Corrections)
  lensCorrections: {
    enableProfileCorrections: boolean;
    removeChromati AbAgency: boolean;
    distortion: number;         // -100 to 100
    vignetting: number;         // -100 to 100
  };
  
  // 效果 (Effects)
  effects: {
    vignette: {
      amount: number;           // -100 to 100
      midpoint: number;         // 0-100
      roundness: number;        // -100 to 100
      feather: number;          // 0-100
    };
    grain: {
      amount: number;           // 0-100
      size: number;             // 0-100
      roughness: number;        // 0-100
    };
  };
  
  // 校准 (Calibration)
  calibration: {
    shadows: {
      tint: number;             // -100 to 100
    };
    red: {
      hue: number;
      saturation: number;
    };
    green: {
      hue: number;
      saturation: number;
    };
    blue: {
      hue: number;
      saturation: number;
    };
  };
  
  // 调整步骤说明
  steps: Array<{
    order: number;              // 步骤顺序
    panel: string;              // 面板名称
    description: string;        // 操作说明
    parameters: { [key: string]: number }; // 参数设置
    note?: string;              // 注意事项
  }>;
  
  // 预设建议
  presetSuggestions?: {
    style: string;              // 风格名称
    description: string;        // 风格描述
    suitableFor: string[];      // 适用场景
  };
}
```

##### PhotoshopData（Photoshop 后期方案）
```typescript
interface PhotoshopData {
  // 图层结构
  layers: Array<{
    id: string;
    name: string;               // 图层名称
    type: string;               // 图层类型 (adjustment/normal/smart object)
    blendMode: string;          // 混合模式
    opacity: number;            // 不透明度 (0-100)
    order: number;              // 图层顺序
    description: string;        // 图层说明
  }>;
  
  // 调整图层详细参数
  adjustmentLayers: Array<{
    id: string;
    layerId: string;            // 关联的图层ID
    type: string;               // 调整类型
    parameters: any;            // 参数（根据类型不同）
    mask?: MaskData;            // 蒙版数据
    blendIf?: BlendIfData;      // 混合条件
  }>;
  
  // 曲线调整
  curves: Array<{
    layerId: string;
    channel: string;            // RGB/Red/Green/Blue
    points: Array<{
      input: number;            // 输入值 (0-255)
      output: number;           // 输出值 (0-255)
    }>;
    description: string;
  }>;
  
  // 色彩平衡
  colorBalance: Array<{
    layerId: string;
    shadows: {
      cyan_red: number;         // -100 to 100
      magenta_green: number;
      yellow_blue: number;
    };
    midtones: {
      cyan_red: number;
      magenta_green: number;
      yellow_blue: number;
    };
    highlights: {
      cyan_red: number;
      magenta_green: number;
      yellow_blue: number;
    };
    preserveLuminosity: boolean;
  }>;
  
  // 色相/饱和度
  hueSaturation: Array<{
    layerId: string;
    master: {
      hue: number;              // -180 to 180
      saturation: number;       // -100 to 100
      lightness: number;        // -100 to 100
    };
    reds?: { hue: number; saturation: number; lightness: number };
    yellows?: { hue: number; saturation: number; lightness: number };
    greens?: { hue: number; saturation: number; lightness: number };
    cyans?: { hue: number; saturation: number; lightness: number };
    blues?: { hue: number; saturation: number; lightness: number };
    magentas?: { hue: number; saturation: number; lightness: number };
    colorize?: boolean;
  }>;
  
  // Camera Raw 滤镜
  cameraRaw?: {
    // 与 Lightroom 参数类似
    basic: any;
    detail: any;
    // ... 其他参数
  };
  
  // 滤镜
  filters: Array<{
    name: string;               // 滤镜名称
    category: string;           // 滤镜类别
    parameters: { [key: string]: any };
    applyTo: string;            // 应用到哪个图层
    order: number;              // 应用顺序
  }>;
  
  // 蒙版方案
  masks: Array<{
    id: string;
    layerId: string;
    type: string;               // layer/vector/clipping
    feather: number;            // 羽化 (px)
    density: number;            // 密度 (0-100)
    description: string;        // 蒙版说明
    technique?: string;         // 创建技巧
  }>;
  
  // 详细步骤
  steps: Array<{
    order: number;
    category: string;           // 步骤类别
    title: string;              // 步骤标题
    description: string;        // 详细说明
    tools: string[];            // 使用的工具
    parameters?: any;           // 参数设置
    tips?: string[];            // 技巧提示
    screenshots?: string[];     // 截图说明（可选）
  }>;
  
  // 快捷键提示
  shortcuts?: Array<{
    action: string;
    windows: string;
    mac: string;
  }>;
  
  // 注意事项
  notes: string[];
  
  // 推荐插件
  recommendedPlugins?: Array<{
    name: string;
    purpose: string;
    link?: string;
  }>;
}

// 蒙版数据
interface MaskData {
  type: string;                 // pixel/vector
  feather: number;
  density: number;
  invert: boolean;
}

// 混合条件
interface BlendIfData {
  channel: string;              // Gray/Red/Green/Blue
  thisLayer: { min: number; max: number };
  underlyingLayer: { min: number; max: number };
}
```

#### 业务逻辑

1. **获取第一阶段结果**
   - 从数据库读取
   - 验证数据完整性

2. **调用 AI 深度分析**
   - 使用更详细的 Prompt
   - 要求生成完整的 LR/PS 参数
   - 等待时间可能较长（30-60秒）

3. **解析并验证响应**
   - 验证所有参数在合理范围内
   - 确保步骤的完整性和可操作性

4. **存储完整结果**
   - 更新数据库记录
   - 标记为完整分析
   - 记录完成时间

---

### 4. 用户头像接口

#### 4.1 上传头像
```
POST /api/user/avatar/upload
```

**请求格式**:
```typescript
Content-Type: multipart/form-data

{
  avatar: File,               // 头像文件
  userId: string              // 用户ID
}
```

**响应格式**:
```typescript
{
  success: boolean,
  data: {
    avatarUrl: string,        // 头像URL
    thumbnailUrl?: string     // 缩略图URL（可选）
  },
  message?: string
}
```

#### 4.2 获取头像
```
GET /api/user/avatar/:userId
```

**响应格式**:
```typescript
{
  success: boolean,
  data: {
    avatarUrl: string | null
  }
}
```

#### 4.3 删除头像
```
DELETE /api/user/avatar/:userId
```

**响应格式**:
```typescript
{
  success: boolean,
  message: string
}
```

---

### 5. 分析历史接口

#### 5.1 获取用户的分析历史
```
GET /api/analysis/history/:userId?page=1&limit=10
```

**响应格式**:
```typescript
{
  success: boolean,
  data: {
    total: number,
    page: number,
    limit: number,
    items: Array<{
      analysisId: string,
      uploadId: string,
      sourcePhotoUrl: string,
      targetPhotoUrl: string,
      stage: 'stage1' | 'stage2',
      createdAt: string,
      preview?: {
        dominantColor: string,
        style: string
      }
    }>
  }
}
```

#### 5.2 获取单个分析结果
```
GET /api/analysis/:analysisId
```

**响应格式**:
```typescript
{
  success: boolean,
  data: {
    analysisId: string,
    uploadId: string,
    sourcePhotoUrl: string,
    targetPhotoUrl: string,
    stage: 'stage1' | 'stage2',
    results: {
      review: ReviewData,
      composition: CompositionData,
      lighting: LightingData,
      color: ColorData,
      lightroom?: LightroomData,
      photoshop?: PhotoshopData
    },
    createdAt: string,
    updatedAt: string
  }
}
```

---

## 🤖 AI Prompt 设计指南

### GPT-4 Vision Prompt 结构

#### 第一阶段 Prompt（基础分析）

```
你是一位专业的摄影师和后期处理专家。请分析用户上传的两张照片：

【源照片】: [source_photo_url]
这是用户希望模仿的照片风格。

【目标照片】: [target_photo_url]
这是用户需要调整的照片。

请提供以下分析（以JSON格式返回）：

1. **照片点评** (review)
   - overall: 整体评价（200-300字）
   - strengths: 优点列表（3-5个）
   - weaknesses: 不足列表（3-5个）
   - suggestions: 改进建议（3-5个）
   - technicalScore: 技术评分（0-100）
   - artisticScore: 艺术评分（0-100）
   - emotion: 情感基调

2. **构图分析** (composition) - 请按照以下7个专业维度分析：
   
   a) 画面主结构分析
      - 识别构图类型（三分法/黄金分割/对称/框架/引导线等）
      - 评估主结构的有效性
   
   b) 主体位置与视觉权重
      - 主体在画面中的位置
      - 视觉权重分析
      - 焦点坐标
   
   c) 线条与方向引导
      - 引导线类型
      - 视觉流动方向
      - 引导效果评估
   
   d) 空间层次与分区
      - 前景/中景/背景分析
      - 深度感评估
      - 层次平衡
   
   e) 比例与留白
      - 主体占比
      - 负空间处理
      - 平衡感
   
   f) 视觉平衡与动势
      - 平衡类型
      - 动态元素
      - 张力分析
   
   g) 构图风格归类与改进建议
      - 风格识别
      - 优势总结
      - 改进方向
      - 可选风格

3. **光影参数** (lighting)
   - 光源分析（类型、方向、质量、色温）
   - 曝光参数评估
   - 明暗层次分析
   - 具体调整建议（包含数值范围）

4. **色彩方案** (color)
   - 主色调提取（至少5个，包含hex、rgb、hsl、占比、名称）
   - 色彩和谐度分析
   - HSL详细调整参数（8个色相：红、橙、黄、绿、青、蓝、紫、品）
   - 整体色彩调整建议

**重要要求**：
1. 所有数值必须精确，包含具体范围
2. 构图分析必须涵盖全部7个维度
3. 每个维度都要有量化评分和详细说明
4. 返回标准JSON格式，确保可以直接解析
5. 所有文本使用中文

返回格式示例：
{
  "review": { ... },
  "composition": {
    "mainStructure": { ... },
    "subjectPlacement": { ... },
    ...
  },
  "lighting": { ... },
  "color": { ... }
}
```

#### 第二阶段 Prompt（深度分析）

```
基于第一阶段的分析结果，现在请生成详细的Lightroom和Photoshop调整方案。

【源照片】: [source_photo_url]
【目标照片】: [target_photo_url]
【第一阶段分析】: [stage1_results]

请提供以下内容（JSON格式）：

1. **Lightroom 调整方案** (lightroom)
   
   a) 基本调整 (basic)
      - treatment: Color/Black & White
      - temperature: -100 to 100
      - tint: -100 to 100
      - exposure: -5 to +5
      - contrast: -100 to 100
      - highlights: -100 to 100
      - shadows: -100 to 100
      - whites: -100 to 100
      - blacks: -100 to 100
      - texture: -100 to 100
      - clarity: -100 to 100
      - dehaze: -100 to 100
      - vibrance: -100 to 100
      - saturation: -100 to 100
   
   b) 色调曲线 (toneCurve)
      - parametric: highlights, lights, darks, shadows
      - pointCurve（可选）: RGB各通道的关键点
   
   c) HSL/颜色 (hsl)
      - hue: 8个色相的调整（-100 to 100）
      - saturation: 8个色相的饱和度
      - luminance: 8个色相的明度
   
   d) 分离色调 (splitToning)
      - highlights: hue(0-360), saturation(0-100)
      - shadows: hue(0-360), saturation(0-100)
      - balance: -100 to 100
   
   e) 细节 (detail)
      - sharpening: amount, radius, detail, masking
      - noiseReduction: 各项参数
   
   f) 镜头校正 (lensCorrections)
   
   g) 效果 (effects)
      - vignette: amount, midpoint, roundness, feather
      - grain: amount, size, roughness
   
   h) 校准 (calibration)
   
   i) 调整步骤 (steps)
      - 详细的操作步骤，包含顺序、面板、参数、说明

2. **Photoshop 后期方案** (photoshop)
   
   a) 图层结构 (layers)
      - 列出所有图层（名称、类型、混合模式、不透明度、顺序）
   
   b) 调整图层 (adjustmentLayers)
      - 每个调整图层的详细参数
   
   c) 曲线 (curves)
      - 各通道的曲线点
   
   d) 色彩平衡 (colorBalance)
      - 阴影/中间调/高光的RGB调整
   
   e) 色相/饱和度 (hueSaturation)
      - 全局和各色相通道的调整
   
   f) Camera Raw滤镜（可选）
   
   g) 其他滤镜 (filters)
   
   h) 蒙版方案 (masks)
      - 详细的蒙版创建和应用说明
   
   i) 详细步骤 (steps)
      - 完整的操作流程，包括：
        - 步骤顺序
        - 步骤标题
        - 详细说明
        - 使用工具
        - 参数设置
        - 技巧提示
   
   j) 快捷键提示 (shortcuts)
   
   k) 注意事项 (notes)

**重要要求**：
1. 所有参数必须在有效范围内
2. 步骤必须详细、可操作
3. Lightroom和Photoshop的方案要相互呼应
4. 提供具体的数值，不要使用"适当"、"稍微"等模糊词汇
5. 步骤要考虑操作顺序的合理性
6. 返回标准JSON格式
7. 所有文本使用中文

返回格式示例：
{
  "lightroom": {
    "basic": { ... },
    "toneCurve": { ... },
    "hsl": { ... },
    ...
    "steps": [ ... ]
  },
  "photoshop": {
    "layers": [ ... ],
    "curves": [ ... ],
    "steps": [ ... ],
    ...
  }
}
```

### Prompt 优化建议

1. **使用Few-Shot Learning**
   - 提供1-2个完整的示例输出
   - 帮助AI理解期望的格式和细节程度

2. **明确数值范围**
   - 在Prompt中明确每个参数的取值范围
   - 要求AI严格遵守范围

3. **结构化输出**
   - 要求JSON格式
   - 定义清晰的数据结构
   - 使用TypeScript接口定义

4. **质量控制**
   - 要求具体数值而非模糊描述
   - 要求专业术语
   - 要求可操作性

5. **分段请求**
   - 第一阶段和第二阶段分开
   - 避免一次性请求过多内容
   - 提高响应质量

---

## 💾 数据库设计

### 表结构

#### 1. uploads（照片上传表）
```sql
CREATE TABLE uploads (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  user_id VARCHAR(36),                  -- 用户ID（可选）
  source_photo_url VARCHAR(500),        -- 源照片URL
  target_photo_url VARCHAR(500),        -- 目标照片URL
  source_photo_key VARCHAR(200),        -- 对象存储key
  target_photo_key VARCHAR(200),        -- 对象存储key
  similarity FLOAT,                     -- 相似度
  status VARCHAR(20),                   -- 状态：pending/analyzing/completed/failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

#### 2. analyses（分析结果表）
```sql
CREATE TABLE analyses (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  upload_id VARCHAR(36) NOT NULL,       -- 关联 uploads.id
  stage VARCHAR(10) NOT NULL,           -- stage1/stage2
  
  -- 第一阶段数据
  review_data JSON,                     -- 照片点评
  composition_data JSON,                -- 构图分析
  lighting_data JSON,                   -- 光影参数
  color_data JSON,                      -- 色彩方案
  
  -- 第二阶段数据
  lightroom_data JSON,                  -- Lightroom方案
  photoshop_data JSON,                  -- Photoshop方案
  lightroom_extra JSON,                 -- Lightroom额外数据
  
  status VARCHAR(20),                   -- 状态
  error_message TEXT,                   -- 错误信息
  processing_time INT,                  -- 处理时间（秒）
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_upload_id (upload_id),
  INDEX idx_stage (stage),
  INDEX idx_created_at (created_at)
);
```

#### 3. users（用户表）
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  email VARCHAR(255) UNIQUE,            -- 邮箱
  username VARCHAR(100),                -- 用户名
  avatar_url VARCHAR(500),              -- 头像URL
  avatar_key VARCHAR(200),              -- 对象存储key
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email)
);
```

#### 4. analysis_cache（分析缓存表）
```sql
CREATE TABLE analysis_cache (
  id VARCHAR(36) PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE,        -- 缓存键（基于照片hash）
  stage VARCHAR(10),
  result_data JSON,                     -- 缓存的分析结果
  hit_count INT DEFAULT 0,              -- 命中次数
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_cache_key (cache_key),
  INDEX idx_last_accessed (last_accessed_at)
);
```

---

## 🛠️ 技术栈建议

### 后端框架选择

#### Node.js + Express
```javascript
// 优势
- JavaScript全栈开发
- npm生态丰富
- 异步处理友好
- 适合I/O密集型应用

// 推荐的库
- express: Web框架
- multer: 文件上传
- sharp: 图片处理
- axios: HTTP客户端
- sequelize/prisma: ORM
- bull: 任务队列
- redis: 缓存
```

#### Python + FastAPI
```python
# 优势
- AI/ML生态成熟
- 图像处理库丰富
- 类型提示
- 自动API文档

# 推荐的库
- fastapi: Web框架
- pillow: 图片处理
- opencv-python: 计算机视觉
- openai: OpenAI SDK
- sqlalchemy: ORM
- celery: 任务队列
- redis: 缓存
```

### 对象存储

推荐使用：
- **AWS S3** - 全球化部署
- **阿里云 OSS** - 国内访问快
- **腾讯云 COS** - 国内备选
- **MinIO** - 自建方案

### 数据库

推荐使用：
- **MySQL 8.0+** - 成熟稳定，JSON支持好
- **PostgreSQL 14+** - JSON功能强大
- **MongoDB** - 文档型数据库（备选）

### 缓存

推荐使用：
- **Redis** - 内存缓存，支持多种数据结构
- **Memcached** - 简单键值缓存（备选）

### 任务队列

推荐使用：
- **Bull** (Node.js) - 基于Redis
- **Celery** (Python) - 功能强大
- **RabbitMQ** - 消息队列（高级）

### AI服务

推荐使用：
- **OpenAI GPT-4 Vision** - 最佳效果
- **Claude 3 Opus** - 备选方案
- **Google Gemini Pro Vision** - 备选方案
- **自建模型** - 成本考虑

---

## 🚀 实现步骤建议

### Phase 1: 基础设施（第1-2周）

1. **搭建项目框架**
   - 选择技术栈
   - 初始化项目
   - 配置开发环境

2. **配置对象存储**
   - 创建存储桶
   - 配置CORS
   - 生成访问密钥

3. **配置数据库**
   - 创建数据库
   - 设计表结构
   - 创建索引

4. **配置Redis**
   - 安装Redis
   - 配置连接

### Phase 2: 核心功能（第3-4周）

1. **照片上传功能**
   - 文件接收和验证
   - 上传到对象存储
   - 相似度计算
   - 数据库记录

2. **AI分析集成**
   - OpenAI API集成
   - Prompt设计和测试
   - 响应解析
   - 错误处理

3. **第一阶段分析**
   - 实现基础分析接口
   - 数据验证和存储
   - 返回格式化结果

4. **第二阶段分析**
   - 实现深度分析接口
   - 复杂参数处理
   - 结果整合

### Phase 3: 优化和扩展（第5-6周）

1. **性能优化**
   - 实现缓存机制
   - 数据库查询优化
   - CDN配置

2. **用户系统**
   - 用户注册/登录
   - 头像管理
   - 历史记录

3. **监控和日志**
   - 错误日志
   - 性能监控
   - 使用统计

4. **测试**
   - 单元测试
   - 集成测试
   - 压力测试

### Phase 4: 部署上线（第7-8周）

1. **部署准备**
   - 环境配置
   - 域名和SSL
   - 备份策略

2. **上线部署**
   - 分阶段上线
   - 灰度发布
   - 监控观察

3. **文档完善**
   - API文档
   - 运维文档
   - 故障处理手册

---

## 📊 性能和成本优化

### 1. 缓存策略

```javascript
// 分析结果缓存
const cacheKey = `analysis:${sourceHash}:${targetHash}:${stage}`;

// 检查缓存
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// 执行分析
const result = await performAnalysis(...);

// 缓存结果（24小时过期）
await redis.setex(cacheKey, 86400, JSON.stringify(result));
```

### 2. 图片相似度优化

使用图像哈希算法快速检测：
```python
import imagehash
from PIL import Image

def calculate_similarity(image1_path, image2_path):
    hash1 = imagehash.phash(Image.open(image1_path))
    hash2 = imagehash.phash(Image.open(image2_path))
    
    # 计算汉明距离
    distance = hash1 - hash2
    
    # 转换为相似度百分比
    similarity = (64 - distance) / 64 * 100
    
    return similarity
```

### 3. AI调用优化

```javascript
// 批量处理请求
async function batchAnalyze(requests) {
  const queue = new Queue('analysis');
  
  // 添加到队列
  for (const req of requests) {
    await queue.add(req, {
      priority: req.priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
}

// 限流控制
const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute'
});

await limiter.removeTokens(1);
```

### 4. 成本估算

**AI调用成本**（基于OpenAI GPT-4 Vision）:
- 第一阶段分析：约$0.10 - $0.20 / 次
- 第二阶段分析：约$0.20 - $0.40 / 次
- 月度10,000次分析：约$3,000 - $6,000

**对象存储成本**：
- 存储：$0.023 / GB / 月
- 流量：$0.09 / GB
- 请求：$0.005 / 1000次

**服务器成本**：
- 应用服务器：$50 - $200 / 月
- 数据库：$50 - $150 / 月
- Redis：$20 - $50 / 月

---

## 🔒 安全性考虑

### 1. 文件上传安全

```javascript
// 文件类型验证
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

// 文件大小限制
const maxSize = 10 * 1024 * 1024; // 10MB
if (file.size > maxSize) {
  throw new Error('File too large');
}

// 文件内容验证
const fileType = await FileType.fromBuffer(file.buffer);
if (!fileType || !allowedTypes.includes(fileType.mime)) {
  throw new Error('Invalid file content');
}
```

### 2. API安全

```javascript
// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制100次请求
}));

// CORS配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));

// 请求验证
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
```

### 3. 数据隐私

- 定期清理过期的照片和分析结果
- 加密存储敏感信息
- 遵守GDPR等隐私法规
- 提供用户数据导出和删除功能

---

## 📚 参考资源

### AI模型文档
- [OpenAI GPT-4 Vision](https://platform.openai.com/docs/guides/vision)
- [Anthropic Claude](https://docs.anthropic.com/claude/docs)
- [Google Gemini](https://ai.google.dev/docs)

### 图像处理
- [Sharp.js](https://sharp.pixelplumbing.com/)
- [Pillow](https://pillow.readthedocs.io/)
- [OpenCV](https://opencv.org/)

### 对象存储
- [AWS S3](https://aws.amazon.com/s3/)
- [阿里云OSS](https://help.aliyun.com/product/31815.html)

### 数据库
- [MySQL](https://dev.mysql.com/doc/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/documentation)

---

## 🎯 总结

### 核心要点

1. **两阶段分析**是关键特性
   - 第一阶段：快速基础分析
   - 第二阶段：深度专业方案

2. **构图分析必须包含7个维度**
   - 这是专业性的体现
   - 每个维度都要详细量化

3. **Lightroom和Photoshop参数要完整**
   - 所有参数都要有具体数值
   - 步骤要详细可操作
   - 避免模糊描述

4. **Prompt设计至关重要**
   - 决定AI输出质量
   - 需要反复测试优化
   - 使用Few-Shot提高准确性

5. **性能和成本平衡**
   - 合理使用缓存
   - 优化AI调用
   - 监控成本

### 开发优先级

1. ⭐⭐⭐ **必须实现**
   - 照片上传
   - 两阶段AI分析
   - 7维度构图分析
   - 详细的LR/PS方案

2. ⭐⭐ **重要功能**
   - 用户系统
   - 头像管理
   - 历史记录
   - 缓存优化

3. ⭐ **增强功能**
   - 风格模拟
   - 批量处理
   - 导出PDF
   - 分享功能

---

**祝开发顺利！如有问题，请参考本指南或联系前端团队。**
