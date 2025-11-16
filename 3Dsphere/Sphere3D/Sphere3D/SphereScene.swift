import SceneKit
import UIKit

class SphereScene {
    let scene: SCNScene
    var sphereNode: SCNNode
    private var autoRotationEnabled = true

    init() {
        // 创建场景
        scene = SCNScene()

        // 先初始化 sphereNode 为临时值
        sphereNode = SCNNode()

        // 设置背景颜色
        scene.background.contents = UIColor.black

        // 创建球体节点并替换
        sphereNode = Self.createSphere()
        scene.rootNode.addChildNode(sphereNode)

        // 添加发光粒子
        setupParticles()

        // 添加光照
        setupLighting()

        // 添加相机
        setupCamera()

        // 启动自动旋转动画
        startAutoRotation()
    }

    // MARK: - 创建球体

    private static func createSphere() -> SCNNode {
        // 创建球体几何体（半径1.0，分段数越高越平滑）
        let geometry = SCNSphere(radius: 1.0)

        // 设置高分段数，确保边缘非常平滑和波浪细腻
        geometry.segmentCount = 200  // 增加分段数（默认48，现在200）

        // 设置材质 - 流动彩色渐变效果
        let material = createGradientMaterial()

        // 添加波浪变形着色器
        material.shaderModifiers = [
            .geometry: """
            // 波浪变形参数
            uniform float waveIntensity;  // 波浪强度
            uniform float waveFrequency;  // 波浪频率
            uniform float waveTime;       // 波浪动画时间

            #pragma body
            // 获取顶点的世界位置
            vec3 pos = _geometry.position.xyz;

            // 计算到球心的距离（归一化）
            float dist = length(pos);

            // 基于位置生成波浪（使用6个正弦波叠加，产生更密集的波浪）
            // 降低波浪振幅，让边缘波浪更温和
            float wave1 = sin(pos.x * waveFrequency + waveTime) * 0.15;
            float wave2 = sin(pos.y * waveFrequency * 1.5 + waveTime * 1.2) * 0.12;
            float wave3 = sin(pos.z * waveFrequency * 0.8 + waveTime * 0.8) * 0.13;
            float wave4 = sin(pos.x * waveFrequency * 2.0 + waveTime * 1.5) * 0.1;
            float wave5 = sin(pos.y * waveFrequency * 2.5 + waveTime * 0.9) * 0.08;
            float wave6 = sin(pos.z * waveFrequency * 1.8 + waveTime * 1.1) * 0.09;

            // 组合波浪效果（更多波浪叠加）
            float waveOffset = (wave1 + wave2 + wave3 + wave4 + wave5 + wave6) * waveIntensity;

            // 沿法线方向偏移顶点（产生边缘波浪）
            vec3 normal = normalize(pos);
            _geometry.position.xyz += normal * waveOffset;
            """
        ]

        geometry.materials = [material]

        let node = SCNNode(geometry: geometry)
        node.position = SCNVector3(x: 0, y: 0, z: 0)

        // 初始化波浪参数为0（球体开始时是平滑的）
        material.setValue(0.0, forKey: "waveIntensity")
        material.setValue(30.0, forKey: "waveFrequency")
        material.setValue(0.0, forKey: "waveTime")

        return node
    }

    // MARK: - 创建流动渐变材质

    private static func createGradientMaterial() -> SCNMaterial {
        let material = SCNMaterial()

        // 创建彩虹渐变纹理
        let gradientTexture = createRainbowGradientTexture()

        // 基础颜色使用渐变纹理
        material.diffuse.contents = gradientTexture
        material.diffuse.wrapS = .repeat  // 水平方向重复
        material.diffuse.wrapT = .repeat  // 垂直方向重复

        // 高光（更柔和）
        material.specular.contents = UIColor(white: 0.3, alpha: 1.0)  // 降低亮度，从白色改为灰白色
        material.shininess = 0.1  // 降低光泽度，高光更分散柔和

        // 不透明（完全不透明）
        material.transparency = 1.0

        // 自发光（彩色渐变）
        material.emission.contents = gradientTexture
        material.emission.intensity = 0.4

        // 反射
        material.reflective.contents = UIColor(white: 0.3, alpha: 0.5)

        // 双面渲染
        material.isDoubleSided = true

        // 使用物理光照模型，确保球体边缘平滑
        material.lightingModel = .physicallyBased

        // 启用抗锯齿和平滑边缘
        material.fillMode = .fill

        return material
    }

