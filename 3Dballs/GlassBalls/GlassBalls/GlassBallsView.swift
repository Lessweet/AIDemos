import SwiftUI
import SpriteKit

struct GlassBallsView: View {
    @State private var scene: GlassBallsScene

    init() {
        let scene = GlassBallsScene()
        scene.scaleMode = .resizeFill
        _scene = State(initialValue: scene)
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // 黑色背景
                Color.black
                    .ignoresSafeArea()

                // SpriteKit视图
                SpriteView(
                    scene: scene,
                    options: [.allowsTransparency]
                )
                .ignoresSafeArea()
                .onAppear {
                    scene.size = geometry.size
                }
                .onChange(of: geometry.size) { oldSize, newSize in
                    scene.size = newSize
                }

                // 提示文字
                VStack {
                    Spacer()
                    Text("旋转手机查看玻璃球重力效果")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                        .padding()
                }
            }
        }
        .statusBar(hidden: true)
    }
}

#Preview {
    GlassBallsView()
}
