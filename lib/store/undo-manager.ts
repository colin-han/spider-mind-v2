/**
 * Undo Manager - 撤销/重做管理器
 *
 * 基于 IndexedDB operation_history 表实现撤销/重做功能
 *
 * 设计要点:
 * - 使用 operation_history 表存储操作历史
 * - 每个操作记录包含 before_state 和 after_state
 * - 支持批量撤销/重做
 * - 内存中维护当前历史位置指针
 */

import {
  initDB,
  type OperationHistory,
  type OperationType,
} from "@/lib/db/schema";
import type { MindmapNode } from "@/lib/types";

/**
 * 撤销操作结果
 */
export interface UndoResult {
  success: boolean;
  operation?: OperationHistory;
  error?: string;
}

/**
 * 重做操作结果
 */
export interface RedoResult {
  success: boolean;
  operation?: OperationHistory;
  error?: string;
}

/**
 * 历史状态信息
 */
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  currentPosition: number;
  totalOperations: number;
}

/**
 * 节点状态快照（用于撤销/重做）
 */
export interface NodeSnapshot {
  node: MindmapNode;
  siblings?: MindmapNode[]; // 兄弟节点（用于恢复顺序）
}

/**
 * Undo Manager 类
 */
export class UndoManager {
  private mindmapId: string;
  private currentPosition: number = -1; // 当前历史位置 (-1 表示没有历史)
  private isInitialized: boolean = false;

  constructor(mindmapId: string) {
    this.mindmapId = mindmapId;
  }

  /**
   * 初始化 - 计算当前历史位置
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const db = await initDB();
      const tx = db.transaction("operation_history", "readonly");
      const index = tx.store.index("by-mindmap");

      // 获取所有未撤销的操作
      const operations = await index.getAll(this.mindmapId);
      const activeOps = operations.filter((op) => !op.is_undone);

      // 当前位置是最后一个未撤销操作的索引
      this.currentPosition = activeOps.length - 1;
      this.isInitialized = true;

      console.log(
        `[UndoManager] Initialized for mindmap ${this.mindmapId}, position: ${this.currentPosition}`
      );
    } catch (error) {
      console.error("[UndoManager] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * 获取历史状态信息
   */
  async getHistoryState(): Promise<HistoryState> {
    await this.initialize();

    try {
      const db = await initDB();
      const tx = db.transaction("operation_history", "readonly");
      const index = tx.store.index("by-mindmap");

      const operations = await index.getAll(this.mindmapId);
      const undoneOperations = operations.filter((op) => op.is_undone);

      return {
        canUndo: this.currentPosition >= 0,
        canRedo: undoneOperations.length > 0,
        undoCount: this.currentPosition + 1,
        redoCount: undoneOperations.length,
        currentPosition: this.currentPosition,
        totalOperations: operations.length,
      };
    } catch (error) {
      console.error("[UndoManager] Failed to get history state:", error);
      return {
        canUndo: false,
        canRedo: false,
        undoCount: 0,
        redoCount: 0,
        currentPosition: -1,
        totalOperations: 0,
      };
    }
  }

  /**
   * 撤销上一个操作
   */
  async undo(): Promise<UndoResult> {
    await this.initialize();

    if (this.currentPosition < 0) {
      return {
        success: false,
        error: "没有可撤销的操作",
      };
    }

    try {
      const db = await initDB();
      const tx = db.transaction("operation_history", "readwrite");
      const index = tx.store.index("by-mindmap");

      // 获取所有未撤销的操作
      const operations = await index.getAll(this.mindmapId);
      const activeOperations = operations
        .filter((op) => !op.is_undone)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      if (this.currentPosition >= activeOperations.length) {
        this.currentPosition = activeOperations.length - 1;
      }

      const operation = activeOperations[this.currentPosition];
      if (!operation) {
        return {
          success: false,
          error: "操作不存在",
        };
      }

      // 标记为已撤销
      await tx.store.put({
        ...operation,
        is_undone: true,
      });

      await tx.done;

      // 更新位置
      this.currentPosition--;

      console.log(
        `[UndoManager] Undone operation ${operation.id}, type: ${operation.operation_type}`
      );

      return {
        success: true,
        operation,
      };
    } catch (error) {
      console.error("[UndoManager] Undo failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "撤销失败",
      };
    }
  }

