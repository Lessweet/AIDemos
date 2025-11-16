# 添加文件到 Xcode 项目

## 问题原因

`SphereView.swift` 和 `SphereScene.swift` 文件虽然在文件夹中，但没有被添加到 Xcode 项目的编译列表中。

## 解决方法（3 步操作）

### 步骤 1：在 Xcode 左侧导航器中找到 Sphere3D 文件夹

- 确保选中左侧的 **文件夹图标**（Project Navigator）
- 找到蓝色的 `Sphere3D` 文件夹（不是 Sphere3D.xcodeproj）

### 步骤 2：右键点击 Sphere3D 文件夹

- **右键点击** `Sphere3D` 文件夹
- 选择 **"Add Files to 'Sphere3D'..."**

### 步骤 3：选择文件并添加

1. 在弹出的文件选择器中，导航到：
   ```
   /Users/chentongrong/Documents/workspace/AIDemos/3Dsphere/Sphere3D/Sphere3D/
   ```

2. **按住 Command 键**，同时选中：
   - ✅ `SphereScene.swift`
   - ✅ `SphereView.swift`

3. 在底部确保勾选：
   - ✅ **"Copy items if needed"** （如果需要复制项目）
   - ✅ **"Add to targets: Sphere3D"** （添加到目标）

4. 点击 **"Add"** 按钮

### 步骤 4：验证

添加成功后，你会在 Xcode 左侧看到：
```
Sphere3D/
├── Sphere3DApp.swift
├── SphereScene.swift     ← 新添加
├── SphereView.swift      ← 新添加
└── Assets.xcassets
```

### 步骤 5：重新编译

- 按 **Cmd + Shift + K** 清理项目
- 按 **Cmd + B** 重新编译
- 或者直接点击 ▶️ 运行

---

## 如果上述方法不起作用

### 备用方案：拖拽添加

1. 在 **Finder** 中打开：
   ```
   /Users/chentongrong/Documents/workspace/AIDemos/3Dsphere/Sphere3D/Sphere3D/
   ```

2. 将 `SphereScene.swift` 和 `SphereView.swift` **直接拖拽**到 Xcode 左侧的 `Sphere3D` 文件夹中

3. 在弹出的对话框中确认：
   - ✅ Copy items if needed
   - ✅ Add to targets: Sphere3D

---

完成后错误应该消失，项目可以正常运行！
