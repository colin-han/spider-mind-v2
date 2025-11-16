import { CommandDefinition } from "../../command-registry";
import { MindmapStore } from "../../mindmap-store.types";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { registerCommand } from "../../command-registry";

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
    return [
      new SetCurrentNodeAction({
        oldNodeId: root.currentEditor!.currentNode,
        newNodeId: nodeId,
      }),
    ];
  },
};

registerCommand(setCurrentNode);
