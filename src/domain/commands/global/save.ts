import { MindmapStore } from "../../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../../command-registry";
import {
  fetchServerVersion,
  uploadMindmapChanges,
} from "@/lib/actions/mindmap-sync";
import { getDB } from "@/lib/db/schema";
import { syncAIMessages } from "@/lib/ai/conversation-persistence";
import { useMindmapStore } from "../../mindmap-store";

/**
 * 保存思维导图到服务器
 *
 * 执行流程：
 * 1. 收集所有 dirty 的 mindmap 和 nodes
 * 2. 查询服务器当前版本（server_updated_at）
 * 3. 冲突检测：比较本地 server_updated_at 和服务器版本
 * 4. 如果有冲突 → 抛出错误
 * 5. 如果无冲突 → 上传到服务器
 * 6. 更新 IndexedDB（设置 dirty=false，更新 server_updated_at）
 */
export const saveMindmapCommand: CommandDefinition = {
  id: "global.save",
  name: "保存思维导图",
  description: "将未保存的修改同步到服务器",
  category: "global",
  actionBased: false,
  undoable: false, // 保存操作不可撤销

  handler: async (root: MindmapStore) => {
    const { currentEditor } = root;
    const db = await getDB();

    if (!currentEditor) {
      throw new Error("No mindmap is currently open");
    }

    if (!db) {
      throw new Error("Database not initialized");
    }

    // 如果已经保存，直接返回
    if (currentEditor.isSaved) {
      console.log("Mindmap is already saved, nothing to do");
      return;
    }

    const { currentMindmap } = currentEditor;

    // 1. 收集 dirty 数据
    const dirtyMindmap = await db.get("mindmaps", currentMindmap.short_id);
    if (!dirtyMindmap) {
      throw new Error("Mindmap not found in local database");
    }

    // 收集所有 dirty 节点
    const allNodes = await db
      .transaction("mindmap_nodes")
      .store.index("by-mindmap")
      .getAll(currentMindmap.id);

    const dirtyNodes = allNodes.filter((node) => node.dirty);
    if (dirtyNodes.length === 0) {
      console.log("No dirty nodes found, nothing to save");
      return;
    }

    // 分离已删除和未删除的节点
    const deletedNodes = dirtyNodes.filter((node) => node.deleted);
    const updatedNodes = dirtyNodes.filter((node) => !node.deleted);

    console.log(
      `Found ${dirtyNodes.length} dirty nodes to save (${updatedNodes.length} updated, ${deletedNodes.length} deleted)`
    );

    // 2. 查询服务器版本
    const serverVersion = await fetchServerVersion(currentMindmap.short_id);

    // 3. 冲突检测
    if (serverVersion.updated_at !== dirtyMindmap.server_updated_at) {
      // 服务器版本已更新，存在冲突
      throw new ConflictError({
        message: "服务器版本已更新，存在冲突",
        localVersion: dirtyMindmap.server_updated_at,
        serverVersion: serverVersion.updated_at,
        dirtyNodesCount: dirtyNodes.length,
      });
    }

    // 4. 上传到服务器
    const uploadResult = await uploadMindmapChanges({
      mindmapId: currentMindmap.short_id,
      mindmap: dirtyMindmap.dirty
        ? (currentMindmap as Partial<typeof currentMindmap>)
        : undefined,
      nodes: updatedNodes,
      deletedNodeIds: deletedNodes.map((node) => node.id),
    });

    // 5. 更新 IndexedDB
    const tx = db.transaction(["mindmaps", "mindmap_nodes"], "readwrite");

    // 更新 mindmap（不管mindmap本身是否dirty，只要有数据上传，就需要更新server_updated_at）
    await tx.objectStore("mindmaps").put({
      ...dirtyMindmap,
      dirty: false,
      server_updated_at: uploadResult.updated_at,
      local_updated_at: new Date().toISOString(),
    });

    // 更新所有已修改的节点
    for (const node of updatedNodes) {
      await tx.objectStore("mindmap_nodes").put({
        ...node,
        dirty: false,
        local_updated_at: new Date().toISOString(),
      });
    }

    // ✅ 真正删除已删除的节点（已同步到服务器）
    for (const node of deletedNodes) {
      await tx.objectStore("mindmap_nodes").delete(node.short_id);
    }

    await tx.done;

    // 6. 同步 AI 消息
    try {
      await syncAIMessages(currentMindmap.id);
      console.log("AI messages synced successfully");
    } catch (error) {
      // AI 消息同步失败不影响主流程
      console.error("Failed to sync AI messages:", error);
    }

    // 7. 更新保存状态
    useMindmapStore.setState((state) => {
      if (state.currentEditor) {
        state.currentEditor.isSaved = true;
      }
    });

    console.log("Mindmap saved successfully");
  },

  when: (root: MindmapStore) => {
    // 只有在有未保存修改时才能执行保存
    return root.currentEditor !== undefined && !root.currentEditor.isSaved;
  },
};

// ============ 辅助类型 ============

/**
 * 冲突错误
 */
export class ConflictError extends Error {
  constructor(
    public readonly details: {
      message: string;
      localVersion: string;
      serverVersion: string;
      dirtyNodesCount: number;
    }
  ) {
    super(details.message);
    this.name = "ConflictError";
  }
}

registerCommand(saveMindmapCommand);
