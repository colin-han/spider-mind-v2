import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { UpdateNodeAction } from "../../actions/persistent/update-node";
import { getChildNodes } from "../../editor-utils";
import { EnsureCurrentNodeVisibleAction } from "../../actions/ephemeral/ensure-current-node-visible";

export const MoveNodeDownParamsSchema = z.object({
  nodeId: z.string().optional().describe("要移动的节点 ID"),
});

export type MoveNodeDownParams = z.infer<typeof MoveNodeDownParamsSchema>;

/**
 * 下移节点
 */
export const moveNodeDownCommand: CommandDefinition<
  typeof MoveNodeDownParamsSchema
> = {
  id: "node.moveDown",
  name: "下移节点",
  description: "在兄弟节点中向下移动",
  category: "node",
  actionBased: true,
  paramsSchema: MoveNodeDownParamsSchema,

  handler: (root, params) => {
    const { nodeId } = params;
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const targetNode = root.currentEditor?.nodes.get(targetNodeId);

    if (!targetNode || !targetNode.parent_short_id) {
      return; // 根节点不能移动
    }

    const siblings = getChildNodes(
      root.currentEditor!,
      targetNode.parent_short_id
    );
    const currentIndex = siblings.findIndex((n) => n.short_id === targetNodeId);

    if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
      return; // 已经是最后一个，不能下移
    }

    const nextSibling = siblings[currentIndex + 1];
    if (!nextSibling) {
      return;
    }

    const actions = [];

    // 交换两个节点的 order_index
    actions.push(
      new UpdateNodeAction({
        id: targetNode.id,
        short_id: targetNode.short_id,
        oldNode: { order_index: targetNode.order_index },
        newNode: { order_index: nextSibling.order_index },
      })
    );

    actions.push(
      new UpdateNodeAction({
        id: nextSibling.id,
        short_id: nextSibling.short_id,
        oldNode: { order_index: nextSibling.order_index },
        newNode: { order_index: targetNode.order_index },
      })
    );

    // 策略A: 确保当前节点在安全区域内（15% padding）
    // 使用 EnsureCurrentNodeVisibleAction，在执行时才检查和滚动
    actions.push(new EnsureCurrentNodeVisibleAction(0.15));

    return actions;
  },

  when: (root) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode || !currentNode.parent_short_id) {
      return false;
    }

    const siblings = getChildNodes(
      root.currentEditor!,
      currentNode.parent_short_id
    );
    const currentIndex = siblings.findIndex(
      (n) => n.short_id === currentNode.short_id
    );
    return currentIndex >= 0 && currentIndex < siblings.length - 1; // 不是最后一个节点
  },
};

registerCommand(moveNodeDownCommand);
