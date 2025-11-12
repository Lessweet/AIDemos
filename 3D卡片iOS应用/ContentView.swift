import SwiftUI

struct ContentView: View {
    @StateObject private var cardModel = CardModel()
    @State private var showControlPanel = false
    @State private var currentPage = 0

    var body: some View {
        TabView(selection: $currentPage) {
            // 第一屏：iPhone设备框架 + 卡片
            FirstScreenView(cardModel: cardModel, showControlPanel: $showControlPanel)
                .tag(0)

            // 第二屏：全屏渐变色
            SecondScreenView()
                .tag(1)
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .ignoresSafeArea(.all, edges: .all)
        .onAppear {
            cardModel.loadSettings()
            cardModel.enableGyro()  // 启动陀螺仪
        }
    }
}

// 第一屏视图
struct FirstScreenView: View {
    @ObservedObject var cardModel: CardModel
    @Binding var showControlPanel: Bool

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
            }
        }
    }
}

// 第二屏视图：全屏渐变色（支持扭曲效果）
struct SecondScreenView: View {
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
                    hueRotation += 1.67
                    if hueRotation >= 360 {
                        hueRotation -= 360
                    }
                }
            }

            // 底部文字（可拖动）
            VStack {
                Spacer()
                Text("指尖的力量")
                    .font(.custom("STSongti-SC-Regular", size: 32))
                    .foregroundColor(.black)
                    .padding(.bottom, 50)
            }
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

// 预览
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
