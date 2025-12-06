import dagre from "dagre";
import type { MindmapNode } from "@/lib/types";
import type { MindmapLayoutEngine, NodeSize } from "../mindmap-layout";
import type { NodeLayout } from "@/domain/mindmap-store.types";

// ============================================================================
// 配置常量
// ============================================================================

const GRAPH_CONFIG = {
  rankdir: "LR", // 从左到右布局（思维导图标准布局）
  // align 不设置，默认居中对齐（父节点在子节点垂直中间）
  nodesep: 10, // 同层节点间距（垂直方向，极致紧凑）
  edgesep: 10, // 边的间距
  ranksep: 50, // 层级间距（水平方向，更紧凑）
  marginx: 15, // 水平边距（减小边距）
  marginy: 15, // 垂直边距（减小边距）
};

const DROP_INDICATOR_CONFIG = {
  height: 4, // drop indicator 高度
  hitTestMargin: 30, // 命中测试的垂直边距
};

// ============================================================================
// DagreLayoutEngine - Dagre 布局算法实现
// ============================================================================

/**
 * 基于 Dagre 的思维导图布局引擎
 *
 * 特点：
 * - 自动过滤折叠节点的子节点
 * - 分层布局（hierarchical layout）
 * - 支持拖放 indicator 计算
 */
export class DagreLayoutEngine implements MindmapLayoutEngine {
  /**
   * 计算布局
   *
   * @param nodes - 所有节点（包括折叠的）
   * @param sizeCache - 节点尺寸缓存
   * @param collapsedNodes - 折叠的节点 ID 集合
   * @returns 布局结果（只包含可见节点）
   */
  layout(
    nodes: Map<string, MindmapNode>,
    sizeCache: Map<string, NodeSize>,
    collapsedNodes: Set<string>
  ): Map<string, NodeLayout> {
    // 1. 过滤可见节点
    const visibleNodes = this.filterVisibleNodes(nodes, collapsedNodes);

    // 2. 创建 dagre 图
    const g = new dagre.graphlib.Graph();
    g.setGraph(GRAPH_CONFIG);
    g.setDefaultEdgeLabel(() => ({}));

    // 3. 添加节点到图中
    // 🔧 FIX: 按照深度优先遍历 + order_index 顺序添加节点
    // 这样可以确保 dagre 按照正确的顺序排列同级节点
    const sortedNodes = this.getSortedNodesForDagre(visibleNodes);
    for (const node of sortedNodes) {
      const size = sizeCache.get(node.short_id) || { width: 100, height: 40 };
      g.setNode(node.short_id, {
        width: size.width,
        height: size.height,
      });
    }

    // 4. 添加边到图中（按父节点分组，每组内按 order_index 排序）
    // dagre 会按边添加顺序排列同级子节点，所以需要确保每个父节点的子节点按顺序添加
    const childrenByParent = new Map<string, MindmapNode[]>();
    for (const node of visibleNodes.values()) {
      if (node.parent_short_id && visibleNodes.has(node.parent_short_id)) {
        if (!childrenByParent.has(node.parent_short_id)) {
          childrenByParent.set(node.parent_short_id, []);
        }
        childrenByParent.get(node.parent_short_id)!.push(node);
      }
    }

    // 对每个父节点的子节点按 order_index 排序，然后添加边
    for (const [parentId, children] of childrenByParent) {
      children.sort((a, b) => a.order_index - b.order_index);
      for (const child of children) {
        g.setEdge(parentId, child.short_id);
      }
    }

    // 5. 运行 dagre 布局算法
    dagre.layout(g);

    // 6. 提取布局结果
    const layouts = new Map<string, NodeLayout>();
    for (const nodeId of visibleNodes.keys()) {
      const dagreNode = g.node(nodeId);
      if (dagreNode) {
        layouts.set(nodeId, {
          id: nodeId,
          x: dagreNode.x - dagreNode.width / 2, // dagre 使用中心点，转换为左上角
          y: dagreNode.y - dagreNode.height / 2,
          width: dagreNode.width,
          height: dagreNode.height,
        });
      }
    }

    // 7. 调整同级节点水平对齐：让兄弟节点左侧与最宽节点对齐
    this.alignSiblingNodes(visibleNodes, layouts);

    console.log(
      `[DagreLayoutEngine] Layout calculated: ${layouts.size} visible nodes (${nodes.size} total)`
    );

    return layouts;
  }

