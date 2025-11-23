import type { MindmapNode } from "@/lib/types";
import type {
  MindmapLayoutEngine,
  MindmapLayoutService,
  NodeSize,
  SizeGetter,
} from "./mindmap-layout";
import type { NodeLayout } from "@/domain/mindmap-store.types";
import { actionSubscriptionManager } from "@/domain/action-subscription-manager";
import { useMindmapStore } from "@/domain/mindmap-store";
import { predictNodeSize } from "./layout-predictor";

// ============================================================================
// MindmapLayoutServiceImpl - 有状态的布局服务实现
// ============================================================================

/**
 * 布局服务实现
 *
 * 职责：
 * - 订阅 Actions 变化并自动响应
 * - 管理节点尺寸缓存
 * - 驱动 LayoutEngine 重新计算布局
 * - 将布局结果保存到 Store
 */
export class MindmapLayoutServiceImpl implements MindmapLayoutService {
  // 内部状态
  private readonly engine: MindmapLayoutEngine;
  private readonly sizeGetter: SizeGetter;

  // 尺寸缓存（由 measureNode 填充）
  private sizeCache: Map<string, NodeSize> = new Map();

  // 订阅清理函数
  private unsubscribeFunctions: Array<() => void> = [];

  // 防止重复初始化标志
  private isInitializing = false;

  constructor(engine: MindmapLayoutEngine, sizeGetter: SizeGetter) {
    this.engine = engine;
    this.sizeGetter = sizeGetter;
  }
  // ==========================================================================
  // 公共 API
  // ==========================================================================

  /**
   * 初始化服务
   *
   * @param engine - 布局引擎实例
   * @param sizeGetter - 节点尺寸测量函数
   * @param store - MindmapStore 实例
   */
  init(): void {
    console.log("[LayoutService] Initializing...");

    this.sizeCache.clear();
    this.isInitializing = false; // 重置标志

    // 设置 Action 订阅
    this.setupSubscriptions();

    // 异步测量所有节点并计算布局（只调用一次）
    this.measureAndUpdateAllNodes().catch((error) => {
      console.error("[LayoutService] Failed to initialize layout:", error);
      this.isInitializing = false; // 确保错误时也清除标志
    });

    console.log("[LayoutService] Initialized successfully");
  }

  /**
   * 测量节点尺寸并更新缓存
   *
   * @param node - 要测量的节点
   * @returns 节点尺寸
   */
  async measureNode(node: MindmapNode): Promise<NodeSize> {
    if (!this.sizeGetter) {
      throw new Error("LayoutService not initialized: sizeGetter is null");
    }

    const size = await this.sizeGetter(node);
    this.sizeCache.set(node.short_id, size);

    console.log(`[LayoutService] Measured node ${node.short_id}:`, size);

    return size;
  }

