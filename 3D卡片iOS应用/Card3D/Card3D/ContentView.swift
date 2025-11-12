import SwiftUI

struct ContentView: View {
    @StateObject private var cardModel = CardModel()
    @State private var showControlPanel = false
    @State private var currentPage: Int = 0

    var body: some View {
        TabView(selection: $currentPage) {
            // 第一屏：iPhone设备框架 + 卡片
            FirstScreenView(cardModel: cardModel, showControlPanel: $showControlPanel, currentPage: $currentPage)
                .tag(0)

            // 第二屏：全屏渐变色
            SecondScreenView(currentPage: $currentPage)
                .tag(1)

            // 第三屏：Three.js 球体（黑色背景）
            LocalWebView()
                .tag(2)
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .ignoresSafeArea(.all, edges: .all)
        .onAppear {
            cardModel.loadSettings()
            cardModel.enableGyro()
        }
    }
}

// 第一屏视图
struct FirstScreenView: View {
    @ObservedObject var cardModel: CardModel
    @Binding var showControlPanel: Bool
    @Binding var currentPage: Int

    var body: some View {
        ZStack {
            // 背景
            Color.white.ignoresSafeArea()

            VStack(spacing: 40) {
                Spacer()

                // 3D渐变卡片
                Card3DView(cardModel: cardModel)

                Spacer()

                // 陀螺仪参数选项
                ControlPanelView(cardModel: cardModel)
                    .padding(.bottom, 40)

                // 跳转到第二屏按钮
                Button(action: {
                    withAnimation {
                        currentPage = 1
                    }
                }) {
                    HStack {
                        Text("指尖的力量")
                        Image(systemName: "arrow.right")
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [Color.blue, Color.purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(25)
                    .shadow(color: Color.blue.opacity(0.3), radius: 10, x: 0, y: 5)
                }
                .padding(.bottom, 30)
            }
        }
        .contentShape(Rectangle())
        .allowsHitTesting(true)
    }
}

// 第二屏视图：全屏渐变色（支持扭曲效果）
struct SecondScreenView: View {
    @Binding var currentPage: Int
    @State private var hueRotation: Double = 0
    @State private var touchPoints: [TouchDistortion] = [] // 触摸扭曲点
    @State private var textPosition: CGSize = .zero // 文字位置偏移（累积）
    @GestureState private var dragOffset: CGSize = .zero // 当前拖动偏移

    // 渐变圆的状态（增加更多渐变圆，覆盖更密集，半径加大确保全屏覆盖）
    @State private var gradientCenters: [GradientCircle] = [
        // 原有的5个（半径增大到0.8）
        GradientCircle(id: 0, originalCenter: UnitPoint(x: 0.2, y: 0.25), currentCenter: UnitPoint(x: 0.2, y: 0.25), color: Color(red: 1.0, green: 0.47, blue: 0.27), radius: 0.8),
        GradientCircle(id: 1, originalCenter: UnitPoint(x: 0.8, y: 0.2), currentCenter: UnitPoint(x: 0.8, y: 0.2), color: Color(red: 0.24, green: 0.71, blue: 1.0), radius: 0.8),
        GradientCircle(id: 2, originalCenter: UnitPoint(x: 0.25, y: 0.8), currentCenter: UnitPoint(x: 0.25, y: 0.8), color: Color(red: 1.0, green: 0.27, blue: 0.71), radius: 0.8),
        GradientCircle(id: 3, originalCenter: UnitPoint(x: 0.75, y: 0.75), currentCenter: UnitPoint(x: 0.75, y: 0.75), color: Color(red: 0.51, green: 0.31, blue: 1.0), radius: 0.8),
        GradientCircle(id: 4, originalCenter: .center, currentCenter: .center, color: Color(red: 1.0, green: 0.78, blue: 0.39).opacity(0.8), radius: 0.9),
        // 新增5个渐变圆，填补空隙（半径增大到0.7）
        GradientCircle(id: 5, originalCenter: UnitPoint(x: 0.5, y: 0.15), currentCenter: UnitPoint(x: 0.5, y: 0.15), color: Color(red: 0.4, green: 0.9, blue: 0.8), radius: 0.7),
        GradientCircle(id: 6, originalCenter: UnitPoint(x: 0.15, y: 0.5), currentCenter: UnitPoint(x: 0.15, y: 0.5), color: Color(red: 0.9, green: 0.5, blue: 0.3), radius: 0.7),
        GradientCircle(id: 7, originalCenter: UnitPoint(x: 0.85, y: 0.5), currentCenter: UnitPoint(x: 0.85, y: 0.5), color: Color(red: 0.3, green: 0.5, blue: 0.9), radius: 0.7),
        GradientCircle(id: 8, originalCenter: UnitPoint(x: 0.5, y: 0.85), currentCenter: UnitPoint(x: 0.5, y: 0.85), color: Color(red: 0.8, green: 0.3, blue: 0.8), radius: 0.7),
        GradientCircle(id: 9, originalCenter: UnitPoint(x: 0.35, y: 0.4), currentCenter: UnitPoint(x: 0.35, y: 0.4), color: Color(red: 1.0, green: 0.6, blue: 0.4), radius: 0.7)
    ]

    var body: some View {
        ZStack {
            GeometryReader { geometry in
                // 全屏流动渐变背景
                Color(red: 0.96, green: 0.96, blue: 0.97)
                    .overlay(
                        ZStack {
                            ForEach(gradientCenters.indices, id: \.self) { index in
                                EllipticalGradient(
                                    colors: [gradientCenters[index].color, Color.clear],
                                    center: gradientCenters[index].currentCenter,
                                    startRadiusFraction: 0,
                                    endRadiusFraction: gradientCenters[index].radius
                                )
                            }
                        }
                        .hueRotation(.degrees(hueRotation))
                        .blur(radius: 50)
                    )

                // 中间区域透明层，用于处理扭曲手势，不影响边缘翻页
                Color.clear
                    .contentShape(Rectangle())
                    .padding(.horizontal, 60) // 左右各留60像素给翻页
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in
                                let location = value.location

                                // 添加新的触摸点（控制采样密度）
                                let shouldAdd: Bool
                                if let lastPoint = touchPoints.last {
                                    let distance = hypot(location.x - lastPoint.position.x, location.y - lastPoint.position.y)
                                    shouldAdd = distance > 1 // 每1个像素采样一次，更密集
                                } else {
                                    shouldAdd = true
                                }

                                if shouldAdd {
                                    // 调整位置，因为有padding偏移
                                    let adjustedLocation = CGPoint(x: location.x + 60, y: location.y)
                                    let newPoint = TouchDistortion(
                                        id: UUID(),
                                        position: adjustedLocation,
                                        timestamp: Date()
                                    )
                                    touchPoints.append(newPoint)

                                    // 保留最近100个点
                                    if touchPoints.count > 100 {
                                        touchPoints.removeFirst()
                                    }
                                }

                                // 应用扭曲效果
                                applyDistortion(screenSize: geometry.size)
                            }
                            .onEnded { _ in
                                // 清除触摸点，但保持渐变圆在当前位置
                                touchPoints.removeAll()

                                // 更新原始位置为当前位置（停留在扭曲后的位置）
                                for i in gradientCenters.indices {
                                    gradientCenters[i].originalCenter = gradientCenters[i].currentCenter
                                }
                            }
                    )

            }
            .onAppear {
                // 启动持续的色相旋转动画
                Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { _ in
                    hueRotation += 2.5
                    if hueRotation >= 360 {
                        hueRotation -= 360
                    }
                }
            }

            // 底部文字和按钮
            VStack(spacing: 20) {
                Spacer()

                Text("指尖的力量")
                    .font(.custom("STSongti-SC-Regular", size: 32))
                    .foregroundColor(.black)
                    .offset(x: textPosition.width + dragOffset.width,
                            y: textPosition.height + dragOffset.height)
                    .gesture(
                        DragGesture()
                            .updating($dragOffset) { value, state, _ in
                                state = value.translation
                            }
                            .onEnded { value in
                                // 累积偏移量
                                textPosition.width += value.translation.width
                                textPosition.height += value.translation.height
                            }
                    )

                // 跳转按钮
                Button(action: {
                    withAnimation {
                        currentPage = 2
                    }
                }) {
                    HStack {
                        Text("查看球体")
                        Image(systemName: "arrow.right")
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [Color.orange, Color.pink],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(25)
                    .shadow(color: Color.orange.opacity(0.3), radius: 10, x: 0, y: 5)
                }
                .padding(.bottom, 50)
            }
        }
        .ignoresSafeArea(.all, edges: .all)
    }

    // 应用扭曲效果
    private func applyDistortion(screenSize: CGSize) {
        // 不使用动画，让扭曲更即时
        for i in gradientCenters.indices {
            let originalX = gradientCenters[i].originalCenter.x * screenSize.width
            let originalY = gradientCenters[i].originalCenter.y * screenSize.height
            var totalOffsetX: CGFloat = 0
            var totalOffsetY: CGFloat = 0

            // 计算所有触摸点对当前渐变圆的扭曲影响
            for (index, touchPoint) in touchPoints.enumerated() {
                let dx = originalX - touchPoint.position.x
                let dy = originalY - touchPoint.position.y
                let distance = hypot(dx, dy)

                // 扭曲影响范围
                let distortionRadius: CGFloat = 350

                if distance < distortionRadius && distance > 1 {
                    // 计算年龄衰减
                    let age = Date().timeIntervalSince(touchPoint.timestamp)
                    let ageFactor = max(0, 1.0 - age / 0.5) // 0.5秒内有效

                    // 扭曲强度 - 使用适中的衰减曲线
                    let distortionStrength = pow((distortionRadius - distance) / distortionRadius, 1.0)
                    let finalStrength = distortionStrength * ageFactor

                    // 计算拖拽方向（如果有前一个点）
                    if index > 0 {
                        let prevPoint = touchPoints[index - 1].position
                        let dragDx = touchPoint.position.x - prevPoint.x
                        let dragDy = touchPoint.position.y - prevPoint.y
                        let dragDistance = hypot(dragDx, dragDy)

                        if dragDistance > 0 {
                            // 沿着拖拽方向拉伸颜色 - 适中强度
                            let dragStrength: CGFloat = 50 * finalStrength
                            totalOffsetX += (dragDx / dragDistance) * dragStrength
                            totalOffsetY += (dragDy / dragDistance) * dragStrength
                        }
                    }

                    // 推开效果（沿着远离触摸点的方向）- 适中强度
                    let angle = atan2(dy, dx)
                    let pushStrength: CGFloat = 45 * finalStrength

                    totalOffsetX += cos(angle) * pushStrength
                    totalOffsetY += sin(angle) * pushStrength

                    // 旋涡扭曲效果 - 适中强度
                    let perpAngle = angle + .pi / 2
                    let swirlStrength: CGFloat = 35 * finalStrength

                    totalOffsetX += cos(perpAngle) * swirlStrength
                    totalOffsetY += sin(perpAngle) * swirlStrength
                }
            }

            // 应用扭曲偏移
            let newX = originalX + totalOffsetX
            let newY = originalY + totalOffsetY

            gradientCenters[i].currentCenter = UnitPoint(
                x: newX / screenSize.width,
                y: newY / screenSize.height
            )
        }
    }
}

// 渐变圆数据结构
struct GradientCircle {
    let id: Int
    var originalCenter: UnitPoint  // 原始位置（改为var，允许更新）
    var currentCenter: UnitPoint   // 当前位置（会被扭曲影响）
    let color: Color
    let radius: CGFloat
}

// 触摸扭曲点数据结构
struct TouchDistortion: Identifiable {
    let id: UUID
    let position: CGPoint
    let timestamp: Date
}

// 自定义圆角扩展
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - 玻璃球体视图

// 带触摸交互的玻璃质感球体视图
struct GlassSphereView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            InteractiveGlassSphereSceneView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// 交互式SceneKit场景
struct InteractiveGlassSphereSceneView: UIViewRepresentable {

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.backgroundColor = .black
        scnView.allowsCameraControl = false // 禁用默认相机控制
        scnView.autoenablesDefaultLighting = false
        scnView.antialiasingMode = .multisampling4X

