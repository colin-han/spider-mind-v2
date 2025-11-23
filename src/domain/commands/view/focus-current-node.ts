import type { CommandDefinition } from "../../command-registry";
import type { MindmapStore } from "../../mindmap-store.types";
import { centerOnNodeAction } from "../../utils/viewport-utils";

export const focusCurrentNode: CommandDefinition = {
  id: "view.focusCurrentNode",
  name: "聚焦当前节点",
  description: "将当前节点居中显示",
  category: "view",
  actionBased: true,
  undoable: false,
  handler: (root: MindmapStore) => {
    const state = root.currentEditor!;
    const action = centerOnNodeAction(state.currentNode, state);
    return action ? [action] : [];
  },
};
