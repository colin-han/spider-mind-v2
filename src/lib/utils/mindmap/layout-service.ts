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
  updateLayout(): void {
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
   * 设置 Action 订阅
   * 监听会影响布局的 Actions 并触发重新计算
   */
  private setupSubscriptions(): void {
    console.log("[LayoutService] Setting up action subscriptions...");

    // 1. 订阅节点添加事件
    const unsubscribeAddNode = actionSubscriptionManager.subscribe(
      "addChildNode",
      async ({ action }) => {
        console.log("[LayoutService] Action received: addChildNode");

        // 测量新节点尺寸
        // 使用类型断言来访问 AddNodeAction 的 getNode() 方法
        const addAction = action as { getNode?: () => MindmapNode };
        if (addAction.getNode) {
          const newNode = addAction.getNode();
          console.log("[LayoutService] Measuring new node:", newNode.short_id);
          await this.measureNode(newNode);
        }

        this.updateLayout();
      }
    );
    this.unsubscribeFunctions.push(unsubscribeAddNode);

    // 2. 订阅节点更新事件（内容变化可能导致尺寸变化）
    const unsubscribeUpdateNode = actionSubscriptionManager.subscribe(
      "updateNode",
      async ({ action }) => {
        console.log("[LayoutService] Action received: updateNode");

        // 从 store 获取最新状态
        const state = this.getCurrentState();
        // 清除缓存的尺寸，触发重新测量
        const updateAction = action as { getNodeId?: () => string };
        if (updateAction.getNodeId) {
          const nodeId = updateAction.getNodeId();
          console.log("[LayoutService] Re-measuring updated node:", nodeId);
          this.sizeCache.delete(nodeId);

          const node = state.nodes.get(nodeId);
          if (node) {
            await this.measureNode(node);
          }
        }

        this.updateLayout();
      }
    );
    this.unsubscribeFunctions.push(unsubscribeUpdateNode);

    // 3. 订阅节点删除事件
    const unsubscribeDeleteNode = actionSubscriptionManager.subscribe(
      "deleteNode",
      async () => {
        console.log("[LayoutService] Action received: deleteNode");

        this.updateLayout();
      }
    );
    this.unsubscribeFunctions.push(unsubscribeDeleteNode);

    // 4. 订阅折叠/展开事件
    const unsubscribeToggleCollapse = actionSubscriptionManager.subscribe(
      "toggleCollapseNode",
      async () => {
        console.log("[LayoutService] Action received: toggleCollapseNode");

        this.updateLayout();
      }
    );
    this.unsubscribeFunctions.push(unsubscribeToggleCollapse);

    console.log(
      `[LayoutService] Subscribed to ${this.unsubscribeFunctions.length} action types`
    );
  }

  private populateLayoutsToStore(layouts: Map<string, NodeLayout>): void {
    const store = useMindmapStore.getState();
    store.updateLayouts(layouts);
  }
}
