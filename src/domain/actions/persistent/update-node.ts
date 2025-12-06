import { EditorAction, EditorState } from "../../mindmap-store.types";
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

  /**
   * 获取节点 ID（供订阅者使用）
   */
  getNodeId(): string {
    return this.params.short_id;
  }

  applyToEditorState(draft: EditorState): void {
    const node = draft.nodes.get(this.params.short_id);
    if (!node) {
      throw new Error(`节点不存在: ${this.params.short_id}`);
    }

    // Immer 允许直接修改属性
    Object.assign(node, this.params.newNode);
    node.updated_at = new Date().toISOString();

    draft.isSaved = false;
  }

  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void> {
    const node = await db.get("mindmap_nodes", this.params.short_id);
    if (!node) {
      throw new Error(`节点不存在: ${this.params.short_id}`);
    }

    await db.put("mindmap_nodes", {
      ...node,
      ...this.params.newNode,
      dirty: true,
      local_updated_at: new Date().toISOString(),
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
