'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ReportContent() {
  const searchParams = useSearchParams();
  const jobPosition = searchParams.get('job') || 'UI 设计师';

  // 模拟评估数据
  const evaluation = {
    overallScore: 85,
    dimensions: [
      { name: '专业能力', score: 88, comment: '展现了扎实的设计基础和丰富的项目经验' },
      { name: '沟通表达', score: 82, comment: '表达清晰，但可以更加简洁有力' },
      { name: '问题解决', score: 86, comment: '能够系统性地分析问题，给出合理方案' },
      { name: '团队协作', score: 84, comment: '有良好的协作意识，懂得平衡各方需求' },
      { name: '学习能力', score: 88, comment: '保持对新技术的关注，有持续学习的习惯' },
      { name: '职业素养', score: 85, comment: '态度积极，对行业有清晰的认知' },
    ],
    highlights: [
      '对设计系统有深入的理解和实践经验',
      '能够清晰地阐述设计决策的依据',
      '展现了良好的用户同理心',
      '具备数据驱动设计的意识',
    ],
    improvements: [
      '回答问题时可以更加结构化',
      '可以准备更多量化的项目成果数据',
      '对行业趋势的了解可以更深入',
      '英语表达能力有提升空间',
    ],
    suggestions: [
      '准备 STAR 法则来回答行为面试题',
      '整理 3-5 个代表性项目的详细案例',
      '关注目标公司的产品和设计风格',
      '练习英文自我介绍和项目描述',
    ],
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
            <h1 className="text-3xl font-bold">面试评估报告</h1>
            <p className="text-gray-500 mt-2">岗位：{jobPosition}</p>
          </div>

          {/* 总分卡片 */}
          <div className="card text-center mb-10 animate-slideUp">
            <p className="text-sm text-gray-500 mb-2">综合评分</p>
            <div className="relative inline-block">
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                {/* 背景圆环 */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="8"
                />
                {/* 进度圆环 */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#000"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${evaluation.overallScore * 2.83} 283`}
                  transform="rotate(-90 50 50)"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">{evaluation.overallScore}</span>
              </div>
            </div>
            <p className="mt-4 text-lg font-medium">
              {evaluation.overallScore >= 90 ? '优秀' :
               evaluation.overallScore >= 80 ? '良好' :
               evaluation.overallScore >= 70 ? '中等' : '需改进'}
            </p>
          </div>

          {/* 维度评分 */}
          <div className="card mb-8 animate-slideUp" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xl font-semibold mb-6">能力维度评估</h2>
            <div className="space-y-6">
              {evaluation.dimensions.map((dim, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{dim.name}</span>
                    <span className="text-lg font-bold">{dim.score}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-black rounded-full transition-all duration-1000"
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">{dim.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 亮点与待改进 */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* 亮点 */}
            <div className="card animate-slideUp" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center">+</span>
                表现亮点
              </h2>
              <ul className="space-y-3">
                {evaluation.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-2 h-2 bg-black rounded-full flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 待改进 */}
            <div className="card animate-slideUp" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center">-</span>
                待改进
              </h2>
              <ul className="space-y-3">
                {evaluation.improvements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1.5 w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 改进建议 */}
          <div className="card bg-gray-50 mb-8 animate-slideUp" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-xl font-semibold mb-4">改进建议</h2>
            <div className="grid grid-cols-2 gap-4">
              {evaluation.suggestions.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-[16px] border-2 border-black">
                  <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 justify-center animate-slideUp" style={{ animationDelay: '0.5s' }}>
            <Link href="/interview" className="btn">
              重新面试
            </Link>
            <Link href="/ranking" className="btn">
              查看其他岗位
            </Link>
            <button
              onClick={() => window.print()}
              className="btn btn-primary"
            >
              导出报告
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-lg">加载报告中...</p>
        </div>
      </main>
    }>
      <ReportContent />
    </Suspense>
  );
}
