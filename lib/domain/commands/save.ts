import { MindmapStore } from "../mindmap-store.types";
import { CommandDefinition, registerCommand } from "../command-registry";

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
  id: "mindmap.save",
  name: "保存思维导图",
  description: "将未保存的修改同步到服务器",
  category: "global",
  undoable: false, // 保存操作不可撤销

  handler: async (root: MindmapStore) => {
    const { currentEditor, db } = root;

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

    console.log(`Found ${dirtyNodes.length} dirty nodes to save`);

    // 2. 查询服务器版本（TODO: 需要实现 Server Action）
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

    // 4. 上传到服务器（TODO: 需要实现 Server Action）
    const uploadResult = await uploadMindmapChanges({
      mindmapId: currentMindmap.short_id,
      mindmap: dirtyMindmap.dirty ? currentMindmap : undefined,
      nodes: dirtyNodes,
    });

    // 5. 更新 IndexedDB
    const tx = db.transaction(["mindmaps", "mindmap_nodes"], "readwrite");

    // 更新 mindmap
    if (dirtyMindmap.dirty) {
      await tx.objectStore("mindmaps").put({
        ...dirtyMindmap,
        dirty: false,
        server_updated_at: uploadResult.updated_at,
        local_updated_at: new Date().toISOString(),
      });
    }

    // 更新所有 dirty 节点
    for (const node of dirtyNodes) {
      await tx.objectStore("mindmap_nodes").put({
        ...node,
        dirty: false,
        local_updated_at: new Date().toISOString(),
      });
    }

    await tx.done;

    console.log("Mindmap saved successfully");
  },

  when: (root: MindmapStore) => {
    // 只有在有未保存修改时才能执行保存
    return root.currentEditor !== undefined && !root.currentEditor.isSaved;
  },
};

// ============ 辅助类型和函数（TODO: 移到合适的位置）============

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

/**
 * 查询服务器版本（TODO: 实现 Server Action）
 */
async function fetchServerVersion(
  mindmapId: string
): Promise<{ updated_at: string }> {
  // TODO: 调用 Server Action 获取服务器版本
  // 示例实现：
  // const response = await fetch(`/api/mindmaps/${mindmapId}/version`);
  // return await response.json();

  throw new Error(
    `fetchServerVersion not implemented yet. Please implement Server Action for mindmap ${mindmapId}`
  );
}

/**
 * 上传修改到服务器（TODO: 实现 Server Action）
 */
async function uploadMindmapChanges(data: {
  mindmapId: string;
  mindmap?: unknown;
  nodes: unknown[];
}): Promise<{ updated_at: string }> {
  // TODO: 调用 Server Action 上传数据
  // 示例实现：
  // const response = await fetch(`/api/mindmaps/${data.mindmapId}/sync`, {
  //   method: 'POST',
  //   body: JSON.stringify(data),
  // });
  // return await response.json();

  throw new Error(
    `uploadMindmapChanges not implemented yet. Need to upload ${data.nodes.length} nodes`
  );
}

registerCommand(saveMindmapCommand);
