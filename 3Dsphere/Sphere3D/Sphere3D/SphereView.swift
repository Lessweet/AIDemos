import SwiftUI
import SceneKit

struct SphereView: View {
    @State private var sphereScene = SphereScene()
    @State private var lastPanLocation: CGPoint = .zero
    @State private var dragVelocity: CGVector = .zero

    var body: some View {
        ZStack {
            // 黑色背景
            Color.black
                .ignoresSafeArea()

            // SceneKit 视图
            SceneKitView(scene: sphereScene.scene)
                .ignoresSafeArea()
                .gesture(
                    DragGesture()
                        .onChanged { gesture in
                            handlePan(gesture: gesture)
                        }
                        .onEnded { _ in
                            // 重置拖动位置
                            lastPanLocation = .zero
                            dragVelocity = .zero

                            // 恢复球体原形（弹性回弹，内部会同步恢复渐变流动）
                            sphereScene.restoreSphereShape()

                            // 拖动结束后恢复自动旋转
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                                sphereScene.resumeAutoRotation()
                            }
                        }
                )
                .gesture(
                    MagnificationGesture()
                        .onChanged { scale in
                            handlePinch(scale: scale)
                        }
                        .onEnded { _ in
                            // 重置缩放比例
                            lastScale = 1.0
                        }
                )
        }
        .statusBar(hidden: true)
    }

    // MARK: - 手势处理

    private func handlePan(gesture: DragGesture.Value) {
        let location = gesture.location

        if lastPanLocation == .zero {
            lastPanLocation = gesture.startLocation
            // 第一次拖动时，确保渐变流动在运行
            sphereScene.ensureGradientFlowing()
        }

        // 计算拖动距离
        let deltaX = Float(location.x - lastPanLocation.x)
        let deltaY = Float(location.y - lastPanLocation.y)

        // 计算拖动速度（用于变形效果）
        dragVelocity = CGVector(dx: CGFloat(deltaX), dy: CGFloat(deltaY))

        // 转换为旋转角度（增加灵敏度）
        let rotationSensitivity: Float = 0.01
        let angleX = deltaY * rotationSensitivity
        let angleY = deltaX * rotationSensitivity

        // 绕 X 轴旋转（上下拖动）
        if abs(deltaY) > 0 {
            sphereScene.rotateSphere(
                byAngle: angleX,
                axis: SCNVector3(1, 0, 0)
            )
        }

        // 绕 Y 轴旋转（左右拖动）
        if abs(deltaX) > 0 {
            sphereScene.rotateSphere(
                byAngle: angleY,
                axis: SCNVector3(0, 1, 0)
            )
        }

        // 应用拖动变形效果（挤压拉伸）
        sphereScene.applyDragDeformation(velocity: dragVelocity)

        lastPanLocation = location
    }

    @State private var lastScale: CGFloat = 1.0

    private func handlePinch(scale: CGFloat) {
        let deltaScale = Float(scale / lastScale)
        sphereScene.scaleSphere(by: deltaScale)
        lastScale = scale
    }
}

// MARK: - SceneKit 视图包装器

struct SceneKitView: UIViewRepresentable {
    let scene: SCNScene

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.scene = scene
        scnView.allowsCameraControl = false // 禁用默认相机控制，使用自定义手势
        scnView.autoenablesDefaultLighting = false // 使用自定义光照
        scnView.backgroundColor = .black
        scnView.antialiasingMode = .multisampling4X // 抗锯齿

        // 优化渲染质量，防止变形
        scnView.rendersContinuously = true  // 持续渲染，确保平滑
        scnView.isJitteringEnabled = true   // 启用抖动，减少锯齿

        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {
        uiView.scene = scene
    }
}

// MARK: - 预览

#Preview {
    SphereView()
}
