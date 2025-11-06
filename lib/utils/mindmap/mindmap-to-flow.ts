/**
 * 思维导图数据转换工具
 *
 * 将 Zustand Store 的 MindmapNode 数据转换为 React Flow 的 nodes/edges 格式
 */

import type { Node, Edge } from "@xyflow/react";
import type { MindmapNode } from "@/lib/types";
import type { CustomNodeData } from "@/lib/types/react-flow";

/**
 * 将思维导图数据转换为 React Flow 格式
 *
 * @param rootNodeId - 根节点 short_id
 * @param nodesMap - 节点 Map (short_id -> MindmapNode)
 * @param collapsedNodes - 已折叠的节点集合
 * @returns React Flow 的 nodes 和 edges 数组
 *
 * @example
 * ```ts
 * const { nodes, edges } = convertToFlowData(
 *   rootNode.short_id,
 *   store.nodes,
 *   store.collapsedNodes
 * );
 * ```
 */
export function convertToFlowData(
  rootNodeId: string,
  nodesMap: Map<string, MindmapNode>,
  collapsedNodes: Set<string>
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const flowNodes: Node<CustomNodeData>[] = [];
  const flowEdges: Edge[] = [];
  const visited = new Set<string>();

  /**
   * 递归遍历节点树
   *
   * @param nodeId - 当前节点 short_id
   */
  function traverse(nodeId: string) {
    // 避免重复处理
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodesMap.get(nodeId);
    if (!node) return;

    // 获取子节点 (按 order_index 排序)
    const children = Array.from(nodesMap.values())
      .filter((n) => n.parent_short_id === nodeId)
      .sort((a, b) => a.order_index - b.order_index);

    // 转换为 React Flow Node
    flowNodes.push({
      id: node.short_id,
      type: "customMindNode",
      position: { x: 0, y: 0 }, // 位置由 Dagre 算法计算
      data: {
        shortId: node.short_id,
        title: node.title,
        orderIndex: node.order_index,
        parentId: node.parent_short_id,
        hasChildren: children.length > 0,
      },
    });

    // 添加边 (连接父节点)
    if (node.parent_short_id) {
      flowEdges.push({
        id: `${node.parent_short_id}-${node.short_id}`,
        source: node.parent_short_id,
        target: node.short_id,
        type: "smoothstep",
      });
    }

    // 如果节点未折叠,递归处理子节点
    if (!collapsedNodes.has(nodeId)) {
      children.forEach((child) => traverse(child.short_id));
    }
  }

  // 从根节点开始遍历
  traverse(rootNodeId);

  return { nodes: flowNodes, edges: flowEdges };
}
