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

  async visitEditorState(mutableState: EditorState) {
    mutableState.currentNode = this.params.newNodeId;
  }

  async visitIndexedDB(_db: IDBPDatabase<MindmapDB>) {
    // Do nothing
  }

  reverse(): EditorAction {
    return new SetCurrentNodeAction({
      newNodeId: this.params.oldNodeId,
      oldNodeId: this.params.newNodeId,
    });
  }
}
