import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { UpdateNodeAction } from "../../actions/update-node";
import { getChildNodes, isDescendant } from "../../editor-utils";
import { EnsureCurrentNodeVisibleAction } from "../../actions/ensure-current-node-visible";

type MoveNodeParams = [string?, string?, number?];

/**
 * 移动节点到新位置
 *
 * 支持两种操作：
 * 1. 同级重排序：newParentId === oldParentId
 * 2. 跨节点移动：newParentId !== oldParentId
 */
export const moveNodeCommand: CommandDefinition = {
  id: "node.move",
  name: "移动节点",
  description: "移动节点到新的父节点或位置",
  category: "node",
  actionBased: true,
  parameters: [
    {
      name: "nodeId",
      type: "string",
      description: "要移动的节点 ID",
    },
    {
      name: "targetParentId",
      type: "string",
      description: "目标父节点 ID",
    },
    {
      name: "position",
      type: "number",
      description: "在新父节点下的位置",
    },
  ],

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId, newParentId, position] = (params as MoveNodeParams) || [];

    if (!nodeId || !root.currentEditor) {
      return;
    }

    const node = root.currentEditor.nodes.get(nodeId);
    if (!node) {
      throw new Error(`节点不存在: ${nodeId}`);
    }

    // 约束 1: 不能移动根节点
    if (node.parent_id === null) {
      throw new Error("不能移动根节点");
    }

    // 约束 2: newParentId 必须存在
    if (newParentId !== null && newParentId !== undefined) {
      const newParent = root.currentEditor.nodes.get(newParentId);
      if (!newParent) {
        throw new Error(`目标父节点不存在: ${newParentId}`);
      }

      // 约束 3: 不能移动到自己的子孙节点下 (循环引用检查)
      if (isDescendant(nodeId, newParentId, root.currentEditor.nodes)) {
        throw new Error("不能移动到自己的子孙节点下");
      }
    }

    const oldParentId = node.parent_short_id;
    const actions = [];

    // 情况 1: 同级重排序 (newParentId === oldParentId)
    if (newParentId === oldParentId) {
      // 获取所有兄弟节点
      const siblings = getChildNodes(root.currentEditor, oldParentId || "");
      const oldIndex = siblings.findIndex((n) => n.short_id === nodeId);

      if (oldIndex === -1) {
        return;
      }

      const targetPosition =
        position !== undefined
          ? Math.min(position, siblings.length - 1)
          : siblings.length - 1;

      // 如果位置没变,不做任何操作
      if (oldIndex === targetPosition) {
        return;
      }

      // 模拟移除和插入
      const movedNode = siblings[oldIndex];
      const reorderedSiblings = siblings.filter((_, i) => i !== oldIndex);
      reorderedSiblings.splice(targetPosition, 0, movedNode!);

      // 生成所有受影响节点的 UpdateNodeAction
      reorderedSiblings.forEach((sibling, index) => {
        if (sibling.order_index !== index) {
          actions.push(
            new UpdateNodeAction({
              id: sibling.id,
              short_id: sibling.short_id,
              oldNode: { order_index: sibling.order_index },
              newNode: { order_index: index },
            })
          );
        }
      });
    }
    // 情况 2: 改变父节点 (newParentId !== oldParentId)
    else {
      // 获取旧父节点的所有子节点
      const oldSiblings = getChildNodes(root.currentEditor, oldParentId || "");

      // 重新排序旧父节点的子节点（移除被移动的节点）
      oldSiblings
        .filter((sibling) => sibling.short_id !== nodeId)
        .forEach((sibling, index) => {
          if (sibling.order_index !== index) {
            actions.push(
              new UpdateNodeAction({
                id: sibling.id,
                short_id: sibling.short_id,
                oldNode: { order_index: sibling.order_index },
                newNode: { order_index: index },
              })
            );
          }
        });

      // 获取新父节点的所有子节点
      const newSiblings = getChildNodes(root.currentEditor, newParentId || "");

      // 确定插入位置
      const targetPosition =
        position !== undefined
          ? Math.min(position, newSiblings.length)
          : newSiblings.length;

      // 更新移动节点的父节点信息
      const newParent = newParentId
        ? root.currentEditor.nodes.get(newParentId)
        : null;

      actions.push(
        new UpdateNodeAction({
          id: node.id,
          short_id: node.short_id,
          oldNode: {
            parent_short_id: node.parent_short_id,
            parent_id: node.parent_id,
            order_index: node.order_index,
          },
          newNode: {
            parent_short_id: newParentId || null,
            parent_id: newParent?.id ?? null,
            order_index: targetPosition,
          },
        })
      );

      // 更新新父节点下后续兄弟节点的 order_index
      newSiblings.forEach((sibling) => {
        if (sibling.order_index >= targetPosition) {
          actions.push(
            new UpdateNodeAction({
              id: sibling.id,
              short_id: sibling.short_id,
              oldNode: { order_index: sibling.order_index },
              newNode: { order_index: sibling.order_index + 1 },
            })
          );
        }
      });
    }

    // 策略A: 确保当前节点在安全区域内（15% padding）
    // 使用 EnsureCurrentNodeVisibleAction，在执行时才检查和滚动
    actions.push(new EnsureCurrentNodeVisibleAction(0.15));

    return actions;
  },

  when: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as MoveNodeParams) || [];
    if (!nodeId || !root.currentEditor) {
      return false;
    }

    const node = root.currentEditor.nodes.get(nodeId);
    // 只有非根节点才能移动
    return node !== undefined && node.parent_id !== null;
  },

  getDescription: (root: MindmapStore, params?: unknown[]) => {
    const [nodeId] = (params as MoveNodeParams) || [];
    const node = root.currentEditor?.nodes.get(nodeId || "");
    return node ? `移动：${node.title}` : "移动节点";
  },
};

registerCommand(moveNodeCommand);
