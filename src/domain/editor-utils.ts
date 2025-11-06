import { EditorState } from "./mindmap-store.types";
import { MindmapNode } from "@/lib/types";

/**
 * 获取子节点（已按 order_index 排序）
 */
export function getChildNodes(
  state: EditorState,
  parentId: string
): MindmapNode[] {
  return Array.from(state.nodes.values())
    .filter((node) => node.parent_short_id === parentId)
    .sort((a, b) => a.order_index - b.order_index);
}

/**
 * 获取祖先节点
 */
export function getAscendantNodes(
  state: EditorState,
  nodeId: string
): MindmapNode[] {
  const node = state.nodes.get(nodeId);
  if (!node) return [];

  const ancestors: MindmapNode[] = [];
  let currentNode = node;

  while (currentNode.parent_short_id) {
    const parent = state.nodes.get(currentNode.parent_short_id);
    if (!parent) break;
    ancestors.push(parent);
    currentNode = parent;
  }

  return ancestors;
}

/**
 * 获取后代节点
 */
export function getDescendantNodes(
  state: EditorState,
  nodeId: string
): MindmapNode[] {
  const node = state.nodes.get(nodeId);
  if (!node) return [];

  const descendants: MindmapNode[] = [];
  const queue = [node];

  while (queue.length > 0) {
    const currentNode = queue.shift()!;
    const children = getChildNodes(state, currentNode.short_id);
    descendants.push(...children);
    queue.push(...children);
  }

  return descendants;
}

/**
 * 检查 ancestorId 是否是 descendantId 的祖先
 * 用于防止循环引用
 */
export function isDescendant(
  ancestorId: string,
  descendantId: string,
  nodesMap: Map<string, MindmapNode>
): boolean {
  // 向上遍历 descendantId 的祖先链
  let current = nodesMap.get(descendantId);

  while (current) {
    // 如果找到了 ancestorId,说明确实是祖先
    if (current.short_id === ancestorId) {
      return true;
    }

    // 继续向上查找父节点
    if (current.parent_short_id) {
      current = nodesMap.get(current.parent_short_id);
    } else {
      // 已到达根节点或浮动节点,停止
      break;
    }
  }

  return false;
}
