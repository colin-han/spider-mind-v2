/**
 * IndexedDB Query Helper Functions
 *
 * 提供常用的数据库查询辅助函数，优化查询性能
 */

import { getDB } from "./schema";
import type { MindmapNode } from "@/lib/types";

/**
 * 通过 parent_short_id 查询所有子节点
 *
 * 使用 by-parent-short 索引优化查询性能
 *
 * @param parentShortId - 父节点的 short_id
 * @returns 所有子节点数组
 *
 * @example
 * ```typescript
 * // 查询某个节点的所有子节点
 * const children = await getChildrenByParentShortId('abc123');
 * ```
 */
export async function getChildrenByParentShortId(
  parentShortId: string
): Promise<Array<MindmapNode & { dirty: boolean; local_updated_at: string }>> {
  const db = await getDB();
  const index = db.transaction("mindmap_nodes").store.index("by-parent-short");
  return await index.getAll(parentShortId);
}

/**
 * 通过 parent_id (UUID) 查询所有子节点
 *
 * 使用 by-parent 索引进行查询
 *
 * @param parentId - 父节点的 UUID
 * @returns 所有子节点数组
 *
 * @example
 * ```typescript
 * // 查询某个节点的所有子节点（使用 UUID）
 * const children = await getChildrenByParentId('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export async function getChildrenByParentId(
  parentId: string
): Promise<Array<MindmapNode & { dirty: boolean; local_updated_at: string }>> {
  const db = await getDB();
  const index = db.transaction("mindmap_nodes").store.index("by-parent");
  return await index.getAll(parentId);
}

/**
 * 查询根节点（parent_id 为 null 的节点）
 *
 * @param mindmapId - 思维导图的 UUID
 * @returns 根节点，如果不存在则返回 undefined
 *
 * @example
 * ```typescript
 * // 查询思维导图的根节点
 * const rootNode = await getRootNode('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export async function getRootNode(
  mindmapId: string
): Promise<
  (MindmapNode & { dirty: boolean; local_updated_at: string }) | undefined
> {
  const db = await getDB();
  const index = db.transaction("mindmap_nodes").store.index("by-mindmap");
  const allNodes = await index.getAll(mindmapId);

  // 查找 parent_id 为 null 的节点
  return allNodes.find((node) => node.parent_id === null);
}

/**
 * 批量通过 short_id 获取节点
 *
 * @param shortIds - short_id 数组
 * @returns 节点数组
 *
 * @example
 * ```typescript
 * const nodes = await getNodesByShortIds(['abc123', 'def456']);
 * ```
 */
export async function getNodesByShortIds(
  shortIds: string[]
): Promise<Array<MindmapNode & { dirty: boolean; local_updated_at: string }>> {
  const db = await getDB();
  const results = await Promise.all(
    shortIds.map((shortId) => db.get("mindmap_nodes", shortId))
  );
  // 过滤掉 undefined 结果
  return results.filter(
    (
      node
    ): node is MindmapNode & { dirty: boolean; local_updated_at: string } =>
      node !== undefined
  );
}

/**
 * 获取思维导图的所有节点
 *
 * 使用 by-mindmap 索引进行查询
 *
 * @param mindmapId - 思维导图的 UUID
 * @returns 所有节点数组，按 order_index 排序
 *
 * @example
 * ```typescript
 * const allNodes = await getAllNodesByMindmap('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export async function getAllNodesByMindmap(
  mindmapId: string
): Promise<Array<MindmapNode & { dirty: boolean; local_updated_at: string }>> {
  const db = await getDB();
  const index = db.transaction("mindmap_nodes").store.index("by-mindmap");
  const nodes = await index.getAll(mindmapId);

  // 按 order_index 排序
  return nodes.sort((a, b) => a.order_index - b.order_index);
}

/**
 * 构建节点树结构
 *
 * 将扁平的节点数组转换为树形结构，使用 parent_short_id 建立父子关系
 *
 * @param nodes - 节点数组
 * @returns 根节点及其子树
 *
 * @example
 * ```typescript
 * const nodes = await getAllNodesByMindmap(mindmapId);
 * const tree = buildNodeTree(nodes);
 * ```
 */
export function buildNodeTree<
  T extends {
    short_id: string;
    parent_short_id: string | null;
    order_index: number;
  },
>(nodes: T[]): T & { children?: T[] } {
  // 创建节点映射
  const nodeMap = new Map<string, T & { children?: T[] }>();
  nodes.forEach((node) => {
    nodeMap.set(node.short_id, { ...node, children: [] });
  });

  // 查找根节点
  let root: (T & { children?: T[] }) | undefined;

  // 构建树结构
  nodes.forEach((node) => {
    const currentNode = nodeMap.get(node.short_id);
    if (!currentNode) return;

    if (node.parent_short_id === null) {
      // 这是根节点
      root = currentNode;
    } else {
      // 将当前节点添加到父节点的 children 中
      const parent = nodeMap.get(node.parent_short_id);
      if (parent && parent.children) {
        parent.children.push(currentNode);
      }
    }
  });

  // 对每个节点的 children 按 order_index 排序
  nodeMap.forEach((node) => {
    if (node.children) {
      node.children.sort((a, b) => a.order_index - b.order_index);
    }
  });

  if (!root) {
    throw new Error("Root node not found");
  }

  return root;
}

/**
 * 计算节点的深度（距离根节点的层级）
 *
 * @param nodeShortId - 节点的 short_id
 * @param allNodes - 所有节点数组
 * @returns 节点深度（根节点深度为 0）
 *
 * @example
 * ```typescript
 * const depth = calculateNodeDepth('abc123', allNodes);
 * console.log(`Node depth: ${depth}`); // Node depth: 2
 * ```
 */
export function calculateNodeDepth(
  nodeShortId: string,
  allNodes: Array<{ short_id: string; parent_short_id: string | null }>
): number {
  const nodeMap = new Map(allNodes.map((n) => [n.short_id, n]));
  const node = nodeMap.get(nodeShortId);

  if (!node) {
    throw new Error(`Node not found: ${nodeShortId}`);
  }

  let depth = 0;
  let current = node;

  while (current.parent_short_id !== null) {
    depth++;
    const parent = nodeMap.get(current.parent_short_id);
    if (!parent) {
      throw new Error(`Parent node not found: ${current.parent_short_id}`);
    }
    current = parent;
  }

  return depth;
}
