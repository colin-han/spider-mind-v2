/**
 * 节点操作命令定义
 *
 * 基于文档: docs/draft/command-definitions.md
 */

import type { Command } from "../types";

/**
 * 节点操作命令集合（11个命令）
 */
export const nodeCommands: Command[] = [
  // ========== 1. 添加子节点 ==========
  {
    id: "node.addChild",
    name: "添加子节点",
    description: "为当前节点添加一个子节点",
    category: "node",

    when: (ctx) => {
      // 必须有当前节点
      return (
        ctx.store.currentNode !== null &&
        // 不能在编辑面板中触发
        ctx.store.focusedArea !== "panel"
      );
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) {
        throw new Error("No current node selected");
      }

      const children = ctx.store.getChildren(currentNode.short_id);
      const newNode = ctx.store.addChildNode({
        parentId: currentNode.short_id,
        position: children.length, // 插入到末尾
        title: "新节点",
      });

      // 自动选中新节点
      ctx.store.setCurrentNode(newNode.short_id);
    },
  },

  // ========== 2. 在上方添加兄弟节点 ==========
  {
    id: "node.addSiblingAbove",
    name: "在上方添加兄弟节点",
    description: "在当前节点上方添加一个兄弟节点",
    category: "node",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      // 不能是根节点
      return currentNode?.parent_id !== null;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) {
        throw new Error("Cannot add sibling to root node");
      }

      const newNode = ctx.store.addChildNode({
        parentId: currentNode.parent_short_id,
        position: currentNode.order_index, // 插入到当前节点位置（推动当前节点向下）
        title: "新节点",
      });

      // 自动选中新节点
      ctx.store.setCurrentNode(newNode.short_id);
    },
  },

  // ========== 3. 在下方添加兄弟节点 ==========
  {
    id: "node.addSiblingBelow",
    name: "在下方添加兄弟节点",
    description: "在当前节点下方添加一个兄弟节点",
    category: "node",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      // 不能是根节点
      return currentNode?.parent_id !== null;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) {
        throw new Error("Cannot add sibling to root node");
      }

      const newNode = ctx.store.addChildNode({
        parentId: currentNode.parent_short_id,
        position: currentNode.order_index + 1, // 插入到当前节点后面
        title: "新节点",
      });

      // 自动选中新节点
      ctx.store.setCurrentNode(newNode.short_id);
    },
  },

  // ========== 5. 删除节点 ==========
  {
    id: "node.delete",
    name: "删除节点",
    description: "删除当前节点及其所有子节点",
    category: "node",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      // 不能是根节点
      return currentNode?.parent_id !== null;
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return;

      // 在删除前，尝试选中下一个兄弟或上一个兄弟
      if (currentNode.parent_short_id) {
        const siblings = ctx.store.getChildren(currentNode.parent_short_id);
        const currentIndex = siblings.findIndex(
          (n) => n.short_id === currentNode.short_id
        );

        // 优先选择下一个兄弟
        if (currentIndex < siblings.length - 1) {
          ctx.store.setCurrentNode(siblings[currentIndex + 1]!.short_id);
        }
        // 否则选择上一个兄弟
        else if (currentIndex > 0) {
          ctx.store.setCurrentNode(siblings[currentIndex - 1]!.short_id);
        }
        // 否则选择父节点
        else {
          ctx.store.setCurrentNode(currentNode.parent_short_id);
        }
      }

      // 执行删除
      ctx.store.deleteNode(currentNode.short_id);
    },
  },

  // ========== 6. 开始编辑 ==========
  {
    id: "node.edit",
    name: "开始编辑节点",
    description: "进入节点编辑模式（在 Panel 中编辑）",
    category: "node",

    when: (ctx) => {
      // 必须有当前节点
      return ctx.store.currentNode !== null;
    },

    handler: (ctx) => {
      // 将焦点切换到 panel
      ctx.store.setFocusedArea("panel");
      // 注意：实际的 DOM 焦点需要在组件中处理
      // 这里只是设置状态，UI 组件会根据这个状态来聚焦输入框
    },
  },

  // ========== 7. 完成编辑 ==========
  {
    id: "node.finishEdit",
    name: "完成编辑",
    description: "退出编辑模式，返回图形视图",
    category: "node",

    when: (ctx) => {
      // 必须在编辑面板中
      return ctx.store.focusedArea === "panel";
    },

    handler: (ctx) => {
      // 将焦点切换回 graph
      ctx.store.setFocusedArea("graph");
    },
  },

  // ========== 8. 增加缩进（作为子节点） ==========
  {
    id: "node.indent",
    name: "增加缩进",
    description: "将节点移动为上一个兄弟的子节点",
    category: "node",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return false;
      if (ctx.store.focusedArea === "panel") return false;

      // 检查是否有上一个兄弟节点
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

      if (currentIndex <= 0) return;

      const previousSibling = siblings[currentIndex - 1]!;

      // 移动为上一个兄弟的子节点（插入到末尾）
      const newSiblingChildren = ctx.store.getChildren(
        previousSibling.short_id
      );
      ctx.store.moveNode({
        nodeId: currentNode.short_id,
        newParentId: previousSibling.short_id,
        position: newSiblingChildren.length,
      });
    },
  },

  // ========== 9. 减少缩进（提升为父节点的兄弟） ==========
  {
    id: "node.outdent",
    name: "减少缩进",
    description: "将节点移动为父节点的兄弟节点",
    category: "node",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode) return false;
      if (ctx.store.focusedArea === "panel") return false;

      // 必须有父节点，且父节点不是根节点
      const parent = currentNode.parent_short_id
        ? ctx.store.nodes.get(currentNode.parent_short_id)
        : null;
      return (
        parent !== null && parent !== undefined && parent.parent_id !== null
      );
    },

    handler: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return;

      const parent = ctx.store.nodes.get(currentNode.parent_short_id);
      if (!parent || !parent.parent_short_id) return;

      // 获取父节点的兄弟节点列表
      const parentSiblings = ctx.store.getChildren(parent.parent_short_id);
      const parentIndex = parentSiblings.findIndex(
        (n) => n.short_id === parent.short_id
      );

      // 移动到父节点的后面
      ctx.store.moveNode({
        nodeId: currentNode.short_id,
        newParentId: parent.parent_short_id,
        position: parentIndex + 1,
      });
    },
  },

  // ========== 10. 上移节点 ==========
  {
    id: "node.moveUp",
    name: "上移节点",
    description: "将节点与上一个兄弟节点交换位置",
    category: "node",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return false;
      if (ctx.store.focusedArea === "panel") return false;

      // 检查是否可以上移
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

      if (currentIndex <= 0) return;

      // 移动到前一个位置
      ctx.store.moveNode({
        nodeId: currentNode.short_id,
        newParentId: currentNode.parent_short_id,
        position: currentIndex - 1,
      });
    },
  },

  // ========== 11. 下移节点 ==========
  {
    id: "node.moveDown",
    name: "下移节点",
    description: "将节点与下一个兄弟节点交换位置",
    category: "node",

    when: (ctx) => {
      const currentNode = ctx.store.nodes.get(ctx.store.currentNode!);
      if (!currentNode || !currentNode.parent_short_id) return false;
      if (ctx.store.focusedArea === "panel") return false;

      // 检查是否可以下移
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

      if (currentIndex >= siblings.length - 1) return;

      // 移动到后一个位置
      ctx.store.moveNode({
        nodeId: currentNode.short_id,
        newParentId: currentNode.parent_short_id,
        position: currentIndex + 1,
      });
    },
  },
];
