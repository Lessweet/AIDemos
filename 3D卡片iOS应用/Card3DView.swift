import SwiftUI
import CoreMotion

// 3D卡片视图
struct Card3DView: View {
    @ObservedObject var cardModel: CardModel
    @GestureState private var dragOffset = CGSize.zero

    var body: some View {
        ZStack {
            // 卡片主体 - 多层渐变叠加，创造流动效果
            RoundedRectangle(cornerRadius: cardModel.borderRadius)
                .fill(Color(red: 0.96, green: 0.96, blue: 0.97))
                .frame(width: cardModel.cardWidth, height: cardModel.cardHeight)
                .overlay(
                    // 多层径向渐变叠加 - 限制在卡片内
                    ZStack {
                        // 蓝色渐变
                        EllipticalGradient(
                            colors: [Color(red: 0.24, green: 0.71, blue: 1.0), Color.clear],
                            center: UnitPoint(x: 0.8, y: 0.2),
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.45
                        )

                        // 粉色渐变
                        EllipticalGradient(
                            colors: [Color(red: 1.0, green: 0.27, blue: 0.71), Color.clear],
                            center: UnitPoint(x: 0.25, y: 0.8),
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.4
                        )

                        // 紫色渐变
                        EllipticalGradient(
                            colors: [Color(red: 0.51, green: 0.31, blue: 1.0), Color.clear],
                            center: UnitPoint(x: 0.75, y: 0.75),
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.45
                        )

                        // 旋转渐变层 - 增加动感
                        AngularGradient(
                            colors: [
                                Color(red: 1.0, green: 0.59, blue: 0.39).opacity(0.3),
                                Color(red: 0.39, green: 0.78, blue: 1.0).opacity(0.3),
                                Color(red: 1.0, green: 0.39, blue: 0.78).opacity(0.3),
                                Color(red: 0.59, green: 0.39, blue: 1.0).opacity(0.3),
                                Color(red: 1.0, green: 0.59, blue: 0.39).opacity(0.3)
                            ],
                            center: .center,
                            angle: .degrees(cardModel.gradientRotation)
                        )
                    }
                    .blur(radius: 40)
                    .hueRotation(.degrees(cardModel.hueRotation))
                    .frame(width: cardModel.cardWidth, height: cardModel.cardHeight)
                    .clipShape(RoundedRectangle(cornerRadius: cardModel.borderRadius))
                )
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

            // 动态光束效果 - 从左上角扫过（摆动时出现，静止时消失）
            RoundedRectangle(cornerRadius: cardModel.borderRadius)
                .fill(
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: Color.clear, location: 0),
                            .init(color: Color.clear, location: cardModel.lightPosition - 0.35),
                            .init(color: Color.white.opacity(0.1), location: cardModel.lightPosition - 0.25),
                            .init(color: Color.white.opacity(0.3), location: cardModel.lightPosition - 0.15),
                            .init(color: Color.white.opacity(0.5), location: cardModel.lightPosition - 0.08),
                            .init(color: Color.white.opacity(0.6), location: cardModel.lightPosition),
                            .init(color: Color.white.opacity(0.5), location: cardModel.lightPosition + 0.08),
                            .init(color: Color.white.opacity(0.3), location: cardModel.lightPosition + 0.15),
                            .init(color: Color.white.opacity(0.1), location: cardModel.lightPosition + 0.25),
                            .init(color: Color.clear, location: cardModel.lightPosition + 0.35),
                            .init(color: Color.clear, location: 1)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: cardModel.cardWidth, height: cardModel.cardHeight)
                .opacity(cardModel.lightIntensity)
                .blendMode(.overlay)

            // 卡片内容
            VStack(alignment: .leading, spacing: 8) {
                Spacer()

                Text("ID Card")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)

                Text("Verified Member")
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.9))
            }
            .padding(30)
            .frame(width: cardModel.cardWidth, height: cardModel.cardHeight, alignment: .bottomLeading)

            // 右下角贴纸区域
            VStack {
                Spacer()
                HStack {
                    Spacer()

                    ZStack {
                        // 贴纸背景
                        Circle()
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 50, height: 50)
                            .overlay(
                                Circle()
                                    .stroke(Color.white.opacity(0.3), lineWidth: 1.5)
                            )

                        // 贴纸图标 - 使用SF Symbol（内置图标）
                        Image(systemName: "star.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white)

                        // 如果要使用自定义图片，先在Assets中添加图片，然后取消下面的注释，注释掉上面的Image(systemName)
                        // Image("sticker")  // 替换成你在Assets中的图片名称
                        //     .resizable()
                        //     .scaledToFit()
                        //     .frame(width: 50, height: 50)
                    }
                    .padding(.bottom, 30)
                    .padding(.trailing, 30)
                }
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
    @Published var angleLimit: Double = 8

    // 旋转状态
    @Published var rotationX: Double = 0
    @Published var rotationY: Double = 0
    @Published var isAutoRotating: Bool = true

    // 光线折射效果参数
    @Published var lightAngle: Double = 125
    @Published var lightIntensity: Double = 0.0  // 静止时不可见，摆动时出现
    @Published var targetLightIntensity: Double = 0.0  // 目标光线强度
    @Published var lightPosition: Double = 0.5   // 光束位置 (0-1)

    // 渐变流动效果参数
    @Published var hueRotation: Double = 0       // 色相旋转角度 (0-360)
    @Published var gradientRotation: Double = 0  // 锥形渐变旋转角度

    // 陀螺仪相关
    @Published var gyroEnabled: Bool = true
    @Published var gyroSensitivity: Double = 10.0
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

            // 更新渐变流动效果 - 持续旋转色相和渐变角度
            self.hueRotation += 1.0  // 每帧增加1.0度 (更快)
            if self.hueRotation >= 360 {
                self.hueRotation -= 360
            }

            self.gradientRotation += 0.5  // 渐变旋转速度 (更快)
            if self.gradientRotation >= 360 {
                self.gradientRotation -= 360
            }
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

        // 根据旋转幅度计算目标光线强度 - 静止时消失，摆动时出现
        let totalRotation = abs(rotationX) + abs(rotationY)

        // 使用平滑的曲线函数，根据旋转角度计算目标光线强度
        // 旋转角度越大，光线越强（降低阈值，让光线更容易出现）
        if totalRotation < 0.3 {
            // 几乎静止：光线消失
            targetLightIntensity = 0.0
        } else if totalRotation < 2.0 {
            // 轻微摆动：光线快速出现
            let factor = (totalRotation - 0.3) / 1.7  // 0-1
            targetLightIntensity = 0.3 + factor * 0.3  // 0.3 ~ 0.6
        } else {
            // 明显摆动：光线完全显现并增强
            let factor = min((totalRotation - 2.0) / 10.0, 1.0)  // 0-1
            targetLightIntensity = 0.6 + factor * 0.3  // 0.6 ~ 0.9
        }

        // 平滑插值到目标强度
        let smoothFactor = 0.15  // 平滑系数，控制淡入淡出速度
        lightIntensity += (targetLightIntensity - lightIntensity) * smoothFactor
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

                // 应用灵敏度系数（以默认值10为基准进行归一化）
                let sensitivityFactor = self.gyroSensitivity / 10.0

                // 限制角度范围并应用平滑过渡
                let targetX = max(-self.angleLimit, min(self.angleLimit, -pitchDegrees * sensitivityFactor))
                let targetY = max(-self.angleLimit, min(self.angleLimit, rollDegrees * sensitivityFactor))

                self.rotationX += (targetX - self.rotationX) * self.smoothSpeed
                self.rotationY += (targetY - self.rotationY) * self.smoothSpeed

                // 更新光线折射效果
                self.updateLightRefraction()

                // 更新渐变流动效果
                self.hueRotation += 1.0
                if self.hueRotation >= 360 {
                    self.hueRotation -= 360
                }
                self.gradientRotation += 0.5
                if self.gradientRotation >= 360 {
                    self.gradientRotation -= 360
                }
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

    // 重新校准陀螺仪
    func recalibrateGyroscope() {
        initialAttitude = nil
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
