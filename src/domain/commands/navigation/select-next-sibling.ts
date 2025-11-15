import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { getNodeDepth, getNodesAtDepth } from "../../editor-utils";

/**
 * 选择下一个同深度的节点
 * 在深度优先遍历顺序中，选择后一个具有相同深度的节点
 */
export const selectNextSiblingCommand: CommandDefinition = {
  id: "navigation.selectNextSibling",
  name: "选择下一个节点",
  description: "跳转到下一个同深度的节点",
  category: "navigation",
  actionBased: true,
  undoable: false,

  handler: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode || !currentNode.parent_short_id) {
      return;
    }

    // 获取当前节点的深度
    const currentDepth = getNodeDepth(
      root.currentEditor!,
      currentNode.short_id
    );
    if (currentDepth < 0) {
      return;
    }

    // 获取所有同深度的节点（按深度优先遍历顺序）
    const nodesAtSameDepth = getNodesAtDepth(root.currentEditor!, currentDepth);

    // 找到当前节点在列表中的位置
    const currentIndex = nodesAtSameDepth.findIndex(
      (n) => n.short_id === currentNode.short_id
    );

    // 如果不是最后一个，选择下一个
    if (currentIndex >= 0 && currentIndex < nodesAtSameDepth.length - 1) {
      const nextNode = nodesAtSameDepth[currentIndex + 1];
      return [
        new SetCurrentNodeAction({
          oldNodeId: currentNode.short_id,
          newNodeId: nextNode!.short_id,
        }),
      ];
    }

    return;
  },

  when: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode || !currentNode.parent_short_id) {
      return false;
    }

    // 获取当前节点的深度
    const currentDepth = getNodeDepth(
      root.currentEditor!,
      currentNode.short_id
    );
    if (currentDepth < 0) {
      return false;
    }

    // 获取所有同深度的节点
    const nodesAtSameDepth = getNodesAtDepth(root.currentEditor!, currentDepth);

    // 找到当前节点的位置
    const currentIndex = nodesAtSameDepth.findIndex(
      (n) => n.short_id === currentNode.short_id
    );

    // 如果不是最后一个，就可以选择下一个
    return currentIndex >= 0 && currentIndex < nodesAtSameDepth.length - 1;
  },
};

registerCommand(selectNextSiblingCommand);
