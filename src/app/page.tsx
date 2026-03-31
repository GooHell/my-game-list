'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import FilterBar from '@/components/FilterBar';
import GameGrid from '@/components/GameGrid';
import gamesData from '../../data/games.json';

// ==========================================
// 标签系统：白名单 + 映射
// ==========================================

// 三级标签体系，导航栏分行显示
const TAG_TIERS = {
  // 第1行：核心大类
  core: ['动作', '射击', '角色扮演', '策略', '模拟', '竞速', '体育', '格斗', '解谜', '冒险'],
  // 第2行：子玩法细分
  sub: [
    '第一人称射击', '第三人称射击', '动作RPG', '即时战略', '回合制',
    'MOBA', '大逃杀', '平台游戏', '类银河战士恶魔城', '类魂系列',
    '类Rogue', '塔防', '卡牌', '砍杀', '潜行', '跑酷',
  ],
  // 第3行：玩法模式
  mode: ['开放世界', '沙盒', '生存', '建造'],
};

// 合并为完整列表，用于匹配计算
const CORE_TAGS: string[] = [...TAG_TIERS.core, ...TAG_TIERS.sub, ...TAG_TIERS.mode];

// 标签映射：将细碎/英文/近义标签归类到核心标签
const TAG_MAPPING: Record<string, string> = {
  // 英文 → 中文
  'Action': '动作', 'Action RPG': '动作RPG', 'Adventure': '冒险',
  'RPG': '角色扮演', 'Souls-like': '类魂系列', 'Cute': '休闲',
  'Funny': '休闲', 'Anime': '独立',
  // 近义合并
  '动作角色扮演': '动作RPG', '动作冒险': '动作',
  '动作类 Rogue': '类Rogue', '轻度 Rogue': '类Rogue', '牌组构建式类 Rogue': '类Rogue',
  '类 Rogue': '类Rogue',
  '日系角色扮演': '角色扮演', '电脑角色扮演': '角色扮演', '战术角色扮演': '角色扮演',
  '策略角色扮演': '策略', '团队角色扮演': '角色扮演',
  '第一人称': '第一人称射击', '第三人称': '第三人称射击',
  '第三人称射击': '第三人称射击',
  '心理恐怖': '恐怖', '生存恐怖': '恐怖',
  '类银河战士恶魔城': '类银河战士恶魔城',
  '类魂系列': '类魂系列',
  '2D 平台': '平台游戏', '3D 平台': '平台游戏', '2D 格斗': '格斗', '平台解谜': '解谜',
  '大型多人在线': '多人', '在线合作': '合作', '本地合作': '合作',
  '玩家对战': '多人', '玩家对战环境': '多人',
  '像素图形': '像素',
  '开放世界生存制作': '生存', '殖民模拟': '模拟', '生活模拟': '模拟', '农场模拟': '模拟',
  '城市营造': '建造', '基地建设': '建造',
  '回合战略': '回合制', '回合制战斗': '回合制', '回合制战术': '回合制',
  '即时战术': '即时战略',
  '黑暗奇幻': '奇幻',
  '卡牌战斗': '卡牌', '卡牌游戏': '卡牌', '牌组构建': '卡牌',
  '视觉小说': '剧情丰富', '互动小说': '剧情丰富',
  '战争游戏': '策略', '战争': '策略', '军事': '射击',
  '僵尸': '恐怖', '后末日': '生存',
  'Mobile': '手游',
  // 过于细碎的标签不映射（会被过滤掉）
};

