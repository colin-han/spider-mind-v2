import { MindmapDB } from "@/lib/db/schema";
import { IDBPDatabase } from "idb";
import { EditorAction, EditorState } from "../../mindmap-store.types";

export interface SetSavingStatusParams {
  isSaving: boolean;
  isSaved: boolean;
}

/**
 * SetSavingStatusAction - 设置保存状态
 *
 * 用于管理保存过程中的 UI 状态：
 * - isSaving: 是否正在保存
 * - isSaved: 是否已保存
 *
 * 注意：
 * - 这是瞬时 UI 状态，不需要持久化到 IndexedDB
 * - 不支持撤销（用户不需要撤销保存状态）
 */
export class SetSavingStatusAction implements EditorAction {
  type = "setSavingStatus";

  constructor(private readonly params: SetSavingStatusParams) {}

  applyToEditorState(draft: EditorState): void {
    draft.isSaving = this.params.isSaving;
    draft.isSaved = this.params.isSaved;
  }

  async applyToIndexedDB(_db: IDBPDatabase<MindmapDB>): Promise<void> {
    // 保存状态是瞬时 UI 状态，不需要持久化到 IndexedDB
  }

  reverse(): EditorAction {
    // 保存状态不支持撤销
    throw new Error("SetSavingStatusAction cannot be reversed");
  }
}
