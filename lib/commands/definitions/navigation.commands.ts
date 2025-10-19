/**
 * 导航命令定义
 *
 * 基于文档: docs/draft/command-definitions.md
 */

import type { Command } from "../types";

/**
 * 导航命令集合（7个命令）
 */
export const navigationCommands: Command[] = [
  // ========== 1. 选择父节点 ==========
  {
    id: "navigation.selectParent",
    name: "选择父节点",
    description: "将焦点移动到当前节点的父节点",
    category: "navigation",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      // 必须有父节点，且不能在编辑面板
      return (
        currentNode?.parent_id !== null && ctx.store.focusedArea !== "panel"
      );
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return;

      ctx.store.setCurrentNode(currentNode.parent_short_id);
    },
  },

  // ========== 2. 选择第一个子节点 ==========
  {
    id: "navigation.selectFirstChild",
    name: "选择第一个子节点",
    description: "将焦点移动到当前节点的第一个子节点",
    category: "navigation",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || ctx.store.focusedArea === "panel") return false;

      // 必须有子节点，且节点未折叠
      const children = ctx.store.getChildren(currentNode.short_id);
      const isCollapsed = ctx.store.collapsedNodes.has(currentNode.short_id);
      return children.length > 0 && !isCollapsed;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      const children = ctx.store.getChildren(currentNode.short_id);
      if (children.length === 0) return;

      ctx.store.setCurrentNode(children[0]!.short_id);
    },
  },

  // ========== 3. 选择上一个兄弟节点 ==========
  {
    id: "navigation.selectPreviousSibling",
    name: "选择上一个兄弟",
    description: "将焦点移动到上一个兄弟节点",
    category: "navigation",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return false;
      if (ctx.store.focusedArea === "panel") return false;

      // 必须有上一个兄弟
      const siblings = ctx.store.getChildren(currentNode.parent_short_id);
      const currentIndex = siblings.findIndex(
        (n) => n.short_id === currentNode.short_id
      );
      return currentIndex > 0;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return;

      const siblings = ctx.store.getChildren(currentNode.parent_short_id);
      const currentIndex = siblings.findIndex(
        (n) => n.short_id === currentNode.short_id
      );

      if (currentIndex > 0) {
        ctx.store.setCurrentNode(siblings[currentIndex - 1]!.short_id);
      }
    },
  },

  // ========== 4. 选择下一个兄弟节点 ==========
  {
    id: "navigation.selectNextSibling",
    name: "选择下一个兄弟",
    description: "将焦点移动到下一个兄弟节点",
    category: "navigation",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return false;
      if (ctx.store.focusedArea === "panel") return false;

      // 必须有下一个兄弟
      const siblings = ctx.store.getChildren(currentNode.parent_short_id);
      const currentIndex = siblings.findIndex(
        (n) => n.short_id === currentNode.short_id
      );
      return currentIndex < siblings.length - 1;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return;

      const siblings = ctx.store.getChildren(currentNode.parent_short_id);
      const currentIndex = siblings.findIndex(
        (n) => n.short_id === currentNode.short_id
      );

      if (currentIndex < siblings.length - 1) {
        ctx.store.setCurrentNode(siblings[currentIndex + 1]!.short_id);
      }
    },
  },

  // ========== 5. 折叠节点 ==========
  {
    id: "navigation.collapseNode",
    name: "折叠节点",
    description: "折叠当前节点（隐藏子节点）",
    category: "navigation",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || ctx.store.focusedArea === "panel") return false;

      // 必须有子节点且未折叠
      const children = ctx.store.getChildren(currentNode.short_id);
      const isCollapsed = ctx.store.collapsedNodes.has(currentNode.short_id);
      return children.length > 0 && !isCollapsed;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      // 添加到折叠节点集合
      ctx.store.collapsedNodes.add(currentNode.short_id);
      // 触发重新渲染（Zustand + Immer 会自动处理）
      ctx.store.setCurrentNode(currentNode.short_id);
    },
  },

  // ========== 6. 展开节点 ==========
  {
    id: "navigation.expandNode",
    name: "展开节点",
    description: "展开当前节点（显示子节点）",
    category: "navigation",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || ctx.store.focusedArea === "panel") return false;

      // 必须已折叠
      return ctx.store.collapsedNodes.has(currentNode.short_id);
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      // 从折叠节点集合中移除
      ctx.store.collapsedNodes.delete(currentNode.short_id);
      // 触发重新渲染
      ctx.store.setCurrentNode(currentNode.short_id);
    },
  },

  // ========== 7. 切换折叠状态 ==========
  {
    id: "navigation.toggleCollapse",
    name: "切换折叠状态",
    description: "切换当前节点的折叠/展开状态",
    category: "navigation",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || ctx.store.focusedArea === "panel") return false;

      // 必须有子节点
      const children = ctx.store.getChildren(currentNode.short_id);
      return children.length > 0;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      const isCollapsed = ctx.store.collapsedNodes.has(currentNode.short_id);

      if (isCollapsed) {
        ctx.store.collapsedNodes.delete(currentNode.short_id);
      } else {
        ctx.store.collapsedNodes.add(currentNode.short_id);
      }

      // 触发重新渲染
      ctx.store.setCurrentNode(currentNode.short_id);
    },
  },
];
