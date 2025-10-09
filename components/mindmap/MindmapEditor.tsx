"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { useMindmapData } from "@/lib/hooks/use-mindmap-data";
import { NodeTree } from "./NodeTree";
import { FloatingNodeList } from "./FloatingNodeList";
import { SaveButton } from "./save-button";
import { UndoRedoButtons } from "./undo-redo-buttons";
import { OfflineBanner } from "./offline-banner";
import type { Mindmap, MindmapNode } from "@/lib/types";

interface MindmapEditorProps {
  mindmap: Mindmap;
  initialNodes: MindmapNode[];
}

export function MindmapEditor({ mindmap, initialNodes }: MindmapEditorProps) {
  const { isInitialized } = useMindmapData(mindmap, initialNodes);
  const { getRootNode, isDirty, isSynced, clearSelection } =
    useMindmapEditorStore();

  const rootNode = getRootNode(mindmap.id);

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

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!rootNode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">错误: 未找到根节点</div>
      </div>
    );
  }

  return (
    <>
      {/* 离线提示横幅 */}
      <OfflineBanner mindmapId={mindmap.short_id} />

      <div
        className="min-h-screen bg-gray-50 p-8"
        onClick={handleBackgroundClick}
        data-testid="mindmap-editor"
      >
        <div className="max-w-7xl mx-auto">
          {/* 工具栏 */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 返回 Dashboard 链接 */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">返回</span>
                </Link>

                <h1 className="text-2xl font-bold text-gray-900">
                  {mindmap.title}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                {/* 撤销/重做按钮 */}
                <UndoRedoButtons />

                {/* 保存按钮 */}
                <SaveButton
                  mindmapId={mindmap.short_id}
                  onSaveSuccess={() => {
                    console.log("保存成功");
                  }}
                  onSaveError={(error) => {
                    console.error("保存失败:", error);
                  }}
                />

                {/* 状态指示器 */}
                <div className="flex items-center gap-2 text-sm">
                  {isDirty ? (
                    <span className="text-orange-600">● 未保存</span>
                  ) : (
                    <span className="text-green-600">✓ 已保存</span>
                  )}
                  {!isSynced && <span className="text-gray-500">(未同步)</span>}
                </div>
              </div>
            </div>
            {mindmap.description && (
              <p className="text-gray-600 mt-2">{mindmap.description}</p>
            )}
          </div>

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
              <FloatingNodeList mindmapId={mindmap.id} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
