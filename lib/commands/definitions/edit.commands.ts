/**
 * 编辑命令定义
 *
 * 基于文档: docs/draft/command-definitions.md
 *
 * 注意: 复制/剪切/粘贴命令使用内存剪贴板
 * 未来可以考虑将剪贴板状态添加到 Store 中
 */

import type { Command } from "../types";
import type { MindmapNode } from "@/lib/types";

/**
 * 内存剪贴板
 * 存储复制或剪切的节点数据
 */
interface ClipboardData {
  node: MindmapNode;
  isCut: boolean; // true: 剪切, false: 复制
}

let clipboard: ClipboardData | null = null;

/**
 * 编辑命令集合（4个命令）
 */
export const editCommands: Command[] = [
  // ========== 1. 复制节点 ==========
  {
    id: "edit.copy",
    name: "复制节点",
    description: "复制当前节点到剪贴板",
    category: "edit",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      // 不能是根节点，不能在编辑面板
      return (
        currentNode?.parent_id !== null && ctx.store.focusedArea !== "panel"
      );
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      // 复制到剪贴板
      clipboard = {
        node: { ...currentNode },
        isCut: false,
      };
    },
  },

  // ========== 2. 剪切节点 ==========
  {
    id: "edit.cut",
    name: "剪切节点",
    description: "剪切当前节点到剪贴板",
    category: "edit",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      // 不能是根节点，不能在编辑面板
      return (
        currentNode?.parent_id !== null && ctx.store.focusedArea !== "panel"
      );
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      // 复制到剪贴板并标记为剪切
      clipboard = {
        node: { ...currentNode },
        isCut: true,
      };
    },
  },

  // ========== 3. 粘贴节点 ==========
  {
    id: "edit.paste",
    name: "粘贴节点",
    description: "粘贴剪贴板中的节点作为当前节点的子节点",
    category: "edit",

    when: (ctx) => {
      // 必须有剪贴板内容，不能在编辑面板
      return (
        clipboard !== null &&
        ctx.store.currentNode !== null &&
        ctx.store.focusedArea !== "panel"
      );
    },

    handler: (ctx) => {
      if (!clipboard) return;

      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      const clipboardNode = clipboard.node;
      const isCut = clipboard.isCut;

      // 如果是剪切，先删除原节点
      if (isCut) {
        // 检查是否试图粘贴到自己的子孙节点（循环引用）
        let checkNode = currentNode;
        while (checkNode.parent_short_id) {
          if (checkNode.short_id === clipboardNode.short_id) {
            console.warn("Cannot paste node into its own descendant");
            return;
          }
          const parent = ctx.store.nodes.get(checkNode.parent_short_id);
          if (!parent) break;
          checkNode = parent;
        }

        // 删除原节点
        ctx.store.deleteNode(clipboardNode.short_id);
      }

      // 获取当前节点的子节点数量
      const children = ctx.store.getChildren(currentNode.short_id);

      // 添加新节点
      const addNodeParams: {
        parentId: string;
        position: number;
        title: string;
        content?: string;
      } = {
        parentId: currentNode.short_id,
        position: children.length,
        title: clipboardNode.title,
      };

      if (clipboardNode.content) {
        addNodeParams.content = clipboardNode.content;
      }

      const newNode = ctx.store.addChildNode(addNodeParams);

      // 如果是剪切，粘贴后清空剪贴板
      if (isCut) {
        clipboard = null;
      }

      // 选中新节点
      ctx.store.setCurrentNode(newNode.short_id);
    },
  },

  // ========== 4. 复制节点（作为兄弟） ==========
  {
    id: "edit.duplicate",
    name: "复制节点",
    description: "在当前节点下方创建一个副本",
    category: "edit",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      // 不能是根节点，不能在编辑面板
      return (
        currentNode?.parent_id !== null && ctx.store.focusedArea !== "panel"
      );
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return;

      const siblings = ctx.store.getChildren(currentNode.parent_short_id);
      const currentIndex = siblings.findIndex(
        (n) => n.short_id === currentNode.short_id
      );

      // 在当前节点下方插入副本
      const duplicateParams: {
        parentId: string;
        position: number;
        title: string;
        content?: string;
      } = {
        parentId: currentNode.parent_short_id,
        position: currentIndex + 1,
        title: currentNode.title + " (副本)",
      };

      if (currentNode.content) {
        duplicateParams.content = currentNode.content;
      }

      const newNode = ctx.store.addChildNode(duplicateParams);

      // 选中新节点
      ctx.store.setCurrentNode(newNode.short_id);
    },
  },
];
