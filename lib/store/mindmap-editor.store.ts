/**
 * 思维导图编辑器 Zustand Store 实现
 *
 * 使用 Immer 实现不可变更新
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { nanoid } from "nanoid";
import type { MindmapNode } from "@/lib/types";
import type {
  MindmapEditorStore,
  AddChildNodeParams,
  CreateFloatingNodeParams,
} from "./mindmap-editor.types";

// 启用 Immer 的 MapSet 插件以支持 Map 和 Set
enableMapSet();

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

    // ========== 节点创建操作 ==========
    addChildNode: (params: AddChildNodeParams) => {
      const { parentId, position, title, content } = params;
      let newNode: MindmapNode | null = null;

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
        const shortId = nanoid(10);
        newNode = {
          id: nanoid(), // UUID,仅用于数据库
          short_id: shortId,
          mindmap_id: parent.mindmap_id,
          parent_id: parent.id,
          parent_short_id: parentId, // 使用 parent 的 short_id
          title,
          content: content || null,
          node_type: "normal",
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

      return newNode!;
    },

    createFloatingNode: (params: CreateFloatingNodeParams) => {
      const { mindmapId, position, title, content } = params;
      let newNode: MindmapNode | null = null;

      set((state) => {
        if (!state.currentMindmap || state.currentMindmap.id !== mindmapId) {
          throw new Error(`思维导图不存在或不匹配: ${mindmapId}`);
        }

        // 获取当前所有浮动节点
        const floatingNodes = Array.from(state.nodes.values())
          .filter(
            (node) =>
              node.mindmap_id === mindmapId &&
              node.parent_id === null &&
              node.node_type === "floating"
          )
          .sort((a, b) => a.order_index - b.order_index);

        const count = floatingNodes.length;

        // 验证 position
        if (position < 0) {
          throw new Error(`position 不能为负数: ${position}`);
        }

        // 计算插入位置
        const insertPosition = Math.min(position, count);

        // 创建新浮动节点
        const shortId = nanoid(10);
        newNode = {
          id: nanoid(),
          short_id: shortId,
          mindmap_id: mindmapId,
          parent_id: null,
          parent_short_id: null, // 浮动节点没有父节点
          title,
          content: content || null,
          node_type: "floating",
          order_index: insertPosition,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 更新后续浮动节点的 order_index
        floatingNodes.forEach((floatingNode) => {
          if (floatingNode.order_index >= insertPosition) {
            const node = state.nodes.get(floatingNode.short_id);
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
        if (node.node_type === "root" && state.currentMindmap) {
          state.currentMindmap.title = newTitle;
          state.currentMindmap.updated_at = new Date().toISOString();
        }

        state.isDirty = true;
        state.isSynced = false;
      });
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
    },

    // ========== 节点删除操作 ==========
    deleteNode: (nodeId: string) => {
      set((state) => {
        const node = state.nodes.get(nodeId);
        if (!node) {
          throw new Error(`节点不存在: ${nodeId}`);
        }

        // 不能删除根节点
        if (node.node_type === "root") {
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
        (node) => node.mindmap_id === mindmapId && node.node_type === "root"
      );
    },

    getFloatingNodes: (mindmapId: string) => {
      return Array.from(get().nodes.values())
        .filter(
          (node) =>
            node.mindmap_id === mindmapId && node.node_type === "floating"
        )
        .sort((a, b) => a.order_index - b.order_index);
    },

    getChildren: (nodeId: string) => {
      const node = get().nodes.get(nodeId);
      if (!node) return [];

      return Array.from(get().nodes.values())
        .filter((n) => n.parent_short_id === nodeId)
        .sort((a, b) => a.order_index - b.order_index);
    },

    // ========== 状态操作 ==========
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
  }))
);
