import { CommandDefinition, registerCommand } from "../../command-registry";
import { MindmapStore } from "../../mindmap-store.types";

export const aiAssist: CommandDefinition = {
  id: "ai.assist",
  name: "AI 助手",
  description: "基于当前节点提供 AI 辅助",
  category: "ai",
  actionBased: false,

  handler: (_root: MindmapStore) => {
    // TODO: 实现逻辑
  },

  when: (root: MindmapStore) => root.currentEditor?.currentNode !== null,
};

registerCommand(aiAssist);
