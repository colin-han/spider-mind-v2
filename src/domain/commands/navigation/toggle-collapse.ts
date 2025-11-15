import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { CollapseNodeAction } from "../../actions/collapse-node";
import { ExpandNodeAction } from "../../actions/expand-node";
import { getChildNodes } from "../../editor-utils";

/**
 * 切换折叠状态
 */
export const toggleCollapseCommand: CommandDefinition = {
  id: "navigation.toggleCollapse",
  name: "切换折叠状态",
  description: "切换节点的展开/折叠状态",
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

    // 检查是否有子节点
    const children = getChildNodes(root.currentEditor!, currentNode.short_id);
    if (children.length === 0) {
      return;
    }

    const isCollapsed = root.currentEditor!.collapsedNodes.has(
      currentNode.short_id
    );

    if (isCollapsed) {
      return [new ExpandNodeAction(currentNode.short_id)];
    } else {
      return [new CollapseNodeAction(currentNode.short_id)];
    }
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

registerCommand(toggleCollapseCommand);
