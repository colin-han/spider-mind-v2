import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { ExpandNodeAction } from "../../actions/ephemeral/expand-node";

export const ExpandNodeParamsSchema = z.object({
  nodeId: z.string().optional().describe("要展开的节点 ID"),
});
export type ExpandNodeParams = z.infer<typeof ExpandNodeParamsSchema>;

/**
 * 展开节点
 */
export const expandNodeCommand: CommandDefinition<
  typeof ExpandNodeParamsSchema
> = {
  id: "navigation.expandNode",
  name: "展开节点",
  description: "展开当前节点的子节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  paramsSchema: ExpandNodeParamsSchema,

  handler: (root, params) => {
    const { nodeId } = params;
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

  when: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return false;
    }

    return root.currentEditor!.collapsedNodes.has(targetNodeId);
  },
};

registerCommand(expandNodeCommand);
