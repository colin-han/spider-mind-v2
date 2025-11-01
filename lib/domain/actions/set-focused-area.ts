import { IDBPDatabase } from "idb";
import { EditorAction, EditorState, FocusedArea } from "../mindmap-store.types";
import { MindmapDB } from "@/lib/db/schema";

export interface SetFocusedAreaParams {
  oldArea: FocusedArea;
  newArea: FocusedArea;
}

export class SetFocusedAreaAction implements EditorAction {
  type = "setFocusedArea";

  constructor(private readonly params: SetFocusedAreaParams) {}

  applyToEditorState(draft: EditorState): void {
    draft.focusedArea = this.params.newArea;
    draft.isSaved = false;
  }

  async applyToIndexedDB(_db: IDBPDatabase<MindmapDB>): Promise<void> {
    // Do nothing
  }

  reverse(): EditorAction {
    return new SetFocusedAreaAction({
      oldArea: this.params.newArea,
      newArea: this.params.oldArea,
    });
  }
}
