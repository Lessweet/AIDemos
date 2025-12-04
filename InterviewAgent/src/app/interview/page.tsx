'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
}

// 模拟面试问题
const interviewQuestions = [
  '请先简单介绍一下自己，以及你为什么对这个职位感兴趣？',
  '能详细介绍一下你最满意的一个设计项目吗？包括项目背景、你的角色、设计过程和最终成果。',
  '在设计过程中，你是如何平衡用户需求和业务目标的？能举个具体的例子吗？',
  '当设计方案与产品或开发团队产生分歧时，你通常是如何处理的？',
  '你是如何保持设计灵感和跟进设计趋势的？',
  '你对我们公司的产品有什么了解？有什么改进建议吗？',
  '你有什么问题想问我的吗？',
];

function InterviewContent() {
  const searchParams = useSearchParams();
  const jobPosition = searchParams.get('job') || 'UI 设计师';
  const company = searchParams.get('company') || '某科技公司';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isInterviewEnded, setIsInterviewEnded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startInterview = () => {
    setIsInterviewStarted(true);
    setIsTyping(true);

    setTimeout(() => {
      setMessages([
        {
          role: 'interviewer',
          content: `你好！我是今天的面试官。欢迎参加 ${company} ${jobPosition} 岗位的面试。我们今天的面试大约会进行 30 分钟，主要了解你的设计经验和思维方式。准备好了吗？`,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);

      // 发送第一个问题
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'interviewer',
            content: interviewQuestions[0],
            timestamp: new Date(),
          }]);
          setIsTyping(false);
        }, 1500);
      }, 1000);
    }, 1500);
  };

  const handleSend = () => {
    if (!inputText.trim() || isTyping) return;

    // 添加候选人的回答
    setMessages(prev => [...prev, {
      role: 'candidate',
      content: inputText,
      timestamp: new Date(),
    }]);
    setInputText('');

    // 检查是否还有问题
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion >= interviewQuestions.length) {
      // 面试结束
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'interviewer',
          content: '非常感谢你今天的分享！你的回答很详细，展现了扎实的设计功底。我们会在一周内给你反馈。祝你好运！',
          timestamp: new Date(),
        }]);
        setIsTyping(false);
        setIsInterviewEnded(true);
      }, 2000);
    } else {
      // 发送下一个问题
      setIsTyping(true);
      setTimeout(() => {
        // 先给一个简短的反馈
        const feedbacks = [
          '好的，谢谢你的分享。',
          '嗯，了解了。',
          '很好，这点很重要。',
          '明白了，感谢你的详细解答。',
          '不错，能看出你的思考。',
          '好的，这个经验很宝贵。',
        ];
        setMessages(prev => [...prev, {
          role: 'interviewer',
          content: feedbacks[Math.floor(Math.random() * feedbacks.length)],
          timestamp: new Date(),
        }]);

        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'interviewer',
            content: interviewQuestions[nextQuestion],
            timestamp: new Date(),
          }]);
          setIsTyping(false);
          setCurrentQuestion(nextQuestion);
        }, 1500);
      }, 1500);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-full" />
            <span className="font-semibold text-lg">面试助手</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/ranking" className="hover:underline">岗位排行</Link>
            <span className="font-medium underline">模拟面试</span>
          </div>
        </div>
      </nav>

      {/* 面试信息栏 */}
      <div className="pt-16 border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{jobPosition}</h1>
            <p className="text-sm text-gray-500">{company}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              问题 {currentQuestion + 1} / {interviewQuestions.length}
            </span>
            {isInterviewEnded && (
              <Link
                href={`/interview/report?job=${encodeURIComponent(jobPosition)}`}
                className="btn text-sm py-2"
              >
                查看评估报告
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-hidden">
        {!isInterviewStarted ? (
          // 开始面试界面
          <div className="h-full flex items-center justify-center">
            <div className="text-center animate-fadeIn">
              <div className="w-24 h-24 bg-black rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">准备开始模拟面试</h2>
              <p className="text-gray-500 mb-6">
                岗位：{jobPosition} | 公司：{company}
              </p>
              <p className="text-sm text-gray-400 mb-8 max-w-md">
                AI 面试官将基于岗位要求向你提问，请认真回答每个问题。<br />
                面试结束后会生成详细的评估报告。
              </p>
              <button
                onClick={startInterview}
                className="btn btn-primary px-12 py-4 text-lg"
              >
                开始面试
              </button>
            </div>
          </div>
        ) : (
          // 聊天界面
          <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`flex items-start gap-3 max-w-[80%] ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
                    {/* 头像 */}
                    <div className={`
                      w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                      ${msg.role === 'interviewer' ? 'bg-black text-white' : 'border-2 border-black'}
                    `}>
                      {msg.role === 'interviewer' ? 'AI' : '我'}
                    </div>
                    {/* 消息气泡 */}
                    <div className={`
                      px-4 py-3 rounded-[16px]
                      ${msg.role === 'interviewer'
                        ? 'bg-gray-100 rounded-tl-none'
                        : 'bg-black text-white rounded-tr-none'
                      }
                    `}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* 正在输入指示器 */}
              {isTyping && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
                      AI
                    </div>
                    <div className="px-4 py-3 bg-gray-100 rounded-[16px] rounded-tl-none">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="border-t-2 border-black p-4">
              <div className="flex gap-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isInterviewEnded ? '面试已结束' : '输入你的回答...'}
                  disabled={isInterviewEnded || isTyping}
                  className="input flex-1 resize-none h-20"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isInterviewEnded || isTyping}
                  className={`
                    px-8 rounded-[16px] font-medium border-2 border-black transition-all
                    ${inputText.trim() && !isInterviewEnded && !isTyping
                      ? 'bg-black text-white hover:bg-white hover:text-black'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    }
                  `}
                >
                  发送
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">按 Enter 发送，Shift + Enter 换行</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-lg">加载中...</p>
        </div>
      </main>
    }>
      <InterviewContent />
    </Suspense>
  );
}