  /**
   * 重做上一个被撤销的操作
   */
  async redo(): Promise<RedoResult> {
    await this.initialize();

    try {
      const db = await initDB();
      const tx = db.transaction("operation_history", "readwrite");
      const index = tx.store.index("by-mindmap");

      // 获取所有已撤销的操作
      const operations = await index.getAll(this.mindmapId);
      const undoneOperations = operations
        .filter((op) => op.is_undone)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      if (undoneOperations.length === 0) {
        return {
          success: false,
          error: "没有可重做的操作",
        };
      }

      // 重做最早被撤销的操作
      const operation = undoneOperations[0];
      if (!operation) {
        return {
          success: false,
          error: "操作不存在",
        };
      }

      // 取消撤销标记
      await tx.store.put({
        ...operation,
        is_undone: false,
      });

      await tx.done;

      // 更新位置
      this.currentPosition++;

      console.log(
        `[UndoManager] Redone operation ${operation.id}, type: ${operation.operation_type}`
      );

      return {
        success: true,
        operation,
      };
    } catch (error) {
      console.error("[UndoManager] Redo failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "重做失败",
      };
    }
  }

  /**
   * 清除指定时间之前的历史记录
   */
  async clearHistoryBefore(timestamp: Date): Promise<number> {
    try {
      const db = await initDB();
      const tx = db.transaction("operation_history", "readwrite");
      const index = tx.store.index("by-mindmap");

      const operations = await index.getAll(this.mindmapId);
      const toDelete = operations.filter(
        (op) => new Date(op.timestamp).getTime() < timestamp.getTime()
      );

      for (const op of toDelete) {
        await tx.store.delete(op.id);
      }

      await tx.done;

      console.log(
        `[UndoManager] Cleared ${toDelete.length} operations before ${timestamp.toISOString()}`
      );

      return toDelete.length;
    } catch (error) {
      console.error("[UndoManager] Failed to clear history:", error);
      return 0;
    }
  }

  /**
   * 清除所有历史记录
   */
  async clearAllHistory(): Promise<number> {
    try {
      const db = await initDB();
      const tx = db.transaction("operation_history", "readwrite");
      const index = tx.store.index("by-mindmap");

      const operations = await index.getAll(this.mindmapId);

      for (const op of operations) {
        await tx.store.delete(op.id);
      }

      await tx.done;

      this.currentPosition = -1;

      console.log(`[UndoManager] Cleared all ${operations.length} operations`);

      return operations.length;
    } catch (error) {
      console.error("[UndoManager] Failed to clear all history:", error);
      return 0;
    }
  }

  /**
   * 获取最近的 N 个操作
   */
  async getRecentOperations(count: number = 10): Promise<OperationHistory[]> {
    try {
      const db = await initDB();
      const tx = db.transaction("operation_history", "readonly");
      const index = tx.store.index("by-mindmap");

      const operations = await index.getAll(this.mindmapId);

      // 按时间倒序排序
      const sorted = operations.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return sorted.slice(0, count);
    } catch (error) {
      console.error("[UndoManager] Failed to get recent operations:", error);
      return [];
    }
  }
}

/**
 * 创建 UndoManager 实例
 */
export function createUndoManager(mindmapId: string): UndoManager {
  return new UndoManager(mindmapId);
}

/**
 * 操作类型的可读名称
 */
export function getOperationTypeName(type: OperationType): string {
  const names: Record<OperationType, string> = {
    ADD_NODE: "添加节点",
    UPDATE_NODE_CONTENT: "更新节点内容",
    UPDATE_NODE_TITLE: "更新节点标题",
    DELETE_NODE: "删除节点",
    MOVE_NODE: "移动节点",
    REORDER_NODE: "重新排序",
    UPDATE_MINDMAP_TITLE: "更新思维导图标题",
  };
  return names[type] || type;
}
