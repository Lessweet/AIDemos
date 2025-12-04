'use client';

import { useState } from 'react';
import Link from 'next/link';

// 模拟数据 - 完整排行榜
const allJobs = Array.from({ length: 50 }, (_, i) => ({
  rank: i + 1,
  field: ['互联网', '金融科技', '电商', '游戏', '教育科技', '医疗健康', 'SaaS', '智能硬件', '出行', '社交'][i % 10],
  position: [
    '高级 UI 设计师', '产品设计师', 'UX/UI 设计师', '视觉设计师',
    '游戏 UI 设计师', '体验设计师', 'UI 设计师', '交互设计师',
    '用户体验设计师', '设计总监'
  ][i % 10],
  company: ['字节跳动', '蚂蚁集团', '美团', '网易', '好未来', '丁香园', '飞书', '小米', '滴滴', '微信'][i % 10],
  match: Math.max(95 - i * 1.5, 40),
  salary: `${25 + Math.floor((50 - i) / 5) * 5}-${35 + Math.floor((50 - i) / 5) * 5}K`,
  source: i % 3 === 0 ? 'AI 推荐' : i % 3 === 1 ? 'JD 匹配' : 'AI 推荐',
}));

export default function RankingPage() {
  const [filter, setFilter] = useState<'all' | 'ai' | 'jd'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = allJobs.filter(job => {
    const matchesFilter = filter === 'all' ||
      (filter === 'ai' && job.source === 'AI 推荐') ||
      (filter === 'jd' && job.source === 'JD 匹配');
    const matchesSearch = job.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
            <span className="font-medium underline">岗位排行</span>
            <Link href="/interview" className="hover:underline">模拟面试</Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* 标题和筛选 */}
          <div className="flex items-end justify-between mb-8 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-bold">岗位排行榜</h1>
              <p className="text-gray-500 mt-2">共 {filteredJobs.length} 个岗位</p>
            </div>
            <div className="flex items-center gap-4">
              {/* 搜索框 */}
              <input
                type="text"
                placeholder="搜索岗位、领域、公司..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-64 py-2"
              />
              {/* 筛选按钮 */}
              <div className="flex border-2 border-black rounded-[16px] overflow-hidden">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'ai', label: 'AI 推荐' },
                  { key: 'jd', label: 'JD 匹配' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilter(item.key as typeof filter)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      filter === item.key
                        ? 'bg-black text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 排行榜表格 */}
          <div className="card p-0 overflow-hidden animate-slideUp">
            <table className="w-full">
              <thead>
                <tr className="bg-black text-white">
                  <th className="py-4 px-4 text-left font-medium w-16">排名</th>
                  <th className="py-4 px-4 text-left font-medium">岗位</th>
                  <th className="py-4 px-4 text-left font-medium">公司</th>
                  <th className="py-4 px-4 text-left font-medium">领域</th>
                  <th className="py-4 px-4 text-left font-medium">薪资</th>
                  <th className="py-4 px-4 text-center font-medium">匹配度</th>
                  <th className="py-4 px-4 text-center font-medium">来源</th>
                  <th className="py-4 px-4 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, i) => (
                  <tr
                    key={job.rank}
                    className="border-t-2 border-black hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className={`
                        inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-medium
                        ${job.rank <= 3 ? 'bg-black text-white' : 'border-2 border-black'}
                      `}>
                        {job.rank}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium">{job.position}</td>
                    <td className="py-4 px-4 text-gray-600">{job.company}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 text-xs border border-black rounded-full">
                        {job.field}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{job.salary}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <span
                            className="block h-full bg-black rounded-full"
                            style={{ width: `${job.match}%` }}
                          />
                        </span>
                        <span className="text-sm font-medium w-10">{job.match.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${job.source === 'AI 推荐' ? 'bg-black text-white' : 'border border-black'}
                      `}>
                        {job.source}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Link
                        href={`/interview?job=${encodeURIComponent(job.position)}&company=${encodeURIComponent(job.company)}`}
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

          {/* 底部操作 */}
          <div className="mt-8 flex gap-4 justify-center animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <Link href="/job-match" className="btn">
              添加新岗位
            </Link>
            <Link href="/" className="btn btn-primary">
              重新分析简历
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
