/**
 * 撤销/重做按钮组件
 *
 * 功能:
 * - 显示撤销和重做按钮
 * - 支持快捷键 (Cmd+Z / Ctrl+Z, Cmd+Shift+Z / Ctrl+Shift+Z)
 * - 根据状态禁用按钮
 */

"use client";

import { useEffect, useCallback } from "react";
import { Undo2, Redo2 } from "lucide-react";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";

export interface UndoRedoButtonsProps {
  className?: string;
}

export function UndoRedoButtons({ className }: UndoRedoButtonsProps) {
  const { canUndo, canRedo, undo, redo, updateUndoRedoState, currentMindmap } =
    useMindmapEditorStore();

  // 使用 useCallback 稳定函数引用
  const handleUndo = useCallback(async () => {
    try {
      await undo();
      console.log("[UndoRedoButtons] Undo completed");
    } catch (error) {
      console.error("[UndoRedoButtons] Undo failed:", error);
    }
  }, [undo]);

  const handleRedo = useCallback(async () => {
    try {
      await redo();
      console.log("[UndoRedoButtons] Redo completed");
    } catch (error) {
      console.error("[UndoRedoButtons] Redo failed:", error);
    }
  }, [redo]);

  // 初始化时更新状态
  useEffect(() => {
    if (currentMindmap) {
      void updateUndoRedoState();
    }
  }, [currentMindmap, updateUndoRedoState]);

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      if (!modKey || !currentMindmap) {
        return;
      }

      // Cmd+Z / Ctrl+Z: 撤销
      if (event.key === "z" && !event.shiftKey && canUndo) {
        event.preventDefault();
        void handleUndo();
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z: 重做
      if (event.key === "z" && event.shiftKey && canRedo) {
        event.preventDefault();
        void handleRedo();
      }

      // Cmd+Y / Ctrl+Y: 重做 (Windows 惯例)
      if (event.key === "y" && !isMac && canRedo) {
        event.preventDefault();
        void handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, currentMindmap, handleUndo, handleRedo]);

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        {/* 撤销按钮 */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-gray-800"
          title="撤销 (Cmd+Z / Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
          <span className="hidden sm:inline">撤销</span>
        </button>

        {/* 重做按钮 */}
        <button
          type="button"
          onClick={handleRedo}
          disabled={!canRedo}
          className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-gray-800"
          title="重做 (Cmd+Shift+Z / Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
          <span className="hidden sm:inline">重做</span>
        </button>
      </div>
    </div>
  );
}
