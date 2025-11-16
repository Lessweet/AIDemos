# 3D 球体 iOS 应用

一个使用 SceneKit 构建的交互式 3D 球体应用，支持自转、手势控制和不规则边缘生成。

## 功能特性

- ✅ **3D 真实球体**：使用 SceneKit 渲染的真 3D 球体
- ✅ **自动旋转**：球体自动绕 Y 轴旋转，并有轻微的 X 轴摆动效果
- ✅ **手势交互**：
  - 单指拖动：旋转球体
  - 双指捏合：缩放球体（0.5x - 3x）
- ✅ **不规则边缘**：可切换为不规则几何体，边缘随机变形
- ✅ **玻璃材质**：半透明玻璃效果，带高光和反射

## 在 Xcode 中运行项目

### 方法一：创建新项目并导入文件（推荐）

1. **打开 Xcode**，选择 `File > New > Project`

2. **选择模板**：
   - 选择 **iOS** > **App**
   - 点击 **Next**

3. **配置项目**：
   - Product Name: `Sphere3D`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - 取消勾选 **Use Core Data** 和 **Include Tests**
   - 点击 **Next**

4. **保存位置**：
   - 选择 `/Users/chentongrong/Documents/workspace/AIDemos/3Dsphere`
   - **注意**：Xcode 会创建 `Sphere3D.xcodeproj`，不要选择已存在的 `Sphere3D` 文件夹

5. **替换文件**：
   - 删除 Xcode 自动生成的 `ContentView.swift`
   - 将以下文件拖入项目：
     - `SphereScene.swift` - 3D 场景逻辑
     - `SphereView.swift` - SwiftUI 视图
     - `Sphere3DApp.swift` - App 入口（替换默认的）

6. **运行**：
   - 选择 iPhone 模拟器或真机
   - 点击 ▶️ 运行

### 方法二：使用现有文件

如果 Xcode 项目已存在，只需将 `Sphere3D` 文件夹中的 Swift 文件添加到项目即可。

## 项目结构

```
3Dsphere/
├── Sphere3D/
│   ├── Sphere3DApp.swift      # App 入口
│   ├── SphereView.swift       # SwiftUI 主视图 + 手势处理
│   ├── SphereScene.swift      # SceneKit 3D 场景
│   └── Assets.xcassets/       # 资源文件
└── README.md                  # 本文件
```

## 技术实现

### 1. SceneKit 3D 球体

使用 `SCNSphere` 创建球体几何体，半径为 1.0。材质配置：
- `diffuse`：基础颜色（蓝色透明）
- `specular`：高光反射
- `transparency`：透明度 0.6
- `reflective`：环境反射
- `emission`：自发光

### 2. 不规则几何体生成

通过球面坐标系生成顶点，每个顶点添加随机扰动（0.85-1.15 倍半径）：

```swift
let randomFactor = Float.random(in: 0.85...1.15)
let finalRadius = radius * randomFactor
```

使用三角形网格索引构建 `SCNGeometry`。

### 3. 手势识别

- **拖动旋转**：`DragGesture` 计算手指位移，转换为旋转矩阵
- **缩放**：`MagnificationGesture` 应用到 `sphereNode.scale`

### 4. 自动旋转动画

使用 `SCNAction`：
- Y 轴旋转：360° / 8 秒
- X 轴摆动：±22.5° / 6 秒

## 自定义配置

### 修改球体材质

编辑 `SphereScene.swift` 的 `createSphere()` 方法：

```swift
// 改为红色玻璃
material.diffuse.contents = UIColor(red: 1.0, green: 0.3, blue: 0.3, alpha: 0.3)
```

### 调整旋转速度

修改 `startAutoRotation()` 中的 `duration` 参数：

```swift
// 更快旋转：4 秒一圈
let rotationY = SCNAction.rotateBy(x: 0, y: CGFloat.pi * 2, z: 0, duration: 4.0)
```

### 调整不规则程度

修改 `createIrregularGeometry()` 中的随机范围：

```swift
// 更夸张的变形
let randomFactor = Float.random(in: 0.7...1.3)
```

## 运行要求

- iOS 15.0+
- Xcode 14.0+
- iPhone 或 iPad（推荐真机测试手势）

## 常见问题

**Q: 球体不显示？**
A: 检查相机位置（SphereScene.swift:182），确保 z 坐标为正值（5.0）

**Q: 手势不响应？**
A: 确保 `allowsCameraControl = false`（SphereView.swift:138）

**Q: 切换不规则球体卡顿？**
A: 减少 `latitudeBands` 和 `longitudeBands` 参数（SphereScene.swift:90）

## 扩展建议

- 添加更多材质选项（金属、塑料、发光）
- 实现多球体碰撞
- 导出 3D 模型（.obj/.usdz）
- 添加 AR 模式（ARKit）

## 技术栈

- **SceneKit**：3D 渲染引擎
- **SwiftUI**：界面框架
- **UIKit**（部分）：手势识别

---

**开发者**：Claude Code
**日期**：2025-11-15
