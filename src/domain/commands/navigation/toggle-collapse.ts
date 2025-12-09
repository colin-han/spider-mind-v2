import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { CollapseNodeAction } from "../../actions/ephemeral/collapse-node";
import { ExpandNodeAction } from "../../actions/ephemeral/expand-node";
import { getChildNodes } from "../../editor-utils";

export const ToggleCollapseParamsSchema = z.object({
  nodeId: z.string().optional().describe("要切换折叠状态的节点 ID"),
});
export type ToggleCollapseParams = z.infer<typeof ToggleCollapseParamsSchema>;

/**
 * 切换折叠状态
 */
export const toggleCollapseCommand: CommandDefinition<
  typeof ToggleCollapseParamsSchema
> = {
  id: "navigation.toggleCollapse",
  name: "切换折叠状态",
  description: "切换节点的展开/折叠状态",
  category: "navigation",
  actionBased: true,
  undoable: false,
  paramsSchema: ToggleCollapseParamsSchema,

  handler: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return;
    }

    // 检查是否有子节点
    const children = getChildNodes(root.currentEditor!, targetNodeId);
    if (children.length === 0) {
      return;
    }

    const isCollapsed = root.currentEditor!.collapsedNodes.has(targetNodeId);

    if (isCollapsed) {
      return [new ExpandNodeAction(targetNodeId)];
    } else {
      return [new CollapseNodeAction(targetNodeId)];
    }
  },

  when: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return false;
    }

    const children = getChildNodes(root.currentEditor!, targetNodeId);
    return children.length > 0;
  },
};

registerCommand(toggleCollapseCommand);
