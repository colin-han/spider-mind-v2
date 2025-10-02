"use client";

import { MindmapCard } from "./MindmapCard";
import { EmptyState } from "./EmptyState";
import { CreateButton } from "./CreateButton";
import type { MindmapListItem } from "@/lib/types";

interface MindmapListProps {
  mindmaps: MindmapListItem[];
}

/**
 * 思维导图列表容器
 * 显示所有思维导图卡片或空状态
 */
export function MindmapList({ mindmaps }: MindmapListProps) {
  // 空状态
  if (mindmaps.length === 0) {
    return <EmptyState />;
  }

  return (
    <div data-testid="dashboard-mindmap-list">
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          我的思维导图
        </h2>
        <CreateButton />
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mindmaps.map((mindmap) => (
          <MindmapCard key={mindmap.id} {...mindmap} />
        ))}
      </div>
    </div>
  );
}
