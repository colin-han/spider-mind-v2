import type {
  ActionType,
  ActionPayload,
  SyncSubscriber,
  AsyncSubscriber,
  PostSyncHandler,
  PostAsyncHandler,
} from "./action-subscription.types";
import type { EditorAction } from "./mindmap-store.types";

/**
 * 订阅记录（内部使用）
 */
interface Subscription<T> {
  id: string;
  handler: T;
}

/**
 * 后处理订阅记录（内部使用）
 */
interface PostSubscription<T> {
  id: string;
  actionTypes: Set<ActionType>;
  handler: T;
}

/**
 * Action 订阅管理器（双层 + 后处理架构）
 *
 * 提供四种订阅方式：
 * 1. subscribeSync - 同步订阅（Store 更新后立即执行）
 * 2. subscribeAsync - 异步订阅（IndexedDB 更新后执行）
 * 3. subscribePostSync - 同步后处理（所有 Sync 订阅完成后执行）
 * 4. subscribePostAsync - 异步后处理（所有 Async 订阅完成后执行）
 */
export class ActionSubscriptionManager {
  // ========================================
  // 内部状态
  // ========================================

  // Sync 订阅（按 ActionType 分组）
  private syncSubscriptions = new Map<
    ActionType,
    Set<Subscription<SyncSubscriber>>
  >();

  // Async 订阅（按 ActionType 分组）
  private asyncSubscriptions = new Map<
    ActionType,
    Set<Subscription<AsyncSubscriber>>
  >();

  // Sync 后处理订阅（数组，按注册顺序执行）
  private postSyncSubscriptions: PostSubscription<PostSyncHandler>[] = [];

  // Async 后处理订阅（数组，按注册顺序执行）
  private postAsyncSubscriptions: PostSubscription<PostAsyncHandler>[] = [];

  // 订阅 ID 计数器
  private nextSubscriptionId = 1;

  // ========================================
  // 公共 API
  // ========================================

  /**
   * 订阅单个 Action 的同步通知（Store 更新后立即执行）
   *
   * @param action - Action 类型
   * @param handler - 同步处理函数
   * @returns 取消订阅函数
   */
  subscribeSync(action: ActionType, handler: SyncSubscriber): () => void {
    const id = this.generateSubscriptionId();
    const subscription: Subscription<SyncSubscriber> = { id, handler };

    // 添加到 map
    if (!this.syncSubscriptions.has(action)) {
      this.syncSubscriptions.set(action, new Set());
    }
    this.syncSubscriptions.get(action)!.add(subscription);

    // 返回取消订阅函数
    return () => {
      const subs = this.syncSubscriptions.get(action);
      if (subs) {
        subs.delete(subscription);
        if (subs.size === 0) {
          this.syncSubscriptions.delete(action);
        }
      }
    };
  }

  /**
   * 订阅单个 Action 的异步通知（IndexedDB 更新后执行）
   *
   * @param action - Action 类型
   * @param handler - 异步处理函数
   * @returns 取消订阅函数
   */
  subscribeAsync(action: ActionType, handler: AsyncSubscriber): () => void {
    const id = this.generateSubscriptionId();
    const subscription: Subscription<AsyncSubscriber> = { id, handler };

    if (!this.asyncSubscriptions.has(action)) {
      this.asyncSubscriptions.set(action, new Set());
    }
    this.asyncSubscriptions.get(action)!.add(subscription);

    return () => {
      const subs = this.asyncSubscriptions.get(action);
      if (subs) {
        subs.delete(subscription);
        if (subs.size === 0) {
          this.asyncSubscriptions.delete(action);
        }
      }
    };
  }

