import SwiftUI
import CoreMotion

// 3D卡片视图
struct Card3DView: View {
    @ObservedObject var cardModel: CardModel
    @GestureState private var dragOffset = CGSize.zero

    var body: some View {
        ZStack {
            // 卡片主体 - 紫色到绿色渐变背景
            RoundedRectangle(cornerRadius: cardModel.borderRadius)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.65, green: 0.55, blue: 0.80),  // #a68ccc 浅紫
                            Color(red: 0.72, green: 0.78, blue: 0.72),  // #b7c7b7 紫绿过渡
                            Color(red: 0.75, green: 0.88, blue: 0.80)   // #bfe0cc 明亮浅绿
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: cardModel.cardWidth, height: cardModel.cardHeight)
                .shadow(color: Color(red: 0.65, green: 0.65, blue: 0.75).opacity(cardModel.shadowOpacity), radius: cardModel.shadowSize / 4, x: 0, y: 10)
                .overlay(
                    // 内阴影效果模拟金属质感
                    RoundedRectangle(cornerRadius: cardModel.borderRadius)
                        .stroke(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.2),
                                    Color.clear,
                                    Color.black.opacity(0.15)
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            lineWidth: 2
                        )
                )

            // 动态光束效果 - 从左上角扫过
            RoundedRectangle(cornerRadius: cardModel.borderRadius)
                .fill(
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: Color.clear, location: 0),
                            .init(color: Color.clear, location: cardModel.lightPosition - 0.2),
                            .init(color: Color.white.opacity(0.5), location: cardModel.lightPosition - 0.08),
                            .init(color: Color.white.opacity(0.75), location: cardModel.lightPosition),
                            .init(color: Color.white.opacity(0.5), location: cardModel.lightPosition + 0.08),
                            .init(color: Color.clear, location: cardModel.lightPosition + 0.2),
                            .init(color: Color.clear, location: 1)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: cardModel.cardWidth, height: cardModel.cardHeight)
                .opacity(cardModel.lightIntensity)
                .blendMode(.overlay)
                .animation(.easeInOut(duration: 0.3), value: cardModel.lightIntensity)

            // 卡片内容
            VStack(alignment: .leading, spacing: 8) {
                Text("Brian")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)

                Text("Verified since August 2008")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.9))

                Spacer()

                Text("Trust is the cornerstone of Airbnb's community, and identity verification is part of how we build it.")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.95))
                    .lineLimit(3)
                    .frame(maxWidth: 220, alignment: .leading)
            }
            .padding(30)
            .frame(width: cardModel.cardWidth, height: cardModel.cardHeight, alignment: .topLeading)

            // 右上角贴纸区域
            VStack {
                HStack {
                    Spacer()

                    ZStack {
                        // 贴纸背景
                        Circle()
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 70, height: 70)
                            .overlay(
                                Circle()
                                    .stroke(Color.white.opacity(0.3), lineWidth: 2)
                            )

                        // 贴纸图标 - 使用SF Symbol（内置图标）
                        Image(systemName: "star.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)

                        // 如果要使用自定义图片，先在Assets中添加图片，然后取消下面的注释，注释掉上面的Image(systemName)
                        // Image("sticker")  // 替换成你在Assets中的图片名称
                        //     .resizable()
                        //     .scaledToFit()
                        //     .frame(width: 50, height: 50)
                    }
                    .padding(.top, 20)
                    .padding(.trailing, 20)
                }
                Spacer()
            }
            .frame(width: cardModel.cardWidth, height: cardModel.cardHeight)
        }
        .rotation3DEffect(
            .degrees(cardModel.rotationY),
            axis: (x: 0, y: 1, z: 0)
        )
        .rotation3DEffect(
            .degrees(cardModel.rotationX),
            axis: (x: 1, y: 0, z: 0)
        )
        .gesture(
            DragGesture()
                .updating($dragOffset) { value, state, _ in
                    state = value.translation
                }
                .onChanged { value in
                    cardModel.isAutoRotating = false
                    let deltaX = value.translation.width - value.predictedEndTranslation.width / 10
                    let deltaY = value.translation.height - value.predictedEndTranslation.height / 10

                    cardModel.rotationY = min(max(deltaX * cardModel.dragSensitivity, -cardModel.angleLimit), cardModel.angleLimit)
                    cardModel.rotationX = min(max(-deltaY * cardModel.dragSensitivity, -cardModel.angleLimit), cardModel.angleLimit)
                }
                .onEnded { _ in
                    // 拖动结束后不立即重置，保持当前角度
                }
        )
        .onAppear {
            cardModel.startAutoRotation()
        }
    }
}