export default function Home() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const gameListRef = useRef<HTMLDivElement>(null);

  const handleSelectTag = useCallback((tag: string | null) => {
    setSelectedTag(tag);
    // 切换标签后平滑滚动到游戏列表区域
    setTimeout(() => {
      gameListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  // 导航栏只显示核心标签（按游戏数量降序排列）
  const displayTags = useMemo(() => {
    const tagGameCount: Record<string, number> = {};
    
    gamesData.forEach(game => {
      if (!game || !game.tags) return;
      // 每个游戏对每个核心标签只计数一次
      const matchedCoreTags = new Set<string>();
      game.tags.forEach(rawTag => {
        if (rawTag === 'Mobile') {
          matchedCoreTags.add('手游');
          return;
        }
        // 直接匹配核心标签
        if (CORE_TAGS.includes(rawTag)) {
          matchedCoreTags.add(rawTag);
        }
        // 通过映射匹配
        const mapped = TAG_MAPPING[rawTag];
        if (mapped && CORE_TAGS.includes(mapped)) {
          matchedCoreTags.add(mapped);
        }
      });
      matchedCoreTags.forEach(ct => {
        tagGameCount[ct] = (tagGameCount[ct] || 0) + 1;
      });
    });

    // 只保留至少有 2 个游戏的核心标签
    const valid = (tags: string[]) => tags.filter(t => (tagGameCount[t] || 0) >= 2);
    return {
      core: valid(TAG_TIERS.core),
      sub: valid(TAG_TIERS.sub),
      mode: valid(TAG_TIERS.mode),
    };
  }, []);

  // 核心过滤与分类逻辑 (纯粹依赖底层数据)
  const { anchorGames, mobileGames, normalGames } = useMemo(() => {
    let result = [...gamesData].filter(game => game !== null);

    // 标签过滤：选中核心标签时，匹配所有相关的原始标签
    if (selectedTag) {
      result = result.filter(game => {
        if (!game.tags) return false;
        return game.tags.some(rawTag => {
          // 直接匹配
          if (rawTag === selectedTag) return true;
          // Mobile 特殊处理
          if (selectedTag === '手游' && rawTag === 'Mobile') return true;
          // 通过映射匹配
          const mapped = TAG_MAPPING[rawTag];
          if (mapped === selectedTag) return true;
          // 核心标签本身也可能出现在原始标签中
          return false;
        });
      });
    }

    const anchors: typeof result = [];
    const mobiles: typeof result = [];
    const normals: typeof result = [];

    result.forEach(game => {
      if (game.isAnchor) {
        anchors.push(game);
      } else if (game.tags && game.tags.includes('Mobile')) {
        mobiles.push(game);
      } else {
        normals.push(game);
      }
    });

    // 排序逻辑
    const sortFn = (a: any, b: any) => {
      const aIsNative = a.cover && !a.cover.includes('bing');
      const bIsNative = b.cover && !b.cover.includes('bing');
      if (aIsNative && !bIsNative) return -1;
      if (!aIsNative && bIsNative) return 1;
      return b.orderWeight - a.orderWeight;
    };

    return {
      anchorGames: anchors.sort((a, b) => b.orderWeight - a.orderWeight), // 研发项目按权重排
      mobileGames: mobiles.sort(sortFn),
      normalGames: normals.sort(sortFn)
    };
  }, [selectedTag]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* 极简头部 */}
      <div className="pt-16 pb-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="inline-block">
          <h1 className="text-4xl md:text-5xl font-light text-white tracking-wider uppercase drop-shadow-lg">
            My Game List
          </h1>
          <div className="h-1 w-full bg-gradient-to-r from-[#66c0f4] to-transparent mt-2 mb-1"></div>
          <p className="text-[#8f98a0] text-sm tracking-[0.2em] uppercase">
            Design Inspiration By Steam
          </p>
        </div>
      </div>
      
      <FilterBar 
        tagTiers={displayTags} 
        selectedTag={selectedTag} 
        onSelectTag={handleSelectTag} 
      />
      
      <div ref={gameListRef} className="max-w-7xl mx-auto w-full flex-grow pb-10">
        {/* 区域 1：参与研发的项目 (最顶部) */}
        {anchorGames.length > 0 && (
          <div className="mt-8 mb-12">
            <div className="px-4 md:px-8 mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-wide">参与研发</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[#2a475e] to-transparent"></div>
            </div>
            <GameGrid games={anchorGames} />
          </div>
        )}

        {/* 区域 2：游玩与拆解库 (中间) */}
        {normalGames.length > 0 && (
          <div className="mb-12">
            <div className="px-4 md:px-8 mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-wide">游戏经历</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[#2a475e] to-transparent"></div>
            </div>
            <GameGrid games={normalGames} />
          </div>
        )}

        {/* 区域 3：移动端游戏 (移到最下面) */}
        {mobileGames.length > 0 && (
          <div>
            <div className="px-4 md:px-8 mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-wide">移动端游戏</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[#2a475e] to-transparent"></div>
            </div>
            <GameGrid games={mobileGames} />
          </div>
        )}

        {/* 空状态 */}
        {anchorGames.length === 0 && mobileGames.length === 0 && normalGames.length === 0 && (
          <div className="text-center py-20 text-[#8f98a0]">
            <p className="text-xl">没有找到匹配的游戏</p>
            <p className="mt-2">尝试调整过滤条件</p>
          </div>
        )}
      </div>

      {/* 底部文案 */}
      <footer className="w-full py-12 border-t border-[#2a475e] bg-[#171a21] mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center flex flex-col gap-2">
          <p className="text-[#8f98a0] text-sm tracking-wide">
            This represents only a portion of my gaming experience.
          </p>
          <p className="text-[#8f98a0] text-sm tracking-wide">
            The game is still ongoing, and I’ll continue to add more content.
          </p>
        </div>
      </footer>
    </main>
  );
}