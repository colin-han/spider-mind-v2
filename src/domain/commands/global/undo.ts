import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";

/**
 * 撤销上一次操作
 */
export const undoCommand: CommandDefinition = {
  id: "global.undo",
  name: "撤销",
  description: "撤销上一次操作",
  category: "global",
  actionBased: false,
  undoable: false, // 撤销操作本身不可撤销

  handler: (root: MindmapStore) => {
    if (!root.historyManager) {
      throw new Error("HistoryManager not initialized");
    }

    root.historyManager.undo();
  },

  when: (root: MindmapStore) => {
    // 只有在可以撤销时才显示此命令
    return root.historyManager?.canUndo() ?? false;
  },

  getDescription: (root: MindmapStore) => {
    // 返回具体的撤销操作描述
    const lastDescription = root.historyManager?.lastUndoDescription();
    return lastDescription ? `撤销：${lastDescription}` : "撤销";
  },
};

registerCommand(undoCommand);
