/**
 * 拖拽验证工具函数
 *
 * 职责:
 * - 验证拖拽操作是否合法
 * - 检查循环引用
 * - 检查拖拽约束
 */

import type { MindmapNode } from "@/lib/types";

/**
 * 验证拖拽操作是否合法
 *
 * @param draggedNodeId - 被拖拽节点的 short_id
 * @param targetNodeId - 目标节点的 short_id
 * @param nodesMap - 节点 Map
 * @returns true 如果操作合法,false 否则
 */
export function validateDrop(
  draggedNodeId: string,
  targetNodeId: string,
  nodesMap: Map<string, MindmapNode>
): boolean {
  // 约束 1: 检查节点存在
  const draggedNode = nodesMap.get(draggedNodeId);
  const targetNode = nodesMap.get(targetNodeId);

  if (!draggedNode || !targetNode) {
    return false;
  }

  // 约束 2: 不能拖拽根节点
  if (draggedNode.node_type === "root") {
    return false;
  }

  // 约束 3: 不能拖拽到自己
  if (draggedNodeId === targetNodeId) {
    return false;
  }

  // 约束 4: 不能拖拽到自己的子孙节点下 (循环引用检查)
  if (isDescendant(draggedNodeId, targetNodeId, nodesMap)) {
    return false;
  }

  return true;
}

/**
 * 检查 ancestorId 是否是 descendantId 的祖先
 * 用于防止循环引用
 *
 * @param ancestorId - 潜在祖先节点的 short_id
 * @param descendantId - 潜在后代节点的 short_id
 * @param nodesMap - 节点 Map
 * @returns true 如果 ancestorId 是 descendantId 的祖先
 */
export function isDescendant(
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

/**
 * 计算拖放动作类型
 *
 * @param mouseY - 鼠标在目标节点上的 Y 坐标
 * @param targetNodeY - 目标节点的 Y 坐标
 * @param targetNodeHeight - 目标节点的高度
 * @returns 拖放动作类型
 */
export function getDropActionType(
  mouseY: number,
  targetNodeY: number,
  targetNodeHeight: number
): "insert-before" | "insert-after" | "change-parent" {
  // 计算鼠标在节点内的相对位置 (0-1)
  const ratio = (mouseY - targetNodeY) / targetNodeHeight;

  if (ratio < 0.2) {
    // 上边缘 20%: 插入到目标节点上方
    return "insert-before";
  } else if (ratio > 0.8) {
    // 下边缘 20%: 插入到目标节点下方
    return "insert-after";
  } else {
    // 中间 60%: 成为目标节点的子节点
    return "change-parent";
  }
}
