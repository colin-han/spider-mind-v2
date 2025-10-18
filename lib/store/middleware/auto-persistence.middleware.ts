/**
 * Auto-Persistence Middleware for Zustand
 *
 * 真正的 Zustand 中间件，自动同步状态到 IndexedDB
 *
 * 功能:
 * 1. 自动拦截所有 Store 状态变更
 * 2. 检测 nodes Map 的变化（新增、更新、删除）
 * 3. 自动同步到 IndexedDB 并标记脏数据
 * 4. 自动记录操作历史（支持撤销/重做）
 */

import type { StateCreator, StoreMutatorIdentifier } from "zustand";
import { getDB, type OperationType } from "@/lib/db/schema";
import type { MindmapNode, NodeOperationState, Mindmap } from "@/lib/types";
import { generateShortId } from "@/lib/utils/short-id";

/**
 * 中间件配置选项
 */
export interface AutoPersistenceOptions {
  /**
   * 是否启用操作历史记录
   */
  enableHistory?: boolean;

  /**
   * 是否在控制台打印调试日志
   */
  debug?: boolean;

  /**
   * 是否启用自动持久化（可用于测试时禁用）
   */
  enabled?: boolean;
}

/**
 * 节点变化类型
 */
type NodeChange =
  | { type: "add"; node: MindmapNode }
  | { type: "update"; node: MindmapNode; prev: MindmapNode }
  | { type: "delete"; node: MindmapNode };

/**
 * Store 状态接口（用于中间件）
 */
interface StoreState {
  nodes: Map<string, MindmapNode>;
  currentMindmap?: Mindmap & { dirty?: boolean };
}

/**
 * Auto-Persistence 中间件类型定义
 *
 * 使用泛型类型以兼容 immer 和其他中间件
 * 保留现有的 mutators 类型信息
 */
export type AutoPersistence = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [], Mps>
) => StateCreator<T, [], Mps>;

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<AutoPersistenceOptions> = {
  enableHistory: true,
  debug: false,
  enabled: true,
};

/**
 * 创建 Auto-Persistence 中间件
 */
export const autoPersistence =
  (userOptions: AutoPersistenceOptions = {}): AutoPersistence =>
  (config) =>
  (set, get, api) => {
    const options = { ...DEFAULT_OPTIONS, ...userOptions };

    // 包装 set 函数
    type SetFn = typeof set;
    const wrappedSet: SetFn = ((
      partial: Parameters<SetFn>[0],
      replace?: Parameters<SetFn>[1]
    ) => {
      // 如果禁用，直接调用原始 set
      if (!options.enabled) {
        if (replace === true) {
          return (set as (state: unknown, replace: true) => void)(
            partial,
            replace
          );
        }
        return (set as (partial: unknown, replace?: false) => void)(
          partial,
          replace
        );
      }

      // 获取变更前的状态
      const prevState = get() as unknown as StoreState;
      const prevNodes: Map<string, MindmapNode> = new Map(
        prevState.nodes || new Map()
      );

      // 执行状态更新
      if (replace === true) {
        (set as (state: unknown, replace: true) => void)(partial, replace);
      } else {
        (set as (partial: unknown, replace?: false) => void)(partial, replace);
      }

      // 获取变更后的状态
      const nextState = get() as unknown as StoreState;
      const nextNodes: Map<string, MindmapNode> = nextState.nodes || new Map();

      // 检测节点变化
      const changes = detectNodeChanges(prevNodes, nextNodes);

      // 如果有变化，异步同步到 IndexedDB
      if (changes.length > 0) {
        syncChangesToIndexedDB(changes, nextState, options).catch((error) => {
          console.error("[AutoPersistence] Failed to sync:", error);
        });
      }
    }) as SetFn;

    // 使用包装后的 set 初始化 store
    return config(wrappedSet, get, api);
  };

/**
 * 检测节点变化
 */
function detectNodeChanges(
  prevNodes: Map<string, MindmapNode>,
  nextNodes: Map<string, MindmapNode>
): NodeChange[] {
  const changes: NodeChange[] = [];

  // 检测新增和更新
  for (const [nodeId, nextNode] of nextNodes.entries()) {
    const prevNode = prevNodes.get(nodeId);

    if (!prevNode) {
      // 新增节点
      changes.push({ type: "add", node: nextNode });
    } else if (hasNodeChanged(prevNode, nextNode)) {
      // 节点已更新
      changes.push({ type: "update", node: nextNode, prev: prevNode });
    }
  }

  // 检测删除
  for (const [nodeId, prevNode] of prevNodes.entries()) {
    if (!nextNodes.has(nodeId)) {
      // 节点被删除
      changes.push({ type: "delete", node: prevNode });
    }
  }

  return changes;
}

/**
 * 检测节点是否发生变化
 */
function hasNodeChanged(prev: MindmapNode, next: MindmapNode): boolean {
  return (
    prev.title !== next.title ||
    prev.content !== next.content ||
    prev.parent_id !== next.parent_id ||
    prev.parent_short_id !== next.parent_short_id ||
    prev.order_index !== next.order_index ||
    prev.updated_at !== next.updated_at
  );
}

/**
 * 确定操作类型
 */
function determineOperationType(
  change: NodeChange & { type: "update" }
): OperationType {
  const { prev, node } = change;

  // 检测标题变化
  if (prev.title !== node.title) {
    return "UPDATE_NODE_TITLE";
  }

  // 检测内容变化
  if (prev.content !== node.content) {
    return "UPDATE_NODE_CONTENT";
  }

  // 检测移动（父节点变化）
  if (prev.parent_id !== node.parent_id) {
    return "MOVE_NODE";
  }

  // 检测重排序（order_index 变化）
  if (prev.order_index !== node.order_index) {
    return "REORDER_NODE";
  }

  // 默认为内容更新
  return "UPDATE_NODE_CONTENT";
}

