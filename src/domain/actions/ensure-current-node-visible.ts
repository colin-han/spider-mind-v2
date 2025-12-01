/**
 * EnsureCurrentNodeVisibleAction - 确保当前节点在可视区域内
 *
 * 这个 Action 在执行时检查当前节点是否在安全区域内，
 * 如果不在，则自动滚动到安全区域。
 *
 * 与 ensureNodeVisibleAction 函数不同，这个 Action 在执行时
 * 才访问 state，所以可以正确处理新添加的节点。
 */

import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";

export class EnsureCurrentNodeVisibleAction implements EditorAction {
  type = "ensureCurrentNodeVisible";

  constructor(private readonly padding: number = 0.15) {}

  applyToEditorState(draft: EditorState): void {
    const currentNodeId = draft.currentNode;

    if (!currentNodeId) {
      return;
    }

    const layout = draft.layouts.get(currentNodeId);
    if (!layout) {
      return;
    }

    const { x: vpX, y: vpY, width: vpWidth, height: vpHeight } = draft.viewport;

    // 1. 计算安全区域边界（节点坐标系）
    const safeLeft = vpX + vpWidth * this.padding;
    const safeRight = vpX + vpWidth * (1 - this.padding);
    const safeTop = vpY + vpHeight * this.padding;
    const safeBottom = vpY + vpHeight * (1 - this.padding);

    // 2. 节点边界（节点坐标系）
    const nodeLeft = layout.x;
    const nodeRight = layout.x + layout.width;
    const nodeTop = layout.y;
    const nodeBottom = layout.y + layout.height;

    // 3. 计算水平方向所需偏移（节点坐标系）
    let deltaX = 0;
    if (nodeRight < safeLeft) {
      // 节点在左侧安全区外，需要向左滚动（减小viewport.x）
      deltaX = safeLeft - nodeRight;
    } else if (nodeLeft > safeRight) {
      // 节点在右侧安全区外，需要向右滚动（增大viewport.x）
      deltaX = safeRight - nodeLeft;
    }

    // 4. 计算垂直方向所需偏移（节点坐标系）
    let deltaY = 0;
    if (nodeBottom < safeTop) {
      // 节点在上方安全区外，需要向上滚动（减小viewport.y）
      deltaY = safeTop - nodeBottom;
    } else if (nodeTop > safeBottom) {
      // 节点在下方安全区外，需要向下滚动（增大viewport.y）
      deltaY = safeBottom - nodeTop;
    }

    // 5. 如果无需滚动，直接返回
    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    // 6. 计算新的视口位置（节点坐标系）
    const newX = vpX - deltaX;
    const newY = vpY - deltaY;

    // 7. 更新视口位置
    draft.viewport.x = newX;
    draft.viewport.y = newY;
  }

  async applyToIndexedDB(_db: IDBPDatabase<MindmapDB>): Promise<void> {
    // 视口状态不持久化到 IndexedDB
  }

  reverse(): EditorAction {
    // 视口变化不需要 undo，返回自身（空操作）
    return new EnsureCurrentNodeVisibleAction(this.padding);
  }
}
