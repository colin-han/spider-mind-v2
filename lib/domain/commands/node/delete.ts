import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { RemoveNodeAction } from "../../actions/remove-node";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { getDescendantNodes } from "../../editor-utils";

type DeleteNodeParams = [string?];

/**
 * 删除节点及其所有子节点
 */
export const deleteNodeCommand: CommandDefinition = {
  id: "node.delete",
  name: "删除节点",
  description: "删除当前节点及其子节点",
  category: "node",

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as DeleteNodeParams) || [];
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

    // 切换焦点到父节点
    actions.push(
      new SetCurrentNodeAction({
        oldNodeId: targetNodeId,
        newNodeId: targetNode.parent_short_id,
      })
    );

    return actions;
  },

  when: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    return currentNode?.parent_short_id != null; // 不是根节点
  },

  getDescription: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    return currentNode ? `删除：${currentNode.title}` : "删除节点";
  },
};

registerCommand(deleteNodeCommand);