  /**
   * 订阅同步后处理（在所有 Sync 订阅处理完成后执行）
   *
   * 语义：这不是批处理优化，而是明确的"后处理"阶段
   * - 在所有 subscribeSync 处理完成后才执行
   * - 每次批处理中，每个 ActionType 只调用一次（去重）
   * - 接收该批次中该类型的所有 Actions
   *
   * @param actions - 关心的 Action 类型列表
   * @param handler - 后处理函数
   * @returns 取消订阅函数
   */
  subscribePostSync(
    actions: ActionType[],
    handler: PostSyncHandler
  ): () => void {
    const id = this.generateSubscriptionId();
    const subscription: PostSubscription<PostSyncHandler> = {
      id,
      actionTypes: new Set(actions),
      handler,
    };

    this.postSyncSubscriptions.push(subscription);

    return () => {
      const index = this.postSyncSubscriptions.findIndex((s) => s.id === id);
      if (index !== -1) {
        this.postSyncSubscriptions.splice(index, 1);
      }
    };
  }

  /**
   * 订阅异步后处理（在所有 Async 订阅处理完成后执行）
   *
   * 语义：这不是批处理优化，而是明确的"后处理"阶段
   * - 在所有 subscribeAsync 处理完成后才执行
   * - 每次批处理中，每个 ActionType 只调用一次（去重）
   * - 接收该批次中该类型的所有 Actions
   *
   * @param actions - 关心的 Action 类型列表
   * @param handler - 后处理函数
   * @returns 取消订阅函数
   */
  subscribePostAsync(
    actions: ActionType[],
    handler: PostAsyncHandler
  ): () => void {
    const id = this.generateSubscriptionId();
    const subscription: PostSubscription<PostAsyncHandler> = {
      id,
      actionTypes: new Set(actions),
      handler,
    };

    this.postAsyncSubscriptions.push(subscription);

    return () => {
      const index = this.postAsyncSubscriptions.findIndex((s) => s.id === id);
      if (index !== -1) {
        this.postAsyncSubscriptions.splice(index, 1);
      }
    };
  }

  // ========================================
  // 通知方法（由 MindmapStore 调用）
  // ========================================

  /**
   * 通知同步订阅者（在 applyToEditorState 之后调用）
   *
   * @param actions - Actions 数组
   * @param mindmapId - 思维导图 ID
   */
  notifySync(actions: EditorAction[], mindmapId: string): void {
    const startTime = performance.now();

    // 1. 逐个调用 Sync 订阅
    for (const action of actions) {
      const subscribers = this.syncSubscriptions.get(action.type);
      if (subscribers && subscribers.size > 0) {
        const payload: ActionPayload = { action, mindmapId };

        for (const sub of subscribers) {
          try {
            const subStartTime = performance.now();
            sub.handler(payload);
            const subDuration = performance.now() - subStartTime;

            // 开发模式：警告慢订阅者
            if (process.env.NODE_ENV === "development" && subDuration > 5) {
              console.warn(
                `[ActionSubscriptionManager] Slow sync subscriber for ${action.type}: ${subDuration.toFixed(2)}ms`
              );
            }
          } catch (error) {
            console.error(
              `[ActionSubscriptionManager] Sync subscriber error for ${action.type}:`,
              error
            );
          }
        }
      }
    }

    // 2. 调用 Sync 后处理（去重）
    this.invokePostSyncHandlers(actions, mindmapId);

    const duration = performance.now() - startTime;

    // 性能警告
    if (duration > 10) {
      console.warn(
        `[ActionSubscriptionManager] Sync notification took ${duration.toFixed(2)}ms (> 10ms threshold)`
      );
    }
  }

  /**
   * 通知异步订阅者（在 applyToIndexedDB 之后调用）
   *
   * @param actions - Actions 数组
   * @param mindmapId - 思维导图 ID
   */
  async notifyAsync(actions: EditorAction[], mindmapId: string): Promise<void> {
    // 1. 逐个调用 Async 订阅
    for (const action of actions) {
      const subscribers = this.asyncSubscriptions.get(action.type);
      if (subscribers && subscribers.size > 0) {
        const payload: ActionPayload = { action, mindmapId };

        // 使用 Promise.allSettled 确保错误隔离
        const promises = Array.from(subscribers).map((sub) =>
          Promise.resolve(sub.handler(payload)).catch((error) => {
            console.error(
              `[ActionSubscriptionManager] Async subscriber error for ${action.type}:`,
              error
            );
          })
        );

        await Promise.allSettled(promises);
      }
    }

    // 2. 调用 Async 后处理（去重）
    await this.invokePostAsyncHandlers(actions, mindmapId);
  }

