import SpriteKit
import CoreMotion

class GlassBallsScene: SKScene {
    private var balls: [SKShapeNode] = []
    private let ballCount = 8
    private let ballRadius: CGFloat = 40
    private let motionManager = CMMotionManager()

    override func didMove(to view: SKView) {
        // 设置黑色背景
        backgroundColor = .black

        // 配置物理世界
        physicsBody = SKPhysicsBody(edgeLoopFrom: frame)
        physicsWorld.gravity = CGVector(dx: 0, dy: -9.8)

        // 创建8个玻璃球
        createGlassBalls()

        // 启动陀螺仪
        startMotionUpdates()
    }

    private func createGlassBalls() {
        for _ in 0..<ballCount {
            let ball = createGlassBall()

            // 随机初始位置
            let randomX = CGFloat.random(in: ballRadius...(size.width - ballRadius))
            let randomY = CGFloat.random(in: size.height/2...(size.height - ballRadius))
            ball.position = CGPoint(x: randomX, y: randomY)

            balls.append(ball)
            addChild(ball)
        }
    }

    private func createGlassBall() -> SKShapeNode {
        let ball = SKShapeNode(circleOfRadius: ballRadius)

        // 创建玻璃质感渐变
        let gradientTexture = createGlassTexture()
        ball.fillTexture = gradientTexture
        ball.fillColor = .white

        // 添加边框增强玻璃效果
        ball.strokeColor = UIColor(white: 1.0, alpha: 0.3)
        ball.lineWidth = 2
        ball.glowWidth = 8

        // 配置物理属性
        ball.physicsBody = SKPhysicsBody(circleOfRadius: ballRadius)
        ball.physicsBody?.restitution = 0.8  // 反弹系数
        ball.physicsBody?.friction = 0.2     // 摩擦系数
        ball.physicsBody?.linearDamping = 0.1 // 线性阻尼
        ball.physicsBody?.angularDamping = 0.1 // 角度阻尼
        ball.physicsBody?.allowsRotation = true
        ball.physicsBody?.affectedByGravity = true

        // 添加玻璃质感的内部高光
        addGlassHighlight(to: ball)

        return ball
    }

    private func createGlassTexture() -> SKTexture {
        let size = CGSize(width: ballRadius * 2, height: ballRadius * 2)
        let renderer = UIGraphicsImageRenderer(size: size)

        let image = renderer.image { context in
            let ctx = context.cgContext

            // 创建径向渐变
            let colors = [
                UIColor(white: 1.0, alpha: 0.4).cgColor,
                UIColor(white: 0.9, alpha: 0.3).cgColor,
                UIColor(white: 0.7, alpha: 0.2).cgColor,
                UIColor(white: 0.5, alpha: 0.15).cgColor
            ] as CFArray

            let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: colors,
                locations: [0.0, 0.3, 0.7, 1.0]
            )!

            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            ctx.drawRadialGradient(
                gradient,
                startCenter: center,
                startRadius: 0,
                endCenter: center,
                endRadius: ballRadius,
                options: []
            )
        }

        return SKTexture(image: image)
    }

    private func addGlassHighlight(to ball: SKShapeNode) {
        // 添加高光效果
        let highlight = SKShapeNode(circleOfRadius: ballRadius * 0.3)
        highlight.position = CGPoint(x: -ballRadius * 0.3, y: ballRadius * 0.3)
        highlight.fillColor = UIColor(white: 1.0, alpha: 0.6)
        highlight.strokeColor = .clear
        highlight.zPosition = 1
        highlight.blendMode = .alpha

        ball.addChild(highlight)

        // 添加次高光
        let secondaryHighlight = SKShapeNode(circleOfRadius: ballRadius * 0.15)
        secondaryHighlight.position = CGPoint(x: ballRadius * 0.4, y: -ballRadius * 0.4)
        secondaryHighlight.fillColor = UIColor(white: 1.0, alpha: 0.3)
        secondaryHighlight.strokeColor = .clear
        secondaryHighlight.zPosition = 1

        ball.addChild(secondaryHighlight)
    }

    private func startMotionUpdates() {
        guard motionManager.isDeviceMotionAvailable else {
            print("设备不支持陀螺仪")
            return
        }

        motionManager.deviceMotionUpdateInterval = 1.0 / 60.0
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            guard let self = self, let motion = motion else { return }

            // 根据设备旋转调整重力方向
            let gravity = motion.gravity
            let gravityScale: Double = 9.8

            self.physicsWorld.gravity = CGVector(
                dx: gravity.x * gravityScale,
                dy: gravity.y * gravityScale
            )
        }
    }

    deinit {
        motionManager.stopDeviceMotionUpdates()
    }

    // 添加触摸交互（可选）
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)

        // 检测触摸的球
        let touchedNodes = nodes(at: location)
        for node in touchedNodes {
            if let ball = node as? SKShapeNode, balls.contains(ball) {
                // 给球一个冲力
                let impulse = CGVector(dx: CGFloat.random(in: -50...50),
                                      dy: CGFloat.random(in: 50...150))
                ball.physicsBody?.applyImpulse(impulse)
            }
        }
    }
}
