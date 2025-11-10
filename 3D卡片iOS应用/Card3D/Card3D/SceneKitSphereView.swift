import SwiftUI
import SceneKit

// SceneKit 3D 球体视图
struct SceneKitSphereView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack {
                Spacer()

                SphereSceneView()
                    .frame(width: 400, height: 400)

                Spacer()
            }
        }
    }
}

// SceneKit 场景视图
struct SphereSceneView: UIViewRepresentable {
    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.backgroundColor = .black
        scnView.allowsCameraControl = true
        scnView.autoenablesDefaultLighting = false
        scnView.antialiasingMode = .multisampling4X

        // 创建场景
        let scene = SCNScene()
        scnView.scene = scene

        // 创建球体
        let sphere = SCNSphere(radius: 1.8)
        sphere.segmentCount = 128

        // 创建渐变材质效果
        let material = SCNMaterial()

        // 使用渐变图片作为纹理
        material.diffuse.contents = createGradientTexture()
        material.specular.contents = UIColor.white
        material.specular.intensity = 0.3
        material.shininess = 100
        material.emission.contents = createGradientTexture()
        material.emission.intensity = 0.2
        material.transparency = 0.95
        material.lightingModel = .physicallyBased
        material.metalness.contents = 0.3
        material.roughness.contents = 0.2

        sphere.materials = [material]

        // 创建球体节点
        let sphereNode = SCNNode(geometry: sphere)
        scene.rootNode.addChildNode(sphereNode)

        // 添加多彩灯光
        let ambientLight = SCNLight()
        ambientLight.type = .ambient
        ambientLight.color = UIColor(white: 0.4, alpha: 1.0)
        let ambientNode = SCNNode()
        ambientNode.light = ambientLight
        scene.rootNode.addChildNode(ambientNode)

        // 黄色点光源
        let yellowLight = SCNLight()
        yellowLight.type = .omni
        yellowLight.color = UIColor(red: 1.0, green: 0.96, blue: 0.55, alpha: 1.0) // #FFF68D
        yellowLight.intensity = 800
        yellowLight.attenuationStartDistance = 3
        yellowLight.attenuationEndDistance = 10
        let yellowNode = SCNNode()
        yellowNode.light = yellowLight
        yellowNode.position = SCNVector3(3, 3, 3)
        scene.rootNode.addChildNode(yellowNode)

        // 蓝色点光源
        let blueLight = SCNLight()
        blueLight.type = .omni
        blueLight.color = UIColor(red: 0.22, green: 0.47, blue: 0.82, alpha: 1.0) // #3878D2
        blueLight.intensity = 600
        blueLight.attenuationStartDistance = 3
        blueLight.attenuationEndDistance = 10
        let blueNode = SCNNode()
        blueNode.light = blueLight
        blueNode.position = SCNVector3(-3, -3, 3)
        scene.rootNode.addChildNode(blueNode)

        // 方向光
        let directionalLight = SCNLight()
        directionalLight.type = .directional
        directionalLight.color = UIColor.white
        directionalLight.intensity = 300
        let lightNode = SCNNode()
        lightNode.light = directionalLight
        lightNode.position = SCNVector3(-5, 5, 5)
        lightNode.look(at: SCNVector3(0, 0, 0))
        scene.rootNode.addChildNode(lightNode)

        // 摄像机
        let camera = SCNCamera()
        camera.fieldOfView = 75
        let cameraNode = SCNNode()
        cameraNode.camera = camera
        cameraNode.position = SCNVector3(0, 0, 5)
        scene.rootNode.addChildNode(cameraNode)

        // 添加旋转动画
        let rotation = CABasicAnimation(keyPath: "rotation")
        rotation.toValue = NSValue(scnVector4: SCNVector4(0, 1, 0, Float.pi * 2))
        rotation.duration = 20
        rotation.repeatCount = .infinity
        sphereNode.addAnimation(rotation, forKey: "rotation")

        // 添加浮动动画
        let floatAnimation = CABasicAnimation(keyPath: "position.y")
        floatAnimation.fromValue = -0.1
        floatAnimation.toValue = 0.1
        floatAnimation.duration = 3
        floatAnimation.autoreverses = true
        floatAnimation.repeatCount = .infinity
        floatAnimation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        sphereNode.addAnimation(floatAnimation, forKey: "float")

        // 添加缩放动画
        let scaleAnimation = CABasicAnimation(keyPath: "scale")
        scaleAnimation.fromValue = NSValue(scnVector3: SCNVector3(1.0, 1.0, 1.0))
        scaleAnimation.toValue = NSValue(scnVector3: SCNVector3(1.02, 1.02, 1.02))
        scaleAnimation.duration = 2
        scaleAnimation.autoreverses = true
        scaleAnimation.repeatCount = .infinity
        scaleAnimation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        sphereNode.addAnimation(scaleAnimation, forKey: "scale")

        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {
        // 不需要更新
    }

    // 创建黄蓝渐变纹理
    func createGradientTexture() -> UIImage {
        let size = CGSize(width: 512, height: 512)
        let renderer = UIGraphicsImageRenderer(size: size)

        return renderer.image { context in
            let colors = [
                UIColor(red: 1.0, green: 0.96, blue: 0.55, alpha: 1.0).cgColor,   // #FFF68D 黄色
                UIColor(red: 0.22, green: 0.47, blue: 0.82, alpha: 1.0).cgColor  // #3878D2 蓝色
            ]

            let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: colors as CFArray,
                locations: [0.0, 1.0]
            )!

            context.cgContext.drawRadialGradient(
                gradient,
                startCenter: CGPoint(x: size.width * 0.3, y: size.height * 0.3),
                startRadius: 0,
                endCenter: CGPoint(x: size.width * 0.5, y: size.height * 0.5),
                endRadius: size.width * 0.7,
                options: [.drawsAfterEndLocation]
            )
        }
    }
}

struct SceneKitSphereView_Previews: PreviewProvider {
    static var previews: some View {
        SceneKitSphereView()
    }
}
