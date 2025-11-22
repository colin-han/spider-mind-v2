import type {
  ActionType,
  ActionPayload,
  Subscriber,
} from "./action-subscription.types";

/**
 * Action 订阅管理器
 *
 * 职责：
 * - 管理所有订阅者
 * - 通知订阅者 action 执行
 * - 处理订阅生命周期
 */
export class ActionSubscriptionManager {
  private subscribers: Map<ActionType, Set<Subscriber>> = new Map();

  /**
   * 订阅 action
   *
   * @param action - action 类型
   * @param handler - 处理函数
   * @returns 取消订阅函数
   */
  subscribe(action: ActionType, handler: Subscriber): () => void {
    if (!this.subscribers.has(action)) {
      this.subscribers.set(action, new Set());
    }

    this.subscribers.get(action)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.unsubscribe(action, handler);
    };
  }

  /**
   * 订阅多个 actions
   *
   * @param actions - action 类型数组
   * @param handler - 处理函数
   * @returns 取消订阅函数
   */
  subscribeMultiple(actions: ActionType[], handler: Subscriber): () => void {
    const unsubscribeFns = actions.map((action) =>
      this.subscribe(action, handler)
    );

    // 返回批量取消订阅函数
    return () => {
      unsubscribeFns.forEach((fn) => fn());
    };
  }

  /**
   * 取消订阅
   */
  unsubscribe(action: ActionType, handler: Subscriber): void {
    const handlers = this.subscribers.get(action);
    if (handlers) {
      handlers.delete(handler);

      // 如果没有订阅者了，删除 key
      if (handlers.size === 0) {
        this.subscribers.delete(action);
      }
    }
  }

  /**
   * 通知订阅者
   *
   * @param action - action 类型
   * @param payload - action 数据
   */
  async notify(action: ActionType, payload: ActionPayload): Promise<void> {
    const handlers = this.subscribers.get(action);
    if (!handlers || handlers.size === 0) {
      return;
    }

    // 错误隔离：一个订阅者的错误不应影响其他订阅者
    const results = await Promise.allSettled(
      Array.from(handlers).map((handler) =>
        // 使用立即执行的 async 函数来捕获同步错误
        (async () => {
          await handler(payload);
        })()
      )
    );

    // 记录错误
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `[ActionSubscriptionManager] Handler ${index} for action "${action}" failed:`,
          result.reason
        );
      }
    });
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.subscribers.clear();
  }

  /**
   * 获取订阅统计信息（调试用）
   */
  getStats(): Record<ActionType, number> {
    const stats: Record<string, number> = {};

    for (const [action, handlers] of this.subscribers.entries()) {
      stats[action] = handlers.size;
    }

    return stats as Record<ActionType, number>;
  }
}

// 全局单例
export const actionSubscriptionManager = new ActionSubscriptionManager();