// 卡片数据模型
class CardModel: ObservableObject {
    // 样式参数
    @Published var cardWidth: CGFloat = 340
    @Published var cardHeight: CGFloat = 210
    @Published var borderRadius: CGFloat = 20
    @Published var shadowSize: CGFloat = 50
    @Published var shadowOpacity: Double = 0.3

    // 动画参数
    @Published var rotateSpeed: Double = 0.5
    @Published var rotateAmplitudeY: Double = 20
    @Published var rotateAmplitudeX: Double = 10
    @Published var smoothSpeed: Double = 0.1

    // 交互参数
    @Published var hoverAngle: Double = 25
    @Published var dragSensitivity: Double = 0.5
    @Published var angleLimit: Double = 45

    // 旋转状态
    @Published var rotationX: Double = 0
    @Published var rotationY: Double = 0
    @Published var isAutoRotating: Bool = true

    // 光线折射效果参数
    @Published var lightAngle: Double = 125
    @Published var lightIntensity: Double = 0.0  // 默认无光线
    @Published var lightPosition: Double = 0.5   // 光束位置 (0-1)

    // 陀螺仪相关
    @Published var gyroEnabled: Bool = false
    private let motionManager = CMMotionManager()
    private var initialAttitude: CMAttitude?

    private var timer: Timer?
    private var angle: Double = 0

