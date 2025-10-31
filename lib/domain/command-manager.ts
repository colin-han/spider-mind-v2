import { getCommand } from "./command-registry";
import { MindmapStore } from "./mindmap-store.types";

export interface CommandRun {
  commandId: string;
  params: unknown[] | undefined;
}

export class CommandManager {
  constructor(private readonly root: MindmapStore) {}

  async executeCommand(run: CommandRun): Promise<void> {
    const command = getCommand(run.commandId);
    if (!command) {
      throw new Error(`Command ${run.commandId} not found`);
    }
    if (!command.when || command.when(this.root, run.params)) {
      const actions = await command.handler(this.root, run.params);
      if (!actions) {
        return;
      }
      if (command.undoable == false) {
        actions.forEach((action) => {
          this.root.acceptAction(action);
        });
      } else {
        this.root.historyManager!.execute({
          commandId: run.commandId,
          description: command.getDescription
            ? command.getDescription(this.root, run.params)
            : command.description,
          actions,
        });
      }
    }
  }
}
