'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 模拟数据 - 岗位推荐
const mockJobRecommendations = [
  { rank: 1, field: '互联网', position: '高级 UI 设计师', match: 95 },
  { rank: 2, field: '互联网', position: '产品设计师', match: 92 },
  { rank: 3, field: '金融科技', position: 'UX/UI 设计师', match: 89 },
  { rank: 4, field: '电商', position: '视觉设计师', match: 87 },
  { rank: 5, field: '游戏', position: '游戏 UI 设计师', match: 85 },
  { rank: 6, field: '教育科技', position: '体验设计师', match: 83 },
  { rank: 7, field: '医疗健康', position: 'UI 设计师', match: 81 },
  { rank: 8, field: 'SaaS', position: '产品设计师', match: 79 },
  { rank: 9, field: '智能硬件', position: '交互设计师', match: 77 },
  { rank: 10, field: '出行', position: '用户体验设计师', match: 75 },
];

export default function AnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    // 模拟加载
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-lg">正在分析您的简历...</p>
          <p className="text-sm text-gray-500 mt-2">AI 正在匹配最适合的岗位</p>
        </div>
      </main>
    );
  }

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
            <h1 className="text-3xl font-bold">分析结果</h1>
            <p className="text-gray-500 mt-2">基于您的简历，为您推荐最匹配的岗位</p>
          </div>

          {/* 概览卡片 */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {[
              { label: '分析岗位数', value: '100+' },
              { label: '最高匹配度', value: '95%' },
              { label: '推荐领域', value: '10 个' },
            ].map((item, i) => (
              <div
                key={i}
                className="card text-center animate-slideUp"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <p className="text-3xl font-bold">{item.value}</p>
                <p className="text-sm text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* 排行榜表格 */}
          <div className="card animate-slideUp" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">岗位推荐排行</h2>
              <Link
                href="/job-match"
                className="btn text-sm py-2 px-4"
              >
                上传 JD 对比
              </Link>
            </div>

            <div className="overflow-hidden rounded-[16px] border-2 border-black">
              <table className="w-full">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="py-3 px-4 text-left font-medium">排名</th>
                    <th className="py-3 px-4 text-left font-medium">领域</th>
                    <th className="py-3 px-4 text-left font-medium">岗位</th>
                    <th className="py-3 px-4 text-right font-medium">匹配度</th>
                    <th className="py-3 px-4 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {mockJobRecommendations.slice(0, showMore ? 10 : 5).map((job, i) => (
                    <tr
                      key={job.rank}
                      className="border-t-2 border-black hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className={`
                          inline-flex w-8 h-8 items-center justify-center rounded-full
                          ${job.rank <= 3 ? 'bg-black text-white' : 'border-2 border-black'}
                        `}>
                          {job.rank}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{job.field}</td>
                      <td className="py-4 px-4 font-medium">{job.position}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <span
                              className="block h-full bg-black rounded-full transition-all duration-500"
                              style={{ width: `${job.match}%` }}
                            />
                          </span>
                          <span className="font-medium">{job.match}%</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Link
                          href={`/interview?job=${encodeURIComponent(job.position)}`}
                          className="text-sm underline hover:no-underline"
                        >
                          模拟面试
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!showMore && (
              <button
                onClick={() => setShowMore(true)}
                className="w-full mt-4 py-3 border-2 border-black rounded-[16px] hover:bg-black hover:text-white transition-all"
              >
                查看更多
              </button>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-8 flex gap-4 animate-slideUp" style={{ animationDelay: '0.4s' }}>
            <Link href="/job-match" className="btn flex-1 justify-center">
              上传岗位 JD 对比
            </Link>
            <Link href="/ranking" className="btn btn-primary flex-1 justify-center">
              查看完整排行榜
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
