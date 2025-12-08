import { getCommand, CommandDefinition } from "./command-registry";
import { useMindmapStore } from "./mindmap-store";
import { parseParams } from "./command-schema";

/**
 * 命令执行请求（对象参数）
 */
export interface CommandRun<TParams = Record<string, unknown>> {
  commandId: string;
  params: TParams;
}

export class CommandManager {
  constructor() {}

  /**
   * 执行命令
   *
   * @param run - 命令执行请求，包含 commandId 和 params（对象格式）
   * @param commandDefinition - 可选的命令定义（用于动态创建的命令，如 CompositeCommand）
   */
  async executeCommand<TParams extends Record<string, unknown>>(
    run: CommandRun<TParams>,
    commandDefinition?: CommandDefinition
  ): Promise<void> {
    const root = useMindmapStore.getState();
    // 优先使用传入的 commandDefinition（用于动态创建的命令，如 CompositeCommand）
    // 否则从 registry 中获取
    const command = commandDefinition || getCommand(run.commandId);
    if (!command) {
      throw new Error(`Command ${run.commandId} not found`);
    }

    // 验证参数
    const validatedParams = parseParams(
      command.paramsSchema,
      run.params,
      run.commandId
    );

    // 检查前置条件
    if (command.when && !command.when(root, validatedParams)) {
      return;
    }

    // 执行命令
    const actions = await command.handler(root, validatedParams);
    if (!actions) {
      return;
    }

    if (command.undoable === false) {
      // 不可撤销的命令，直接批量执行
      await root.acceptActions(actions);
    } else {
      // 可撤销的命令，通过 HistoryManager 执行
      await root.historyManager!.execute({
        commandId: run.commandId,
        description: command.getDescription
          ? command.getDescription(root, validatedParams)
          : command.description,
        actions,
      });

      // 更新 historyVersion 以触发 UI 更新（影响 undo/redo 按钮状态）
      useMindmapStore.setState((state) => {
        state.historyVersion++;
      });
    }
  }
}
