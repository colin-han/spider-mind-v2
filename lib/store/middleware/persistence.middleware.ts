/**
 * Persistence Helper for Zustand Store
 *
 * 功能:
 * 1. 同步数据到 IndexedDB
 * 2. 标记脏数据 (dirty flag)
 * 3. 记录操作历史 (支持撤销/重做)
 *
 * 注意: 这不是标准的 Zustand 中间件,而是辅助函数集合
 * 每个 Store action 需要手动调用这些函数来记录操作历史
 */

import { getDB, type OperationType } from "@/lib/db/schema";
import type { MindmapNode } from "@/lib/types";
import { generateShortId } from "@/lib/utils/short-id";

/**
 * Persistence 配置选项
 */
export interface PersistenceOptions {
  /**
   * 是否启用操作历史记录
   * @default true
   */
  enableHistory?: boolean;

  /**
   * 是否在控制台打印调试日志
   * @default false
   */
  debug?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<PersistenceOptions> = {
  enableHistory: true,
  debug: false,
};

let globalOptions = { ...DEFAULT_OPTIONS };

/**
 * 配置持久化选项
 */
export function configurePersistence(options: PersistenceOptions): void {
  globalOptions = { ...globalOptions, ...options };
}

/**
 * 同步添加节点操作到 IndexedDB
 */
export async function syncAddNode(
  node: MindmapNode,
  options: PersistenceOptions = {}
): Promise<void> {
  const opts = { ...globalOptions, ...options };
  const db = await getDB();
  const timestamp = new Date().toISOString();

  // 添加持久化字段
  const nodeWithMeta = {
    ...node,
    dirty: true,
    local_updated_at: timestamp,
  };

  await db.put("mindmap_nodes", nodeWithMeta);

  // 记录操作历史
  if (opts.enableHistory) {
    await recordHistory(db, {
      id: generateShortId(),
      mindmap_id: node.mindmap_id,
      operation_type: "ADD_NODE",
      timestamp,
      before_state: null,
      after_state: node,
      is_undone: false,
    });
  }

  if (opts.debug) {
    console.log("[Persistence] Added node to IndexedDB:", node.short_id);
  }
}

/**
 * 同步更新节点内容操作到 IndexedDB
 */
export async function syncUpdateNodeContent(
  nodeId: string,
  newContent: string,
  mindmapId: string,
  options: PersistenceOptions = {}
): Promise<void> {
  const opts = { ...globalOptions, ...options };
  const db = await getDB();
  const timestamp = new Date().toISOString();

  // 获取旧状态
  const oldNode = await db.get("mindmap_nodes", nodeId);
  if (!oldNode) {
    throw new Error(`Node not found in IndexedDB: ${nodeId}`);
  }

  // 更新节点
  const updatedNode = {
    ...oldNode,
    content: newContent,
    updated_at: timestamp,
    dirty: true,
    local_updated_at: timestamp,
  };

  await db.put("mindmap_nodes", updatedNode);

  // 记录操作历史
  if (opts.enableHistory) {
    await recordHistory(db, {
      id: generateShortId(),
      mindmap_id: mindmapId,
      operation_type: "UPDATE_NODE_CONTENT",
      timestamp,
      before_state: { content: oldNode.content },
      after_state: { content: newContent },
      is_undone: false,
    });
  }

  if (opts.debug) {
    console.log("[Persistence] Updated node content in IndexedDB:", nodeId);
  }
}

/**
 * 同步更新节点标题操作到 IndexedDB
 */
export async function syncUpdateNodeTitle(
  nodeId: string,
  newTitle: string,
  mindmapId: string,
  options: PersistenceOptions = {}
): Promise<void> {
  const opts = { ...globalOptions, ...options };
  const db = await getDB();
  const timestamp = new Date().toISOString();

  // 获取旧状态
  const oldNode = await db.get("mindmap_nodes", nodeId);
  if (!oldNode) {
    throw new Error(`Node not found in IndexedDB: ${nodeId}`);
  }

  // 更新节点
  const updatedNode = {
    ...oldNode,
    title: newTitle,
    updated_at: timestamp,
    dirty: true,
    local_updated_at: timestamp,
  };

  await db.put("mindmap_nodes", updatedNode);

  // 如果是根节点,同时更新思维导图标题
  if (oldNode.parent_id === null) {
    await syncUpdateMindmapTitle(mindmapId, newTitle, opts);
  }

  // 记录操作历史
  if (opts.enableHistory) {
    await recordHistory(db, {
      id: generateShortId(),
      mindmap_id: mindmapId,
      operation_type: "UPDATE_NODE_TITLE",
      timestamp,
      before_state: { title: oldNode.title },
      after_state: { title: newTitle },
      is_undone: false,
    });
  }

  if (opts.debug) {
    console.log("[Persistence] Updated node title in IndexedDB:", nodeId);
  }
}

/**
 * 同步删除节点操作到 IndexedDB
 */
export async function syncDeleteNode(
  deletedNodes: MindmapNode[],
  options: PersistenceOptions = {}
): Promise<void> {
  if (deletedNodes.length === 0) return;

  const opts = { ...globalOptions, ...options };
  const db = await getDB();
  const timestamp = new Date().toISOString();

  // 删除所有节点
  await Promise.all(
    deletedNodes.map((node) => db.delete("mindmap_nodes", node.short_id))
  );

  // 记录操作历史
  if (opts.enableHistory && deletedNodes.length > 0 && deletedNodes[0]) {
    await recordHistory(db, {
      id: generateShortId(),
      mindmap_id: deletedNodes[0].mindmap_id,
      operation_type: "DELETE_NODE",
      timestamp,
      before_state: deletedNodes,
      after_state: null,
      is_undone: false,
    });
  }

  if (opts.debug) {
    console.log(
      "[Persistence] Deleted nodes from IndexedDB:",
      deletedNodes.map((n) => n.short_id)
    );
  }
}

/**
 * 同步更新思维导图标题到 IndexedDB
 */
export async function syncUpdateMindmapTitle(
  mindmapId: string,
  newTitle: string,
  options: PersistenceOptions = {}
): Promise<void> {
  const opts = { ...globalOptions, ...options };
  const db = await getDB();
  const timestamp = new Date().toISOString();

  // 获取旧状态
  const oldMindmap = await db.get("mindmaps", mindmapId);
  if (!oldMindmap) {
    throw new Error(`Mindmap not found in IndexedDB: ${mindmapId}`);
  }

  // 更新思维导图
  const updatedMindmap = {
    ...oldMindmap,
    title: newTitle,
    updated_at: timestamp,
    dirty: true,
    local_updated_at: timestamp,
  };

  await db.put("mindmaps", updatedMindmap);

  // 记录操作历史
  if (opts.enableHistory) {
    await recordHistory(db, {
      id: generateShortId(),
      mindmap_id: mindmapId,
      operation_type: "UPDATE_MINDMAP_TITLE",
      timestamp,
      before_state: { title: oldMindmap.title },
      after_state: { title: newTitle },
      is_undone: false,
    });
  }

  if (opts.debug) {
    console.log("[Persistence] Updated mindmap title in IndexedDB:", mindmapId);
  }
}

/**
 * 记录操作历史
 */
async function recordHistory(
  db: Awaited<ReturnType<typeof getDB>>,
  operation: {
    id: string;
    mindmap_id: string;
    operation_type: OperationType;
    timestamp: string;
    before_state: unknown;
    after_state: unknown;
    is_undone: boolean;
  }
): Promise<void> {
  await db.put("operation_history", operation);
}

/**
 * 清理超过限制的历史记录
 */
export async function cleanupHistory(
  mindmapId: string,
  maxSize: number = 1000
): Promise<void> {
  const db = await getDB();
  const index = db.transaction("operation_history").store.index("by-mindmap");
  const allHistory = await index.getAll(mindmapId);

  // 按时间戳排序 (最新的在前)
  allHistory.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // 删除超过限制的记录
  if (allHistory.length > maxSize) {
    const toDelete = allHistory.slice(maxSize);
    await Promise.all(
      toDelete.map((op) => db.delete("operation_history", op.id))
    );
    console.log(
      `[Persistence] Cleaned up ${toDelete.length} old history records`
    );
  }
}
