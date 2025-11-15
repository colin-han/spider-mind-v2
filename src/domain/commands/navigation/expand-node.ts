import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { ExpandNodeAction } from "../../actions/expand-node";

/**
 * 展开节点
 */
export const expandNodeCommand: CommandDefinition = {
  id: "navigation.expandNode",
  name: "展开节点",
  description: "展开当前节点的子节点",
  category: "navigation",
  actionBased: true,
  undoable: false,

  handler: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode) {
      return;
    }

    // 检查是否已经展开
    if (!root.currentEditor!.collapsedNodes.has(currentNode.short_id)) {
      return;
    }

    return [new ExpandNodeAction(currentNode.short_id)];
  },

  when: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode) {
      return false;
    }

    return root.currentEditor!.collapsedNodes.has(currentNode.short_id);
  },
};

registerCommand(expandNodeCommand);
