import { MindmapNode } from "@/lib/types";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { AddNodeAction } from "./add-node";

export class RemoveNodeAction implements EditorAction {
  type = "removeNode";

  constructor(private readonly node: MindmapNode) {}

  async visitEditorState(mutableState: EditorState) {
    mutableState.nodes.delete(this.node.id);
  }

  async visitIndexedDB(db: IDBPDatabase<MindmapDB>) {
    await db.delete("mindmap_nodes", this.node.id);
  }

  reverse(): EditorAction {
    return new AddNodeAction(this.node);
  }
}
