import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { EmptyParamsSchema } from "../../command-schema";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";

export const focusCurrentNode: CommandDefinition<typeof EmptyParamsSchema> = {
  id: "view.focusCurrentNode",
  name: "聚焦当前节点",
  description: "确保当前节点在视口中可见（保留 15% 边距）",
  category: "view",
  actionBased: true,
  undoable: false,
  paramsSchema: EmptyParamsSchema,
  handler: (root: MindmapStore, _params) => {
    const state = root.currentEditor!;
    const action = ensureNodeVisibleAction(state.currentNode, state);
    return action ? [action] : [];
  },
};
