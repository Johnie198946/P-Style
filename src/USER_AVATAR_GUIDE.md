# 👤 用户头像功能指南

## 功能概述

用户头像组件位于应用的右上角，支持查看、更换和移除头像功能。头像数据存储在浏览器的本地存储（LocalStorage）中，无需后端服务器。

## 📍 位置

- **主页**：右上角固定位置
- **结果页**：右上角固定位置（风格模拟按钮左侧）

## 🎯 功能特性

### 1. 默认状态
- 显示默认的渐变色圆形头像
- 中间有用户图标（User Icon）
- Hover时有缩放和光圈动画效果

### 2. 点击头像
打开下拉菜单，显示：
- **用户信息**
  - 头像预览（大图）
  - 用户名：用户
  - 邮箱：user@example.com
- **菜单选项**
  - 更换头像
  - 移除头像（仅当已设置头像时显示）

### 3. 更换头像功能

#### 操作步骤：

**步骤 1：打开更换对话框**
1. 点击右上角的头像按钮
2. 在下拉菜单中点击"更换头像"
3. 弹出更换头像对话框

**步骤 2：选择图片**
1. 对话框中显示当前头像预览（圆形）
2. 点击"选择图片"按钮
3. 或者点击头像预览区域的相机图标
4. 系统打开文件选择器

**步骤 3：上传图片**
1. 在文件选择器中选择图片文件
   - 支持格式：JPG、PNG、WEBP
   - 建议尺寸：400x400 像素
   - 图片会自动裁剪为圆形
2. 选择后图片立即显示在预览区域

**步骤 4：确认或重选**
- **保存**：点击"保存"按钮确认更换
  - 头像更新到所有位置
  - 自动保存到本地存储
  - 关闭对话框
- **重新选择**：点击"重新选择"按钮
  - 重新打开文件选择器
  - 可选择其他图片
- **取消**：点击"X"按钮或背景区域
  - 放弃更改
  - 关闭对话框

**步骤 5：完成**
- 头像已更新
- 刷新页面后头像依然保留
- 可随时再次更换

### 4. 移除头像功能

#### 操作步骤：

1. 点击右上角的头像按钮
2. 在下拉菜单中点击"移除头像"（红色选项）
3. 头像恢复为默认状态
4. 本地存储中的头像数据被清除

## 🎨 设计细节

### 视觉效果

1. **头像按钮**
   - 圆形设计
   - 白色边框
   - 渐变色背景（蓝色到紫色）
   - Hover时缩放效果（1.05倍）
   - 点击时缩小效果（0.95倍）
   - Hover时外围光圈动画

2. **下拉菜单**
   - 毛玻璃效果（backdrop-blur）
   - 白色半透明背景
   - 圆角矩形（rounded-2xl）
   - 柔和阴影
   - 流畅的展开/收起动画

3. **更换对话框**
   - 全屏半透明背景
   - 居中显示的白色卡片
   - 大圆形头像预览（128x128px）
   - 渐变色按钮
   - 弹性动画进入

### 交互动画

1. **打开菜单**：淡入 + 向下滑动 + 缩放
2. **关闭菜单**：淡出 + 向上滑动 + 缩放
3. **打开对话框**：背景淡入 + 卡片弹性进入
4. **关闭对话框**：背景淡出 + 卡片缩小退出
5. **按钮Hover**：缩放 + 背景变色

## 💾 数据存储

### LocalStorage 键值
- **键名**：`userAvatar`
- **值**：Base64编码的图片数据
- **格式**：`data:image/jpeg;base64,/9j/4AAQSkZJRgABA...`

### 存储逻辑
```javascript
// 保存头像
localStorage.setItem('userAvatar', base64ImageData);

// 读取头像
const avatarUrl = localStorage.getItem('userAvatar');

// 删除头像
localStorage.removeItem('userAvatar');
```

### 数据持久化
- 头像数据保存在浏览器本地
- 刷新页面后依然存在
- 清除浏览器数据会删除头像
- 不同浏览器数据不互通

## 🎯 使用场景

1. **个性化设置**
   - 用户可以上传自己的照片作为头像
   - 增强个人辨识度
   - 提升使用体验

2. **快速识别**
   - 在多用户环境下区分不同用户
   - 视觉化的用户标识

3. **专业形象**
   - 使用专业照片作为头像
   - 适合展示和分享

## 📝 技术实现

### 核心组件
- **UserAvatar.tsx**：用户头像组件

### 主要功能模块

1. **头像显示**
   ```tsx
   {avatarUrl ? (
     <img src={avatarUrl} alt="User Avatar" />
   ) : (
     <User icon />
   )}
   ```

2. **文件上传**
   ```tsx
   <input type="file" accept="image/*" onChange={handleFileSelect} />
   ```

3. **图片预览**
   ```tsx
   const reader = new FileReader();
   reader.onload = (e) => setPreviewUrl(e.target.result);
   reader.readAsDataURL(file);
   ```

4. **数据持久化**
   ```tsx
   localStorage.setItem('userAvatar', previewUrl);
   ```

### 状态管理
- `avatarUrl`：当前头像URL
- `previewUrl`：预览图片URL
- `showMenu`：菜单显示状态
- `showUploadDialog`：对话框显示状态

## 🔧 自定义和扩展

### 修改默认渐变色
在 `UserAvatar.tsx` 中修改：
```tsx
className="bg-gradient-to-br from-blue-500 to-purple-600"
// 改为
className="bg-gradient-to-br from-pink-500 to-orange-600"
```

### 添加更多菜单选项
在菜单部分添加新按钮：
```tsx
<button className="w-full px-4 py-2.5 ...">
  <Icon className="w-4 h-4" />
  <span>新选项</span>
</button>
```

### 集成后端存储
将 `localStorage` 替换为 API 调用：
```tsx
// 保存头像
await fetch('/api/avatar', {
  method: 'POST',
  body: JSON.stringify({ avatar: base64Data })
});

// 获取头像
const response = await fetch('/api/avatar');
const { avatar } = await response.json();
```

### 添加图片裁剪功能
可以集成图片裁剪库（如 react-easy-crop）：
```tsx
import Cropper from 'react-easy-crop';

<Cropper
  image={uploadedImage}
  crop={crop}
  zoom={zoom}
  aspect={1}
  onCropChange={setCrop}
  onZoomChange={setZoom}
  onCropComplete={onCropComplete}
/>
```

## ⚠️ 注意事项

1. **文件大小**
   - Base64编码会增大文件体积约33%
   - 建议压缩图片后再上传
   - LocalStorage有5-10MB的存储限制

2. **浏览器兼容性**
   - FileReader API 在现代浏览器中支持良好
   - IE浏览器可能需要polyfill

3. **安全性**
   - 当前仅支持前端存储
   - 敏感信息不应存储在LocalStorage
   - 生产环境建议使用后端存储

4. **性能优化**
   - 大图片会导致存储和读取变慢
   - 建议上传前压缩图片到400x400或以下
   - 可以添加文件大小限制（如2MB）

## 🎁 未来增强

- [ ] 图片裁剪和缩放功能
- [ ] 图片滤镜和特效
- [ ] 支持从摄像头拍照
- [ ] 头像画廊/预设头像选择
- [ ] 多头像管理
- [ ] 头像历史记录
- [ ] 与后端同步
- [ ] 头像尺寸自动优化
- [ ] 支持GIF动态头像
- [ ] 头像装饰/边框

---

**提示**：头像功能完全在前端实现，无需后端支持，适合快速原型开发和演示。