  // ========================================
  // 私有方法
  // ========================================

  /**
   * 调用同步后处理器（去重）
   */
  private invokePostSyncHandlers(
    actions: EditorAction[],
    _mindmapId: string
  ): void {
    if (this.postSyncSubscriptions.length === 0) {
      return;
    }

    // 按 ActionType 分组
    const actionsMap = this.groupActionsByType(actions);

    // 调用所有后处理器
    for (const postSub of this.postSyncSubscriptions) {
      // 检查是否有关心的 ActionType
      const relevantActions = this.filterRelevantActions(
        actionsMap,
        postSub.actionTypes
      );

      if (relevantActions.size > 0) {
        try {
          postSub.handler(relevantActions);
        } catch (error) {
          console.error(
            `[ActionSubscriptionManager] Post-sync handler error:`,
            error
          );
        }
      }
    }
  }

  /**
   * 调用异步后处理器（去重）
   */
  private async invokePostAsyncHandlers(
    actions: EditorAction[],
    _mindmapId: string
  ): Promise<void> {
    if (this.postAsyncSubscriptions.length === 0) {
      return;
    }

    // 按 ActionType 分组
    const actionsMap = this.groupActionsByType(actions);

    // 并发调用所有后处理器（错误隔离）
    const promises = this.postAsyncSubscriptions.map(async (postSub) => {
      const relevantActions = this.filterRelevantActions(
        actionsMap,
        postSub.actionTypes
      );

      if (relevantActions.size > 0) {
        try {
          await postSub.handler(relevantActions);
        } catch (error) {
          console.error(
            `[ActionSubscriptionManager] Post-async handler error:`,
            error
          );
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 按 ActionType 分组
   */
  private groupActionsByType(
    actions: EditorAction[]
  ): Map<ActionType, EditorAction[]> {
    const map = new Map<ActionType, EditorAction[]>();

    for (const action of actions) {
      if (!map.has(action.type)) {
        map.set(action.type, []);
      }
      map.get(action.type)!.push(action);
    }

    return map;
  }

  /**
   * 过滤出相关的 Actions
   */
  private filterRelevantActions(
    actionsMap: Map<ActionType, EditorAction[]>,
    interestedTypes: Set<ActionType>
  ): Map<ActionType, EditorAction[]> {
    const filtered = new Map<ActionType, EditorAction[]>();

    for (const [type, actions] of actionsMap) {
      if (interestedTypes.has(type)) {
        filtered.set(type, actions);
      }
    }

    return filtered;
  }

  /**
   * 生成订阅 ID
   */
  private generateSubscriptionId(): string {
    return `sub-${this.nextSubscriptionId++}`;
  }

  // ========================================
  // 调试和维护方法
  // ========================================

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.syncSubscriptions.clear();
    this.asyncSubscriptions.clear();
    this.postSyncSubscriptions = [];
    this.postAsyncSubscriptions = [];
  }

  /**
   * 获取订阅统计信息（调试用）
   */
  getStats(): {
    sync: Record<ActionType, number>;
    async: Record<ActionType, number>;
    postSync: number;
    postAsync: number;
  } {
    const syncStats: Record<string, number> = {};
    const asyncStats: Record<string, number> = {};

    for (const [action, handlers] of this.syncSubscriptions.entries()) {
      syncStats[action] = handlers.size;
    }

    for (const [action, handlers] of this.asyncSubscriptions.entries()) {
      asyncStats[action] = handlers.size;
    }

    return {
      sync: syncStats as Record<ActionType, number>,
      async: asyncStats as Record<ActionType, number>,
      postSync: this.postSyncSubscriptions.length,
      postAsync: this.postAsyncSubscriptions.length,
    };
  }
}

// 全局单例
export const actionSubscriptionManager = new ActionSubscriptionManager();
