import type { MindmapNode } from "@/lib/types";
import type { NodeLayout } from "@/domain/mindmap-store.types";

// ============================================================================
// 类型定义
// ============================================================================

export type { NodeLayout }; // 重新导出，方便外部使用

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
 * - 订阅 Actions 变化（自动响应）
 * - 管理节点尺寸缓存
 * - 驱动 LayoutEngine 重新计算布局
 * - 缓存布局结果
 */
export interface MindmapLayoutService {
  /**
   * 初始化服务（设置订阅）
   *
   * 注：engine 和 sizeGetter 在构造函数中传入，
   * init() 负责设置 Action 订阅并执行初始布局计算
   */
  init(): void;

  /**
   * 测量节点尺寸并更新缓存
   *
   * @param node - 要测量的节点
   * @returns 节点尺寸
   */
  measureNode(node: MindmapNode): Promise<NodeSize>;
}
