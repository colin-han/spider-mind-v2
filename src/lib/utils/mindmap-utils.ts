/**
 * 思维导图工具函数
 *
 * 提供思维导图相关的通用工具函数
 */

import type { MindmapNode } from "@/lib/types";

/**
 * 从节点Map中获取根节点
 *
 * 根节点定义：parent_short_id 为 null 的节点
 *
 * @param nodes 节点Map
 * @returns 根节点，如果不存在则返回undefined
 */
export function getRootNode(
  nodes: Map<string, MindmapNode>
): MindmapNode | undefined {
  return Array.from(nodes.values()).find((n) => !n.parent_short_id);
}

/**
 * 获取根节点的标题，用于显示思维导图名称
 *
 * 这是一个便捷函数，用于常见的场景：只需要获取标题字符串
 *
 * @param nodes 节点Map
 * @param fallback 当根节点不存在时的默认值
 * @returns 根节点标题或默认值
 */
export function getRootNodeTitle(
  nodes: Map<string, MindmapNode>,
  fallback: string = "未命名思维导图"
): string {
  const rootNode = getRootNode(nodes);
  return rootNode?.title || fallback;
}
