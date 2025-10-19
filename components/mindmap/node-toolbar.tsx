/**
 * NodeToolbar - 节点操作工具栏
 *
 * 职责:
 * - 提供节点的快捷操作按钮
 * - 基于 CommandBar 实现，复用命令系统
 * - 可在 NodePanel 和 GraphViewer 中使用
 *
 * 特性:
 * - 统一的命令驱动架构
 * - 自动显示命令名称、描述和快捷键
 * - 支持自定义样式和布局
 */

"use client";

import { useMemo } from "react";
import type { MindmapNode } from "@/lib/types";
import {
  CornerDownRight,
  ArrowUpToLine,
  ArrowDownToLine,
  Trash2,
  Sparkles,
} from "lucide-react";
import { CommandBar, type CommandGroup } from "@/components/common/command-bar";
import { cn } from "@/lib/utils/cn";

/**
 * NodeToolbar Props
 */
interface NodeToolbarProps {
  /**
   * 当前节点
   */
  node: MindmapNode;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 测试 ID
   */
  testId?: string;
}

/**
 * NodeToolbar 组件
 */
export function NodeToolbar({
  node,
  className,
  testId = "node-toolbar",
}: NodeToolbarProps) {
  // 是否是根节点
  const isRootNode = node.parent_id === null;

  // 工具栏命令配置
  const toolbarCommands: CommandGroup[] = useMemo(
    () => [
      // AI 按钮组
      [
        {
          commandId: "ai.assist",
          icon: Sparkles,
          testId: "ai-agent-button",
        },
      ],
      // 分隔符
      "separator",
      // 节点操作按钮组
      [
        {
          commandId: "node.addChild",
          icon: CornerDownRight,
          testId: "add-child-button",
        },
        {
          commandId: "node.addSiblingAbove",
          icon: ArrowUpToLine,
          disabled: isRootNode,
          testId: "add-sibling-above-button",
        },
        {
          commandId: "node.addSiblingBelow",
          icon: ArrowDownToLine,
          disabled: isRootNode,
          testId: "add-sibling-below-button",
        },
        {
          commandId: "node.delete",
          icon: Trash2,
          variant: "danger",
          disabled: isRootNode,
          testId: "delete-node-button",
        },
      ],
    ],
    [isRootNode]
  );

  return (
    <div
      className={cn("pb-3 border-b border-gray-200", className)}
      data-testid={testId}
    >
      <CommandBar commands={toolbarCommands} />
    </div>
  );
}
