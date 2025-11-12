# 3D玻璃球 - iOS原生应用

## 项目状态
✅ 已完成开发，可直接在iOS设备上运行

## 功能特性
- 黑色背景，8个质感通透的玻璃球
- 真实物理模拟：重力、碰撞、反弹、摩擦
- 陀螺仪感应：实时响应手机旋转
- 触摸交互：点击玻璃球施加冲击力

## 快速开始

### 在真机上运行（推荐）
1. 打开Xcode创建新项目（iOS App, SwiftUI）
2. 将以下文件添加到项目：
   - `GlassBallsApp.swift`
   - `GlassBallsView.swift`
   - `GlassBallsScene.swift`
3. 更新 `Info.plist` 添加陀螺仪权限
4. 连接iPhone设备并运行

### 集成到Card3D项目
```bash
# 复制文件到Card3D项目
cp GlassBallsScene.swift GlassBallsView.swift ../3D卡片iOS应用/Card3D/Card3D/
```

然后在Card3D的ContentView中添加导航按钮。

## 文件说明
- `GlassBallsApp.swift` - 应用入口
- `GlassBallsView.swift` - SwiftUI主视图
- `GlassBallsScene.swift` - SpriteKit物理场景（核心逻辑）
- `Info.plist` - 配置文件（陀螺仪权限）
- `使用说明.md` - 详细技术文档

## 技术栈
- SwiftUI + SpriteKit + CoreMotion
- iOS 15.0+
- 需要真机测试（模拟器无陀螺仪）

## 效果预览
旋转手机 → 8个玻璃球随重力滚动 → 碰撞反弹 → 真实物理效果

详见 `使用说明.md` 获取完整技术文档。