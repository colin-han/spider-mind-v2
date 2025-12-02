import { MindmapStore, EditorAction } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import {
  getNodeDepth,
  getNodesAtDepth,
  isNodeVisible,
} from "../../editor-utils";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";

/**
 * 选择上一个同深度的节点
 * 在深度优先遍历顺序中，选择前一个具有相同深度的节点
 */
export const selectPreviousSiblingCommand: CommandDefinition = {
  id: "navigation.selectPreviousSibling",
  name: "选择上一个节点",
  description: "跳转到上一个同深度的节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  parameters: [],

  handler: (root: MindmapStore) => {
    const state = root.currentEditor;
    if (!state) return;

    const currentNode = state.nodes.get(state.currentNode);
    if (!currentNode || !currentNode.parent_short_id) {
      return;
    }

    // 获取当前节点的深度
    const currentDepth = getNodeDepth(state, currentNode.short_id);
    if (currentDepth < 0) {
      return;
    }

    // 获取所有同深度的节点（按深度优先遍历顺序）
    const allNodesAtSameDepth = getNodesAtDepth(state, currentDepth);

    // 过滤出可见的节点
    const visibleNodes = allNodesAtSameDepth.filter((node) =>
      isNodeVisible(state, node.short_id)
    );

    // 找到当前节点在可见节点列表中的位置
    const currentIndex = visibleNodes.findIndex(
      (n) => n.short_id === currentNode.short_id
    );

    // 如果不是第一个可见节点，选择上一个
    if (currentIndex > 0) {
      const previousNode = visibleNodes[currentIndex - 1];
      if (!previousNode) return;

      const actions: EditorAction[] = [
        new SetCurrentNodeAction({
          oldNodeId: currentNode.short_id,
          newNodeId: previousNode.short_id,
        }),
      ];

      // 确保上一个节点在可视区域内
      const viewportAction = ensureNodeVisibleAction(
        previousNode.short_id,
        state
      );
      if (viewportAction) {
        actions.push(viewportAction);
      }

      return actions;
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
    const allNodesAtSameDepth = getNodesAtDepth(
      root.currentEditor!,
      currentDepth
    );

    // 过滤出可见的节点
    const visibleNodes = allNodesAtSameDepth.filter((node) =>
      isNodeVisible(root.currentEditor!, node.short_id)
    );

    // 找到当前节点的位置
    const currentIndex = visibleNodes.findIndex(
      (n) => n.short_id === currentNode.short_id
    );

    // 如果不是第一个可见节点，就可以选择上一个
    return currentIndex > 0;
  },
};

registerCommand(selectPreviousSiblingCommand);
