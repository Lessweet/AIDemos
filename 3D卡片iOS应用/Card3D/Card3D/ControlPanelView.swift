import SwiftUI

// 参数控制面板 - 仅陀螺仪参数
struct ControlPanelView: View {
    @ObservedObject var cardModel: CardModel

    var body: some View {
        VStack(spacing: 20) {
            // 陀螺仪灵敏度滑块
            if cardModel.gyroEnabled {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("陀螺仪灵敏度")
                            .font(.system(size: 15, weight: .medium))
                        Spacer()
                        Text("\(Int(cardModel.gyroSensitivity))")
                            .font(.system(size: 14, weight: .semibold, design: .monospaced))
                            .foregroundColor(.gray)
                    }

                    Slider(value: $cardModel.gyroSensitivity, in: 0...20, step: 1)
                        .accentColor(.black)

                    Text("控制手机倾斜时卡片旋转的幅度")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .background(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.black, lineWidth: 1.5)
                )
                .padding(.horizontal, 20)

                // 重新校准按钮
                Button(action: {
                    cardModel.recalibrateGyroscope()
                }) {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("重新校准")
                    }
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.black)
                    .cornerRadius(10)
                }
                .padding(.horizontal, 20)
            }
        }
    }
}
