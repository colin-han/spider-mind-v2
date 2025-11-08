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

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { Undo2, Redo2, Save } from "lucide-react";
import { useMindmapStore, useMindmapEditorState } from "@/domain/mindmap-store";
import { MindmapEditorLayout } from "./mindmap-editor-layout";
import { CommandButton } from "@/components/common/command-button";
import { OfflineBanner } from "./offline-banner";

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
  const { openMindmap, shortcutManager, historyManager } = useMindmapStore();
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

  useEffect(() => {
    openMindmap(mindmapId);
  }, [mindmapId, openMindmap]);

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
          <div className="relative flex items-center justify-between px-4 py-3">
            {/* 左侧：网站图标 + 返回 */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
              data-testid="mindmap-header-logo"
            >
              <div className="text-xl font-bold">🕸️ Spider Mind</div>
            </Link>

            {/* 中间：思维导图标题 */}
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl font-semibold text-gray-900 dark:text-white">
              {editorState.currentMindmap.title}
            </h1>

            {/* 右侧：工具栏 */}
            <div className="flex items-center gap-2">
              {/* Undo 按钮 */}
              <CommandButton
                commandId="global.undo"
                icon={Undo2}
                testId="undo-button"
                disabled={!historyManager?.canUndo()}
              />

              {/* Redo 按钮 */}
              <CommandButton
                commandId="global.redo"
                icon={Redo2}
                testId="redo-button"
                disabled={!historyManager?.canRedo()}
              />

              {/* 分隔线 */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

              {/* Save 按钮 */}
              <CommandButton
                commandId="global.save"
                icon={Save}
                testId="save-button"
                disabled={editorState.isSaved}
              />

              {/* 状态指示器 */}
              <div className="flex items-center gap-2 text-sm ml-2">
                {!editorState.isSaved ? (
                  <span className="text-orange-600 dark:text-orange-400">
                    ● 未保存
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ 已保存
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 三栏布局内容 */}
        <div className="h-[calc(100vh-129px)]">
          <MindmapEditorLayout />
        </div>
      </div>
    </>
  );
}
