/**
 * 思维导图编辑器 Zustand Store 实现
 *
 * 使用 Immer 实现不可变更新
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { generateShortId } from "@/lib/utils/short-id";
import type { MindmapNode } from "@/lib/types";
import type {
  MindmapEditorStore,
  AddChildNodeParams,
} from "./mindmap-editor.types";
import {
  syncAddNode,
  syncUpdateNodeContent,
  syncUpdateNodeTitle,
  syncDeleteNode,
} from "./middleware/persistence.middleware";
import { createUndoManager, type UndoManager } from "./undo-manager";
import type { OperationHistory } from "@/lib/db/schema";

// 启用 Immer 的 MapSet 插件以支持 Map 和 Set
enableMapSet();

// UndoManager 实例（延迟初始化）
let undoManager: UndoManager | null = null;

/**
 * 创建思维导图编辑器 Store
 */
export const useMindmapEditorStore = create<MindmapEditorStore>()(
  immer((set, get) => ({
    // ========== 初始状态 ==========
    currentMindmap: null,
    nodes: new Map(),
    currentNode: null,
    selectedNodes: new Set(),
    isDirty: false,
    isSynced: true,
    isEditing: false,
    editingNodeId: null,
    expandedNodes: new Set(),
    collapsedNodes: new Set(),
    canUndo: false,
    canRedo: false,

    // ========== 节点创建操作 ==========
    addChildNode: (params: AddChildNodeParams) => {
      const { parentId, position, title, content } = params;
      let newNode: MindmapNode | null = null;
      let shortId: string = "";

      set((state) => {
        const parent = state.nodes.get(parentId);
        if (!parent) {
          throw new Error(`父节点不存在: ${parentId}`);
        }

        // 获取当前子节点
        const siblings = Array.from(state.nodes.values())
          .filter((node) => node.parent_short_id === parentId)
          .sort((a, b) => a.order_index - b.order_index);

        const count = siblings.length;

        // 验证 position
        if (position < 0) {
          throw new Error(`position 不能为负数: ${position}`);
        }

        // 计算插入位置 (如果 position >= count,则插到最后)
        const insertPosition = Math.min(position, count);

        // 创建新节点
        shortId = generateShortId();
        newNode = {
          id: crypto.randomUUID(), // UUID,用于数据库主键
          short_id: shortId,
          mindmap_id: parent.mindmap_id,
          parent_id: parent.id,
          parent_short_id: parentId, // 使用 parent 的 short_id
          title,
          content: content || null,
          order_index: insertPosition,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 更新后续节点的 order_index
        siblings.forEach((sibling) => {
          if (sibling.order_index >= insertPosition) {
            const node = state.nodes.get(sibling.short_id);
            if (node) {
              node.order_index += 1;
              node.updated_at = new Date().toISOString();
            }
          }
        });

        // 添加新节点
        state.nodes.set(shortId, newNode);
        state.isDirty = true;
        state.isSynced = false;
      });

      // 异步同步到 IndexedDB
      if (newNode) {
        syncAddNode(newNode).catch((error) => {
          console.error("[Store] Failed to sync add node:", error);
        });
      }

      return newNode!;
    },

    // ========== 节点编辑操作 ==========
    updateNodeTitle: (nodeId: string, newTitle: string) => {
      let mindmapId: string | null = null;

      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) {
          throw new Error(`节点不存在: ${nodeId}`);
        }

        mindmapId = node.mindmap_id;
        node.title = newTitle;
        node.updated_at = new Date().toISOString();

        // 如果是根节点,同步更新 Mindmap.title
        if (node.parent_id === null && state.currentMindmap) {
          state.currentMindmap.title = newTitle;
          state.currentMindmap.updated_at = new Date().toISOString();
        }

        state.isDirty = true;
        state.isSynced = false;
      });

      // 异步同步到 IndexedDB
      if (mindmapId) {
        syncUpdateNodeTitle(nodeId, newTitle, mindmapId).catch((error) => {
          console.error("[Store] Failed to sync update node title:", error);
        });
      }
    },

    updateNodeContent: (nodeId: string, newContent: string) => {
      let mindmapId: string | null = null;

      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) {
          throw new Error(`节点不存在: ${nodeId}`);
        }

        mindmapId = node.mindmap_id;
        node.content = newContent;
        node.updated_at = new Date().toISOString();
        state.isDirty = true;
        state.isSynced = false;
      });

      // 异步同步到 IndexedDB
      if (mindmapId) {
        syncUpdateNodeContent(nodeId, newContent, mindmapId).catch((error) => {
          console.error("[Store] Failed to sync update node content:", error);
        });
      }
    },

    // ========== 节点删除操作 ==========
    deleteNode: (nodeId: string) => {
      const deletedNodes: MindmapNode[] = [];

      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) {
          throw new Error(`节点不存在: ${nodeId}`);
        }

        // 不能删除根节点
        if (node.parent_id === null) {
          throw new Error("不能删除根节点");
        }

        // 递归收集要删除的节点 (包括所有子孙节点)
        const toDelete = new Set<string>();
        const collectDescendants = (currentNodeId: string) => {
          toDelete.add(currentNodeId);
          const currentNode = state.nodes.get(currentNodeId);
          if (!currentNode) return;

          // 保存要删除的节点数据 (用于历史记录)
          deletedNodes.push({ ...currentNode });

          // 查找子节点 (通过 parent_short_id)
          Array.from(state.nodes.values())
            .filter((n) => n.parent_short_id === currentNodeId)
            .forEach((child) => collectDescendants(child.short_id));
        };

        collectDescendants(nodeId);

        // 删除所有标记的节点
        toDelete.forEach((id) => {
          state.nodes.delete(id);

          // 如果删除的是当前节点或选中的节点,清空选中状态
          if (state.currentNode === id) {
            state.currentNode = null;
            state.selectedNodes.clear();
          } else {
            state.selectedNodes.delete(id);
          }

          // 清理展开/折叠状态
          state.expandedNodes.delete(id);
          state.collapsedNodes.delete(id);
        });

        // 更新后续兄弟节点的 order_index
        if (node.parent_short_id) {
          const siblings = Array.from(state.nodes.values())
            .filter((n) => n.parent_short_id === node.parent_short_id)
            .sort((a, b) => a.order_index - b.order_index);

          siblings.forEach((sibling, index) => {
            const siblingNode = state.nodes.get(sibling.short_id);
            if (siblingNode && siblingNode.order_index !== index) {
              siblingNode.order_index = index;
              siblingNode.updated_at = new Date().toISOString();
            }
          });
        }

        state.isDirty = true;
        state.isSynced = false;
      });

      // 异步同步到 IndexedDB
      if (deletedNodes.length > 0) {
        syncDeleteNode(deletedNodes).catch((error) => {
          console.error("[Store] Failed to sync delete node:", error);
        });
      }
    },

    // ========== 节点查询操作 ==========
    getNode: (nodeId: string) => {
      return get().nodes.get(nodeId);
    },

    getAllNodes: (mindmapId: string) => {
      return Array.from(get().nodes.values()).filter(
        (node) => node.mindmap_id === mindmapId
      );
    },

    getRootNode: (mindmapId: string) => {
      return Array.from(get().nodes.values()).find(
        (node) => node.mindmap_id === mindmapId && node.parent_id === null
      );
    },

    getChildren: (nodeId: string) => {
      const node = get().nodes.get(nodeId);
      if (!node) return [];

      return Array.from(get().nodes.values())
        .filter((n) => n.parent_short_id === nodeId)
        .sort((a, b) => a.order_index - b.order_index);
    },

    // ========== 状态操作 ==========
    initializeMindmap: (mindmapId: string) => {
      set((state) => {
        // 如果 currentNode 已存在,不需要初始化
        if (state.currentNode) {
          return;
        }

        // 查找根节点
        const root = Array.from(state.nodes.values()).find(
          (node) => node.mindmap_id === mindmapId && node.parent_id === null
        );

        if (root) {
          // 自动选中根节点
          state.currentNode = root.short_id;
          state.selectedNodes.clear();
          state.selectedNodes.add(root.short_id);
        }
      });
    },

    setCurrentNode: (nodeId: string | null) => {
      set((state) => {
        if (nodeId === null) {
          // 清空焦点和选中
          state.currentNode = null;
          state.selectedNodes.clear();
        } else {
          // 验证节点存在
          const node = state.nodes.get(nodeId);
          if (!node) {
            throw new Error(`节点不存在: ${nodeId}`);
          }

          // 设置焦点并清空选中集合,然后添加该节点
          state.currentNode = nodeId;
          state.selectedNodes.clear();
          state.selectedNodes.add(nodeId);
        }
      });
    },

    selectNode: (nodeId: string, multiSelect = false) => {
      set((state) => {
        // 验证节点存在
        const node = state.nodes.get(nodeId);
        if (!node) {
          throw new Error(`节点不存在: ${nodeId}`);
        }

        if (multiSelect) {
          // 多选模式: 添加到选中集合
          state.selectedNodes.add(nodeId);
        } else {
          // 单选模式: 清空后添加
          state.selectedNodes.clear();
          state.selectedNodes.add(nodeId);
        }

        // 更新焦点
        state.currentNode = nodeId;
      });
    },

    clearSelection: () => {
      set((state) => {
        state.currentNode = null;
        state.selectedNodes.clear();
      });
    },

    // ========== 撤销/重做操作 ==========
    undo: async () => {
      const state = get();
      const mindmapId = state.currentMindmap?.short_id;

      if (!mindmapId) {
        console.warn("[Store] Cannot undo: no mindmap loaded");
        return;
      }

      // 初始化 UndoManager
      if (!undoManager || undoManager["mindmapId"] !== mindmapId) {
        undoManager = createUndoManager(mindmapId);
        await undoManager.initialize();
      }

      // 执行撤销
      const result = await undoManager.undo();

      if (!result.success) {
        console.warn("[Store] Undo failed:", result.error);
        return;
      }

      // 应用撤销操作
      if (result.operation) {
        await applyUndoOperation(result.operation, set);
      }

      // 更新撤销/重做状态
      await get().updateUndoRedoState();
    },

    redo: async () => {
      const state = get();
      const mindmapId = state.currentMindmap?.short_id;

      if (!mindmapId) {
        console.warn("[Store] Cannot redo: no mindmap loaded");
        return;
      }

      // 初始化 UndoManager
      if (!undoManager || undoManager["mindmapId"] !== mindmapId) {
        undoManager = createUndoManager(mindmapId);
        await undoManager.initialize();
      }

      // 执行重做
      const result = await undoManager.redo();

      if (!result.success) {
        console.warn("[Store] Redo failed:", result.error);
        return;
      }

      // 应用重做操作
      if (result.operation) {
        await applyRedoOperation(result.operation, set);
      }

      // 更新撤销/重做状态
      await get().updateUndoRedoState();
    },

    updateUndoRedoState: async () => {
      const state = get();
      const mindmapId = state.currentMindmap?.short_id;

      if (!mindmapId) {
        set((state) => {
          state.canUndo = false;
          state.canRedo = false;
        });
        return;
      }

      // 初始化 UndoManager
      if (!undoManager || undoManager["mindmapId"] !== mindmapId) {
        undoManager = createUndoManager(mindmapId);
        await undoManager.initialize();
      }

      // 获取历史状态
      const historyState = await undoManager.getHistoryState();

      // 更新 Store 状态
      set((state) => {
        state.canUndo = historyState.canUndo;
        state.canRedo = historyState.canRedo;
      });
    },
  }))
);

