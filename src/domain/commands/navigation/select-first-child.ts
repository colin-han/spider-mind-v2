import { MindmapStore, EditorAction } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { ExpandNodeAction } from "../../actions/expand-node";
import { getChildNodes } from "../../editor-utils";
import { ensureNodeVisibleAction } from "../../utils/viewport-utils";

/**
 * 选择第一个子节点
 */
export const selectFirstChildCommand: CommandDefinition = {
  id: "navigation.selectFirstChild",
  name: "选择第一个子节点",
  description: "跳转到第一个子节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  parameters: [],

  handler: (root: MindmapStore) => {
    const state = root.currentEditor;
    if (!state) return;

    const currentNode = state.nodes.get(state.currentNode);
    if (!currentNode) {
      return;
    }

    const children = getChildNodes(state, currentNode.short_id);
    if (children.length === 0) {
      return;
    }

    const firstChild = children[0];
    if (!firstChild) {
      return;
    }

    const actions: EditorAction[] = [];

    // 如果当前节点是折叠状态，先展开它
    if (state.collapsedNodes.has(currentNode.short_id)) {
      actions.push(new ExpandNodeAction(currentNode.short_id));
    }

    actions.push(
      new SetCurrentNodeAction({
        oldNodeId: currentNode.short_id,
        newNodeId: firstChild.short_id,
      })
    );

    // 确保子节点在可视区域内
    const viewportAction = ensureNodeVisibleAction(firstChild.short_id, state);
    if (viewportAction) {
      actions.push(viewportAction);
    }

    return actions;
  },

  when: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode) {
      return false;
    }
    const children = getChildNodes(root.currentEditor!, currentNode.short_id);
    return children.length > 0;
  },
};

registerCommand(selectFirstChildCommand);
