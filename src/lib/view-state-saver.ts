/**
 * 视图状态保存辅助函数
 * 在 Action 执行后保存视图状态到 localStorage
 */
import type { EditorAction, EditorState } from "@/domain/mindmap-store.types";
import { ViewStateManager } from "./view-state-manager";

/**
 * 在 Action 执行后保存视图状态
 * 根据 Action 类型，保存相应的视图状态到 localStorage
 *
 * 注意：这个函数不通过 Action 系统实现，而是在 acceptActions 完成后直接调用
 */
export function saveViewStateAfterActions(
  actions: EditorAction[],
  editorState: EditorState
): void {
  try {
    const mindmapId = editorState.currentMindmap.id;

    // 检查是否有折叠/展开操作
    const hasCollapseAction = actions.some(
      (action) => action.type === "collapseNode" || action.type === "expandNode"
    );

    if (hasCollapseAction) {
      // 保存折叠节点状态
      ViewStateManager.save(mindmapId, {
        collapsedNodes: Array.from(editorState.collapsedNodes),
      });
    }

    // 检查是否有设置当前节点操作
    const hasSetCurrentNodeAction = actions.some(
      (action) => action.type === "setCurrentNode"
    );

    if (hasSetCurrentNodeAction) {
      // 保存当前节点状态
      ViewStateManager.save(mindmapId, {
        currentNode: editorState.currentNode,
      });
    }
  } catch (error) {
    console.error("[ViewStateSaver] Failed to save view state:", error);
    // 保存失败不影响正常使用，静默处理
  }
}
