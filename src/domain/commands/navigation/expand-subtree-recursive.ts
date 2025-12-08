import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { ExpandNodeAction } from "../../actions/ephemeral/expand-node";
import { getChildNodes, getDescendantNodes } from "../../editor-utils";

export const ExpandSubtreeRecursiveParamsSchema = z.object({
  nodeId: z
    .string()
    .optional()
    .describe("要展开的节点 ID(可选,默认为当前节点)"),
});
export type ExpandSubtreeRecursiveParams = z.infer<
  typeof ExpandSubtreeRecursiveParamsSchema
>;

/**
 * 递归展开子树命令
 * 展开当前节点及其所有子孙节点
 */
export const expandSubtreeRecursiveCommand: CommandDefinition<
  typeof ExpandSubtreeRecursiveParamsSchema
> = {
  id: "navigation.expandSubtreeRecursive",
  name: "递归展开子树",
  description: "展开当前节点及其所有子孙节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  paramsSchema: ExpandSubtreeRecursiveParamsSchema,

  handler: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;

    const targetNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!targetNode) {
      return;
    }

    const children = getChildNodes(root.currentEditor!, targetNodeId);
    if (children.length === 0) {
      return;
    }

    // 获取所有后代节点
    const descendants = getDescendantNodes(root.currentEditor!, targetNodeId);

    const nodesToExpand: string[] = [];

    // 如果当前节点是折叠状态，添加到展开列表
    if (root.currentEditor!.collapsedNodes.has(targetNodeId)) {
      nodesToExpand.push(targetNodeId);
    }

    // 添加所有有子节点且处于折叠状态的后代节点
    for (const descendant of descendants) {
      const descendantChildren = getChildNodes(
        root.currentEditor!,
        descendant.short_id
      );
      if (
        descendantChildren.length > 0 &&
        root.currentEditor!.collapsedNodes.has(descendant.short_id)
      ) {
        nodesToExpand.push(descendant.short_id);
      }
    }

    if (nodesToExpand.length === 0) {
      return;
    }

    // 返回所有展开动作
    return nodesToExpand.map((id) => new ExpandNodeAction(id));
  },

  when: (root) => {
    const targetNodeId = root.currentEditor?.currentNode;
    if (!targetNodeId) return false;

    const targetNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!targetNode) return false;

    const children = getChildNodes(root.currentEditor!, targetNodeId);
    return children.length > 0;
  },
};

registerCommand(expandSubtreeRecursiveCommand);
