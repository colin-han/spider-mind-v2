import type { EditorAction } from "./mindmap-store.types";

/**
 * Action 类型定义
 *
 * 直接使用现有 Action 类的 type 字段值
 */
export type ActionType =
  // 持久化 Actions（修改节点数据）
  | "addChildNode"
  | "removeNode"
  | "updateNode"

  // 非持久化 Actions（仅 UI 状态）
  | "setCurrentNode"
  | "collapseNode"
  | "expandNode"
  | "setFocusedArea"

  // AI 相关 Actions
  | "addAIMessage"
  | "updateAIMessageMetadata"

  // 未来可扩展...
  | string; // 允许任意字符串（用于未来的 Action 类型）

/**
 * Action Payload
 *
 * 包含 Action 实例本身，订阅者可以通过类型断言访问具体数据
 */
export interface ActionPayload {
  action: EditorAction; // Action 实例
  mindmapId: string; // 思维导图 ID
}

/**
 * 同步订阅者（在 Store 更新后立即执行）
 *
 * 约束：
 * - 必须是同步函数（不能返回 Promise）
 * - 应该尽快完成（< 10ms）
 * - 不应包含异步操作
 */
export type SyncSubscriber = (payload: ActionPayload) => void;

/**
 * 异步订阅者（在 IndexedDB 更新后执行）
 *
 * 允许：
 * - 同步或异步函数
 * - 包含异步操作（如 DOM 测量、网络请求）
 */
export type AsyncSubscriber = (payload: ActionPayload) => void | Promise<void>;

/**
 * 同步后处理器（在所有 Sync 订阅处理完成后执行）
 *
 * 约束：
 * - 必须是同步函数
 * - 应该尽快完成
 *
 * @param actionsMap - 按 ActionType 分组的 Actions
 *   例如：Map { "addChildNode" => [action1, action2], "updateNode" => [action3] }
 */
export type PostSyncHandler = (
  actionsMap: Map<ActionType, EditorAction[]>
) => void;

/**
 * 异步后处理器（在所有 Async 订阅处理完成后执行）
 *
 * @param actionsMap - 按 ActionType 分组的 Actions
 */
export type PostAsyncHandler = (
  actionsMap: Map<ActionType, EditorAction[]>
) => void | Promise<void>;
