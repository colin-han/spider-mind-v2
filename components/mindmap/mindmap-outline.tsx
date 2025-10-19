/**
 * MindmapOutline - 思维导图大纲面板
 *
 * 职责:
 * - 以树状列表形式展示思维导图大纲
 * - 提供收起/展开功能
 * - 复用 NodeTree 组件的核心逻辑
 *
 * 不负责:
 * - Store 初始化
 * - 布局管理 (由 MindmapEditorLayout 管理)
 */

"use client";

import { useEffect, useRef, memo } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { NodeTree } from "./NodeTree";

/**
 * MindmapOutline Props
 */
interface MindmapOutlineProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * MindmapOutline 组件（使用 memo 优化）
 */
export const MindmapOutline = memo(function MindmapOutline({
  isCollapsed,
  onToggleCollapse,
}: MindmapOutlineProps) {
  const { currentMindmap, getRootNode, currentNode } = useMindmapEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const rootNode = currentMindmap ? getRootNode(currentMindmap.id) : null;

  // 当 currentNode 变化时，自动滚动到可视区域
  useEffect(() => {
    if (!currentNode || isCollapsed || !containerRef.current) {
      return;
    }

    // 延迟执行，确保 DOM 已更新
    const timer = setTimeout(() => {
      const nodeElement = containerRef.current?.querySelector(
        `[data-testid="mindmap-node-${currentNode}"]`
      );

      if (nodeElement) {
        nodeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentNode, isCollapsed]);

  // 收起状态：只显示展开按钮
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="展开大纲"
          data-testid="outline-expand-button"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
        <div className="mt-4">
          <BookOpen className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    );
  }

  // 展开状态：显示完整大纲
  return (
    <div className="h-full flex flex-col" data-testid="mindmap-outline">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">大纲</h3>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="收起大纲"
          data-testid="outline-collapse-button"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* 大纲内容 - 仅在展开时渲染 */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
        {!currentMindmap && (
          <div className="text-sm text-gray-500 text-center py-8">
            未加载思维导图
          </div>
        )}

        {currentMindmap && !rootNode && (
          <div className="text-sm text-red-500 text-center py-8">
            错误: 未找到根节点
          </div>
        )}

        {rootNode && (
          <div data-testid="outline-tree">
            <NodeTree nodeId={rootNode.short_id} depth={0} />
          </div>
        )}
      </div>
    </div>
  );
});