    // 创建彩虹渐变纹理
    private static func createRainbowGradientTexture() -> UIImage {
        let width: CGFloat = 512
        let height: CGFloat = 512
        let size = CGSize(width: width, height: height)

        let renderer = UIGraphicsImageRenderer(size: size)

        let image = renderer.image { context in
            let ctx = context.cgContext

            // 定义黑色+绿色渐变（增加更多过渡色）
            let colors = [
                UIColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 1.0).cgColor,      // 纯黑色
                UIColor(red: 0.0, green: 0.1, blue: 0.0, alpha: 1.0).cgColor,      // 极深绿
                UIColor(red: 0.0, green: 0.2, blue: 0.0, alpha: 1.0).cgColor,      // 很深绿
                UIColor(red: 0.0, green: 0.35, blue: 0.0, alpha: 1.0).cgColor,     // 深绿
                UIColor(red: 0.0, green: 0.5, blue: 0.0, alpha: 1.0).cgColor,      // 中深绿
                UIColor(red: 0.0, green: 0.7, blue: 0.0, alpha: 1.0).cgColor,      // 中绿
                UIColor(red: 0.0, green: 0.85, blue: 0.0, alpha: 1.0).cgColor,     // 亮绿
                UIColor(red: 0.0, green: 1.0, blue: 0.0, alpha: 1.0).cgColor,      // 最亮绿
                UIColor(red: 0.0, green: 0.85, blue: 0.0, alpha: 1.0).cgColor,     // 亮绿
                UIColor(red: 0.0, green: 0.7, blue: 0.0, alpha: 1.0).cgColor,      // 中绿
                UIColor(red: 0.0, green: 0.5, blue: 0.0, alpha: 1.0).cgColor,      // 中深绿
                UIColor(red: 0.0, green: 0.35, blue: 0.0, alpha: 1.0).cgColor,     // 深绿
                UIColor(red: 0.0, green: 0.2, blue: 0.0, alpha: 1.0).cgColor,      // 很深绿
                UIColor(red: 0.0, green: 0.1, blue: 0.0, alpha: 1.0).cgColor,      // 极深绿
                UIColor(red: 0.0, green: 0.0, blue: 0.0, alpha: 1.0).cgColor       // 回到黑色（循环）
            ] as CFArray

            // 创建渐变（均匀分布）
            let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: colors,
                locations: [0.0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.5, 0.58, 0.65, 0.72, 0.79, 0.86, 0.93, 1.0]
            )!

