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

    // 如果不是最后一个，选择下一个可见节点
    if (currentIndex >= 0 && currentIndex < visibleNodes.length - 1) {
      const nextNode = visibleNodes[currentIndex + 1];
      if (!nextNode) return;

      const actions: EditorAction[] = [
        new SetCurrentNodeAction({
          oldNodeId: currentNode.short_id,
          newNodeId: nextNode.short_id,
        }),
      ];

      // 策略A: 15% padding (确保在安全区域内)
      const viewportAction = ensureNodeVisibleAction(
        nextNode.short_id,
        state,
        0.15
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

    // 如果不是最后一个可见节点，就可以选择下一个
    return currentIndex >= 0 && currentIndex < visibleNodes.length - 1;
  },
};

registerCommand(selectNextSiblingCommand);
