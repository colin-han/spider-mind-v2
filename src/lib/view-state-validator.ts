/**
 * 视图状态验证器
 * 验证并修正保存的视图状态，确保状态数据仍然有效
 */
import type { MindmapNode } from "@/lib/types";
import type { ViewState } from "./view-state-manager";

/**
 * 验证并修正保存的视图状态
 * 确保状态数据仍然有效
 */
export function validateViewState(
  savedState: ViewState,
  nodes: MindmapNode[],
  rootNodeId: string
): ViewState | null {
  try {
    // 1. 验证版本号（已在 load 中验证）

    // 2. 验证折叠节点
    const nodeIds = new Set(nodes.map((n) => n.short_id));
    const validCollapsedNodes = savedState.collapsedNodes.filter((id) =>
      nodeIds.has(id)
    );

    // 3. 验证当前节点
    let validCurrentNode = savedState.currentNode;

    // 3.1 如果当前节点不存在，使用根节点
    if (!nodeIds.has(validCurrentNode)) {
      console.warn(
        `[ViewState] Current node ${validCurrentNode} not found, using root node`
      );
      validCurrentNode = rootNodeId;
    }

    // 3.2 如果当前节点被折叠了（父节点折叠），找到最近的可见父节点
    const nodeMap = new Map(nodes.map((n) => [n.short_id, n]));
    const collapsedSet = new Set(validCollapsedNodes);

    if (isNodeCollapsed(validCurrentNode, nodeMap, collapsedSet)) {
      const visibleAncestor = findVisibleAncestor(
        validCurrentNode,
        nodeMap,
        collapsedSet,
        rootNodeId
      );
      if (visibleAncestor) {
        console.warn(
          `[ViewState] Current node ${validCurrentNode} is collapsed, using ancestor ${visibleAncestor}`
        );
        validCurrentNode = visibleAncestor;
      } else {
        console.warn(`[ViewState] No visible ancestor found, using root node`);
        validCurrentNode = rootNodeId;
      }
    }

    // 4. 验证视口（确保 zoom 在有效范围内）
    const validZoom = Math.max(0.1, Math.min(2.0, savedState.viewport.zoom));

    // 5. 返回验证后的状态
    return {
      viewport: {
        x: savedState.viewport.x,
        y: savedState.viewport.y,
        zoom: validZoom,
      },
      collapsedNodes: validCollapsedNodes,
      currentNode: validCurrentNode,
      lastUpdated: savedState.lastUpdated,
      version: savedState.version,
    };
  } catch (error) {
    console.error("[ViewState] Validation failed:", error);
    return null;
  }
}

/**
 * 检查节点是否因为父节点折叠而不可见
 */
function isNodeCollapsed(
  nodeId: string,
  nodeMap: Map<string, MindmapNode>,
  collapsedSet: Set<string>
): boolean {
  let current = nodeMap.get(nodeId);
  while (current && current.parent_short_id) {
    if (collapsedSet.has(current.parent_short_id)) {
      return true;
    }
    current = nodeMap.get(current.parent_short_id);
  }
  return false;
}

/**
 * 找到最近的可见祖先节点
 */
function findVisibleAncestor(
  nodeId: string,
  nodeMap: Map<string, MindmapNode>,
  collapsedSet: Set<string>,
  rootNodeId: string
): string | null {
  let current = nodeMap.get(nodeId);
  while (current && current.parent_short_id) {
    const parent = nodeMap.get(current.parent_short_id);
    if (!parent) break;

    // 检查父节点是否可见
    // 1. 父节点本身不能被折叠
    // 2. 父节点的祖先也不能被折叠
    if (
      !collapsedSet.has(parent.short_id) &&
      !isNodeCollapsed(parent.short_id, nodeMap, collapsedSet)
    ) {
      return parent.short_id;
    }

    current = parent;
  }
  return rootNodeId;
}