/**
 * 应用撤销操作 - 恢复到 before_state
 */
async function applyUndoOperation(
  operation: OperationHistory,
  set: (fn: (state: MindmapEditorStore) => void) => void
): Promise<void> {
  const { operation_type, before_state } = operation;

  console.log(`[Store] Applying undo for ${operation_type}`);

  switch (operation_type) {
    case "ADD_NODE": {
      // 撤销添加节点 = 删除节点
      const nodeData = before_state as { short_id: string };
      set((state) => {
        state.nodes.delete(nodeData.short_id);
        state.isDirty = true;
      });
      break;
    }

    case "UPDATE_NODE_CONTENT":
    case "UPDATE_NODE_TITLE": {
      // 撤销更新 = 恢复旧值
      const nodeData = before_state as MindmapNode;
      set((state) => {
        const node = state.nodes.get(nodeData.short_id);
        if (node) {
          if (operation_type === "UPDATE_NODE_CONTENT") {
            node.content = nodeData.content;
          } else {
            node.title = nodeData.title;
          }
          state.isDirty = true;
        }
      });
      break;
    }

    case "DELETE_NODE": {
      // 撤销删除 = 恢复节点和所有子节点
      const nodeData = before_state as {
        node: MindmapNode;
        children: MindmapNode[];
      };
      set((state) => {
        // 恢复节点本身
        state.nodes.set(nodeData.node.short_id, nodeData.node);
        // 恢复所有子节点
        for (const child of nodeData.children) {
          state.nodes.set(child.short_id, child);
        }
        state.isDirty = true;
      });
      break;
    }

    case "UPDATE_MINDMAP_TITLE": {
      // 撤销更新思维导图标题
      const data = before_state as { title: string };
      set((state) => {
        if (state.currentMindmap) {
          state.currentMindmap.title = data.title;
          state.isDirty = true;
        }
      });
      break;
    }

    default:
      console.warn(
        `[Store] Unknown operation type for undo: ${operation_type}`
      );
  }
}