        // 创建场景
        let scene = SCNScene()
        scnView.scene = scene

        // 创建球体（高精度网格用于扭曲效果）
        let sphere = SCNSphere(radius: 1.8)
        sphere.segmentCount = 256 // 增加细分以支持平滑扭曲

        // 创建材质并应用Metal着色器
        let material = SCNMaterial()
        material.lightingModel = .constant // 使用自定义着色器

        // 应用Metal着色器修改器
        material.shaderModifiers = [
            // 几何着色器：控制顶点变形（扭曲效果）
            .geometry: geometryShader,
            // 片段着色器:玻璃质感、Fresnel、渐变效果
            .fragment: fragmentShader
        ]

        sphere.materials = [material]

        // 创建球体节点
        let sphereNode = SCNNode(geometry: sphere)
        sphereNode.name = "glassSphere"
        scene.rootNode.addChildNode(sphereNode)

        // 摄像机
        let camera = SCNCamera()
        camera.fieldOfView = 75
        let cameraNode = SCNNode()
        cameraNode.camera = camera
        cameraNode.position = SCNVector3(0, 0, 5)
        scene.rootNode.addChildNode(cameraNode)

        // 添加环境光
        let ambientLight = SCNLight()
        ambientLight.type = .ambient
        ambientLight.color = UIColor(white: 0.3, alpha: 1.0)
        let ambientNode = SCNNode()
        ambientNode.light = ambientLight
        scene.rootNode.addChildNode(ambientNode)

