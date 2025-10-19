/**
 * 命令系统类型定义
 *
 * 基于文档: docs/draft/command-system-architecture.md
 */

import type { MindmapEditorStore } from "@/lib/store/mindmap-editor.types";

/**
 * 命令分类
 */
export type CommandCategory =
  | "node" // 节点操作
  | "navigation" // 导航操作
  | "edit" // 编辑操作
  | "global" // 全局操作
  | "ai"; // AI 相关操作

/**
 * 命令执行上下文
 *
 * 设计原则：
 * - 单一数据源：所有状态都从 store 获取
 * - selectedNode 可通过 store.nodes.get(store.currentNode!) 获取
 * - focusedArea 可通过 store.focusedArea 获取
 */
export interface CommandContext {
  // Zustand store 访问（单一数据源）
  store: MindmapEditorStore;

  // 额外参数（用于命令特定数据）
  params?: Record<string, unknown>;
}

/**
 * 命令定义
 */
export interface Command {
  // 基本信息
  id: string; // 唯一标识，如 'node.addChild'
  name: string; // 显示名称，如 '添加子节点'
  description: string; // 描述
  category: CommandCategory; // 命令分类

  // 执行逻辑
  handler: (context: CommandContext) => void | Promise<void>;

  // 上下文条件（可选）
  when?: (context: CommandContext) => boolean;

  // 元数据（用于未来扩展）
  icon?: string; // 图标（用于 UI）
  tags?: string[]; // 标签（用于搜索）
}
