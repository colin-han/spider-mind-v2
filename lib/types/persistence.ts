/**
 * 持久化相关类型定义
 *
 * 包含 IndexedDB、操作历史、同步管理等持久化功能的类型定义
 */

/**
 * 节点操作状态类型
 * 用于记录操作历史中的 before_state 和 after_state
 *
 * @description
 * 这个类型定义了操作历史中需要保存的节点状态字段。
 * 根据 P0-003 issue 的修复，使用明确的类型定义代替 unknown 类型。
 *
 * @remarks
 * - 所有字段都是必需的，但某些字段在特定操作中不使用
 * - 使用 Partial 的变体来确保类型安全
 *
 * @see docs/draft/mindmap-persistence-requirements.md - Section 3.7
 */
export type NodeOperationState = {
  /** 节点 ID (使用 nodeId 而非 short_id，因为操作历史需要精确引用) */
  nodeId: string;
} & Partial<{
  /** 节点标题（用于 UPDATE_TITLE, ADD_NODE 操作） */
  title: string;
  /** 节点内容（用于 UPDATE_CONTENT, ADD_NODE 操作） */
  content: string | null;
  /** 父节点 ID（用于 MOVE_NODE, ADD_NODE 操作） */
  parent_id: string | null;
  /** 排序索引（用于 MOVE_NODE, ADD_NODE 操作） */
  order_index: number;
}>;

/**
 * 操作类型枚举
 */
export type OperationType =
  | "ADD_NODE"
  | "UPDATE_NODE_TITLE"
  | "UPDATE_NODE_CONTENT"
  | "DELETE_NODE"
  | "MOVE_NODE"
  | "UPDATE_MINDMAP_TITLE";

/**
 * 操作历史记录
 *
 * @description
 * 用于撤销/重做功能的操作历史记录。
 * 每个操作都记录操作前后的状态，支持执行反向操作。
 *
 * @remarks
 * - ADD_NODE: before_state 为 null, after_state 包含新节点信息
 * - DELETE_NODE: before_state 包含删除的节点信息, after_state 为 null
 * - UPDATE_*: before_state 和 after_state 都不为 null
 */
export interface OperationHistory {
  /** 操作 ID */
  id: string;
  /** 所属思维导图 ID */
  mindmap_id: string;
  /** 操作类型 */
  operation_type: OperationType;
  /** 操作时间戳 */
  timestamp: string;
  /** 操作前的状态 (ADD_NODE 时为 null) */
  before_state: NodeOperationState | null;
  /** 操作后的状态 (DELETE_NODE 时为 null) */
  after_state: NodeOperationState | null;
  /** 是否已被撤销 */
  is_undone: boolean;
}

/**
 * 保存状态类型
 */
export type SaveStatus =
  | "saved" // 云端已保存
  | "local_only" // 仅本地保存，未同步
  | "syncing" // 同步中
  | "sync_failed" // 同步失败
  | "conflict"; // 检测到冲突

/**
 * 详细保存状态
 */
export type DetailedSaveStatus =
  | { type: "saved"; timestamp: string }
  | { type: "local_only"; dirtyCount: number }
  | { type: "syncing"; progress?: number }
  | { type: "sync_failed"; error: string; retryable: boolean }
  | { type: "conflict"; serverVersion: string }
  | { type: "offline"; dirtyCount: number };

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  message?: string;
  conflict?: ConflictInfo;
  error?: string;
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  localVersion: string;
  serverVersion: string;
}

/**
 * 冲突解决动作
 */
export type ConflictAction = "force_overwrite" | "discard_local" | "cancel";

/**
 * IndexedDB 扩展字段
 *
 * @description
 * IndexedDB 相比 Supabase 额外添加的字段，用于本地持久化管理
 */
export interface IndexedDBExtendedFields {
  /** 是否有未保存的修改 */
  dirty: boolean;
  /** 本地最后修改时间 */
  local_updated_at: string;
}

/**
 * 操作元数据
 *
 * @description
 * Persistence Middleware 中传递的操作元数据
 */
export interface OperationMetadata {
  /** 操作类型标识 */
  [OPERATION_TYPE]: OperationType;
  /** 操作前的状态 */
  before: NodeOperationState;
  /** 操作后的状态 */
  after: NodeOperationState;
  /** 思维导图 ID */
  mindmapId: string;
  /** 节点 ID（如果适用） */
  nodeId?: string;
  /** 其他操作特定字段 */
  [key: string]: unknown;
}

/**
 * 操作类型符号
 * 用于在操作元数据中标识操作类型
 */
export const OPERATION_TYPE = Symbol("OPERATION_TYPE");
