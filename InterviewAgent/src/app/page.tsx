'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';

export default function Home() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!resumeFile) return;

    setIsAnalyzing(true);

    // 创建 FormData
    const formData = new FormData();
    formData.append('resume', resumeFile);
    if (portfolioFile) {
      formData.append('portfolio', portfolioFile);
    }

    // 存储文件信息到 localStorage（临时方案）
    localStorage.setItem('resumeName', resumeFile.name);
    if (portfolioFile) {
      localStorage.setItem('portfolioName', portfolioFile.name);
    }

    // 模拟分析过程
    setTimeout(() => {
      router.push('/analysis');
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-full" />
            <span className="font-semibold text-lg">面试助手</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="/ranking" className="hover:underline">岗位排行</a>
            <a href="/interview" className="hover:underline">模拟面试</a>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          {/* 标题 */}
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="text-4xl font-bold mb-4">
              UI 设计师面试助手
            </h1>
            <p className="text-lg text-gray-600">
              上传简历，发现最适合你的职业方向
            </p>
          </div>

          {/* 上传区域 */}
          <div className="space-y-6 animate-slideUp" style={{ animationDelay: '0.1s' }}>
            {/* 简历上传 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                简历 <span className="text-red-500">*</span>
              </label>
              <FileUpload
                onFileSelect={setResumeFile}
                label="上传简历"
                description="支持 PDF 格式，包含工作经历和技能"
              />
            </div>

            {/* 作品集上传 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                作品集 <span className="text-gray-400">(可选)</span>
              </label>
              <FileUpload
                onFileSelect={setPortfolioFile}
                label="上传作品集"
                description="支持 PDF 格式，展示你的设计作品"
              />
            </div>
          </div>

          {/* 分析按钮 */}
          <div className="mt-10 animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={handleAnalyze}
              disabled={!resumeFile || isAnalyzing}
              className={`
                w-full py-4 rounded-[16px] text-lg font-medium
                border-2 border-black
                transition-all duration-300
                ${resumeFile && !isAnalyzing
                  ? 'bg-black text-white hover:bg-white hover:text-black'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                }
              `}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  正在分析...
                </span>
              ) : (
                '开始分析'
              )}
            </button>
          </div>

          {/* 功能说明 */}
          <div className="mt-16 grid grid-cols-3 gap-6 animate-slideUp" style={{ animationDelay: '0.3s' }}>
            {[
              { title: '职业评估', desc: '100个岗位推荐排行' },
              { title: '岗位匹配', desc: '精准匹配度分析' },
              { title: '模拟面试', desc: 'AI 面试官训练' },
            ].map((item, i) => (
              <div
                key={i}
                className="card text-center py-6 hover:bg-gray-50"
              >
                <p className="font-medium text-lg">{item.title}</p>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
