import { getCommand, CommandDefinition } from "../../command-registry";
import { MindmapStore, EditorAction } from "../../mindmap-store.types";
import { EmptyParamsSchema } from "../../command-schema";

/**
 * 子命令定义
 *
 * 约束：
 * - 必须是 actionBased: true 的命令
 * - 必须是可撤销的命令（undoable !== false）
 */
export interface SubCommand {
  commandId: string; // 子命令ID，如 "node.addChild"
  params: Record<string, unknown>; // 子命令参数（对象格式）
}

/**
 * 创建组合命令
 *
 * 返回一个标准的 CommandDefinition，可以通过 commandManager 执行
 *
 * 约束：
 * - 所有子命令必须是 actionBased: true
 * - 所有子命令必须是 undoable: true（默认）或未显式设置为 false
 *
 * @param description - 操作描述，显示在 undo/redo 历史中
 * @param subCommands - 子命令列表
 * @returns CommandDefinition - 标准命令定义
 */
export function createCompositeCommand(
  description: string,
  subCommands: SubCommand[]
): CommandDefinition<typeof EmptyParamsSchema> {
  return {
    id: `ai.composite.${Date.now()}`, // 临时 id，仅用于显示
    name: description,
    description,
    category: "ai",
    actionBased: true,
    paramsSchema: EmptyParamsSchema,

    // handler 实现收集 actions 的逻辑
    handler: async (root: MindmapStore, _params): Promise<EditorAction[]> => {
      const allActions: EditorAction[] = [];

      // 收集所有 actions
      // 在这个阶段，任何失败都会中止整个执行，不会执行任何 action
      for (const { commandId, params } of subCommands) {
        // 获取子命令
        const command = getCommand(commandId);
        if (!command) {
          throw new Error(`Command ${commandId} not found, execution aborted`);
        }

        // 检查命令类型：必须是 actionBased: true
        if (command.actionBased === false) {
          throw new Error(
            `Command ${commandId} is not action-based, cannot be used in composite command`
          );
        }

        // 检查命令是否可撤销：不支持 undoable: false
        if (command.undoable === false) {
          throw new Error(
            `Command ${commandId} is not undoable (undoable: false), cannot be used in composite command`
          );
        }

        // 验证参数
        const validatedParams = command.paramsSchema.parse(params);

        // 检查前置条件
        if (command.when && !command.when(root, validatedParams)) {
          throw new Error(
            `Command ${commandId} precondition not met, execution aborted`
          );
        }

        // 执行子命令，收集 actions（不执行）
        const actions = await command.handler(root, validatedParams);

        if (actions && Array.isArray(actions)) {
          allActions.push(...actions);
        }
      }

      // 返回所有 actions
      // commandManager 会自动将这些 actions 记录到 historyManager 并执行
      return allActions;
    },
  };
}
