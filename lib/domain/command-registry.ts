import { CommandCategory } from "../commands";
import { MindmapStore, EditorAction } from "./mindmap-store.types";

const commandRegistry = new Map<string, CommandDefinition>();

export interface CommandDefinition {
  // 基本信息
  id: string; // 唯一标识，如 'node.addChild'
  name: string; // 显示名称，如 '添加子节点'
  description: string; // 描述
  category: CommandCategory; // 命令分类

  undoable?: boolean; // 是否可以撤销, 如果handler返回EditorAction[], 则默认为true，否则默认为false

  // 执行逻辑
  handler: (
    root: MindmapStore,
    params?: unknown[]
  ) => void | Promise<void> | EditorAction[] | Promise<EditorAction[]>;

  // 上下文条件（可选）
  when?: (root: MindmapStore, params?: unknown[]) => boolean;

  getDescription?: (params: unknown[] | undefined) => string;
}

export function registerCommand(def: CommandDefinition) {
  commandRegistry.set(def.id, def);
}

export function getCommand(id: string): CommandDefinition | undefined {
  return commandRegistry.get(id);
}
