import { MindmapDB } from "@/lib/db/schema";
import { IDBPDatabase } from "idb";
import { EditorAction, EditorState } from "../../mindmap-store.types";
import { ExpandNodeAction } from "./expand-node";

export class CollapseNodeAction implements EditorAction {
  type = "collapseNode";

  constructor(private readonly nodeId: string) {}

  applyToEditorState(draft: EditorState): void {
    draft.collapsedNodes.add(this.nodeId);
  }

  async applyToIndexedDB(_db: IDBPDatabase<MindmapDB>): Promise<void> {
    // Do nothing
  }

  reverse(): EditorAction {
    return new ExpandNodeAction(this.nodeId);
  }
}
