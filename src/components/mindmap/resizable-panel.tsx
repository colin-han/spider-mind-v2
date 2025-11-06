/**
 * ResizablePanel - 可调整宽度的面板容器
 *
 * 职责:
 * - 提供可拖拽调整宽度的容器
 * - 持久化面板宽度到 localStorage
 * - 提供清晰的视觉反馈 (hover 和拖拽中)
 *
 * 设计决策:
 * - 宽度保存到 localStorage (纯 UI 偏好设置)
 * - 不通过 IndexedDB 持久化中间件
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * ResizablePanel Props
 */
export interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  className?: string;
}

const STORAGE_KEY = "mindmap-panel-width";

/**
 * ResizablePanel 组件
 */
export function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth,
  className,
}: ResizablePanelProps) {
  // 从 localStorage 读取保存的宽度
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return defaultWidth;

    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      // 确保在有效范围内
      if (parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 开始拖拽
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  // 停止拖拽
  const stopResizing = useCallback(() => {
    setIsResizing(false);
    // 保存宽度到 localStorage
    localStorage.setItem(STORAGE_KEY, width.toString());
  }, [width]);

  // 拖拽过程中调整宽度
  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      // 从右往左拖拽
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(clampedWidth);
    },
    [isResizing, minWidth, maxWidth]
  );

  // 监听鼠标移动和释放事件
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);

      return () => {
        window.removeEventListener("mousemove", resize);
        window.removeEventListener("mouseup", stopResizing);
      };
    }
    return undefined;
  }, [isResizing, resize, stopResizing]);

  return (
    <div
      ref={panelRef}
      data-testid="resizable-panel"
      className={cn("relative", className)}
      style={{ width }}
    >
      {/* 拖拽手柄 */}
      <div
        data-testid="resizable-panel-handle"
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          "cursor-col-resize transition-colors",
          "hover:bg-blue-500",
          {
            "bg-blue-500": isResizing,
          }
        )}
        onMouseDown={startResizing}
      />

      {/* 内容区域 */}
      <div className="h-full overflow-y-auto">{children}</div>
    </div>
  );
}
