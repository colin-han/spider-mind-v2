import type { MindmapNode } from "@/lib/types";

// ============================================================================
// 类型定义
// ============================================================================

export interface NodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeSize {
  width: number;
  height: number;
}

export interface HitTestResult {
  nodeId: string;
  area: "above" | "below" | "child";
}

export type SizeGetter = (node: MindmapNode) => Promise<NodeSize>;

// ============================================================================
// MindmapLayoutEngine - 无状态的布局计算引擎
// ============================================================================

/**
 * 布局引擎接口 - 纯计算，无状态，同步执行
 *
 * 职责：
 * - 根据输入的节点、尺寸、折叠状态计算布局
 * - 同步返回布局结果
 * - 不持有任何状态
 * - 可以随时替换不同的布局算法实现
 */
export interface MindmapLayoutEngine {
  /**
   * 计算布局
   *
   * @param nodes - 所有节点的 Map（包括折叠的节点）
   * @param sizeCache - 节点尺寸缓存
   * @param collapsedNodes - 折叠的节点 ID 集合
   * @returns 布局结果 Map（只包含可见节点的布局）
   */
  layout(
    nodes: Map<string, MindmapNode>,
    sizeCache: Map<string, NodeSize>,
    collapsedNodes: Set<string>
  ): Map<string, NodeLayout>;

  /**
   * 获取 drop indicator 布局
   *
   * @param x - 鼠标 x 坐标
   * @param y - 鼠标 y 坐标
   * @param layoutCache - 当前的布局缓存
   * @returns drop indicator 的布局信息
   */
  getDropIndicatorLayout(
    x: number,
    y: number,
    layoutCache: Map<string, NodeLayout>
  ): NodeLayout | null;
}

// ============================================================================
// MindmapLayoutService - 有状态的布局服务
// ============================================================================

/**
 * 布局服务接口 - 管理状态，协调布局计算
 *
 * 职责：
 * - 监听 store 变化
 * - 管理节点尺寸缓存
 * - 驱动 LayoutEngine 重新计算布局
 * - 缓存布局结果
 */
export interface MindmapLayoutService {
  /**
   * 初始化服务
   *
   * @param engine - 布局引擎实例
   * @param sizeGetter - 节点尺寸测量函数
   */
  init(engine: MindmapLayoutEngine, sizeGetter: SizeGetter): void;

  /**
   * 测量节点尺寸并更新缓存
   *
   * @param node - 要测量的节点
   * @returns 节点尺寸
   */
  measureNode(node: MindmapNode): Promise<NodeSize>;

  /**
   * 重新计算布局（驱动 engine）
   *
   * @param nodes - 当前所有节点
   * @param collapsedNodes - 当前折叠的节点
   */
  updateLayout(
    nodes: Map<string, MindmapNode>,
    collapsedNodes: Set<string>
  ): void;

  /**
   * 获取节点布局
   *
   * @param nodeId - 节点 ID
   * @returns 节点布局，如果节点不可见则返回 null
   */
  getNodeLayout(nodeId: string): NodeLayout | null;

  /**
   * 获取所有布局
   *
   * @returns 所有可见节点的布局
   */
  getAllLayouts(): Map<string, NodeLayout>;

  /**
   * 获取 drop indicator 布局
   *
   * @param x - 鼠标 x 坐标
   * @param y - 鼠标 y 坐标
   * @returns drop indicator 的布局信息
   */
  getDropIndicatorLayout(x: number, y: number): NodeLayout | null;

  /**
   * 清理资源
   */
  dispose(): void;
}