  /**
   * 获取 drop indicator 布局
   *
   * @param x - 鼠标 x 坐标
   * @param y - 鼠标 y 坐标
   * @param layoutCache - 当前的布局缓存
   * @returns drop indicator 的布局信息，如果没有命中则返回 null
   */
  getDropIndicatorLayout(
    x: number,
    y: number,
    layoutCache: Map<string, NodeLayout>
  ): NodeLayout | null {
    // 1. 命中测试：找到最近的节点
    const hitResult = this.hitTest(x, y, layoutCache);
    if (!hitResult) {
      return null;
    }

    const targetLayout = layoutCache.get(hitResult.nodeId);
    if (!targetLayout) {
      return null;
    }

    // 2. 根据区域计算 indicator 位置
    let indicatorY: number;
    switch (hitResult.area) {
      case "above":
        indicatorY = targetLayout.y - DROP_INDICATOR_CONFIG.height / 2;
        break;
      case "below":
        indicatorY =
          targetLayout.y +
          targetLayout.height -
          DROP_INDICATOR_CONFIG.height / 2;
        break;
      case "child":
        // 作为子节点，显示在节点下方，稍微缩进
        indicatorY =
          targetLayout.y +
          targetLayout.height +
          10 -
          DROP_INDICATOR_CONFIG.height / 2;
        break;
    }

    return {
      id: "drop-indicator",
      x: targetLayout.x,
      y: indicatorY,
      width: targetLayout.width,
      height: DROP_INDICATOR_CONFIG.height,
    };
  }

  // ==========================================================================
  // 私有辅助方法
  // ==========================================================================

  /**
   * 按照深度优先遍历 + order_index 顺序获取节点列表
   * 这样可以确保 dagre 按照正确的顺序排列同级节点
   *
   * @param visibleNodes - 可见节点 Map
   * @returns 排序后的节点列表
   */
  private getSortedNodesForDagre(
    visibleNodes: Map<string, MindmapNode>
  ): MindmapNode[] {
    const result: MindmapNode[] = [];
    const visited = new Set<string>();

    // 找到根节点
    const rootNode = Array.from(visibleNodes.values()).find(
      (node) => !node.parent_short_id
    );

    if (!rootNode) {
      // 如果没有根节点，直接返回所有节点
      return Array.from(visibleNodes.values());
    }

    // 深度优先遍历
    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) {
        return;
      }

      const node = visibleNodes.get(nodeId);
      if (!node) {
        return;
      }

      visited.add(nodeId);
      result.push(node);

      // 获取子节点并按 order_index 排序
      const children = Array.from(visibleNodes.values())
        .filter((n) => n.parent_short_id === nodeId)
        .sort((a, b) => a.order_index - b.order_index);

