/**
 * 树结构工具函数
 *
 * 提供思维导图树结构遍历和查询功能
 */

import type { MindmapNode } from "@/lib/types";

/**
 * 从节点Map中找到根节点
 *
 * @param nodes - 节点Map
 * @returns 根节点，如果未找到返回null
 */
export function findRootNode(
  nodes: Map<string, MindmapNode>
): MindmapNode | null {
  for (const node of nodes.values()) {
    if (node.parent_id === null) {
      return node;
    }
  }
  return null;
}

/**
 * 获取指定节点的所有子节点（按order_index排序）
 *
 * @param parentShortId - 父节点的short_id
 * @param nodes - 节点Map
 * @returns 排序后的子节点数组
 */
export function getChildNodes(
  parentShortId: string,
  nodes: Map<string, MindmapNode>
): MindmapNode[] {
  const children = Array.from(nodes.values())
    .filter((node) => node.parent_short_id === parentShortId)
    .sort((a, b) => a.order_index - b.order_index);
  return children;
}
