import { MindmapNode } from "@/lib/types";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { AddNodeAction } from "./add-node";
import { current } from "immer";

export class RemoveNodeAction implements EditorAction {
  type = "removeNode";

  constructor(
    private readonly nodeId: string,
    private deletedNode?: MindmapNode
  ) {}

  applyToEditorState(draft: EditorState): void {
    // 在删除前保存节点（用于 undo）
    if (!this.deletedNode) {
      const node = draft.nodes.get(this.nodeId);
      if (node) {
        // ✅ 使用 current() 获取快照，避免保存 revoked proxy
        this.deletedNode = current(node);
      }
    }

    draft.nodes.delete(this.nodeId);
    draft.isSaved = false;

    // 如果删除的是当前节点，切换到父节点
    if (draft.currentNode === this.nodeId && this.deletedNode) {
      draft.currentNode = this.deletedNode.parent_short_id || "";
    }
  }

  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void> {
    if (this.deletedNode) {
      await db.delete("mindmap_nodes", this.deletedNode.id);
    }
  }

  reverse(): EditorAction {
    if (!this.deletedNode) {
      throw new Error("Cannot reverse RemoveNodeAction without deletedNode");
    }
    return new AddNodeAction(this.deletedNode);
  }
}
