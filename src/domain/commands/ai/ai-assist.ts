import { CommandDefinition, registerCommand } from "../../command-registry";
import { MindmapStore } from "../../mindmap-store.types";
import { EmptyParamsSchema } from "../../command-schema";

export const aiAssist: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "ai.assist",
  name: "AI 助手",
  description: "基于当前节点提供 AI 辅助",
  category: "ai",
  actionBased: false,
  paramsSchema: EmptyParamsSchema,

  handler: (_root: MindmapStore, _params) => {
    // TODO: 实现逻辑
  },

  when: (root: MindmapStore, _params) =>
    root.currentEditor?.currentNode !== null,
};

registerCommand(aiAssist);
