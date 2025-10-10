/**
 * MindmapTreeViewer - 思维导图树状展示组件
 *
 * 职责:
 * - 以树状列表形式展示思维导图
 * - 提供节点的增删改操作
 * - 展示浮动节点列表
 *
 * 不负责:
 * - Store 初始化 (由 MindmapEditor 管理)
 * - 数据持久化
 * - 顶部工具栏 (保存、撤销等按钮)
 */

"use client";

import { useEffect } from "react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { NodeTree } from "./NodeTree";
import { FloatingNodeList } from "./FloatingNodeList";

/**
 * MindmapTreeViewer 组件
 */
export function MindmapTreeViewer() {
  const { currentMindmap, getRootNode, clearSelection } =
    useMindmapEditorStore();

  const rootNode = currentMindmap ? getRootNode(currentMindmap.id) : null;

  // 点击空白区域清空选中
  const handleBackgroundClick = () => {
    clearSelection();
  };

  // Escape 键清空选中
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection]);

  if (!currentMindmap) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">未加载思维导图</div>
      </div>
    );
  }

  if (!rootNode) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-red-500">错误: 未找到根节点</div>
      </div>
    );
  }

  return (
    <div
      className="h-full bg-gray-50 p-8"
      onClick={handleBackgroundClick}
      data-testid="mindmap-tree-viewer"
    >
      <div className="max-w-7xl mx-auto">
        {/* 编辑区域 */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* 主树区域 */}
          <div className="flex-1 bg-white rounded-lg shadow p-6 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              思维导图
            </h2>
            <div data-testid="main-tree">
              <NodeTree nodeId={rootNode.short_id} depth={0} />
            </div>
          </div>

          {/* 浮动节点区域 */}
          <div className="w-full md:w-80 flex-shrink-0">
            <FloatingNodeList mindmapId={currentMindmap.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
