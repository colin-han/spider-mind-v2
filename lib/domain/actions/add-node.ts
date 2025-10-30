import { MindmapNode } from "@/lib/types";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { RemoveNodeAction } from "./remove-node";

export class AddNodeAction implements EditorAction {
  type = "addChildNode";

  constructor(private readonly node: MindmapNode) {}

  async visitEditorState(mutableState: EditorState) {
    mutableState.nodes.set(this.node.id, this.node);
  }
  async visitIndexedDB(db: IDBPDatabase<MindmapDB>) {
    db.put("mindmap_nodes", {
      ...this.node,
      dirty: true,
      local_updated_at: new Date().toISOString(),
    });
  }
  reverse(): EditorAction {
    return new RemoveNodeAction(this.node);
  }
}
