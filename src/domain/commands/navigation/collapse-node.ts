import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { CollapseNodeAction } from "../../actions/ephemeral/collapse-node";
import { getChildNodes } from "../../editor-utils";

export const CollapseNodeParamsSchema = z.object({
  nodeId: z.string().optional().describe("要折叠的节点 ID"),
});
export type CollapseNodeParams = z.infer<typeof CollapseNodeParamsSchema>;

/**
 * 折叠节点
 */
export const collapseNodeCommand: CommandDefinition<
  typeof CollapseNodeParamsSchema
> = {
  id: "navigation.collapseNode",
  name: "折叠节点",
  description: "折叠当前节点的子节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  paramsSchema: CollapseNodeParamsSchema,

  handler: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const targetNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!targetNode) {
      return;
    }

    // 检查是否有子节点
    const children = getChildNodes(root.currentEditor!, targetNodeId);
    if (children.length === 0) {
      return;
    }

    // 检查是否已经折叠
    if (root.currentEditor!.collapsedNodes.has(targetNodeId)) {
      return;
    }

    return [new CollapseNodeAction(targetNodeId)];
  },

  when: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return false;
    }

    const children = getChildNodes(root.currentEditor!, targetNodeId);
    const isCollapsed = root.currentEditor!.collapsedNodes.has(targetNodeId);
    return children.length > 0 && !isCollapsed;
  },
};

registerCommand(collapseNodeCommand);
