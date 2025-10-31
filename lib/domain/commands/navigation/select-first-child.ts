import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { getChildNodes } from "../../editor-utils";

/**
 * 选择第一个子节点
 */
export const selectFirstChildCommand: CommandDefinition = {
  id: "navigation.selectFirstChild",
  name: "选择第一个子节点",
  description: "跳转到第一个子节点",
  category: "navigation",
  undoable: false,

  handler: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode) {
      return;
    }

    const children = getChildNodes(root.currentEditor!, currentNode.short_id);
    if (children.length === 0) {
      return;
    }

    const firstChild = children[0];
    if (!firstChild) {
      return;
    }

    root.acceptAction(
      new SetCurrentNodeAction({
        oldNodeId: currentNode.short_id,
        newNodeId: firstChild.short_id,
      })
    );
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
