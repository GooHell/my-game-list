'use client';

import { useState, useEffect } from 'react';

interface TagTiers {
  core: string[];
  sub: string[];
  mode: string[];
}

interface FilterBarProps {
  tagTiers: TagTiers;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
}

function TagButton({ tag, isSelected, onClick, compact = false }: { tag: string; isSelected: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm'} rounded-sm font-medium transition-all duration-200 whitespace-nowrap ${
        isSelected
          ? 'bg-gradient-to-r from-[#47bfff] to-[#1a44c2] text-white shadow-[0_0_10px_rgba(71,191,255,0.3)]'
          : 'bg-[#202d39] text-[#c7d5e0] hover:bg-[#2a475e] hover:text-white border border-[#3d4450]/50'
      }`}
    >
      {tag}
    </button>
  );
}

export default function FilterBar({ tagTiers, selectedTag, onSelectTag, searchQuery, onSearch }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const tierConfig = [
    { label: 'Genre', tags: tagTiers.core },
    { label: 'Sub-Genre', tags: tagTiers.sub },
    { label: 'Mode', tags: tagTiers.mode },
  ];

  const handleTagClick = (tag: string | null) => {
    onSelectTag(tag);
    // 移动端选中后自动收起
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  // ========================
  // 移动端：折叠/展开模式
  // ========================
  if (isMobile) {
    return (
      <div className="sticky top-0 z-30 bg-[#1b2838]/95 backdrop-blur-md border-b border-[#2a475e] shadow-lg">
        <div className="px-3 py-2">
          {/* 收起状态：一行显示当前选中 + 展开按钮 */}
          {!isExpanded && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TagButton
                  tag="全部游戏"
                  isSelected={selectedTag === null && !searchQuery}
                  onClick={() => { handleTagClick(null); onSearch(''); }}
                  compact
                />
                {selectedTag && (
                  <TagButton
                    tag={selectedTag}
                    isSelected={true}
                    onClick={() => handleTagClick(null)}
                    compact
                  />
                )}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="ml-auto px-3 py-1 text-xs text-[#66c0f4] border border-[#66c0f4]/40 rounded-sm bg-[#202d39] hover:bg-[#2a475e] transition-colors flex items-center gap-1"
                >
                  展开游戏类型 ▾
                </button>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="🔍 搜索游戏..."
                className="w-full px-3 py-1.5 text-xs bg-[#202d39] border border-[#3d4450]/50 rounded-sm text-white placeholder-[#8f98a0] outline-none focus:border-[#66c0f4]"
              />
            </div>
          )}

          {/* 展开状态：完整三级标签 */}
          {isExpanded && (
            <div className="space-y-2.5">
              {/* 顶部：标题 + 收起按钮 */}
              <div className="flex items-center justify-between pb-1 border-b border-[#2a475e]/50">
                <TagButton
                  tag="全部游戏"
                  isSelected={selectedTag === null}
                  onClick={() => handleTagClick(null)}
                  compact
                />
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-1 text-xs text-[#66c0f4] border border-[#66c0f4]/40 rounded-sm bg-[#202d39] hover:bg-[#2a475e] transition-colors"
                >
                  收起游戏类型 ▴
                </button>
              </div>

              {tierConfig.map(({ label, tags }, tierIdx) => (
                tags.length > 0 && (
                  <div key={tierIdx}>
                    <span className="text-[#8f98a0] text-xs font-bold mb-1 block">{label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <TagButton
                          key={tag}
                          tag={tag}
                          isSelected={selectedTag === tag}
                          onClick={() => handleTagClick(tag)}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========================
  // 桌面端：三行完整展示
  // ========================
  return (
    <div className="sticky top-0 z-30 bg-[#1b2838]/95 backdrop-blur-md border-b border-[#2a475e] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 space-y-2">
        {tierConfig.map(({ label, tags }, tierIdx) => (
          tags.length > 0 && (
            <div key={tierIdx} className="flex items-center gap-2 flex-wrap">
              <span className="text-[#8f98a0] text-sm w-20 shrink-0 text-left font-bold">
                {label}
              </span>
              {tierIdx === 0 && (
                <>
                  <TagButton
                    tag="全部游戏"
                    isSelected={selectedTag === null && !searchQuery}
                    onClick={() => { onSelectTag(null); onSearch(''); }}
                  />
                  <div className="ml-auto">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearch(e.target.value)}
                      placeholder="🔍 搜索游戏名称..."
                      className="px-3 py-1.5 text-sm bg-[#202d39] border border-[#3d4450]/50 rounded-sm text-white placeholder-[#8f98a0] outline-none focus:border-[#66c0f4] w-48"
                    />
                  </div>
                </>
              )}
              {tierIdx !== 0 && tags.map(tag => (
                <TagButton
                  key={tag}
                  tag={tag}
                  isSelected={selectedTag === tag}
                  onClick={() => onSelectTag(tag)}
                />
              ))}
              {tierIdx === 0 && tags.map(tag => (
                <TagButton
                  key={tag}
                  tag={tag}
                  isSelected={selectedTag === tag}
                  onClick={() => onSelectTag(tag)}
                />
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
}