/**
 * MindmapEditor - 思维导图编辑器容器组件
 *
 * 职责:
 * - 管理 MindmapEditorStore 的初始化
 * - 提供顶部工具栏 (返回、标题、保存、撤销/重做)
 * - 展示离线横幅
 * - 组合 MindmapEditorLayout (三栏布局)
 *
 * 不负责:
 * - 具体的编辑 UI (由子组件实现)
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMindmapStore, useMindmapEditorState } from "@/domain/mindmap-store";
import { MindmapEditorLayout } from "./mindmap-editor-layout";
import { SaveButton } from "./save-button";
import { OfflineBanner } from "./offline-banner";
import { ConflictDialog } from "./conflict-dialog";
import type { ConflictResolution } from "@/lib/sync/sync-manager";

/**
 * MindmapEditor Props
 */
export interface MindmapEditorProps {
  mindmapId: string;
}

/**
 * MindmapEditor 容器组件
 */
export function MindmapEditor({ mindmapId }: MindmapEditorProps) {
  const { openMindmap, shortcutManager } = useMindmapStore();
  const editorState = useMindmapEditorState();

  const keyHandle = useCallback(
    (e: KeyboardEvent) => shortcutManager?.handleKeydown(e),
    [shortcutManager]
  );

  useEffect(() => {
    addEventListener("keydown", keyHandle, {
      capture: true,
    });
    return () => {
      removeEventListener("keydown", keyHandle, {
        capture: true,
      });
    };
  }, [keyHandle]);

  // 冲突对话框状态
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    serverUpdatedAt: string;
    localUpdatedAt: string;
    resolve: (resolution: ConflictResolution) => void;
  } | null>(null);

  useEffect(() => {
    openMindmap(mindmapId);
  }, [mindmapId, openMindmap]);

  /**
   * 处理冲突
   */
  const handleConflict = async (info: {
    serverUpdatedAt: string;
    localUpdatedAt: string;
  }): Promise<ConflictResolution> => {
    return new Promise<ConflictResolution>((resolve) => {
      setConflictInfo({
        ...info,
        resolve,
      });
      setShowConflictDialog(true);
    });
  };

  /**
   * 处理冲突解决
   */
  const handleConflictResolve = (resolution: ConflictResolution) => {
    if (conflictInfo?.resolve) {
      conflictInfo.resolve(resolution);
    }
    setShowConflictDialog(false);
    setConflictInfo(null);
  };

  if (!editorState) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <>
      {/* 离线提示横幅 */}
      <OfflineBanner mindmapId={editorState.currentMindmap.short_id} />

      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
        data-testid="mindmap-editor"
      >
        {/* 工具栏 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 返回 Dashboard 链接 */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">返回</span>
                </Link>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editorState.currentMindmap.title}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                {/* 保存按钮 */}
                <SaveButton
                  mindmapId={editorState.currentMindmap.short_id}
                  onSaveSuccess={() => {
                    console.log("[MindmapEditor] 保存成功");
                  }}
                  onSaveError={(error) => {
                    console.error("[MindmapEditor] 保存失败:", error);
                  }}
                  onConflict={handleConflict}
                />

                {/* 状态指示器 */}
                <div className="flex items-center gap-2 text-sm">
                  {!editorState.isSaved ? (
                    <span className="text-orange-600">● 未保存</span>
                  ) : (
                    <span className="text-green-600">✓ 已保存</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 三栏布局内容 */}
        <div className="h-[calc(100vh-129px)]">
          <MindmapEditorLayout />
        </div>
      </div>

      {/* 冲突对话框 */}
      <ConflictDialog
        open={showConflictDialog}
        localVersion={conflictInfo?.localUpdatedAt || ""}
        serverVersion={conflictInfo?.serverUpdatedAt || ""}
        onResolve={handleConflictResolve}
      />
    </>
  );
}
