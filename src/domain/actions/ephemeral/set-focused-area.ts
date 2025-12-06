import { IDBPDatabase } from "idb";
import { EditorAction, EditorState } from "../../mindmap-store.types";
import { MindmapDB } from "@/lib/db/schema";
import { FocusedAreaId } from "../../focused-area.types";
import {
  beforeSetFocusedArea,
  afterSetFocusedArea,
} from "../../focused-area-registry";

export interface SetFocusedAreaParams {
  oldArea: FocusedAreaId;
  newArea: FocusedAreaId;
  reason?: "escape" | "normal";
}

export class SetFocusedAreaAction implements EditorAction {
  type = "setFocusedArea";

  constructor(private readonly params: SetFocusedAreaParams) {}

  applyToEditorState(draft: EditorState): void {
    const { oldArea, newArea, reason = "normal" } = this.params;

    // 1. 调用 onLeave（在状态更新之前）
    beforeSetFocusedArea(oldArea, newArea, reason);

    // 2. 更新状态
    draft.focusedArea = newArea;

    // 3. 调用 onEnter（在状态更新之后）
    // 使用 queueMicrotask 确保在 Immer 完成状态更新后执行
    queueMicrotask(() => {
      afterSetFocusedArea(oldArea, newArea);
    });
  }

  async applyToIndexedDB(_db: IDBPDatabase<MindmapDB>): Promise<void> {
    // Do nothing - focusedArea 不需要持久化
  }

  reverse(): EditorAction {
    return new SetFocusedAreaAction({
      oldArea: this.params.newArea,
      newArea: this.params.oldArea,
    });
  }
}
