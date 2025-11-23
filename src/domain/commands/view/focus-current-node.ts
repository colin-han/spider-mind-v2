import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";

export const focusCurrentNode: CommandDefinition = {
  id: "view.focusCurrentNode",
  name: "聚焦当前节点",
  description: "确保当前节点在视口中可见（保留 15% 边距）",
  category: "view",
  actionBased: true,
  undoable: false,
  handler: (root: MindmapStore) => {
    const state = root.currentEditor!;
    const action = ensureNodeVisibleAction(state.currentNode, state);
    return action ? [action] : [];
  },
};
