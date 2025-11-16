import SwiftUI

@main
struct GlassBallsApp: App {
    var body: some Scene {
        WindowGroup {
            GlassBallsView()
                .preferredColorScheme(.dark)
        }
    }
}
