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

// 第二屏视图：全屏渐变色
struct SecondScreenView: View {
    @State private var hueRotation: Double = 0

    var body: some View {
        ZStack {
            // 全屏流动渐变背景
            Color(red: 0.96, green: 0.96, blue: 0.97)
                .overlay(
                    ZStack {
                        // 橙色渐变
                        EllipticalGradient(
                            colors: [Color(red: 1.0, green: 0.47, blue: 0.27), Color.clear],
                            center: UnitPoint(x: 0.2, y: 0.25),
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.5
                        )

                        // 蓝色渐变
                        EllipticalGradient(
                            colors: [Color(red: 0.24, green: 0.71, blue: 1.0), Color.clear],
                            center: UnitPoint(x: 0.8, y: 0.2),
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.5
                        )

                        // 粉色渐变
                        EllipticalGradient(
                            colors: [Color(red: 1.0, green: 0.27, blue: 0.71), Color.clear],
                            center: UnitPoint(x: 0.25, y: 0.8),
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.5
                        )

                        // 紫色渐变
                        EllipticalGradient(
                            colors: [Color(red: 0.51, green: 0.31, blue: 1.0), Color.clear],
                            center: UnitPoint(x: 0.75, y: 0.75),
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.5
                        )

                        // 黄橙色渐变
                        EllipticalGradient(
                            colors: [Color(red: 1.0, green: 0.78, blue: 0.39).opacity(0.8), Color.clear],
                            center: .center,
                            startRadiusFraction: 0,
                            endRadiusFraction: 0.7
                        )
                    }
                    .hueRotation(.degrees(hueRotation))
                    .blur(radius: 80)
                )
                .ignoresSafeArea()
                .onAppear {
                    // 启动持续的色相旋转动画 (更快速度)
                    Timer.scheduledTimer(withTimeInterval: 0.016, repeats: true) { _ in
                        hueRotation += 1.0
                        if hueRotation >= 360 {
                            hueRotation -= 360
                        }
                    }
                }

            // 底部文字
            VStack {
                Spacer()
                Text("指尖的力量")
                    .font(.custom("STSongti-SC-Regular", size: 32))
                    .foregroundColor(.black.opacity(0.6))
                    .padding(.bottom, 50)
            }
        }
    }
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