        // 设置手势识别器
        let coordinator = context.coordinator
        coordinator.scnView = scnView
        coordinator.sphereNode = sphereNode

        let panGesture = UIPanGestureRecognizer(target: coordinator, action: #selector(Coordinator.handlePan(_:)))
        scnView.addGestureRecognizer(panGesture)

        let tapGesture = UITapGestureRecognizer(target: coordinator, action: #selector(Coordinator.handleTap(_:)))
        scnView.addGestureRecognizer(tapGesture)

        // 启动时间更新动画
        coordinator.startTimeAnimation(for: sphereNode)

        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {
        // 不需要更新
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    // Coordinator处理手势和动画
    class Coordinator: NSObject {
        weak var scnView: SCNView?
        weak var sphereNode: SCNNode?
        var displayLink: CADisplayLink?
        var startTime: CFTimeInterval = CACurrentMediaTime()

        // 触摸交互参数
        var touchPosition = SIMD2<Float>(0.5, 0.5) // 归一化触摸位置
        var distortionIntensity: Float = 0.0 // 扭曲强度（0-1）
        var rotationVelocity = SIMD2<Float>(0, 0) // 旋转速度
        var currentRotation = SIMD2<Float>(0, 0) // 当前旋转角度

        // 启动时间动画
        func startTimeAnimation(for node: SCNNode) {
            displayLink = CADisplayLink(target: self, selector: #selector(updateTime))
            displayLink?.add(to: .main, forMode: .common)
        }

        @objc func updateTime() {
            guard let sphereNode = sphereNode,
                  let material = sphereNode.geometry?.firstMaterial else { return }

            let currentTime = Float(CACurrentMediaTime() - startTime)

            // 更新着色器参数
            material.setValue(SCNVector3(touchPosition.x, touchPosition.y, distortionIntensity),
                            forKey: "touchPoint")
            material.setValue(currentTime, forKey: "time")

            // 衰减扭曲强度（呼吸效果）
            if distortionIntensity > 0 {
                distortionIntensity *= 0.95 // 快速衰减
            }

            // 应用惯性旋转
            if rotationVelocity.x != 0 || rotationVelocity.y != 0 {
                currentRotation.x += rotationVelocity.x
                currentRotation.y += rotationVelocity.y

                // 应用旋转
                sphereNode.eulerAngles = SCNVector3(currentRotation.y, currentRotation.x, 0)

                // 衰减速度
                rotationVelocity *= 0.95
                if abs(rotationVelocity.x) < 0.001 && abs(rotationVelocity.y) < 0.001 {
                    rotationVelocity = SIMD2<Float>(0, 0)
                }
            }
        }

        // 处理拖动手势
        @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
            guard let scnView = scnView else { return }

            let location = gesture.location(in: scnView)
            let viewSize = scnView.bounds.size

            // 转换为归一化坐标
            touchPosition = SIMD2<Float>(
                Float(location.x / viewSize.width),
                Float(1.0 - location.y / viewSize.height)
            )

            switch gesture.state {
            case .began:
                distortionIntensity = 0.6 // 开始扭曲
                rotationVelocity = SIMD2<Float>(0, 0) // 停止旋转

            case .changed:
                let translation = gesture.translation(in: scnView)
                let velocity = gesture.velocity(in: scnView)

                // 更新扭曲强度（基于移动速度）
                let speed = sqrt(pow(velocity.x, 2) + pow(velocity.y, 2))
                distortionIntensity = min(1.0, Float(speed / 2000.0))

                // 更新旋转速度
                rotationVelocity = SIMD2<Float>(
                    Float(velocity.x) / 500.0,
                    Float(velocity.y) / 500.0
                )

            case .ended, .cancelled:
                // 保持惯性旋转，扭曲自然衰减
                break

            default:
                break
            }
        }

        // 处理点击手势
        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let scnView = scnView else { return }

            let location = gesture.location(in: scnView)
            let viewSize = scnView.bounds.size

            // 转换为归一化坐标
            touchPosition = SIMD2<Float>(
                Float(location.x / viewSize.width),
                Float(1.0 - location.y / viewSize.height)
            )

            // 产生短暂的强烈扭曲波纹
            distortionIntensity = 0.8
        }

        deinit {
            displayLink?.invalidate()
        }
    }

    // MARK: - Metal着色器代码

    // 几何着色器：顶点变形（扭曲效果）
    private var geometryShader: String {
        """
        #pragma arguments
        uniform float3 touchPoint; // x,y: 触摸位置, z: 扭曲强度
        uniform float time;

        #pragma body

        // 获取当前顶点的球面坐标
        float3 pos = _geometry.position.xyz;
        float3 normal = _geometry.normal.xyz;

        // 计算触摸点的3D坐标（假设在球面上）
        float touchTheta = touchPoint.y * 3.14159265;
        float touchPhi = touchPoint.x * 6.28318531;
        float3 touchPos = float3(
            sin(touchTheta) * cos(touchPhi),
            cos(touchTheta),
            sin(touchTheta) * sin(touchPhi)
        );

        // 计算当前顶点到触摸点的距离
        float dist = distance(normalize(pos), touchPos);

        // 扭曲影响范围（0-1）
        float influenceRadius = 0.5;
        float influence = smoothstep(influenceRadius, 0.0, dist);

        // 动态扭曲：结合时间的呼吸效果
        float breathe = 0.6 + 0.4 * sin(time * 0.8);
        float distortionAmount = touchPoint.z * influence * breathe;

        // 波纹扭曲（多层波形）
        float wave1 = sin(dist * 8.0 - time * 2.0) * 0.4;
        float wave2 = sin(dist * 12.0 - time * 1.5) * 0.3;
        float wave3 = cos(dist * 6.0 - time * 2.5) * 0.3;
        float combinedWave = (wave1 + wave2 + wave3) * distortionAmount;

        // 应用扭曲（沿法线方向）
        float displacement = combinedWave * 0.12;
        _geometry.position.xyz += normal * displacement;

        // 轻微的全局呼吸动画
        float globalBreath = 1.0 + 0.01 * sin(time * 1.2);
        _geometry.position.xyz *= globalBreath;
        """
    }

    // 片段着色器：玻璃质感、Fresnel、渐变
    private var fragmentShader: String {
        """
        #pragma arguments
        uniform float3 touchPoint;
        uniform float time;

        #pragma body

        // 计算视线方向
        float3 viewDir = normalize(_surface.view);
        float3 normal = normalize(_surface.normal);

        // Fresnel效果（玻璃反射）
        float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);

        // 三色渐变基础颜色
        float3 color1 = float3(1.0, 0.965, 0.553);  // #FFF68D 黄色
        float3 color2 = float3(1.0, 0.545, 0.831);  // #FF8BD4 粉色
        float3 color3 = float3(0.220, 0.471, 0.824); // #3878D2 蓝色

        // 基于法线的渐变混合
        float3 gradientPos = normal * 0.5 + 0.5;

        // 混合三种颜色（避免黑色）
        float3 baseColor = mix(
            mix(color1, color2, gradientPos.x),
            color3,
            gradientPos.y * 0.6  // 降低蓝色权重避免过暗
        );

        // 添加动态流动效果
        float flow = sin(gradientPos.x * 3.14159 + time * 0.5) * 0.5 + 0.5;
        baseColor = mix(baseColor, color2, flow * 0.2);

        // 玻璃高光（左上角光源）
        float3 lightDir = normalize(float3(-1.0, 1.0, 1.0));
        float specular = pow(max(0.0, dot(reflect(-lightDir, normal), viewDir)), 100.0);

        // 边缘发光效果
        float edgeGlow = pow(fresnel, 2.0) * 0.3;

        // 组合最终颜色
        float3 finalColor = baseColor;
        finalColor += float3(1.0, 1.0, 1.0) * specular * 0.5; // 高光
        finalColor += float3(1.0, 0.9, 0.7) * edgeGlow;       // 边缘光
        finalColor += baseColor * fresnel * 0.15;             // Fresnel增强

        // 触摸点附近额外高亮
        float3 surfacePos = normal * 0.5 + 0.5;
        float touchDist = distance(surfacePos.xy, touchPoint.xy);
        float touchHighlight = smoothstep(0.3, 0.0, touchDist) * touchPoint.z;
        finalColor += float3(1.0, 1.0, 1.0) * touchHighlight * 0.4;

        // 应用颜色和透明度
        _output.color.rgb = finalColor;
        _output.color.a = 0.98 + fresnel * 0.02; // 几乎不透明，边缘微透
        """
    }
}

// 预览
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
