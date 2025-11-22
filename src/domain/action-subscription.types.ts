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
  timestamp: number; // 执行时间戳
}

/**
 * 订阅者函数类型
 */
export type Subscriber = (payload: ActionPayload) => void | Promise<void>;

/**
 * 订阅上下文（用于扩展）
 */
export interface SubscriptionContext {
  action: ActionType;
  timestamp: number;
}
