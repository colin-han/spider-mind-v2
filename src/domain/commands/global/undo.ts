import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { EmptyParamsSchema } from "../../command-schema";
import { useMindmapStore } from "../../mindmap-store";

/**
 * 撤销上一次操作
 */
export const undoCommand: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "global.undo",
  name: "撤销",
  description: "撤销上一次操作",
  category: "global",
  actionBased: false,
  undoable: false, // 撤销操作本身不可撤销
  paramsSchema: EmptyParamsSchema,

  handler: async (root: MindmapStore, _params) => {
    if (!root.historyManager) {
      throw new Error("HistoryManager not initialized");
    }

    await root.historyManager.undo();

    // 手动触发 zustand 更新，以便 UI 能响应 historyManager 状态的变化
    useMindmapStore.setState((state) => {
      state.historyVersion++;
    });
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
