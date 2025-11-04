import { getCommand } from "./command-registry";
import { useMindmapStore } from "./mindmap-store";

export interface CommandRun {
  commandId: string;
  params: unknown[] | undefined;
}

export class CommandManager {
  constructor() {}

  async executeCommand(run: CommandRun): Promise<void> {
    const root = useMindmapStore.getState();
    const command = getCommand(run.commandId);
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
      }
    }
  }
}
