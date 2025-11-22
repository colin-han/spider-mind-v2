import { getCommand, CommandDefinition } from "./command-registry";
import { useMindmapStore } from "./mindmap-store";

export interface CommandRun {
  commandId: string;
  params: unknown[] | undefined;
}

export class CommandManager {
  constructor() {}

  async executeCommand(
    run: CommandRun,
    commandDefinition?: CommandDefinition
  ): Promise<void> {
    const root = useMindmapStore.getState();
    // 优先使用传入的 commandDefinition（用于动态创建的命令，如 CompositeCommand）
    // 否则从 registry 中获取
    const command = commandDefinition || getCommand(run.commandId);
    if (!command) {
      throw new Error(`Command ${run.commandId} not found`);
    }
    if (!command.when || command.when(root, run.params)) {
      const actions = await command.handler(root, run.params);
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
            ? command.getDescription(root, run.params)
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
}
