import { MindmapNode } from "@/lib/types";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { RemoveNodeAction } from "./remove-node";

export class AddNodeAction implements EditorAction {
  type = "addChildNode";

  constructor(private readonly node: MindmapNode) {}

  applyToEditorState(draft: EditorState): void {
    // Immer 允许直接修改（会自动转为 immutable）
    draft.nodes.set(this.node.short_id, this.node);
    draft.isSaved = false;
  }
  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>) {
    db.put("mindmap_nodes", {
      ...this.node,
      dirty: true,
      local_updated_at: new Date().toISOString(),
    });
  }
  reverse(): EditorAction {
    return new RemoveNodeAction(this.node.short_id, this.node);
  }
}