    func startAutoRotation() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { [weak self] _ in
            guard let self = self, self.isAutoRotating else { return }

            self.angle += self.rotateSpeed * 0.01

            let targetX = sin(self.angle) * self.rotateAmplitudeX
            let targetY = cos(self.angle) * self.rotateAmplitudeY

            // 平滑插值
            self.rotationX += (targetX - self.rotationX) * self.smoothSpeed
            self.rotationY += (targetY - self.rotationY) * self.smoothSpeed

            // 更新光线折射效果
            self.updateLightRefraction()
        }
    }

    // 更新光线折射效果
    func updateLightRefraction() {
        // 根据卡片旋转角度计算光束位置 (从左上角扫向右下角)
        // rotationY影响横向移动，rotationX影响纵向移动
        let normalizedX = (rotationY + angleLimit) / (angleLimit * 2)  // 0-1
        let normalizedY = (rotationX + angleLimit) / (angleLimit * 2)  // 0-1

        // 综合横向和纵向位置，计算光束沿对角线的位置
        lightPosition = (normalizedX + normalizedY) / 2.0

        // 限制在0-1范围内
        lightPosition = max(0, min(1, lightPosition))

        // 根据旋转幅度计算光线强度 - 使用平滑过渡
        let totalRotation = abs(rotationX) + abs(rotationY)

        // 渐隐渐现效果：使用平滑的曲线，适中的强度
        if totalRotation < 2 {
            // 完全静止：无光线
            lightIntensity = 0
        } else if totalRotation < 5 {
            // 渐现阶段：从0渐变到0.6
            let fadeIn = (totalRotation - 2) / 3  // 0-1
            lightIntensity = fadeIn * 0.6
        } else {
            // 完全显示阶段：从0.6渐变到0.9
            let intensity = min(totalRotation - 5, 28) / 28  // 0-1
            lightIntensity = 0.6 + intensity * 0.3
        }
    }

    func stopAutoRotation() {
        isAutoRotating = false
    }

    // 启用陀螺仪
    func enableGyro() {
        guard motionManager.isDeviceMotionAvailable else {
            print("设备不支持陀螺仪")
            return
        }

        gyroEnabled = true
        isAutoRotating = false
        initialAttitude = nil

        motionManager.deviceMotionUpdateInterval = 0.016  // 60fps
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] (motion, error) in
            guard let self = self, let motion = motion else { return }

            // 第一次获取初始姿态
            if self.initialAttitude == nil {
                self.initialAttitude = motion.attitude
                return
            }

            // 计算相对于初始姿态的旋转
            if let initial = self.initialAttitude {
                let currentAttitude = motion.attitude
                currentAttitude.multiply(byInverseOf: initial)

                // 将设备姿态转换为卡片旋转角度
                // pitch (俯仰) 对应 rotationX
                // roll (横滚) 对应 rotationY
                let pitchDegrees = currentAttitude.pitch * 180 / .pi
                let rollDegrees = currentAttitude.roll * 180 / .pi

                // 限制角度范围并应用平滑过渡
                let targetX = max(-self.angleLimit, min(self.angleLimit, -pitchDegrees))
                let targetY = max(-self.angleLimit, min(self.angleLimit, rollDegrees))

                self.rotationX += (targetX - self.rotationX) * self.smoothSpeed
                self.rotationY += (targetY - self.rotationY) * self.smoothSpeed

                // 更新光线折射效果
                self.updateLightRefraction()
            }
        }
    }

    // 禁用陀螺仪
    func disableGyro() {
        gyroEnabled = false
        motionManager.stopDeviceMotionUpdates()
        initialAttitude = nil
        isAutoRotating = true
    }

    func reset() {
        cardWidth = 340
        cardHeight = 210
        borderRadius = 20
        shadowSize = 50
        shadowOpacity = 0.3
        rotateSpeed = 0.5
        rotateAmplitudeY = 20
        rotateAmplitudeX = 10
        smoothSpeed = 0.1
        hoverAngle = 25
        dragSensitivity = 0.5
        angleLimit = 45
        rotationX = 0
        rotationY = 0
        angle = 0
        isAutoRotating = true
        disableGyro()
    }

    func saveSettings() {
        UserDefaults.standard.set(cardWidth, forKey: "cardWidth")
        UserDefaults.standard.set(cardHeight, forKey: "cardHeight")
        UserDefaults.standard.set(borderRadius, forKey: "borderRadius")
        UserDefaults.standard.set(shadowSize, forKey: "shadowSize")
        UserDefaults.standard.set(shadowOpacity, forKey: "shadowOpacity")
        UserDefaults.standard.set(rotateSpeed, forKey: "rotateSpeed")
        UserDefaults.standard.set(rotateAmplitudeY, forKey: "rotateAmplitudeY")
        UserDefaults.standard.set(rotateAmplitudeX, forKey: "rotateAmplitudeX")
        UserDefaults.standard.set(smoothSpeed, forKey: "smoothSpeed")
        UserDefaults.standard.set(dragSensitivity, forKey: "dragSensitivity")
        UserDefaults.standard.set(angleLimit, forKey: "angleLimit")
    }

    func loadSettings() {
        if UserDefaults.standard.object(forKey: "cardWidth") != nil {
            cardWidth = CGFloat(UserDefaults.standard.double(forKey: "cardWidth"))
            cardHeight = CGFloat(UserDefaults.standard.double(forKey: "cardHeight"))
            borderRadius = CGFloat(UserDefaults.standard.double(forKey: "borderRadius"))
            shadowSize = CGFloat(UserDefaults.standard.double(forKey: "shadowSize"))
            let savedShadowOpacity = UserDefaults.standard.double(forKey: "shadowOpacity")
            if savedShadowOpacity > 0 {
                shadowOpacity = savedShadowOpacity
            }
            rotateSpeed = UserDefaults.standard.double(forKey: "rotateSpeed")
            rotateAmplitudeY = UserDefaults.standard.double(forKey: "rotateAmplitudeY")
            rotateAmplitudeX = UserDefaults.standard.double(forKey: "rotateAmplitudeX")
            smoothSpeed = UserDefaults.standard.double(forKey: "smoothSpeed")
            dragSensitivity = UserDefaults.standard.double(forKey: "dragSensitivity")
            angleLimit = UserDefaults.standard.double(forKey: "angleLimit")
        }
    }
}
