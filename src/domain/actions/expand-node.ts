import { MindmapDB } from "@/lib/db/schema";
import { IDBPDatabase } from "idb";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { CollapseNodeAction } from "./collapse-node";

export class ExpandNodeAction implements EditorAction {
  type = "expandNode";

  constructor(private readonly nodeId: string) {}

  applyToEditorState(draft: EditorState): void {
    draft.collapsedNodes.delete(this.nodeId);
  }

  async applyToIndexedDB(_db: IDBPDatabase<MindmapDB>): Promise<void> {
    // Do nothing
  }

  reverse(): EditorAction {
    return new CollapseNodeAction(this.nodeId);
  }
}
