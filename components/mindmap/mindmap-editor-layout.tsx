/**
 * MindmapEditorLayout - 思维导图编辑器三栏布局组件
 *
 * 职责:
 * - 提供左中右三栏布局
 * - 管理左侧大纲面板的展开/收起状态
 * - 管理左侧大纲面板的可调整宽度
 * - 组合大纲、图形视图、属性面板
 *
 * 不负责:
 * - Store 初始化 (由 MindmapEditor 管理)
 * - 具体的编辑逻辑 (由子组件实现)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { MindmapOutlineArborist } from "./mindmap-outline-arborist";
import { MindmapGraphViewer } from "./mindmap-graph-viewer";
import { NodePanel } from "./node-panel";
import { cn } from "@/lib/utils/cn";
import { useShortcuts, allBindings } from "@/lib/shortcuts";

// 常量定义
const DEFAULT_OUTLINE_WIDTH = 280;
const MIN_OUTLINE_WIDTH = 180;
const MAX_OUTLINE_WIDTH = 400;
const COLLAPSED_WIDTH = 40;
const STORAGE_KEY = "mindmap-layout-state";

/**
 * 布局状态类型
 */
interface LayoutState {
  isOutlineCollapsed: boolean;
  outlineWidth: number;
}

/**
 * 从 localStorage 加载布局状态
 */
function loadLayoutState(): Partial<LayoutState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as LayoutState;
      return {
        isOutlineCollapsed: state.isOutlineCollapsed ?? true,
        outlineWidth:
          state.outlineWidth &&
          state.outlineWidth >= MIN_OUTLINE_WIDTH &&
          state.outlineWidth <= MAX_OUTLINE_WIDTH
            ? state.outlineWidth
            : DEFAULT_OUTLINE_WIDTH,
      };
    }
  } catch (error) {
    console.error("[MindmapEditorLayout] Failed to load layout state:", error);
  }
  return {};
}

/**
 * 保存布局状态到 localStorage
 */
function saveLayoutState(state: LayoutState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("[MindmapEditorLayout] Failed to save layout state:", error);
  }
}

/**
 * MindmapEditorLayout 组件
 */
export function MindmapEditorLayout() {
  // 从 localStorage 加载初始状态
  const savedState = loadLayoutState();

  // 左侧大纲面板状态
  const [isOutlineCollapsed, setIsOutlineCollapsed] = useState(
    savedState.isOutlineCollapsed ?? true
  );
  const [outlineWidth, setOutlineWidth] = useState(
    savedState.outlineWidth ?? DEFAULT_OUTLINE_WIDTH
  );
  const [isResizing, setIsResizing] = useState(false);

  // 注册所有快捷键
  useShortcuts(allBindings);

  /**
   * 处理拖拽开始
   */
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  /**
   * 处理拖拽中
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;

      // 限制宽度范围
      if (newWidth >= MIN_OUTLINE_WIDTH && newWidth <= MAX_OUTLINE_WIDTH) {
        setOutlineWidth(newWidth);
      }
    },
    [isResizing]
  );

  /**
   * 处理拖拽结束
   */
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  /**
   * 处理双击恢复默认宽度
   */
  const handleDoubleClick = useCallback(() => {
    setOutlineWidth(DEFAULT_OUTLINE_WIDTH);
  }, []);

  /**
   * 添加/移除全局鼠标事件监听
   */
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // 防止拖拽时选中文本
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
    return undefined;
  }, [isResizing, handleMouseMove, handleMouseUp]);

  /**
   * 保存布局状态到 localStorage
   */
  useEffect(() => {
    saveLayoutState({
      isOutlineCollapsed,
      outlineWidth,
    });
  }, [isOutlineCollapsed, outlineWidth]);

  return (
    <div
      className="h-full flex bg-gray-50 dark:bg-gray-900"
      data-testid="mindmap-editor-layout"
    >
      {/* 左侧：大纲面板 */}
      <div
        className={cn(
          "h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 relative",
          !isResizing && "transition-all duration-200"
        )}
        style={{
          width: isOutlineCollapsed ? COLLAPSED_WIDTH : outlineWidth,
        }}
        data-testid="outline-panel"
      >
        <MindmapOutlineArborist
          isCollapsed={isOutlineCollapsed}
          onToggleCollapse={() => setIsOutlineCollapsed(!isOutlineCollapsed)}
        />

        {/* 可拖拽的边界handle - 仅在展开时显示 */}
        {!isOutlineCollapsed && (
          <div
            className={cn(
              "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors",
              isResizing && "bg-blue-500"
            )}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            data-testid="outline-resize-handle"
          />
        )}
      </div>

      {/* 中间：图形视图 */}
      <div className="flex-1 min-w-0" data-testid="graph-viewer-container">
        <ReactFlowProvider>
          <MindmapGraphViewer />
        </ReactFlowProvider>
      </div>

      {/* 右侧：属性面板 */}
      <NodePanel />
    </div>
  );
}
