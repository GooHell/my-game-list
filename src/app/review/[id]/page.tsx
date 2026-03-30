import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import gamesData from '../../../../data/games.json';

// 告诉 Next.js 在构建时需要生成哪些静态页面
export async function generateStaticParams() {
  // 找出所有有 reviewFile 的游戏
  const gamesWithReviews = gamesData.filter(game => game && game.reviewFile);

  // 如果没有任何评测数据，提供一个占位路径以避免 output:export 构建失败
  // 该占位 id 在 ReviewPage 中会被 notFound() 处理
  if (gamesWithReviews.length === 0) {
    return [{ id: '_placeholder' }];
  }

  return gamesWithReviews.map((game) => ({
    id: String(game.id),
  }));
}

export const dynamic = 'force-static';
export const dynamicParams = false;

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  
  const game = gamesData.find(g => g && g.id === id);
  
  if (!game || !game.reviewFile) {
    notFound();
  }

  let content = '';
  
  try {
    const reviewsDir = path.join(process.cwd(), 'content/reviews');
    if (!fs.existsSync(reviewsDir)) {
      fs.mkdirSync(reviewsDir, { recursive: true });
    }

    const filePath = path.join(reviewsDir, game.reviewFile);
    
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    } else {
      content = `> **提示**：拆解文档 \`${game.reviewFile}\` 尚未创建。\n\n请在 \`content/reviews\` 目录下创建该文件以展示深度拆解内容。`;
    }
  } catch (error) {
    console.error('读取 Markdown 文件失败:', error);
    content = '> **错误**：读取拆解文档时发生异常。';
  }

  const coverSrc = game.cover;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return '🏆';
      case 'completed': return '🏆✨';
      case 'playing': return '🎮';
      case 'on-hold': return '⏳';
      case 'dropped': return '❌';
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'cleared': return '已通关';
      case 'completed': return '全成就';
      case 'playing': return '游玩中';
      case 'on-hold': return '搁置';
      case 'dropped': return '放弃';
      default: return '';
    }
  };

  return (
    <main className="min-h-screen bg-[#1b2838] text-[#c7d5e0] py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundImage: 'radial-gradient(circle at top center, #2a475e 0%, #1b2838 40%, #171a21 100%)', backgroundAttachment: 'fixed' }}>
      <div className="max-w-4xl mx-auto">
        {/* 导航栏 */}
        <div className="mb-6 flex items-center justify-between border-b border-[#2a475e] pb-4">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[#66c0f4] hover:text-white transition-colors bg-[#202d39] px-4 py-1.5 rounded-sm border border-[#3d4450]/50"
          >
            <span>←</span> 返回游戏库
          </Link>
          <div className="text-sm text-[#8f98a0] uppercase tracking-wider">
            {game.title} · 游戏印象
          </div>
        </div>

        {/* 游戏信息头部 (Steam 商店页风格) */}
        <div className="mb-8 bg-gradient-to-b from-[#171a21] to-[#10141b] rounded-sm p-6 border border-[#2a475e] shadow-2xl flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="w-40 h-56 relative rounded-sm overflow-hidden shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.8)] border border-[#3d4450]">
            <img 
              src={coverSrc} 
              alt={game.title}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1 w-full">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-wide">{game.title}</h1>
            
            <div className="bg-[#1b2838] p-4 rounded-sm border border-[#2a475e]/50 mb-4">
              <div className="flex flex-col sm:flex-row gap-6 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-3xl drop-shadow-md">{getStatusIcon(game.playStatus)}</span>
                  <div>
                    <span className="text-[#8f98a0] block text-xs uppercase tracking-wider mb-0.5">游玩情况</span>
                    <span className="font-medium text-[#c7d5e0]">{getStatusText(game.playStatus)}</span>
                  </div>
                </div>
                {game.showPlaytime && (
                  <div className="flex items-center gap-3 border-l border-[#2a475e] pl-6">
                    <span className="text-2xl text-[#8f98a0]">⏱️</span>
                    <div>
                      <span className="text-[#8f98a0] block text-xs uppercase tracking-wider mb-0.5">游玩时长</span>
                      <span className="font-medium text-[#c7d5e0]">{game.playtime}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {game.tags.map(tag => {
                const isSpecial = tag === '实战项目' || tag === '小想法';
                return (
                  <span 
                    key={tag} 
                    className={`text-xs px-3 py-1.5 rounded-sm border cursor-default transition-colors ${
                      isSpecial
                        ? 'bg-[#a4d007]/10 text-[#a4d007] border-[#a4d007]/50 font-bold hover:bg-[#a4d007]/20'
                        : 'bg-[#202d39] text-[#66c0f4] border-[#3d4450]/50 hover:bg-[#2a475e]'
                    }`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Steam 社区评测风格：优缺点卡片 */}
        {(game.pros || game.cons) && (
          <div className="mb-8 flex flex-col gap-4">
            {/* 优点卡片 (推荐) */}
            {game.pros && (
              <div className="bg-[#16202d] border border-[#2a475e] rounded-sm overflow-hidden shadow-lg">
                <div className="bg-[#1b2838] p-3 flex items-center gap-3 border-b border-[#2a475e]">
                  <div className="w-10 h-10 bg-[#3d6a8f] rounded-sm flex items-center justify-center">
                    <span className="text-2xl text-white">👍</span>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#66c0f4] tracking-wide">推荐 (优点)</div>
                    <div className="text-xs text-[#8f98a0]">核心设计亮点与体验优势</div>
                  </div>
                </div>
                <div className="p-4 text-[#c7d5e0] text-sm leading-relaxed">
                  {game.pros}
                </div>
              </div>
            )}

            {/* 缺点卡片 (不推荐) */}
            {game.cons && (
              <div className="bg-[#16202d] border border-[#2a475e] rounded-sm overflow-hidden shadow-lg">
                <div className="bg-[#1b2838] p-3 flex items-center gap-3 border-b border-[#2a475e]">
                  <div className="w-10 h-10 bg-[#8f3d3d] rounded-sm flex items-center justify-center">
                    <span className="text-2xl text-white">👎</span>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#ff6b6b] tracking-wide">不推荐 (缺点)</div>
                    <div className="text-xs text-[#8f98a0]">系统摩擦力与设计缺陷</div>
                  </div>
                </div>
                <div className="p-4 text-[#c7d5e0] text-sm leading-relaxed">
                  {game.cons}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Markdown 内容渲染区 (深色内框) */}
        <div className="bg-[#10141b] rounded-sm p-6 sm:p-10 border border-[#2a475e] shadow-xl">
          <article className="prose prose-invert prose-slate max-w-none 
            prose-headings:text-white prose-headings:border-b prose-headings:border-[#2a475e] prose-headings:pb-2
            prose-a:text-[#66c0f4] hover:prose-a:text-[#67c1f5] 
            prose-img:rounded-sm prose-img:shadow-lg prose-img:border prose-img:border-[#3d4450]
            prose-code:text-[#66c0f4] prose-code:bg-[#1b2838] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm
            prose-pre:bg-[#1b2838] prose-pre:border prose-pre:border-[#2a475e]">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeRaw]}
            >
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </main>
  );
}