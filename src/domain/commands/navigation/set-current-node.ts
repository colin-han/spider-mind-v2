import { CommandDefinition } from "../../command-registry";
import { MindmapStore, EditorAction } from "../../mindmap-store.types";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { registerCommand } from "../../command-registry";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";

export type SetCurrentNodeParams = [nodeId: string];

export const setCurrentNode: CommandDefinition = {
  id: "navigation.setCurrentNode",
  name: "设置当前节点",
  description: "设置当前选中的节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  parameters: [
    {
      name: "nodeId",
      type: "string",
      description: "要选中的节点 ID",
    },
  ],
  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as SetCurrentNodeParams) || [];
    const state = root.currentEditor!;

    const actions: EditorAction[] = [
      new SetCurrentNodeAction({
        oldNodeId: state.currentNode,
        newNodeId: nodeId,
      }),
    ];

    // 确保新节点在可视区域内
    const viewportAction = ensureNodeVisibleAction(nodeId, state);
    if (viewportAction) {
      actions.push(viewportAction);
    }

    return actions;
  },
};

registerCommand(setCurrentNode);
