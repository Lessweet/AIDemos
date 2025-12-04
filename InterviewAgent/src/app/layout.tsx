import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI 设计师面试助手",
  description: "帮助 UI 设计师评估职业方向、岗位匹配度，并提供模拟面试功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