      // 递归遍历子节点
      for (const child of children) {
        dfs(child.short_id);
      }
    };

    // 从根节点开始遍历
    dfs(rootNode.short_id);

    return result;
  }

  /**
   * 过滤可见节点（排除折叠节点的后代）
   *
   * @param nodes - 所有节点
   * @param collapsedNodes - 折叠的节点 ID 集合
   * @returns 可见节点 Map
   */
  private filterVisibleNodes(
    nodes: Map<string, MindmapNode>,
    collapsedNodes: Set<string>
  ): Map<string, MindmapNode> {
    const visibleNodes = new Map<string, MindmapNode>();

    // 辅助函数：检查节点是否可见
    const isNodeVisible = (node: MindmapNode): boolean => {
      // 根节点总是可见
      if (!node.parent_short_id) {
        return true;
      }

      // 递归检查祖先是否有折叠的
      let current: MindmapNode | undefined = node;
      while (current && current.parent_short_id) {
        const parent = nodes.get(current.parent_short_id);
        if (!parent) {
          return false; // 父节点不存在，视为不可见
        }
        if (collapsedNodes.has(parent.short_id)) {
          return false; // 祖先被折叠，不可见
        }
        current = parent;
      }

      return true;
    };

    // 过滤所有节点
    for (const [id, node] of nodes) {
      if (isNodeVisible(node)) {
        visibleNodes.set(id, node);
      }
    }

    return visibleNodes;
  }

  /**
   * 调整同级节点水平对齐
   *
   * 让具有相同父节点的兄弟节点左侧对齐到最宽节点的左边缘
   *
   * @param visibleNodes - 可见节点 Map
   * @param layouts - 布局结果 Map（会被直接修改）
   */
  private alignSiblingNodes(
    visibleNodes: Map<string, MindmapNode>,
    layouts: Map<string, NodeLayout>
  ): void {
    // 1. 按父节点分组
    const siblingGroups = new Map<string | null, string[]>();

    for (const node of visibleNodes.values()) {
      const parentId = node.parent_short_id;
      if (!siblingGroups.has(parentId)) {
        siblingGroups.set(parentId, []);
      }
      siblingGroups.get(parentId)!.push(node.short_id);
    }

    // 2. 对每组兄弟节点进行对齐调整
    for (const [_parentId, siblingIds] of siblingGroups) {
      // 跳过只有一个节点的组（无需对齐）
      if (siblingIds.length <= 1) {
        continue;
      }

      // 找到最宽节点的宽度
      let maxWidth = 0;
      for (const nodeId of siblingIds) {
        const layout = layouts.get(nodeId);
        if (layout && layout.width > maxWidth) {
          maxWidth = layout.width;
        }
      }

      // 调整所有兄弟节点的 x 坐标，使它们左侧对齐
      // Dagre 布局后，节点是居中对齐的，需要调整为左对齐
      for (const nodeId of siblingIds) {
        const layout = layouts.get(nodeId);
        if (layout) {
          // 计算需要向左移动的距离
          // 当前节点中心 = layout.x + layout.width / 2
          // 最宽节点的左边缘对应的中心 = layout.x + maxWidth / 2
          // 差值 = (maxWidth - layout.width) / 2
          // 新的 x = 原 x - 差值，即让窄节点向左移动到与最宽节点左对齐
          const offset = (maxWidth - layout.width) / 2;
          layout.x = layout.x - offset;
        }
      }
    }
  }

  /**
   * 命中测试：找到鼠标位置最近的节点和区域
   *
   * @param x - 鼠标 x 坐标
   * @param y - 鼠标 y 坐标
   * @param layoutCache - 布局缓存
   * @returns 命中结果，包括节点 ID 和区域（above/below/child）
   */
  private hitTest(
    x: number,
    y: number,
    layoutCache: Map<string, NodeLayout>
  ): { nodeId: string; area: "above" | "below" | "child" } | null {
    let closestNode: string | null = null;
    let closestDistance = Infinity;

    // 找到最近的节点
    for (const [nodeId, layout] of layoutCache) {
      // 检查水平方向是否在节点范围内（带一些容差）
      if (x >= layout.x - 50 && x <= layout.x + layout.width + 50) {
        const distance = Math.abs(y - (layout.y + layout.height / 2));
        if (distance < closestDistance) {
          closestDistance = distance;
          closestNode = nodeId;
        }
      }
    }

    if (!closestNode) {
      return null;
    }

    const layout = layoutCache.get(closestNode)!;

    // 判断在节点的哪个区域
    const margin = DROP_INDICATOR_CONFIG.hitTestMargin;
    const middleY = layout.y + layout.height / 2;

    let area: "above" | "below" | "child";
    if (y < middleY - margin / 2) {
      area = "above";
    } else if (y > middleY + margin / 2) {
      area = "below";
    } else {
      area = "child";
    }

    return { nodeId: closestNode, area };
  }
}
