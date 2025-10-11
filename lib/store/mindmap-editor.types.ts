/**
 * 思维导图编辑器领域模型类型定义
 *
 * 说明:
 * - 所有 nodeId 参数都指的是 MindMapNode 的 short_id 字段
 * - 在领域模型中,节点的唯一标识是 short_id,而 id 字段仅用于数据库存储
 */

import type { Mindmap, MindmapNode } from "@/lib/types";

/**
 * 编辑器状态
 */
export interface EditorState {
  // 核心数据
  currentMindmap: Mindmap | null;
  nodes: Map<string, MindmapNode>; // key 是 short_id

  // 焦点和选中状态
  // 不变式: selectedNodes 必然包含 currentNode (当 currentNode 不为 null 时)
  // 如果 currentNode 为 null,则 selectedNodes 必为空集
  currentNode: string | null; // short_id
  selectedNodes: Set<string>; // short_id 集合

  // 编辑状态
  isDirty: boolean; // 是否有未保存的修改
  isSynced: boolean; // 是否已同步到云端
  isEditing: boolean; // 是否正在编辑节点
  editingNodeId: string | null; // 正在编辑的节点 short_id

  // UI 状态
  expandedNodes: Set<string>; // 展开的节点 short_id 集合
  collapsedNodes: Set<string>; // 折叠的节点 short_id 集合

  // 撤销/重做状态
  canUndo: boolean; // 是否可以撤销
  canRedo: boolean; // 是否可以重做
}

/**
 * 节点创建操作参数
 */
export interface AddChildNodeParams {
  parentId: string; // 父节点 short_id
  position: number; // 插入位置 (0 = 最前面, count = 最后面)
  title: string;
  content?: string;
}

export interface CreateFloatingNodeParams {
  mindmapId: string; // 思维导图 ID
  position: number; // 在浮动节点列表中的位置
  title: string;
  content?: string;
}

/**
 * 节点移动操作参数
 */
export interface MoveNodeParams {
  nodeId: string; // 要移动的节点 short_id
  newParentId: string | null; // 新父节点 short_id (null = 转为浮动节点)
  position?: number; // 在新父节点下的位置 (可选,默认插到最后)
}

/**
 * 节点克隆操作参数
 */
export interface CloneNodeParams {
  nodeId: string; // 要克隆的节点 short_id
  targetParentId: string | null; // 目标父节点 short_id (null = 克隆为浮动节点)
  position: number; // 在目标父节点下的位置
  includeChildren?: boolean; // 是否包含子节点 (默认 true)
}

/**
 * 节点查询结果
 */
export interface NodeWithDepth {
  id: string; // UUID
  parentId: string | null;
  shortId: string;
  title: string;
  nodeType: string;
  depth: number;
}

/**
 * 编辑器操作接口 (P0 优先级)
 */
export interface MindmapEditorActions {
  // ========== 节点创建操作 ==========
  /**
   * 在指定父节点下添加子节点
   */
  addChildNode: (params: AddChildNodeParams) => MindmapNode;

  /**
   * 创建浮动节点
   */
  createFloatingNode: (params: CreateFloatingNodeParams) => MindmapNode;

  // ========== 节点编辑操作 ==========
  /**
   * 更新节点标题
   * 注意: 如果是根节点,同时更新 Mindmap.title
   */
  updateNodeTitle: (nodeId: string, newTitle: string) => void;

  /**
   * 更新节点内容
   */
  updateNodeContent: (nodeId: string, newContent: string) => void;

  // ========== 节点删除操作 ==========
  /**
   * 删除节点 (总是递归删除整个子树)
   * 约束: 不能删除根节点
   */
  deleteNode: (nodeId: string) => void;

  // ========== 节点移动操作 ==========
  /**
   * 移动节点到新位置
   * 约束:
   * - 不能移动根节点
   * - 不能移动到自己的子孙节点下 (循环引用)
   * - 不改变 currentNode (保持用户焦点)
   */
  moveNode: (params: MoveNodeParams) => void;

  // ========== 节点查询操作 ==========
  /**
   * 获取单个节点
   */
  getNode: (nodeId: string) => MindmapNode | undefined;

  /**
   * 获取思维导图的所有节点
   */
  getAllNodes: (mindmapId: string) => MindmapNode[];

  /**
   * 获取根节点
   */
  getRootNode: (mindmapId: string) => MindmapNode | undefined;

  /**
   * 获取所有浮动节点
   */
  getFloatingNodes: (mindmapId: string) => MindmapNode[];

  /**
   * 获取节点的子节点 (按 order_index 排序)
   */
  getChildren: (nodeId: string) => MindmapNode[];

  // ========== 状态操作 ==========
  /**
   * 初始化思维导图
   * - 如果 currentNode 为 null,自动设置为根节点
   * - 确保 currentNode 不变式
   */
  initializeMindmap: (mindmapId: string) => void;

  /**
   * 设置当前焦点节点
   * 约束: 保持 selectedNodes 必然包含 currentNode 的不变式
   */
  setCurrentNode: (nodeId: string | null) => void;

  /**
   * 选中节点
   * 约束: currentNode 必然在 selectedNodes 中
   */
  selectNode: (nodeId: string, multiSelect?: boolean) => void;

  /**
   * 清空所有选中
   */
  clearSelection: () => void;

  // ========== 撤销/重做操作 ==========
  /**
   * 撤销上一个操作
   */
  undo: () => Promise<void>;

  /**
   * 重做上一个被撤销的操作
   */
  redo: () => Promise<void>;

  /**
   * 更新撤销/重做状态
   */
  updateUndoRedoState: () => Promise<void>;
}

/**
 * 完整的编辑器 Store 类型
 */
export type MindmapEditorStore = EditorState & MindmapEditorActions;