/**
 * 同步变化到 IndexedDB
 */
async function syncChangesToIndexedDB(
  changes: NodeChange[],
  state: StoreState,
  options: Required<AutoPersistenceOptions>
): Promise<void> {
  if (options.debug) {
    console.log("[AutoPersistence] Syncing changes:", changes);
  }

  const db = await getDB();
  const timestamp = new Date().toISOString();

  for (const change of changes) {
    try {
      switch (change.type) {
        case "add": {
          // 添加节点到 IndexedDB
          await db.put("mindmap_nodes", {
            ...change.node,
            dirty: true,
            local_updated_at: timestamp,
          });

          // 记录操作历史
          if (options.enableHistory) {
            await recordHistory(db, {
              mindmap_id: change.node.mindmap_id,
              operation_type: "ADD_NODE",
              timestamp,
              before_state: null,
              after_state: {
                nodeId: change.node.short_id,
                title: change.node.title,
                content: change.node.content,
                parent_id: change.node.parent_id,
                order_index: change.node.order_index,
              },
              is_undone: false,
            });
          }

          if (options.debug) {
            console.log("[AutoPersistence] Added node:", change.node.short_id);
          }
          break;
        }

        case "update": {
          // 更新节点
          await db.put("mindmap_nodes", {
            ...change.node,
            dirty: true,
            local_updated_at: timestamp,
          });

          // 记录操作历史
          if (options.enableHistory) {
            const operationType = determineOperationType(change);

            await recordHistory(db, {
              mindmap_id: change.node.mindmap_id,
              operation_type: operationType,
              timestamp,
              before_state: createNodeState(change.prev, operationType),
              after_state: createNodeState(change.node, operationType),
              is_undone: false,
            });
          }

          if (options.debug) {
            console.log(
              "[AutoPersistence] Updated node:",
              change.node.short_id
            );
          }
          break;
        }

        case "delete": {
          // 从 IndexedDB 删除
          await db.delete("mindmap_nodes", change.node.short_id);

          // 记录操作历史
          if (options.enableHistory) {
            await recordHistory(db, {
              mindmap_id: change.node.mindmap_id,
              operation_type: "DELETE_NODE",
              timestamp,
              before_state: {
                nodeId: change.node.short_id,
                title: change.node.title,
                content: change.node.content,
                parent_id: change.node.parent_id,
                order_index: change.node.order_index,
              },
              after_state: null,
              is_undone: false,
            });
          }

          if (options.debug) {
            console.log(
              "[AutoPersistence] Deleted node:",
              change.node.short_id
            );
          }
          break;
        }
      }
    } catch (error) {
      console.error(`[AutoPersistence] Failed to sync ${change.type}:`, error);
    }
  }

  // 如果当前思维导图标题也变化了，同步更新
  if (state.currentMindmap?.dirty) {
    await syncMindmapTitle(db, state.currentMindmap, timestamp, options);
  }
}

/**
 * 创建节点状态快照（根据操作类型只保留相关字段）
 */
function createNodeState(
  node: MindmapNode,
  operationType: OperationType
): NodeOperationState {
  const baseState: NodeOperationState = {
    nodeId: node.short_id,
  };

  switch (operationType) {
    case "UPDATE_NODE_TITLE":
      baseState.title = node.title;
      break;
    case "UPDATE_NODE_CONTENT":
      baseState.content = node.content;
      break;
    case "MOVE_NODE":
      baseState.parent_id = node.parent_id;
      baseState.order_index = node.order_index;
      break;
    case "REORDER_NODE":
      baseState.order_index = node.order_index;
      break;
    default:
      // 包含所有字段
      baseState.title = node.title;
      baseState.content = node.content;
      baseState.parent_id = node.parent_id;
      baseState.order_index = node.order_index;
  }

  return baseState;
}

/**
 * 同步思维导图标题
 */
async function syncMindmapTitle(
  db: Awaited<ReturnType<typeof getDB>>,
  mindmap: Mindmap & { dirty?: boolean },
  timestamp: string,
  options: Required<AutoPersistenceOptions>
): Promise<void> {
  const existingMindmap = await db.get("mindmaps", mindmap.short_id);

  if (existingMindmap && existingMindmap.title !== mindmap.title) {
    await db.put("mindmaps", {
      ...existingMindmap,
      title: mindmap.title,
      updated_at: timestamp,
      dirty: true,
      local_updated_at: timestamp,
    });

    // 记录操作历史
    if (options.enableHistory) {
      await recordHistory(db, {
        mindmap_id: mindmap.id,
        operation_type: "UPDATE_MINDMAP_TITLE",
        timestamp,
        before_state: {
          nodeId: mindmap.short_id,
          title: existingMindmap.title,
        },
        after_state: {
          nodeId: mindmap.short_id,
          title: mindmap.title,
        },
        is_undone: false,
      });
    }

    if (options.debug) {
      console.log("[AutoPersistence] Updated mindmap title");
    }
  }
}

/**
 * 记录操作历史
 */
async function recordHistory(
  db: Awaited<ReturnType<typeof getDB>>,
  operation: {
    mindmap_id: string;
    operation_type: OperationType;
    timestamp: string;
    before_state: NodeOperationState | null;
    after_state: NodeOperationState | null;
    is_undone: boolean;
  }
): Promise<void> {
  await db.put("operation_history", {
    id: generateShortId(),
    ...operation,
  });
}
