'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function JobMatchPage() {
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<null | {
    match: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }>(null);

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;

    setIsAnalyzing(true);

    // 模拟 API 调用
    setTimeout(() => {
      setResult({
        match: 87,
        strengths: [
          '3年以上 UI 设计经验符合要求',
          '熟练掌握 Figma、Sketch 等设计工具',
          '有 B 端产品设计经验',
          '具备设计系统搭建能力',
        ],
        weaknesses: [
          '缺少金融行业项目经验',
          '英语能力需要提升',
        ],
        suggestions: [
          '准备一些金融类产品的案例研究',
          '突出数据可视化设计能力',
          '强调跨部门协作经验',
        ],
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-full" />
            <span className="font-semibold text-lg">面试助手</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/ranking" className="hover:underline">岗位排行</Link>
            <Link href="/interview" className="hover:underline">模拟面试</Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* 标题 */}
          <div className="mb-10 animate-fadeIn">
            <h1 className="text-3xl font-bold">岗位匹配分析</h1>
            <p className="text-gray-500 mt-2">粘贴岗位 JD，查看与您简历的匹配度</p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* 左侧：JD 输入 */}
            <div className="animate-slideUp">
              <label className="block text-sm font-medium mb-2">岗位描述 (JD)</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="粘贴岗位描述内容..."
                className="input h-80 resize-none"
              />
              <button
                onClick={handleAnalyze}
                disabled={!jdText.trim() || isAnalyzing}
                className={`
                  w-full mt-4 py-3 rounded-[16px] font-medium
                  border-2 border-black transition-all duration-300
                  ${jdText.trim() && !isAnalyzing
                    ? 'bg-black text-white hover:bg-white hover:text-black'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  }
                `}
              >
                {isAnalyzing ? '分析中...' : '开始匹配'}
              </button>
            </div>

            {/* 右侧：分析结果 */}
            <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
              {!result ? (
                <div className="h-full border-2 border-dashed border-gray-300 rounded-[24px] flex items-center justify-center">
                  <p className="text-gray-400">分析结果将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 匹配度 */}
                  <div className="card text-center">
                    <p className="text-sm text-gray-500">匹配度</p>
                    <p className="text-5xl font-bold mt-2">{result.match}%</p>
                    <div className="w-full h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all duration-1000"
                        style={{ width: `${result.match}%` }}
                      />
                    </div>
                  </div>

                  {/* 优势 */}
                  <div className="card">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">+</span>
                      您的优势
                    </h3>
                    <ul className="space-y-2">
                      {result.strengths.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 bg-black rounded-full flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 待提升 */}
                  <div className="card">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 border-2 border-black rounded-full flex items-center justify-center text-sm">-</span>
                      待提升
                    </h3>
                    <ul className="space-y-2">
                      {result.weaknesses.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 建议 */}
                  <div className="card bg-gray-50">
                    <h3 className="font-semibold mb-3">面试建议</h3>
                    <ul className="space-y-2">
                      {result.suggestions.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-black">{i + 1}.</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        // 添加到排行榜
                        alert('已添加到排行榜');
                      }}
                      className="btn flex-1"
                    >
                      添加到排行榜
                    </button>
                    <Link
                      href="/interview"
                      className="btn btn-primary flex-1 text-center"
                    >
                      开始模拟面试
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
