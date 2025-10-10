/**
 * MindmapEditorTabs - 思维导图编辑器 Tab 页包装组件
 *
 * 职责:
 * - 提供两个 Tab 页切换
 * - Tab 1: 树状结构视图
 * - Tab 2: 图形化视图
 *
 * 不负责:
 * - Store 初始化 (由 MindmapEditor 管理)
 * - 工具栏 (由 MindmapEditor 管理)
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { MindmapTreeViewer } from "./mindmap-tree-viewer";
import { MindmapGraphViewer } from "./mindmap-graph-viewer";
import { NodePanel, type NodePanelRef } from "./node-panel";
import { cn } from "@/lib/utils/cn";

/**
 * Tab 类型
 */
type TabType = "tree" | "graph";

/**
 * MindmapEditorTabs 组件
 */
export function MindmapEditorTabs() {
  const [activeTab, setActiveTab] = useState<TabType>("tree");
  const panelRef = useRef<NodePanelRef>(null);

  // 双击编辑功能 - 聚焦编辑面板标题输入框
  const handleNodeEdit = useCallback(() => {
    panelRef.current?.focusTitleInput();
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab 导航栏 */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8">
          <nav className="flex gap-8" aria-label="编辑器视图切换">
            {/* 树状结构 Tab */}
            <button
              data-testid="tab-tree"
              onClick={() => setActiveTab("tree")}
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                activeTab === "tree"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
              aria-current={activeTab === "tree" ? "page" : undefined}
            >
              📋 树状结构
            </button>

            {/* 图形化 Tab */}
            <button
              data-testid="tab-graph"
              onClick={() => setActiveTab("graph")}
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                activeTab === "graph"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
              aria-current={activeTab === "graph" ? "page" : undefined}
            >
              🗺️ 图形化视图
            </button>
          </nav>
        </div>
      </div>

      {/* Tab 内容区域 */}
      <div className="flex-1 overflow-hidden" data-testid="tab-content">
        {activeTab === "tree" && (
          <div data-testid="tree-viewer-container" className="h-full">
            <MindmapTreeViewer />
          </div>
        )}

        {activeTab === "graph" && (
          <div data-testid="graph-viewer-container" className="h-full flex">
            {/* 左侧: 图形展示 */}
            <div className="flex-1">
              <ReactFlowProvider>
                <MindmapGraphViewer onNodeEdit={handleNodeEdit} />
              </ReactFlowProvider>
            </div>

            {/* 右侧: 编辑面板 */}
            <NodePanel ref={panelRef} />
          </div>
        )}
      </div>
    </div>
  );
}
