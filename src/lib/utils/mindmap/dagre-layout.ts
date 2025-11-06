/**
 * Dagre 布局计算工具
 *
 * 使用 Dagre 算法自动计算思维导图节点的位置
 */

import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { LayoutOptions } from "@/lib/types/react-flow";

/**
 * 默认布局选项
 */
const defaultOptions: LayoutOptions = {
  direction: "LR", // 从左到右布局 (Left to Right)
  nodeWidth: 172,
  nodeHeight: 50,
  rankSep: 80, // 层级间距
  nodeSep: 40, // 节点间距
};

/**
 * 使用 Dagre 算法计算节点布局
 *
 * @param nodes - React Flow 节点数组
 * @param edges - React Flow 边数组
 * @param options - 布局选项 (可选)
 * @returns 带有计算后位置的节点数组
 *
 * @example
 * ```ts
 * const layoutedNodes = calculateDagreLayout(nodes, edges, {
 *   direction: 'LR',
 *   rankSep: 100,
 * });
 * ```
 */
export function calculateDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: Partial<LayoutOptions> = {}
): Node[] {
  const opts = { ...defaultOptions, ...options };

  // 创建 dagre 图
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // 设置图布局参数
  dagreGraph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
  });

  // 添加节点到 dagre 图
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width || opts.nodeWidth,
      height: node.height || opts.nodeHeight,
    });
  });

  // 添加边到 dagre 图
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 执行布局计算
  dagre.layout(dagreGraph);

  // 应用计算结果到节点
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.width || opts.nodeWidth;
    const height = node.height || opts.nodeHeight;

    return {
      ...node,
      position: {
        // Dagre 的锚点是中心,React Flow 是左上角
        // 所以需要减去一半的宽度和高度
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      // MiniMap 需要这些属性来渲染节点
      width,
      height,
    };
  });
}
