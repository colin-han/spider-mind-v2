import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { UpdateNodeAction } from "../../actions/update-node";
import { getChildNodes } from "../../editor-utils";
import { EnsureCurrentNodeVisibleAction } from "../../actions/ensure-current-node-visible";

type MoveNodeParams = [string?];

/**
 * 上移节点
 */
export const moveNodeUpCommand: CommandDefinition = {
  id: "node.moveUp",
  name: "上移节点",
  description: "在兄弟节点中向上移动",
  category: "node",
  actionBased: true,
  parameters: [
    {
      name: "nodeId",
      type: "string",
      description: "要移动的节点 ID",
    },
  ],

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as MoveNodeParams) || [];
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

    if (currentIndex <= 0) {
      return; // 已经是第一个，不能上移
    }

    const previousSibling = siblings[currentIndex - 1];
    if (!previousSibling) {
      return;
    }

    const actions = [];

    // 交换两个节点的 order_index
    actions.push(
      new UpdateNodeAction({
        id: targetNode.id,
        short_id: targetNode.short_id,
        oldNode: { order_index: targetNode.order_index },
        newNode: { order_index: previousSibling.order_index },
      })
    );

    actions.push(
      new UpdateNodeAction({
        id: previousSibling.id,
        short_id: previousSibling.short_id,
        oldNode: { order_index: previousSibling.order_index },
        newNode: { order_index: targetNode.order_index },
      })
    );

    // 策略A: 确保当前节点在安全区域内（15% padding）
    // 使用 EnsureCurrentNodeVisibleAction，在执行时才检查和滚动
    actions.push(new EnsureCurrentNodeVisibleAction(0.15));

    return actions;
  },

  when: (root: MindmapStore) => {
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
    return currentIndex > 0; // 不是第一个节点
  },
};

registerCommand(moveNodeUpCommand);
