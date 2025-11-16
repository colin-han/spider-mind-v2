/**
 * 焦点区域 ID
 * 新增焦点区域时，在此处添加
 */
export type FocusedAreaId =
  | "graph" // 图形视图
  | "outline" // 大纲视图
  | "title-editor" // 标题编辑器
  | "note-editor" // 笔记编辑器
  | "ai-chat"; // AI 聊天面板

export interface FocusedAreaHandler {
  /**
   * 区域 ID
   */
  id: FocusedAreaId;

  /**
   * 进入该区域时的回调
   * @param from 来源区域
   */
  onEnter?: (from: FocusedAreaId) => void | Promise<void>;

  /**
   * 离开该区域时的回调
   * @param to 目标区域
   */
  onLeave?: (to: FocusedAreaId) => void | Promise<void>;
}
