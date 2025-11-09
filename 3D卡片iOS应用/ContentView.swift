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
        .tabViewStyle(.page(indexDisplayMode: .always))
        .indexViewStyle(.page(backgroundDisplayMode: .always))
        .onAppear {
            cardModel.loadSettings()
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

            VStack(spacing: 0) {
                // iPhone设备框架 + 卡片
                ZStack {
                    // iPhone外框（简化版）
                    RoundedRectangle(cornerRadius: 55)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.96, green: 0.96, blue: 0.96),
                                    Color(red: 0.88, green: 0.88, blue: 0.88),
                                    Color(red: 0.84, green: 0.84, blue: 0.84)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 280, height: 580)
                        .shadow(color: .black.opacity(0.2), radius: 20, x: 0, y: 10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 48)
                                .stroke(Color.black, lineWidth: 3)
                                .padding(8)
                        )

                    // iPhone屏幕区域 + 卡片
                    ZStack {
                        // 屏幕背景
                        RoundedRectangle(cornerRadius: 45)
                            .fill(Color.white)
                            .frame(width: 264, height: 564)

                        // 刘海
                        Capsule()
                            .fill(Color.black)
                            .frame(width: 120, height: 25)
                            .offset(y: -264)

                        // 3D卡片
                        Card3DView(cardModel: cardModel)
                            .scaleEffect(0.75) // 缩小以适应iPhone屏幕
                    }
                }
                .padding(.top, 40)

                Spacer()

                // 控制按钮
                Button(action: {
                    withAnimation {
                        showControlPanel.toggle()
                    }
                }) {
                    HStack {
                        Text("参数控制")
                            .font(.system(size: 17, weight: .semibold))
                        Image(systemName: showControlPanel ? "chevron.down" : "chevron.up")
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.black)
                    .cornerRadius(15)
                    .padding(.horizontal)
                }
                .padding(.bottom, 10)

                // 控制面板（从底部弹出）
                if showControlPanel {
                    ControlPanelView(cardModel: cardModel)
                        .frame(height: 450)
                        .background(Color.white)
                        .cornerRadius(20, corners: [.topLeft, .topRight])
                        .transition(.move(edge: .bottom))
                }
            }
        }
    }
}

// 第二屏视图：全屏渐变色
struct SecondScreenView: View {
    var body: some View {
        ZStack {
            // 全屏渐变背景 - 使用与卡片相同的渐变色
            LinearGradient(
                colors: [
                    Color(red: 0.65, green: 0.55, blue: 0.80),  // #a68ccc 浅紫
                    Color(red: 0.72, green: 0.78, blue: 0.72),  // #b7c7b7 紫绿过渡
                    Color(red: 0.75, green: 0.88, blue: 0.80)   // #bfe0cc 明亮浅绿
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
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
