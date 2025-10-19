/**
 * 思维导图编辑器 Zustand Store 实现
 *
 * 使用 Immer 实现不可变更新
 * 使用 Auto-Persistence 中间件自动同步到 IndexedDB
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { generateShortId } from "@/lib/utils/short-id";
import type { MindmapNode } from "@/lib/types";
import type {
  MindmapEditorStore,
  AddChildNodeParams,
  FocusedArea,
} from "./mindmap-editor.types";
import { autoPersistence } from "./middleware/auto-persistence.middleware";

// 启用 Immer 的 MapSet 插件以支持 Map 和 Set
enableMapSet();

/**
 * 创建思维导图编辑器 Store
 *
 * 中间件顺序：autoPersistence -> immer
 * - autoPersistence: 自动同步状态到 IndexedDB
 * - immer: 提供不可变更新的便利 API
 */
export const useMindmapEditorStore = create<MindmapEditorStore>()(
  autoPersistence({ enableHistory: true, debug: false })(
    immer((set, get) => ({
      // ========== 初始状态 ==========
      currentMindmap: null,
      nodes: new Map(),
      currentNode: null,
      focusedArea: "graph",
      isDirty: false,
      isSynced: true,
      isEditing: false,
      editingNodeId: null,
      collapsedNodes: new Set(),

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

        // ✅ 中间件会自动同步到 IndexedDB，无需手动调用

        return newNode!;
      },

      // ========== 节点编辑操作 ==========
      updateNodeTitle: (nodeId: string, newTitle: string) => {
        set((state) => {
          const node = state.nodes.get(nodeId);
          if (!node) {
            throw new Error(`节点不存在: ${nodeId}`);
          }

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

        // ✅ 中间件会自动同步到 IndexedDB，无需手动调用
      },

      updateNodeContent: (nodeId: string, newContent: string) => {
        set((state) => {
          const node = state.nodes.get(nodeId);
          if (!node) {
            throw new Error(`节点不存在: ${nodeId}`);
          }

          node.content = newContent;
          node.updated_at = new Date().toISOString();
          state.isDirty = true;
          state.isSynced = false;
        });

        // ✅ 中间件会自动同步到 IndexedDB，无需手动调用
      },

      // ========== 节点删除操作 ==========
      deleteNode: (nodeId: string) => {
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

            // 查找子节点 (通过 parent_short_id)
            Array.from(state.nodes.values())
              .filter((n) => n.parent_short_id === currentNodeId)
              .forEach((child) => collectDescendants(child.short_id));
          };

          collectDescendants(nodeId);

          // 删除所有标记的节点
          toDelete.forEach((id) => {
            state.nodes.delete(id);

            // 如果删除的是当前节点,清空选中状态
            if (state.currentNode === id) {
              state.currentNode = null;
            }

            // 清理折叠状态
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

        // ✅ 中间件会自动同步到 IndexedDB，无需手动调用
      },

      // ========== 节点移动操作 ==========
      moveNode: (params) => {
        const { nodeId, newParentId, position } = params;

        set((state) => {
          const node = state.nodes.get(nodeId);
          if (!node) {
            throw new Error(`节点不存在: ${nodeId}`);
          }

          // 约束 1: 不能移动根节点
          if (node.parent_id === null) {
            throw new Error("不能移动根节点");
          }

          // 约束 2: newParentId 必须存在
          if (newParentId !== null) {
            const newParent = state.nodes.get(newParentId);
            if (!newParent) {
              throw new Error(`目标父节点不存在: ${newParentId}`);
            }

            // 约束 3: 不能移动到自己的子孙节点下 (循环引用检查)
            if (isDescendant(nodeId, newParentId, state.nodes)) {
              throw new Error("不能移动到自己的子孙节点下");
            }
          }

          const oldParentId = node.parent_short_id;

          // 情况 1: 同级重排序 (newParentId === oldParentId)
          if (newParentId === oldParentId) {
            // 获取所有兄弟节点
            const siblings = Array.from(state.nodes.values())
              .filter((n) => n.parent_short_id === oldParentId)
              .sort((a, b) => a.order_index - b.order_index);

            const oldIndex = siblings.findIndex((n) => n.short_id === nodeId);
            if (oldIndex === -1) return;

            const targetPosition =
              position !== undefined
                ? Math.min(position, siblings.length - 1)
                : siblings.length - 1;

            // 如果位置没变,不做任何操作
            if (oldIndex === targetPosition) return;

            // 从列表中移除节点
            const removed = siblings.splice(oldIndex, 1);
            if (removed.length === 0) return;

            const movedNode = removed[0];
            if (!movedNode) return;

            // 插入到新位置
            siblings.splice(targetPosition, 0, movedNode);

            // 更新所有兄弟节点的 order_index
            siblings.forEach((sibling, index) => {
              const siblingNode = state.nodes.get(sibling.short_id);
              if (siblingNode) {
                siblingNode.order_index = index;
                siblingNode.updated_at = new Date().toISOString();
              }
            });
          }
          // 情况 2: 改变父节点 (newParentId !== oldParentId)
          else {
            // 获取旧父节点的所有子节点 (用于重新排序)
            const oldSiblings = Array.from(state.nodes.values())
              .filter((n) => n.parent_short_id === oldParentId)
              .sort((a, b) => a.order_index - b.order_index);

            // 从旧父节点中移除
            oldSiblings.forEach((sibling, index) => {
              if (sibling.short_id === nodeId) return;
              const siblingNode = state.nodes.get(sibling.short_id);
              if (siblingNode) {
                siblingNode.order_index = index;
                siblingNode.updated_at = new Date().toISOString();
              }
            });

            // 获取新父节点的所有子节点
            const newSiblings = Array.from(state.nodes.values())
              .filter((n) => n.parent_short_id === newParentId)
              .sort((a, b) => a.order_index - b.order_index);

            // 确定插入位置
            const targetPosition =
              position !== undefined
                ? Math.min(position, newSiblings.length)
                : newSiblings.length;

            // 更新移动节点的父节点信息
            node.parent_short_id = newParentId;
            node.parent_id = newParentId
              ? (state.nodes.get(newParentId)?.id ?? null)
              : null;
            node.order_index = targetPosition;
            node.updated_at = new Date().toISOString();

            // 更新新父节点下后续兄弟节点的 order_index
            newSiblings.forEach((sibling) => {
              if (sibling.order_index >= targetPosition) {
                const siblingNode = state.nodes.get(sibling.short_id);
                if (siblingNode) {
                  siblingNode.order_index += 1;
                  siblingNode.updated_at = new Date().toISOString();
                }
              }
            });
          }

          // 标记为脏数据
          state.isDirty = true;
          state.isSynced = false;

          // 注意: 不改变 currentNode (保持用户焦点)
        });
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
          }
        });
      },

      setCurrentNode: (nodeId: string | null) => {
        set((state) => {
          if (nodeId === null) {
            // 清空焦点
            state.currentNode = null;
          } else {
            // 验证节点存在
            const node = state.nodes.get(nodeId);
            if (!node) {
              throw new Error(`节点不存在: ${nodeId}`);
            }

            // 设置焦点
            state.currentNode = nodeId;
          }
        });
      },

      setFocusedArea: (area: FocusedArea) => {
        set((state) => {
          state.focusedArea = area;
        });
      },

      // ========== 同步状态操作 ==========
      clearSyncStatus: () => {
        set((state) => {
          state.isDirty = false;
          state.isSynced = true;
        });
      },
    }))
  )
);

/**
 * 检查 ancestorId 是否是 descendantId 的祖先
 * 用于防止循环引用
 *
 * @param ancestorId - 潜在祖先节点的 short_id
 * @param descendantId - 潜在后代节点的 short_id
 * @param nodesMap - 节点 Map
 * @returns true 如果 ancestorId 是 descendantId 的祖先
 */
function isDescendant(
  ancestorId: string,
  descendantId: string,
  nodesMap: Map<string, MindmapNode>
): boolean {
  // 向上遍历 descendantId 的祖先链
  let current = nodesMap.get(descendantId);

  while (current) {
    // 如果找到了 ancestorId,说明确实是祖先
    if (current.short_id === ancestorId) {
      return true;
    }

    // 继续向上查找父节点
    if (current.parent_short_id) {
      current = nodesMap.get(current.parent_short_id);
    } else {
      // 已到达根节点或浮动节点,停止
      break;
    }
  }

  return false;
}
