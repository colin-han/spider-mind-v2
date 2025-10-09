/**
 * IndexedDB Schema for Mindmap Persistence
 *
 * 支持功能:
 * - 本地缓存思维导图和节点数据
 * - 脏数据标记 (dirty flag)
 * - 操作历史 (支持撤销/重做)
 */

import { DBSchema, IDBPDatabase, openDB } from "idb";
import type { Mindmap, MindmapNode } from "@/lib/types";

/**
 * 操作类型定义
 */
export type OperationType =
  | "ADD_NODE"
  | "UPDATE_NODE_CONTENT"
  | "UPDATE_NODE_TITLE"
  | "DELETE_NODE"
  | "MOVE_NODE"
  | "REORDER_NODE"
  | "UPDATE_MINDMAP_TITLE";

/**
 * 操作历史记录
 */
export interface OperationHistory {
  id: string;
  mindmap_id: string;
  operation_type: OperationType;
  timestamp: string;

  // 操作前后的状态
  before_state: unknown;
  after_state: unknown;

  // 撤销/重做状态
  is_undone: boolean;
}

/**
 * IndexedDB Schema 定义
 */
export interface MindmapDB extends DBSchema {
  /**
   * 思维导图元数据表
   */
  mindmaps: {
    key: string; // short_id
    value: Mindmap & {
      // 持久化相关字段
      dirty: boolean; // 思维导图元数据是否有修改
      local_updated_at: string; // 本地最后修改时间
      server_updated_at: string; // 服务器版本的时间戳
    };
    indexes: {
      "by-user": string; // user_id
      "by-updated": string; // updated_at
    };
  };

  /**
   * 思维导图节点表
   */
  mindmap_nodes: {
    key: string; // short_id
    value: MindmapNode & {
      // 持久化相关字段
      dirty: boolean; // 是否有未保存的修改
      local_updated_at: string; // 本地最后修改时间
    };
    indexes: {
      "by-mindmap": string; // mindmap_id
      "by-parent": string; // parent_id
      "by-updated": string; // updated_at
    };
  };

  /**
   * 操作历史表 (支持撤销/重做)
   */
  operation_history: {
    key: string; // operation_id
    value: OperationHistory;
    indexes: {
      "by-mindmap": string; // mindmap_id
      "by-timestamp": string; // timestamp
    };
  };
}

/**
 * 数据库实例
 */
let dbInstance: IDBPDatabase<MindmapDB> | null = null;

/**
 * 数据库配置
 */
const DB_NAME = "spider-mark-mindmap";
const DB_VERSION = 1;

/**
 * 初始化并打开数据库
 */
export async function initDB(): Promise<IDBPDatabase<MindmapDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<MindmapDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, _transaction) {
      console.log(
        `Upgrading database from version ${oldVersion} to ${newVersion}`
      );

      // 创建 mindmaps 表
      if (!db.objectStoreNames.contains("mindmaps")) {
        const mindmapStore = db.createObjectStore("mindmaps", {
          keyPath: "short_id",
        });

        mindmapStore.createIndex("by-user", "user_id", { unique: false });
        mindmapStore.createIndex("by-updated", "updated_at", { unique: false });

        console.log("Created mindmaps object store");
      }

      // 创建 mindmap_nodes 表
      if (!db.objectStoreNames.contains("mindmap_nodes")) {
        const nodesStore = db.createObjectStore("mindmap_nodes", {
          keyPath: "short_id",
        });

        nodesStore.createIndex("by-mindmap", "mindmap_id", { unique: false });
        nodesStore.createIndex("by-parent", "parent_id", { unique: false });
        nodesStore.createIndex("by-updated", "updated_at", { unique: false });

        console.log("Created mindmap_nodes object store");
      }

      // 创建 operation_history 表
      if (!db.objectStoreNames.contains("operation_history")) {
        const historyStore = db.createObjectStore("operation_history", {
          keyPath: "id",
        });

        historyStore.createIndex("by-mindmap", "mindmap_id", { unique: false });
        historyStore.createIndex("by-timestamp", "timestamp", {
          unique: false,
        });

        console.log("Created operation_history object store");
      }
    },

    blocked() {
      console.warn("Database upgrade was blocked");
    },

    blocking() {
      console.warn("Database is blocking a newer version");
    },

    terminated() {
      console.error("Database connection was unexpectedly terminated");
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * 获取数据库实例
 */
export async function getDB(): Promise<IDBPDatabase<MindmapDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

/**
 * 关闭数据库连接
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log("Database connection closed");
  }
}

/**
 * 清空指定思维导图的所有数据
 */
export async function clearMindmapData(mindmapId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["mindmaps", "mindmap_nodes", "operation_history"],
    "readwrite"
  );

  // 删除思维导图
  await tx.objectStore("mindmaps").delete(mindmapId);

  // 删除所有节点
  const nodeIndex = tx.objectStore("mindmap_nodes").index("by-mindmap");
  const nodes = await nodeIndex.getAll(mindmapId);
  await Promise.all(
    nodes.map((node) => tx.objectStore("mindmap_nodes").delete(node.short_id))
  );

  // 删除操作历史
  const historyIndex = tx.objectStore("operation_history").index("by-mindmap");
  const history = await historyIndex.getAll(mindmapId);
  await Promise.all(
    history.map((op) => tx.objectStore("operation_history").delete(op.id))
  );

  await tx.done;
  console.log(`Cleared all data for mindmap: ${mindmapId}`);
}

/**
 * 清空所有数据 (谨慎使用)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["mindmaps", "mindmap_nodes", "operation_history"],
    "readwrite"
  );

  await tx.objectStore("mindmaps").clear();
  await tx.objectStore("mindmap_nodes").clear();
  await tx.objectStore("operation_history").clear();

  await tx.done;
  console.log("Cleared all data from IndexedDB");
}
