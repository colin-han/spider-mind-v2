/**
 * MindmapEditor - 思维导图编辑器容器组件
 *
 * 职责:
 * - 管理 MindmapEditorStore 的初始化
 * - 提供顶部工具栏 (返回、标题、保存、撤销/重做)
 * - 展示离线横幅
 * - 组合 MindmapEditorTabs (包含两个视图)
 *
 * 不负责:
 * - 具体的编辑 UI (由子组件实现)
 */

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMindmapData } from "@/lib/hooks/use-mindmap-data";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import { MindmapEditorTabs } from "./mindmap-editor-tabs";
import { SaveButton } from "./save-button";
import { UndoRedoButtons } from "./undo-redo-buttons";
import { OfflineBanner } from "./offline-banner";
import type { Mindmap, MindmapNode } from "@/lib/types";

/**
 * MindmapEditor Props
 */
export interface MindmapEditorProps {
  mindmap: Mindmap;
  initialNodes: MindmapNode[];
}

/**
 * MindmapEditor 容器组件
 */
export function MindmapEditor({ mindmap, initialNodes }: MindmapEditorProps) {
  const { isInitialized } = useMindmapData(mindmap, initialNodes);
  const { isDirty, isSynced, clearSyncStatus } = useMindmapEditorStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <>
      {/* 离线提示横幅 */}
      <OfflineBanner mindmapId={mindmap.short_id} />

      <div className="min-h-screen bg-gray-50" data-testid="mindmap-editor">
        {/* 工具栏 */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8 py-4">
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
                    console.log("[MindmapEditor] 保存成功，清除同步状态");
                    clearSyncStatus();
                  }}
                  onSaveError={(error) => {
                    console.error("[MindmapEditor] 保存失败:", error);
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
        </div>

        {/* Tab 页内容 */}
        <div className="h-[calc(100vh-129px)]">
          <MindmapEditorTabs />
        </div>
      </div>
    </>
  );
}
