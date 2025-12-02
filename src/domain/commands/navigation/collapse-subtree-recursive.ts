import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { CollapseNodeAction } from "../../actions/collapse-node";
import { getChildNodes, getDescendantNodes } from "../../editor-utils";

type CollapseSubtreeRecursiveParams = [string?];

/**
 * 递归折叠子树
 * 折叠当前节点及其所有子孙节点
 */
export const collapseSubtreeRecursiveCommand: CommandDefinition = {
  id: "navigation.collapseSubtreeRecursive",
  name: "递归折叠子树",
  description: "折叠当前节点及其所有子孙节点",
  category: "navigation",
  actionBased: true,
  undoable: false,
  parameters: [
    {
      name: "nodeId",
      type: "string",
      description: "要递归折叠的节点 ID",
    },
  ],

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as CollapseSubtreeRecursiveParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const targetNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!targetNode) {
      return;
    }

    // 检查是否有子节点
    const children = getChildNodes(root.currentEditor!, targetNodeId);
    if (children.length === 0) {
      return;
    }

    // 获取所有后代节点
    const descendants = getDescendantNodes(root.currentEditor!, targetNodeId);

    // 收集需要折叠的节点（包括当前节点和所有有子节点的后代节点）
    const nodesToCollapse: string[] = [];

    // 如果当前节点未折叠，添加到列表
    if (!root.currentEditor!.collapsedNodes.has(targetNodeId)) {
      nodesToCollapse.push(targetNodeId);
    }

    // 检查所有后代节点，如果有子节点且未折叠，添加到列表
    for (const descendant of descendants) {
      const descendantChildren = getChildNodes(
        root.currentEditor!,
        descendant.short_id
      );
      if (
        descendantChildren.length > 0 &&
        !root.currentEditor!.collapsedNodes.has(descendant.short_id)
      ) {
        nodesToCollapse.push(descendant.short_id);
      }
    }

    // 如果没有需要折叠的节点，返回
    if (nodesToCollapse.length === 0) {
      return;
    }

    // 返回折叠 actions
    return nodesToCollapse.map((id) => new CollapseNodeAction(id));
  },

  when: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as CollapseSubtreeRecursiveParams) || [];
    const targetNodeId = nodeId || root.currentEditor!.currentNode;
    const currentNode = root.currentEditor?.nodes.get(targetNodeId);
    if (!currentNode) {
      return false;
    }

    // 只要有子节点就可以执行
    const children = getChildNodes(root.currentEditor!, targetNodeId);
    return children.length > 0;
  },
};

registerCommand(collapseSubtreeRecursiveCommand);
