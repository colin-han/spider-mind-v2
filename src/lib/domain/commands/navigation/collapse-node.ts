import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { CollapseNodeAction } from "../../actions/collapse-node";
import { getChildNodes } from "../../editor-utils";

/**
 * 折叠节点
 */
export const collapseNodeCommand: CommandDefinition = {
  id: "navigation.collapseNode",
  name: "折叠节点",
  description: "折叠当前节点的子节点",
  category: "navigation",
  undoable: false,

  handler: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode) {
      return;
    }

    // 检查是否有子节点
    const children = getChildNodes(root.currentEditor!, currentNode.short_id);
    if (children.length === 0) {
      return;
    }

    // 检查是否已经折叠
    if (root.currentEditor!.collapsedNodes.has(currentNode.short_id)) {
      return;
    }

    return [new CollapseNodeAction(currentNode.short_id)];
  },

  when: (root: MindmapStore) => {
    const currentNode = root.currentEditor?.nodes.get(
      root.currentEditor.currentNode
    );
    if (!currentNode) {
      return false;
    }

    const children = getChildNodes(root.currentEditor!, currentNode.short_id);
    const isCollapsed = root.currentEditor!.collapsedNodes.has(
      currentNode.short_id
    );
    return children.length > 0 && !isCollapsed;
  },
};

registerCommand(collapseNodeCommand);
