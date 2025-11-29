import { MindmapDB } from "@/lib/db/schema";
import { IDBPDatabase } from "idb";
import { EditorAction, EditorState } from "../mindmap-store.types";

export interface SetCurrentNodeParams {
  newNodeId: string;
  oldNodeId: string;
}

export class SetCurrentNodeAction implements EditorAction {
  type = "setCurrentNode";

  constructor(private readonly params: SetCurrentNodeParams) {}

  applyToEditorState(draft: EditorState): void {
    draft.currentNode = this.params.newNodeId;
    // 注意：选择节点是纯 UI 操作，不影响保存状态
  }

  async applyToIndexedDB(_db: IDBPDatabase<MindmapDB>): Promise<void> {
    // Do nothing
  }

  reverse(): EditorAction {
    return new SetCurrentNodeAction({
      newNodeId: this.params.oldNodeId,
      oldNodeId: this.params.newNodeId,
    });
  }
}