            // 使用垂直方向的线性渐变（从上到下），避免垂直接缝
            ctx.drawLinearGradient(
                gradient,
                start: CGPoint(x: width / 2, y: 0),
                end: CGPoint(x: width / 2, y: height),
                options: [.drawsBeforeStartLocation, .drawsAfterEndLocation]
            )
        }

        return image
    }

    // MARK: - 创建不规则球体

    func createIrregularSphere() -> SCNNode {
        let geometry = createIrregularGeometry()

        // 使用与普通球体相同的渐变材质
        let material = Self.createGradientMaterial()

        geometry.materials = [material]

        let node = SCNNode(geometry: geometry)
        node.position = SCNVector3(x: 0, y: 0, z: 0)

        return node
    }

    // 生成不规则几何体
    private func createIrregularGeometry() -> SCNGeometry {
        var vertices: [SCNVector3] = []
        var indices: [Int32] = []

        let latitudeBands = 40
        let longitudeBands = 40
        let radius: Float = 1.0

        // 生成顶点（使用球面坐标 + 随机扰动）
        for lat in 0...latitudeBands {
            let theta = Float(lat) * .pi / Float(latitudeBands)
            let sinTheta = sin(theta)
            let cosTheta = cos(theta)

            for lon in 0...longitudeBands {
                let phi = Float(lon) * 2 * .pi / Float(longitudeBands)
                let sinPhi = sin(phi)
                let cosPhi = cos(phi)

                // 基础球面坐标
                let x = cosPhi * sinTheta
                let y = cosTheta
                let z = sinPhi * sinTheta

                // 添加轻微随机扰动（制造微妙的不规则效果）
                let randomFactor = Float.random(in: 0.97...1.03)
                let finalRadius = radius * randomFactor

                let vertex = SCNVector3(
                    x * finalRadius,
                    y * finalRadius,
                    z * finalRadius
                )
                vertices.append(vertex)
            }
        }

        // 生成三角形索引
        for lat in 0..<latitudeBands {
            for lon in 0..<longitudeBands {
                let first = lat * (longitudeBands + 1) + lon
                let second = first + longitudeBands + 1

                indices.append(Int32(first))
                indices.append(Int32(second))
                indices.append(Int32(first + 1))

                indices.append(Int32(second))
                indices.append(Int32(second + 1))
                indices.append(Int32(first + 1))
            }
        }

        // 创建几何体源
        let vertexSource = SCNGeometrySource(vertices: vertices)
        let indexData = Data(bytes: indices, count: indices.count * MemoryLayout<Int32>.size)
        let element = SCNGeometryElement(
            data: indexData,
            primitiveType: .triangles,
            primitiveCount: indices.count / 3,
            bytesPerIndex: MemoryLayout<Int32>.size
        )

        return SCNGeometry(sources: [vertexSource], elements: [element])
    }

    // 切换为不规则球体
    func switchToIrregularSphere() {
        let newNode = createIrregularSphere()

        // 保留当前的旋转状态
        newNode.eulerAngles = sphereNode.eulerAngles

        // 替换节点
        scene.rootNode.replaceChildNode(sphereNode, with: newNode)

        // 更新引用（注意：这里不会更新外部引用，需要重新设计）
        // 暂时通过移除旧节点+添加新节点的方式
        sphereNode.removeFromParentNode()
        scene.rootNode.addChildNode(newNode)
    }

    // MARK: - 粒子系统设置

    private func setupParticles() {
        // 创建白色发光粒子
        let whiteParticles = SCNParticleSystem()
        whiteParticles.birthRate = 10  // 降低到每秒10个粒子
        whiteParticles.particleLifeSpan = 2.0  // 粒子生命周期（秒）
        whiteParticles.particleLifeSpanVariation = 0.5
        whiteParticles.particleSize = 0.03  // 粒子大小
        whiteParticles.particleSizeVariation = 0.02

        // 白色发光效果
        whiteParticles.particleColor = UIColor.white
        whiteParticles.particleColorVariation = SCNVector4(0.1, 0.1, 0.1, 0)

        // 发光强度
        whiteParticles.blendMode = .additive  // 加性混合，产生发光效果

        // 粒子速度（向外扩散）
        whiteParticles.emissionDuration = 0
        whiteParticles.spreadingAngle = 180  // 全方向发射
        whiteParticles.particleVelocity = 0.2  // 移动速度
        whiteParticles.particleVelocityVariation = 0.1

        // 粒子从球体表面发射
        whiteParticles.emitterShape = SCNSphere(radius: 1.05)

        // 添加到球体
        sphereNode.addParticleSystem(whiteParticles)

        // 创建绿色发光粒子
        let greenParticles = SCNParticleSystem()
        greenParticles.birthRate = 6  // 降低到每秒6个粒子
        greenParticles.particleLifeSpan = 2.5
        greenParticles.particleLifeSpanVariation = 0.5
        greenParticles.particleSize = 0.04  // 稍微大一点
        greenParticles.particleSizeVariation = 0.02

        // 绿色发光效果
        greenParticles.particleColor = UIColor(red: 0.0, green: 1.0, blue: 0.0, alpha: 1.0)
        greenParticles.particleColorVariation = SCNVector4(0, 0.2, 0, 0)

        // 发光强度
        greenParticles.blendMode = .additive

        // 粒子速度
        greenParticles.emissionDuration = 0
        greenParticles.spreadingAngle = 180
        greenParticles.particleVelocity = 0.15
        greenParticles.particleVelocityVariation = 0.08

        // 粒子从球体表面发射
        greenParticles.emitterShape = SCNSphere(radius: 1.05)

        // 添加到球体
        sphereNode.addParticleSystem(greenParticles)
    }

    // MARK: - 光照设置

    private func setupLighting() {
        // 环境光（整体照明）
        let ambientLight = SCNNode()
        ambientLight.light = SCNLight()
        ambientLight.light!.type = .ambient
        ambientLight.light!.color = UIColor(white: 0.3, alpha: 1.0)
        scene.rootNode.addChildNode(ambientLight)

        // 主光源（从右上方照射）
        let mainLight = SCNNode()
        mainLight.light = SCNLight()
        mainLight.light!.type = .directional
        mainLight.light!.color = UIColor.white
        mainLight.light!.intensity = 1000
        mainLight.position = SCNVector3(x: 5, y: 5, z: 5)
        mainLight.look(at: SCNVector3(0, 0, 0))
        scene.rootNode.addChildNode(mainLight)
    }

    // MARK: - 相机设置

    private func setupCamera() {
        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 0, z: 5)
        cameraNode.look(at: SCNVector3(0, 0, 0))

        // 设置相机视野
        cameraNode.camera?.fieldOfView = 60

        scene.rootNode.addChildNode(cameraNode)
    }

    // MARK: - 自动旋转动画

    private func startAutoRotation() {
        // Y 轴自转（绕竖直轴）
        let rotationY = SCNAction.rotateBy(x: 0, y: CGFloat.pi * 2, z: 0, duration: 8.0)
        let repeatForever = SCNAction.repeatForever(rotationY)
        sphereNode.runAction(repeatForever, forKey: "autoRotation")

        // X 轴轻微摆动（增加动感）
        let tiltUp = SCNAction.rotateBy(x: CGFloat.pi / 8, y: 0, z: 0, duration: 3.0)
        let tiltDown = SCNAction.rotateBy(x: -CGFloat.pi / 8, y: 0, z: 0, duration: 3.0)
        let tiltSequence = SCNAction.sequence([tiltUp, tiltDown])
        let tiltRepeat = SCNAction.repeatForever(tiltSequence)
        sphereNode.runAction(tiltRepeat, forKey: "tiltAnimation")

        // 只在初始化时启动渐变流动（避免重复启动）
        if sphereNode.action(forKey: "gradientFlow") == nil {
            startGradientFlowAnimation()
        }
    }

    // 渐变流动动画（使用 SCNAction 实现无缝循环）
    private func startGradientFlowAnimation() {
        guard let material = sphereNode.geometry?.firstMaterial else { return }

        // 流动速度（每秒移动的距离，1.0 = 一个完整周期）
        let flowSpeed: CGFloat = 0.33  // 约 3 秒完成一次循环

        // 使用基于时间的自定义动作，确保流畅无缝
        let flowAction = SCNAction.customAction(duration: .infinity) { node, elapsedTime in
            // 基于已过时间计算偏移量
            let offset = CGFloat(elapsedTime) * flowSpeed

            // 使用 fmod 实现无缝循环（0.0 到 1.0 之间循环）
            let normalizedOffset = offset.truncatingRemainder(dividingBy: 1.0)

            // 创建平移变换（SceneKit 使用 SCNMatrix4）
            let transform = SCNMatrix4MakeTranslation(0, Float(normalizedOffset), 0)

            // 更新材质的纹理变换
            material.diffuse.contentsTransform = transform
            material.emission.contentsTransform = transform
        }

        // 在球体节点上运行动作
        sphereNode.runAction(flowAction, forKey: "gradientFlow")
    }

    func stopAutoRotation() {
        sphereNode.removeAction(forKey: "autoRotation")
        sphereNode.removeAction(forKey: "tiltAnimation")
        autoRotationEnabled = false
    }

    func resumeAutoRotation() {
        if !autoRotationEnabled {
            startAutoRotation()
            autoRotationEnabled = true
        }
    }

    // 确保渐变流动继续（立即检查并恢复）
    func ensureGradientFlowing() {
        // 如果渐变流动动画不存在，立即重启
        if sphereNode.action(forKey: "gradientFlow") == nil {
            startGradientFlowAnimation()
        }
    }

    // MARK: - 手势控制

    func rotateSphere(byAngle angle: Float, axis: SCNVector3) {
        // 暂停自动旋转
        stopAutoRotation()

        // 使用局部旋转
        sphereNode.localRotate(by: SCNQuaternion(
            x: axis.x * sin(angle / 2),
            y: axis.y * sin(angle / 2),
            z: axis.z * sin(angle / 2),
            w: cos(angle / 2)
        ))
    }

    // 拖动时应用扭曲变形（挤压拉伸效果 + 波浪边缘）
    func applyDragDeformation(velocity: CGVector) {
        // 只移除缩放相关的动画，保留渐变流动
        sphereNode.removeAction(forKey: "restoreShape")

        // 计算变形强度（基于拖动速度，更夸张的系数）
        let speed = sqrt(velocity.dx * velocity.dx + velocity.dy * velocity.dy)
        let deformAmount = min(Float(speed) * 0.01, 1.5) // 限制最大变形150%（非常夸张）

        // 根据拖动方向计算挤压拉伸
        let angle = atan2(Float(velocity.dy), Float(velocity.dx))

        // 水平和垂直方向：拖动方向被极度拉伸，垂直方向被极度挤压
        let stretchX = 1.0 + deformAmount * abs(cos(angle)) * 2.0  // 2倍拉伸
        let stretchY = 1.0 + deformAmount * abs(sin(angle)) * 2.0  // 2倍拉伸
        let squashZ = 1.0 / sqrt(stretchX * stretchY) // 保持体积

        // 应用非均匀缩放（极度 squash and stretch）
        sphereNode.scale = SCNVector3(stretchX, stretchY, squashZ)

        // 应用波浪边缘效果（着色器参数）
        guard let material = sphereNode.geometry?.firstMaterial else { return }

        // 波浪强度：拖动越快，波浪越明显（大幅提升强度）
        let waveIntensity = min(Float(speed) * 0.03, 2.0)  // 最大2.0，速度越快波浪越明显

        // 波浪频率：更低频率产生更大、更稀疏的波浪
        let waveFrequency = 3.0 + Float(speed) * 0.1  // 3-8 Hz，波浪更稀疏更大

        // 设置着色器参数
        material.setValue(waveIntensity, forKey: "waveIntensity")
        material.setValue(waveFrequency, forKey: "waveFrequency")

        // 启动波浪时间动画（如果还没启动）
        if sphereNode.action(forKey: "waveTimeAnimation") == nil {
            startWaveAnimation()
        }
    }

    // 启动波浪时间动画（让波浪持续流动）
    private func startWaveAnimation() {
        guard let material = sphereNode.geometry?.firstMaterial else { return }

        let waveAction = SCNAction.customAction(duration: .infinity) { node, elapsedTime in
            // 持续更新波浪时间，让波浪动起来
            material.setValue(Float(elapsedTime) * 2.0, forKey: "waveTime")
        }

        sphereNode.runAction(waveAction, forKey: "waveTimeAnimation")
    }

    // 停止波浪动画
    private func stopWaveAnimation() {
        sphereNode.removeAction(forKey: "waveTimeAnimation")
    }

    // 恢复球体原形（弹性回弹动画）
    func restoreSphereShape() {
        // 立即确保渐变流动在运行（与回弹同步）
        ensureGradientFlowing()

        // 使用 SCNAction 实现弹性回弹（不影响其他动画）
        let scaleAction = SCNAction.scale(to: 1.0, duration: 0.6)
        scaleAction.timingMode = .easeOut

        // 使用自定义贝塞尔曲线实现弹簧效果
        scaleAction.timingFunction = { time in
            // 弹簧弹跳效果
            let t = time
            return t * t * ((1.7 + 1) * t - 1.7) + 1
        }

        sphereNode.runAction(scaleAction, forKey: "restoreShape")

        // 停止波浪动画
        stopWaveAnimation()

        // 同时恢复波浪效果（平滑过渡到0）
        guard let material = sphereNode.geometry?.firstMaterial else { return }

        // 使用 SCNTransaction 平滑过渡波浪强度
        SCNTransaction.begin()
        SCNTransaction.animationDuration = 0.6
        material.setValue(0.0, forKey: "waveIntensity")
        material.setValue(10.0, forKey: "waveFrequency")
        SCNTransaction.commit()
    }

    func scaleSphere(by scale: Float) {
        let currentScale = sphereNode.scale
        let newScale = SCNVector3(
            currentScale.x * scale,
            currentScale.y * scale,
            currentScale.z * scale
        )

        // 限制缩放范围 0.5x - 3x
        let clampedScale = SCNVector3(
            min(max(newScale.x, 0.5), 3.0),
            min(max(newScale.y, 0.5), 3.0),
            min(max(newScale.z, 0.5), 3.0)
        )

        sphereNode.scale = clampedScale
    }
}
