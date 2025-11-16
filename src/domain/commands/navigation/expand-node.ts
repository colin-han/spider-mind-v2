import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { ExpandNodeAction } from "../../actions/expand-node";

type ExpandNodeParams = [string?];

/**
 * 展开节点
 */
export const expandNodeCommand: CommandDefinition = {
  id: "navigation.expandNode",
  name: "展开节点",
  description: "展开当前节点的子节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  parameters: [
    {
      name: "nodeId",
      type: "string",
      description: "要展开的节点 ID",
    },
  ],

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as ExpandNodeParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return;
    }

    // 检查是否已经展开
    if (!root.currentEditor!.collapsedNodes.has(targetNodeId)) {
      return;
    }

    return [new ExpandNodeAction(targetNodeId)];
  },

  when: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as ExpandNodeParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return false;
    }

    return root.currentEditor!.collapsedNodes.has(targetNodeId);
  },
};

registerCommand(expandNodeCommand);
