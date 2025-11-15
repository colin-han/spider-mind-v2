import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";

/**
 * 重做上一次撤销的操作
 */
export const redoCommand: CommandDefinition = {
  id: "global.redo",
  name: "重做",
  description: "重做上一次撤销的操作",
  category: "global",
  actionBased: false,
  undoable: false, // 重做操作本身不可撤销

  handler: (root: MindmapStore) => {
    if (!root.historyManager) {
      throw new Error("HistoryManager not initialized");
    }

    root.historyManager.redo();
  },

  when: (root: MindmapStore) => {
    // 只有在可以重做时才显示此命令
    return root.historyManager?.canRedo() ?? false;
  },

  getDescription: (root: MindmapStore) => {
    // 返回具体的重做操作描述
    const lastDescription = root.historyManager?.lastRedoDescription();
    return lastDescription ? `重做：${lastDescription}` : "重做";
  },
};

registerCommand(redoCommand);