  /**
   * 重新计算布局（驱动 engine）
   */
  private updateLayout(): void {
    const { nodes, collapsedNodes } = this.getCurrentState();
    // 计算新布局
    const newLayouts = this.engine.layout(
      nodes,
      this.sizeCache,
      collapsedNodes
    );

    // 保存到 store，触发响应式更新
    this.populateLayoutsToStore(newLayouts);

    console.log(
      `[LayoutService] Layout updated in store, visible nodes: ${newLayouts.size}`
    );
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  /**
   * 测量所有节点的尺寸并更新布局
   */
  private async measureAndUpdateAllNodes(): Promise<void> {
    // 防止重复初始化
    if (this.isInitializing) {
      console.log("[LayoutService] Already initializing, skipping...");
      return;
    }

    this.isInitializing = true;
    console.log("[LayoutService] Measuring all nodes...");
    const { nodes } = this.getCurrentState();

    try {
      // 测量所有可见节点的尺寸
      const measurePromises = Array.from(nodes.values()).map((node) =>
        this.measureNode(node)
      );

      await Promise.all(measurePromises);

      console.log(
        `[LayoutService] Measured ${this.sizeCache.size} nodes successfully`
      );

      // 重新计算布局（使用实际尺寸）
      this.updateLayout();
    } catch (error) {
      console.error("[LayoutService] Failed to measure nodes:", error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 从 store 获取最新的节点和折叠状态
   * 必须从 store 获取，因为 immer 更新后会创建新的 Map 对象
   */
  private getCurrentState(): {
    nodes: Map<string, MindmapNode>;
    collapsedNodes: Set<string>;
  } {
    const store = useMindmapStore.getState();
    if (!store.currentEditor) {
      return { nodes: new Map(), collapsedNodes: new Set() };
    }
    return {
      nodes: store.currentEditor.nodes,
      collapsedNodes: store.currentEditor.collapsedNodes,
    };
  }

  /**
   * 设置 Action 订阅（双层 + 后处理架构）
   *
   * 四步处理流程：
   * 1. Sync订阅：预测受影响节点的尺寸，更新缓存
   * 2. Sync后处理：使用预测尺寸驱动布局引擎，更新预测布局到Store
   * 3. Async订阅：实际测量节点的真实尺寸
   * 4. Async后处理：使用真实尺寸驱动布局引擎，更新精确布局到Store
   */
  private setupSubscriptions(): void {
    console.log(
      "[LayoutService] Setting up action subscriptions (dual-layer)..."
    );

    // ========================================
    // 步骤 1: 单个 Action 的同步订阅
    // 职责：预测受影响节点的布局，更新缓存的测量尺寸
    // 时机：每个 Action 的 Store 更新后立即执行
    // ========================================

    this.unsubscribeFunctions.push(
      actionSubscriptionManager.subscribeSync("addChildNode", ({ action }) => {
        const addAction = action as { getNode?: () => MindmapNode };
        if (addAction.getNode) {
          const newNode = addAction.getNode();
          console.log(
            "[LayoutService] Sync: predicting new node",
            newNode.short_id
          );

          // 预测新节点的尺寸
          const predictedSize = predictNodeSize(newNode);
          this.sizeCache.set(newNode.short_id, predictedSize);
        }
      })
    );

    this.unsubscribeFunctions.push(
      actionSubscriptionManager.subscribeSync("updateNode", ({ action }) => {
        const updateAction = action as { getNodeId?: () => string };
        if (updateAction.getNodeId) {
          const nodeId = updateAction.getNodeId();
          const node = this.getCurrentState().nodes.get(nodeId);

          if (node) {
            console.log(
              "[LayoutService] Sync: predicting updated node",
              nodeId
            );

            // 预测更新后的尺寸
            const predictedSize = predictNodeSize(node);
            this.sizeCache.set(nodeId, predictedSize);
          }
        }
      })
    );

    this.unsubscribeFunctions.push(
      actionSubscriptionManager.subscribeSync("removeNode", ({ action }) => {
        const deleteAction = action as { getNodeId?: () => string };
        if (deleteAction.getNodeId) {
          const nodeId = deleteAction.getNodeId();
          console.log("[LayoutService] Sync: removing node from cache", nodeId);

          // 清理缓存
          this.sizeCache.delete(nodeId);
        }
      })
    );

    // ========================================
    // 步骤 2: 同步后处理
    // 职责：驱动 LayoutEngine，更新预测布局到 EditorState.layouts
    // 时机：所有 Action 的 Sync 订阅处理完成后执行（后处理阶段）
    // 特点：批量操作时只调用一次，接收所有相关 Actions
    // ========================================

    this.unsubscribeFunctions.push(
      actionSubscriptionManager.subscribePostSync(
        [
          "addChildNode",
          "updateNode",
          "removeNode",
          "collapseNode",
          "expandNode",
        ],
        (actionsMap) => {
          console.log(
            "[LayoutService] Post-sync: updating layout with predictions,",
            actionsMap.size,
            "action types"
          );

          this.updateLayout();
        }
      )
    );

    // ========================================
    // 步骤 3: 单个 Action 的异步订阅
    // 职责：实际测量节点的真实尺寸（DOM 测量）
    // 时机：每个 Action 的 IndexedDB 更新后立即执行
    // ========================================

    this.unsubscribeFunctions.push(
      actionSubscriptionManager.subscribeAsync(
        "addChildNode",
        async ({ action }) => {
          const addAction = action as { getNode?: () => MindmapNode };
          if (addAction.getNode) {
            const newNode = addAction.getNode();
            console.log(
              "[LayoutService] Async: measuring new node",
              newNode.short_id
            );

            // 异步测量真实尺寸（需要 DOM 渲染）
            const actualSize = await this.measureNode(newNode);
            this.sizeCache.set(newNode.short_id, actualSize);
          }
        }
      )
    );

    this.unsubscribeFunctions.push(
      actionSubscriptionManager.subscribeAsync(
        "updateNode",
        async ({ action }) => {
          const updateAction = action as { getNodeId?: () => string };
          if (updateAction.getNodeId) {
            const nodeId = updateAction.getNodeId();
            const node = this.getCurrentState().nodes.get(nodeId);

            if (node) {
              console.log(
                "[LayoutService] Async: measuring updated node",
                nodeId
              );

              // 异步测量真实尺寸
              const actualSize = await this.measureNode(node);
              this.sizeCache.set(nodeId, actualSize);
            }
          }
        }
      )
    );

    // ========================================
    // 步骤 4: 异步后处理
    // 职责：使用真实尺寸驱动 LayoutEngine，更新精确布局到 Store
    // 时机：所有 Action 的 Async 订阅处理完成后执行（后处理阶段）
    // 特点：批量操作时只调用一次，接收所有相关 Actions
    // ========================================

    this.unsubscribeFunctions.push(
      actionSubscriptionManager.subscribePostAsync(
        [
          "addChildNode",
          "updateNode",
          "removeNode",
          "collapseNode",
          "expandNode",
        ],
        async (actionsMap) => {
          console.log(
            "[LayoutService] Post-async: updating layout with actual sizes,",
            actionsMap.size,
            "action types"
          );

          this.updateLayout();
        }
      )
    );

    console.log(
      `[LayoutService] Subscribed with dual-layer architecture: ${this.unsubscribeFunctions.length} subscriptions`
    );
  }

  private populateLayoutsToStore(layouts: Map<string, NodeLayout>): void {
    const store = useMindmapStore.getState();
    store.updateLayouts(layouts);
  }
}
