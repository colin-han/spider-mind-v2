import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { RemoveNodeAction } from "../../actions/persistent/remove-node";
import { SetCurrentNodeAction } from "../../actions/ephemeral/set-current-node";
import { getDescendantNodes, getChildNodes } from "../../editor-utils";
import { EnsureCurrentNodeVisibleAction } from "../../actions/ephemeral/ensure-current-node-visible";

export const DeleteNodeParamsSchema = z.object({
  nodeId: z.string().optional().describe("要删除的节点 ID"),
});

export type DeleteNodeParams = z.infer<typeof DeleteNodeParamsSchema>;

/**
 * 删除节点及其所有子节点
 */
export const deleteNodeCommand: CommandDefinition<
  typeof DeleteNodeParamsSchema
> = {
  id: "node.delete",
  name: "删除节点",
  description: "删除节点及其所有子节点",
  category: "node",
  actionBased: true,
  paramsSchema: DeleteNodeParamsSchema,

  handler: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const targetNode = root.currentEditor?.nodes.get(targetNodeId);

    if (!targetNode || !targetNode.parent_short_id) {
      return; // 不能删除根节点
    }

    const actions = [];

    // 收集所有子孙节点（自底向上删除）
    const descendants = getDescendantNodes(root.currentEditor!, targetNodeId);

    // 先删除所有子孙节点（从叶子到根）
    descendants.reverse().forEach((node) => {
      actions.push(new RemoveNodeAction(node.short_id));
    });

    // 最后删除目标节点本身
    actions.push(new RemoveNodeAction(targetNodeId));

    // 智能选择下一个焦点节点
    // 优先级：下一个兄弟节点 > 上一个兄弟节点 > 父节点
    const siblings = getChildNodes(
      root.currentEditor!,
      targetNode.parent_short_id
    );

    let nextNodeId = targetNode.parent_short_id; // 默认选择父节点

    if (siblings.length > 1) {
      // 有兄弟节点
      // 找到下一个兄弟节点（order_index比当前节点大的最小节点）
      const nextSibling = siblings
        .filter((node) => node.order_index > targetNode.order_index)
        .sort((a, b) => a.order_index - b.order_index)[0];

      if (nextSibling) {
        nextNodeId = nextSibling.short_id;
      } else {
        // 没有下一个兄弟节点，找上一个兄弟节点（order_index比当前节点小的最大节点）
        const prevSibling = siblings
          .filter((node) => node.order_index < targetNode.order_index)
          .sort((a, b) => b.order_index - a.order_index)[0];

        if (prevSibling) {
          nextNodeId = prevSibling.short_id;
        }
      }
    }

    // 切换焦点到选定的节点
    actions.push(
      new SetCurrentNodeAction({
        oldNodeId: targetNodeId,
        newNodeId: nextNodeId,
      })
    );

    // 策略A: 确保新节点在安全区域内（15% padding）
    // 使用 EnsureCurrentNodeVisibleAction，在执行时才检查和滚动
    actions.push(new EnsureCurrentNodeVisibleAction(0.15));

    return actions;
  },

  when: (root) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    return currentNode?.parent_short_id != null; // 不是根节点
  },

  getDescription: (root) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    return currentNode ? `删除：${currentNode.title}` : "删除节点";
  },
};

registerCommand(deleteNodeCommand);
