/**
 * React Flow 相关类型定义
 *
 * 用于思维导图可视化组件
 */

import type { Node } from "@xyflow/react";

/**
 * 自定义节点数据
 *
 * CustomMindNode 组件使用的数据结构
 */
export interface CustomNodeData extends Record<string, unknown> {
  /** 节点 short_id (用于索引) */
  shortId: string;
  /** 节点标题 */
  title: string;
  /** 节点在兄弟节点中的顺序 */
  orderIndex: number;
  /** 父节点 short_id (根节点为 null) */
  parentId: string | null;
  /** 是否有子节点 */
  hasChildren: boolean;
}

/**
 * 自定义思维导图节点类型
 */
export type CustomMindNode = Node<CustomNodeData, "customMindNode">;

/**
 * 拖拽状态
 *
 * 用于追踪拖拽操作的状态
 */
export interface DragState {
  /** 被拖拽的节点 ID */
  draggedNodeId: string;
  /** 目标节点 ID (鼠标悬停的节点) */
  targetNodeId: string | null;
  /** 计算出的 drop action */
  dropAction: DropAction | null;
  /** 操作是否合法 (通过验证) */
  isValid: boolean;
}

/**
 * Drop Action 类型
 *
 * 描述拖拽放置的操作类型
 */
export type DropAction =
  | {
      /** 插入到目标节点上方或下方 (同级) */
      type: "insert-before" | "insert-after";
      /** 父节点 ID */
      parentId: string;
      /** 插入位置 (0-based) */
      position: number;
    }
  | {
      /** 成为目标节点的子节点 */
      type: "change-parent";
      /** 新父节点 ID */
      parentId: string;
      /** 插入位置 (Infinity = 插入到最后) */
      position: number;
    };

/**
 * 拖拽指示器类型
 */
export type DropIndicatorType =
  | "line-above"
  | "line-below"
  | "highlight"
  | "forbidden";

/**
 * Dagre 布局选项
 */
export interface LayoutOptions {
  /** 布局方向: TB (垂直) 或 LR (水平) */
  direction: "TB" | "LR";
  /** 默认节点宽度 */
  nodeWidth: number;
  /** 默认节点高度 */
  nodeHeight: number;
  /** 层级间距 */
  rankSep: number;
  /** 节点间距 */
  nodeSep: number;
}
