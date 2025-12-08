import { z } from "zod";
import { MindmapStore, EditorAction } from "./mindmap-store.types";
import type { CommandParamsSchema } from "./command-schema";

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
 * 基于 Action 的命令 - 返回 EditorAction[]，支持 undo/redo
 */
export interface ActionBasedCommandDefinition<
  TParams extends CommandParamsSchema = CommandParamsSchema,
> {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  actionBased: true; // 类型标记
  undoable?: boolean; // 是否可撤销，默认为 true

  /** 参数 schema（Zod 定义） */
  paramsSchema: TParams;

  handler: (
    root: MindmapStore,
    params: z.infer<TParams>
  ) => EditorAction[] | Promise<EditorAction[]> | void | Promise<void>;

  when?: (root: MindmapStore, params: z.infer<TParams>) => boolean;
  getDescription?: (root: MindmapStore, params: z.infer<TParams>) => string;
}

/**
 * 命令式命令 - 直接执行，不返回 actions
 */
export interface ImperativeCommandDefinition<
  TParams extends CommandParamsSchema = CommandParamsSchema,
> {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  actionBased: false; // 类型标记
  undoable?: boolean;

  /** 参数 schema（Zod 定义） */
  paramsSchema: TParams;

  handler: (
    root: MindmapStore,
    params: z.infer<TParams>
  ) => void | Promise<void>;

  when?: (root: MindmapStore, params: z.infer<TParams>) => boolean;
  getDescription?: (root: MindmapStore, params: z.infer<TParams>) => string;
}

/**
 * 命令定义联合类型
 */
export type CommandDefinition<
  TParams extends CommandParamsSchema = CommandParamsSchema,
> =
  | ActionBasedCommandDefinition<TParams>
  | ImperativeCommandDefinition<TParams>;

/**
 * 注册命令
 */
export function registerCommand<TParams extends CommandParamsSchema>(
  def: CommandDefinition<TParams>
) {
  commandRegistry.set(def.id, def as CommandDefinition);
}

/**
 * 获取命令
 */
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
 * 获取所有已注册的命令
 */
export function getAllCommands(): CommandDefinition[] {
  return Array.from(commandRegistry.values());
}

/**
 * 生成 AI 可用命令的提示词
 *
 * @param categories - 要包含的命令分类
 * @returns 格式化的命令列表字符串
 */
export function generateAICommandsPrompt(
  categories: CommandCategory[]
): string {
  const commands = getCommandsByCategories(categories);

  if (commands.length === 0) {
    return "暂无可用命令";
  }

  const lines: string[] = [];

  for (const command of commands) {
    lines.push(`### ${command.id}`);
    lines.push(`- **名称**: ${command.name}`);
    lines.push(`- **描述**: ${command.description}`);

    // 生成参数说明
    if (command.paramsSchema) {
      const shape = (command.paramsSchema as z.ZodObject<z.ZodRawShape>).shape;
      if (shape && Object.keys(shape).length > 0) {
        lines.push("- **参数**:");
        for (const [key, value] of Object.entries(shape)) {
          const zodType = value as z.ZodTypeAny;
          const description = zodType.description || "";
          const isOptional = zodType.isOptional?.() ?? false;
          lines.push(
            `  - \`${key}\`${isOptional ? " (可选)" : ""}: ${description}`
          );
        }
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
