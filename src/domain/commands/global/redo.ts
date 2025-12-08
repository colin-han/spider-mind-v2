import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { EmptyParamsSchema } from "../../command-schema";
import { useMindmapStore } from "../../mindmap-store";

/**
 * 重做上一次撤销的操作
 */
export const redoCommand: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "global.redo",
  name: "重做",
  description: "重做上一次撤销的操作",
  category: "global",
  actionBased: false,
  undoable: false, // 重做操作本身不可撤销
  paramsSchema: EmptyParamsSchema,

  handler: async (root: MindmapStore, _params) => {
    if (!root.historyManager) {
      throw new Error("HistoryManager not initialized");
    }

    await root.historyManager.redo();

    // 手动触发 zustand 更新，以便 UI 能响应 historyManager 状态的变化
    useMindmapStore.setState((state) => {
      state.historyVersion++;
    });
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
