import SwiftUI

// 参数控制面板
struct ControlPanelView: View {
    @ObservedObject var cardModel: CardModel
    @State private var showSavedAlert = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // 控制按钮
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        Button(action: {
                            cardModel.isAutoRotating.toggle()
                        }) {
                            Text(cardModel.isAutoRotating ? "暂停" : "继续")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.black, lineWidth: 2)
                                )
                                .cornerRadius(20)
                        }

                        Button(action: {
                            cardModel.reset()
                        }) {
                            Text("重置")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.black, lineWidth: 2)
                                )
                                .cornerRadius(20)
                        }

                        Button(action: {
                            cardModel.saveSettings()
                            showSavedAlert = true
                        }) {
                            Text("保存")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.black, lineWidth: 2)
                                )
                                .cornerRadius(20)
                        }
                    }

                    // 陀螺仪控制按钮
                    Button(action: {
                        if cardModel.gyroEnabled {
                            cardModel.disableGyro()
                        } else {
                            cardModel.enableGyro()
                        }
                    }) {
                        HStack {
                            Image(systemName: cardModel.gyroEnabled ? "gyroscope" : "gyroscope")
                            Text(cardModel.gyroEnabled ? "禁用陀螺仪" : "启用陀螺仪")
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(cardModel.gyroEnabled ? Color.green : Color.blue)
                        .cornerRadius(20)
                    }
                }
                .padding(.horizontal)

                // 样式参数
                ParameterSection(title: "样式参数") {
                    ParameterSlider(
                        title: "卡片宽度",
                        value: $cardModel.cardWidth,
                        range: 250...370,
                        step: 10,
                        unit: "px"
                    )

                    ParameterSlider(
                        title: "卡片高度",
                        value: $cardModel.cardHeight,
                        range: 150...320,
                        step: 10,
                        unit: "px"
                    )

                    ParameterSlider(
                        title: "圆角大小",
                        value: $cardModel.borderRadius,
                        range: 0...50,
                        step: 5,
                        unit: "px"
                    )

                    ParameterSlider(
                        title: "阴影大小",
                        value: $cardModel.shadowSize,
                        range: 10...80,
                        step: 5,
                        unit: "px"
                    )
                }

                // 动画参数
                ParameterSection(title: "动画参数") {
                    ParameterSlider(
                        title: "自动旋转速度",
                        value: $cardModel.rotateSpeed,
                        range: 0...2,
                        step: 0.1,
                        description: "控制卡片自动旋转的快慢"
                    )

                    ParameterSlider(
                        title: "左右摇摆幅度",
                        value: $cardModel.rotateAmplitudeY,
                        range: 0...50,
                        step: 1,
                        unit: "°",
                        description: "调整卡片左右摇摆的角度"
                    )

                    ParameterSlider(
                        title: "上下倾斜幅度",
                        value: $cardModel.rotateAmplitudeX,
                        range: 0...50,
                        step: 1,
                        unit: "°",
                        description: "调整卡片上下倾斜的角度"
                    )

                    ParameterSlider(
                        title: "动画流畅度",
                        value: $cardModel.smoothSpeed,
                        range: 0.01...0.5,
                        step: 0.01,
                        description: "数值越大动画越快速"
                    )
                }

                // 交互参数
                ParameterSection(title: "交互参数") {
                    ParameterSlider(
                        title: "拖动灵敏度",
                        value: $cardModel.dragSensitivity,
                        range: 0.1...2,
                        step: 0.1,
                        description: "拖动卡片时的反应灵敏程度"
                    )

                    ParameterSlider(
                        title: "最大旋转角度",
                        value: $cardModel.angleLimit,
                        range: 15...90,
                        step: 5,
                        unit: "°",
                        description: "拖动卡片时允许旋转的最大角度"
                    )
                }
            }
            .padding(.top, 10)
            .padding(.bottom, 30)
        }
        .background(Color.white)
        .alert("已保存", isPresented: $showSavedAlert) {
            Button("确定", role: .cancel) { }
        } message: {
            Text("参数设置已保存")
        }
    }
}

// 参数区块
struct ParameterSection<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .padding(.horizontal)

            VStack(spacing: 10) {
                content
            }
        }
    }
}

// 参数滑块
struct ParameterSlider: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    var unit: String = ""
    var description: String = ""

    // 处理CGFloat类型
    init(title: String, value: Binding<CGFloat>, range: ClosedRange<Double>, step: Double, unit: String = "", description: String = "") {
        self.title = title
        self._value = Binding(
            get: { Double(value.wrappedValue) },
            set: { value.wrappedValue = CGFloat($0) }
        )
        self.range = range
        self.step = step
        self.unit = unit
        self.description = description
    }

    // 处理Double类型
    init(title: String, value: Binding<Double>, range: ClosedRange<Double>, step: Double, unit: String = "", description: String = "") {
        self.title = title
        self._value = value
        self.range = range
        self.step = step
        self.unit = unit
        self.description = description
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                Spacer()
                Text("\(Int(value))\(unit)")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundColor(.gray)
            }

            Slider(value: $value, in: range, step: step)
                .accentColor(.black)

            if !description.isEmpty {
                Text(description)
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Color.white)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.black, lineWidth: 1.5)
        )
        .padding(.horizontal)
    }
}
