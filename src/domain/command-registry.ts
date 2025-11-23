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
  | "view" // 视图操作
  | "ai"; // AI 相关操作

/**
 * 命令参数定义
 */
export interface CommandParameter {
  name: string; // 参数名称
  type: string; // 参数类型（TypeScript 类型的字符串表示）
  description?: string; // 参数描述（可选）
  optional?: boolean; // 是否可选，默认为 false
}

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
  parameters?: CommandParameter[]; // 参数定义（用于生成 AI 提示词）

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
  parameters?: CommandParameter[]; // 参数定义（用于生成 AI 提示词）

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

/**
 * 获取指定分类的所有命令
 */
export function getCommandsByCategory(
  category: CommandCategory
): CommandDefinition[] {
  const commands: CommandDefinition[] = [];
  for (const command of commandRegistry.values()) {
    if (command.category === category) {
      commands.push(command);
    }
  }
  return commands;
}

/**
 * 获取多个分类的所有命令
 */
export function getCommandsByCategories(
  categories: CommandCategory[]
): CommandDefinition[] {
  const commands: CommandDefinition[] = [];
  for (const command of commandRegistry.values()) {
    if (categories.includes(command.category)) {
      commands.push(command);
    }
  }
  return commands;
}

/**
 * 格式化参数列表为字符串
 * 例如: (parentId: string, children: NodeTree[])
 */
function formatParameters(params: CommandParameter[]): string {
  if (!params || params.length === 0) {
    return "()";
  }

  const paramStrs = params.map((p) => {
    const optionalMark = p.optional ? "?" : "";
    return `${p.name}${optionalMark}: ${p.type}`;
  });

  return `(${paramStrs.join(", ")})`;
}

/**
 * 生成 AI 提示词中的可用命令列表
 *
 * @param categories 要包含的命令分类
 * @returns 格式化的命令列表文本
 */
export function generateAICommandsPrompt(
  categories: CommandCategory[] = ["node", "navigation"]
): string {
  const commands = getCommandsByCategories(categories);

  // 按分类分组
  const grouped = new Map<CommandCategory, CommandDefinition[]>();
  for (const cmd of commands) {
    if (!grouped.has(cmd.category)) {
      grouped.set(cmd.category, []);
    }
    grouped.get(cmd.category)!.push(cmd);
  }

  const sections: string[] = [];

  // 为每个分类生成一节
  for (const category of categories) {
    const categoryCommands = grouped.get(category);
    if (!categoryCommands || categoryCommands.length === 0) {
      continue;
    }

    // 分类标题
    const categoryTitles: Record<CommandCategory, string> = {
      node: "节点操作",
      navigation: "导航操作",
      edit: "编辑操作",
      global: "全局操作",
      view: "视图操作",
      ai: "AI 操作",
    };

    sections.push(`### ${categoryTitles[category]}`);

    // 为每个命令生成文档
    for (const cmd of categoryCommands) {
      const params = cmd.parameters
        ? formatParameters(cmd.parameters)
        : "(...)";
      sections.push(`- ${cmd.id}${params} - ${cmd.description}`);
    }

    sections.push(""); // 空行
  }

  return sections.join("\n");
}
