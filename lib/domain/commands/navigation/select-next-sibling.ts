import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { SetCurrentNodeAction } from "../../actions/set-current-node";
import { getChildNodes } from "../../editor-utils";

/**
 * 选择下一个兄弟节点
 */
export const selectNextSiblingCommand: CommandDefinition = {
  id: "navigation.selectNextSibling",
  name: "选择下一个兄弟节点",
  description: "跳转到下一个兄弟节点",
  category: "navigation",
  undoable: false,

  handler: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode || !currentNode.parent_short_id) {
      return;
    }

    const siblings = getChildNodes(
      root.currentEditor!,
      currentNode.parent_short_id
    );
    const currentIndex = siblings.findIndex(
      (n) => n.short_id === currentNode.short_id
    );

    if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
      return; // 已经是最后一个
    }

    const nextSibling = siblings[currentIndex + 1];
    if (!nextSibling) {
      return;
    }

    return [
      new SetCurrentNodeAction({
        oldNodeId: currentNode.short_id,
        newNodeId: nextSibling.short_id,
      }),
    ];
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
    return currentIndex >= 0 && currentIndex < siblings.length - 1;
  },
};

registerCommand(selectNextSiblingCommand);
