/**
 * MiniToolbar - 节点迷你工具栏组件
 *
 * 职责:
 * - 在节点左上角显示迷你工具栏
 * - 处理 hover 状态和缩放逻辑
 * - 复用 NodeToolbar 的命令配置
 *
 * 实现方式:
 * - 始终使用 Portal 渲染到 React Flow 容器顶层，避免被其他节点遮挡
 * - 通过 editorState.layouts 获取节点位置，editorState.viewport 获取视口信息
 * - 使用 nodeToScreenCoords 将节点坐标转换为屏幕坐标
 *
 * 缩放行为:
 * - 非 hover: scale = baseScale * zoom，工具栏随画布缩放，但比标准尺寸小
 * - hover: scale = max(1, zoom * baseScale)，确保工具栏至少为标准尺寸，便于点击
 *
 * 定位计算:
 * - 工具栏底部对齐到节点顶部附近
 * - 使用 transform-origin: bottom left，hover 放大时向上扩展
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { MindmapNode } from "@/lib/types";
import { NodeToolbar } from "@/components/mindmap/node-toolbar";
import { cn } from "@/lib/utils/cn";
import { useMindmapEditorState } from "@/domain/mindmap-store";

/**
 * 将节点坐标系坐标转换为屏幕坐标（相对于 React Flow 容器）
 */
function nodeToScreenCoords(
  nodeX: number,
  nodeY: number,
  viewport: { x: number; y: number; zoom: number }
): { screenX: number; screenY: number } {
  // viewport.x, viewport.y 是视口左上角在节点坐标系中的位置
  // 屏幕坐标 = (节点坐标 - 视口坐标) * zoom
  return {
    screenX: (nodeX - viewport.x) * viewport.zoom,
    screenY: (nodeY - viewport.y) * viewport.zoom,
  };
}

/**
 * MiniToolbar Props
 */
interface MiniToolbarProps {
  /**
   * 当前节点
   */
  node: MindmapNode;

  /**
   * 当前 React Flow 缩放级别
   */
  zoom: number;

  /**
   * 是否可见
   */
  visible: boolean;

  /**
   * 测试 ID
   */
  testId?: string;
}

/**
 * MiniToolbar 组件
 */
export function MiniToolbar({ node, zoom, visible, testId }: MiniToolbarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  const editorState = useMindmapEditorState();

  const toolbarBaseHeight = 32;
  // 计算缩放系数
  // 非 hover: 固定缩小到 1/1.8，与卡片比例协调
  const baseScale = 1 / 1.8;

  // 查找 React Flow 容器作为 Portal 目标
  useEffect(() => {
    const reactFlowContainer = document.querySelector(
      ".react-flow"
    ) as HTMLElement;
    if (reactFlowContainer) {
      setPortalContainer(reactFlowContainer);
    }
  }, []);

  // 计算 Portal 中工具栏的屏幕位置
  const portalPosition = useMemo(() => {
    if (!editorState) return null;

    const layout = editorState.layouts.get(node.short_id);
    if (!layout) return null;

    const scale = Math.max(1, zoom * baseScale);
    const toolbarBottomInNodeCoords = layout.y + toolbarBaseHeight * baseScale;
    const toolbarLeftInNodeCoords = layout.x + 4;

    const { viewport } = editorState;
    const {
      screenX: toolbarLeftInScreenCoords,
      screenY: toolbarBottomInScreenCoords,
    } = nodeToScreenCoords(
      toolbarLeftInNodeCoords,
      toolbarBottomInNodeCoords,
      viewport
    );

    const toolbarTopInScreenCoords =
      toolbarBottomInScreenCoords - toolbarBaseHeight * scale + 2;

    return {
      x: toolbarLeftInScreenCoords,
      y: toolbarTopInScreenCoords,
      scale: isHovered ? scale : baseScale * zoom,
    };
  }, [isHovered, editorState, node.short_id, zoom, baseScale]);

  const toolbarContent = (
    <NodeToolbar
      node={node}
      className="border-0 pb-0 px-1 py-0.5"
      buttonClassName="!bg-transparent hover:!bg-white/80 dark:hover:!bg-white/30"
      {...(testId && { testId: `${testId}-toolbar` })}
    />
  );

  const toolbarStyles = cn(
    // 毛玻璃效果 - 浅色模式和深色模式都使用白色半透明
    "bg-white/60 dark:bg-white/20",
    "backdrop-blur-sm",
    "rounded-md",
    // hover 时增加阴影，非 hover 时半透明
    {
      "shadow-lg opacity-100": isHovered,
      "opacity-60": !isHovered,
    }
  );

  // 使用 Portal 渲染到顶层
  if (portalContainer && portalPosition) {
    return createPortal(
      <div
        className={cn("absolute", "transition-all duration-150", toolbarStyles)}
        style={{
          left: portalPosition.x,
          top: portalPosition.y,
          transform: `scale(${portalPosition.scale})`,
          transformOrigin: "bottom left",
          zIndex: 10000,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {toolbarContent}
      </div>,
      portalContainer
    );
  }

  return null;
}
