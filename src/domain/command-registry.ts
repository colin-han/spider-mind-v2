import { MindmapStore, EditorAction } from "./mindmap-store.types";

const commandRegistry = new Map<string, CommandDefinition>();

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
 * 基于 Action 的命令 - 返回 EditorAction[]，支持 undo/redo
 */
export interface ActionBasedCommandDefinition {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  actionBased: true; // 类型标记
  undoable?: boolean; // 是否可撤销，默认为 true

  handler: (
    root: MindmapStore,
    params?: unknown[]
  ) => EditorAction[] | Promise<EditorAction[]> | void | Promise<void>;

  when?: (root: MindmapStore, params?: unknown[]) => boolean;
  getDescription?: (root: MindmapStore, params?: unknown[]) => string;
}

/**
 * 命令式命令 - 直接执行，不返回 actions
 */
export interface ImperativeCommandDefinition {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  actionBased: false; // 类型标记
  undoable?: boolean;

  handler: (root: MindmapStore, params?: unknown[]) => void | Promise<void>;

  when?: (root: MindmapStore, params?: unknown[]) => boolean;
  getDescription?: (root: MindmapStore, params?: unknown[]) => string;
}

/**
 * 命令定义联合类型
 */
export type CommandDefinition =
  | ActionBasedCommandDefinition
  | ImperativeCommandDefinition;

export function registerCommand(def: CommandDefinition) {
  commandRegistry.set(def.id, def);
}

export function getCommand(id: string): CommandDefinition | undefined {
  return commandRegistry.get(id);
}
