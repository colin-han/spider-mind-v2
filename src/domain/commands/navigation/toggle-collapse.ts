import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { CollapseNodeAction } from "../../actions/ephemeral/collapse-node";
import { ExpandNodeAction } from "../../actions/ephemeral/expand-node";
import { getChildNodes } from "../../editor-utils";

type ToggleCollapseParams = [string?];
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
  parameters: [
    {
      name: "nodeId",
      type: "string",
      description: "要切换折叠状态的节点 ID",
    },
  ],

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as ToggleCollapseParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return;
    }

    // 检查是否有子节点
    const children = getChildNodes(root.currentEditor!, targetNodeId);
    if (children.length === 0) {
      return;
    }

    const isCollapsed = root.currentEditor!.collapsedNodes.has(targetNodeId);

    if (isCollapsed) {
      return [new ExpandNodeAction(targetNodeId)];
    } else {
      return [new CollapseNodeAction(targetNodeId)];
    }
  },

  when: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as ToggleCollapseParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return false;
    }

    const children = getChildNodes(root.currentEditor!, targetNodeId);
    return children.length > 0;
  },
};

registerCommand(toggleCollapseCommand);
