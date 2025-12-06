import { MindmapNode } from "@/lib/types";
import { EditorAction, EditorState } from "../../mindmap-store.types";
import { IDBPDatabase } from "idb";
import { MindmapDB } from "@/lib/db/schema";
import { RemoveNodeAction } from "./remove-node";
import { predictNewNodeLayout } from "@/lib/utils/mindmap/layout-predictor";

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

    // 预测新节点的布局并添加到 layouts 中
    // 这样可以确保 ensureNodeVisibleAction 能够找到新节点的 layout
    const predictedLayout = predictNewNodeLayout(
      this.node,
      draft.layouts,
      draft.nodes
    );
    draft.layouts.set(this.node.short_id, predictedLayout);
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
