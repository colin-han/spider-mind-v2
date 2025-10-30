import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { MindmapNode } from "@/lib/types";

export interface UpdateNodeParams {
  id: string;
  short_id: string;
  oldNode: Partial<MindmapNode>;
  newNode: Partial<MindmapNode>;
}

export class UpdateNodeAction implements EditorAction {
  type = "updateNode";

  constructor(private readonly params: UpdateNodeParams) {}

  async visitEditorState(mutableState: EditorState) {
    const node = mutableState.nodes.get(this.params.short_id);
    if (!node) {
      throw new Error(`节点不存在: ${this.params.short_id}`);
    }
    mutableState.nodes.set(this.params.short_id, {
      ...node,
      ...this.params.newNode,
    });
  }

  async visitIndexedDB(db: IDBPDatabase<MindmapDB>) {
    const node = await db.get("mindmap_nodes", this.params.id);
    if (!node) {
      throw new Error(`节点不存在: ${this.params.id}`);
    }

    await db.put("mindmap_nodes", {
      ...node,
      ...this.params.newNode,
    });
  }

  reverse(): EditorAction {
    return new UpdateNodeAction({
      id: this.params.id,
      short_id: this.params.short_id,
      oldNode: this.params.newNode,
      newNode: this.params.oldNode,
    });
  }
}