/**
 * 应用重做操作 - 恢复到 after_state
 */
async function applyRedoOperation(
  operation: OperationHistory,
  set: (fn: (state: MindmapEditorStore) => void) => void
): Promise<void> {
  const { operation_type, after_state } = operation;

  console.log(`[Store] Applying redo for ${operation_type}`);

  switch (operation_type) {
    case "ADD_NODE": {
      // 重做添加节点 = 添加节点
      const nodeData = after_state as MindmapNode;
      set((state) => {
        state.nodes.set(nodeData.short_id, nodeData);
        state.isDirty = true;
      });
      break;
    }

    case "UPDATE_NODE_CONTENT":
    case "UPDATE_NODE_TITLE": {
      // 重做更新 = 应用新值
      const nodeData = after_state as MindmapNode;
      set((state) => {
        const node = state.nodes.get(nodeData.short_id);
        if (node) {
          if (operation_type === "UPDATE_NODE_CONTENT") {
            node.content = nodeData.content;
          } else {
            node.title = nodeData.title;
          }
          state.isDirty = true;
        }
      });
      break;
    }

    case "DELETE_NODE": {
      // 重做删除 = 删除节点
      const nodeData = after_state as {
        short_id: string;
        children_ids: string[];
      };
      set((state) => {
        // 删除节点本身
        state.nodes.delete(nodeData.short_id);
        // 删除所有子节点
        for (const childId of nodeData.children_ids) {
          state.nodes.delete(childId);
        }
        state.isDirty = true;
      });
      break;
    }

    case "UPDATE_MINDMAP_TITLE": {
      // 重做更新思维导图标题
      const data = after_state as { title: string };
      set((state) => {
        if (state.currentMindmap) {
          state.currentMindmap.title = data.title;
          state.isDirty = true;
        }
      });
      break;
    }

    default:
      console.warn(
        `[Store] Unknown operation type for redo: ${operation_type}`
      );
  }
}
