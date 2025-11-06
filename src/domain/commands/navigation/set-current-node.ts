import { CommandDefinition } from "../../command-registry";
import { MindmapStore } from "../../mindmap-store.types";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { registerCommand } from "../../command-registry";

export type SetCurrentNodeParams = [nodeId: string];

export const setCurrentNode: CommandDefinition = {
  id: "navigation.setCurrentNode",
  name: "设置当前节点",
  description: "设置当前节点",
  category: "navigation",
  undoable: false,
  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as SetCurrentNodeParams) || [];
    return [
      new SetCurrentNodeAction({
        oldNodeId: root.currentEditor!.currentNode,
        newNodeId: nodeId,
      }),
    ];
  },
};

registerCommand(setCurrentNode);
