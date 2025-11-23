import { MindmapNode } from "@/lib/types";
import { EditorAction, EditorState } from "../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { RemoveNodeAction } from "./remove-node";

export class AddNodeAction implements EditorAction {
  type = "addChildNode";

  constructor(private readonly node: MindmapNode) {}

  /**
   * 获取要添加的节点（供订阅者使用）
   */
  getNode(): MindmapNode {
    return this.node;
  }

  applyToEditorState(draft: EditorState): void {
    // Immer 允许直接修改（会自动转为 immutable）
    draft.nodes.set(this.node.short_id, this.node);
    draft.isSaved = false;
  }
  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>) {
    db.put("mindmap_nodes", {
      ...this.node,
      dirty: true,
      deleted: false, // ✅ 确保清除删除标记（用于 undo 删除操作）
      local_updated_at: new Date().toISOString(),
    });
  }
  reverse(): EditorAction {
    return new RemoveNodeAction(this.node.short_id, this.node);
  }
}
