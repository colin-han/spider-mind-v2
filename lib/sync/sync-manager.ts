/**
 * Sync Manager
 *
 * 负责将 IndexedDB 中的脏数据同步到 Supabase
 *
 * 功能:
 * 1. 收集脏数据
 * 2. 冲突检测 (基于时间戳)
 * 3. 批量上传到 Supabase
 * 4. 清除脏标记
 */

import { getDB } from "@/lib/db/schema";
import { supabase } from "@/lib/supabase/client";
import type { Mindmap, MindmapNode } from "@/lib/types";

/**
 * 同步结果类型
 */
export type SyncResult =
  | { success: true; uploadedNodes: number; uploadedMindmap: boolean }
  | { success: false; error: SyncError };

/**
 * 同步错误类型
 */
export type SyncError =
  | { type: "conflict"; serverUpdatedAt: string; localUpdatedAt: string }
  | { type: "network"; message: string }
  | { type: "auth"; message: string }
  | { type: "unknown"; message: string };

/**
 * 冲突解决策略
 */
export type ConflictResolution = "force_overwrite" | "discard_local" | "cancel";

/**
 * Sync Manager 配置选项
 */
export interface SyncManagerOptions {
  /**
   * 是否在控制台打印调试日志
   */
  debug?: boolean;
}

/**
 * Sync Manager 类
 */
export class SyncManager {
  private options: Required<SyncManagerOptions>;

  constructor(options: SyncManagerOptions = {}) {
    this.options = {
      debug: options.debug ?? false,
    };
  }

  /**
   * 同步指定思维导图的所有脏数据到 Supabase
   */
  async syncMindmap(
    mindmapId: string,
    conflictResolution?: ConflictResolution
  ): Promise<SyncResult> {
    try {
      // 1. 收集脏数据
      const { mindmap, nodes } = await this.collectDirtyData(mindmapId);

      if (!mindmap && nodes.length === 0) {
        // 没有需要同步的数据
        return { success: true, uploadedNodes: 0, uploadedMindmap: false };
      }

      if (this.options.debug) {
        console.log("[SyncManager] Collected dirty data:", {
          mindmap: !!mindmap,
          nodesCount: nodes.length,
        });
      }

      // 2. 冲突检测
      if (mindmap) {
        const conflict = await this.detectConflict(mindmap);
        if (conflict) {
          if (!conflictResolution) {
            // 没有提供解决策略,返回冲突错误
            return {
              success: false,
              error: {
                type: "conflict",
                serverUpdatedAt: conflict.serverUpdatedAt,
                localUpdatedAt: mindmap.local_updated_at,
              },
            };
          }

          // 处理冲突解决策略
          if (conflictResolution === "cancel") {
            return {
              success: false,
              error: {
                type: "conflict",
                serverUpdatedAt: conflict.serverUpdatedAt,
                localUpdatedAt: mindmap.local_updated_at,
              },
            };
          }

          if (conflictResolution === "discard_local") {
            // 丢弃本地修改,重新加载服务器数据
            await this.reloadFromServer(mindmapId);
            return { success: true, uploadedNodes: 0, uploadedMindmap: false };
          }

          // force_overwrite: 继续上传,覆盖服务器数据
        }
      }

      // 3. 批量上传数据
      const result = await this.uploadData(mindmap, nodes);

      if (!result.success) {
        return result;
      }

      // 4. 清除脏标记
      await this.clearDirtyFlags(mindmapId);

      if (this.options.debug) {
        console.log("[SyncManager] Sync completed successfully");
      }

      return {
        success: true,
        uploadedNodes: nodes.length,
        uploadedMindmap: !!mindmap,
      };
    } catch (error) {
      console.error("[SyncManager] Sync failed:", error);
      return {
        success: false,
        error: {
          type: "unknown",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * 收集指定思维导图的所有脏数据
   * @param mindmapId 思维导图的 short_id
   */
  private async collectDirtyData(mindmapId: string): Promise<{
    mindmap:
      | (Mindmap & {
          dirty: boolean;
          local_updated_at: string;
          server_updated_at: string;
        })
      | null;
    nodes: Array<MindmapNode & { dirty: boolean; local_updated_at: string }>;
  }> {
    if (this.options.debug) {
      console.log(
        `[SyncManager] Collecting dirty data for mindmap: ${mindmapId}`
      );
    }

    const db = await getDB();

    // 获取思维导图 (使用 short_id 作为 key)
    const mindmap = await db.get("mindmaps", mindmapId);
    const dirtyMindmap = mindmap?.dirty ? mindmap : null;

    if (this.options.debug) {
      console.log(`[SyncManager] Mindmap dirty status:`, {
        found: !!mindmap,
        dirty: mindmap?.dirty,
        willSync: !!dirtyMindmap,
        mindmapUUID: mindmap?.id,
      });
    }

    if (!mindmap) {
      console.warn(`[SyncManager] Mindmap not found: ${mindmapId}`);
      return { mindmap: null, nodes: [] };
    }

    // 获取所有脏节点 (使用 mindmap 的 UUID 进行过滤)
    const tx = db.transaction("mindmap_nodes", "readonly");
    const index = tx.store.index("by-mindmap");
    const relevantNodes = await index.getAll(mindmap.id); // 使用 UUID
    const dirtyNodes = relevantNodes.filter((node) => node.dirty);

    if (this.options.debug) {
      console.log(`[SyncManager] Nodes status:`, {
        relevantNodes: relevantNodes.length,
        dirtyNodes: dirtyNodes.length,
      });
    }

    await tx.done;

    return {
      mindmap: dirtyMindmap,
      nodes: dirtyNodes,
    };
  }

  /**
   * 检测冲突
   * 比较本地保存时的服务器时间戳和当前服务器时间戳
   */
  private async detectConflict(
    mindmap: Mindmap & { server_updated_at: string }
  ): Promise<{ serverUpdatedAt: string } | null> {
    const { data, error } = await supabase
      .from("mindmaps")
      .select("updated_at")
      .eq("short_id", mindmap.short_id)
      .single();

    if (error) {
      // 如果是认证错误,抛出
      if (error.code === "PGRST301") {
        throw new Error("Authentication required");
      }
      // 其他错误暂时忽略,继续上传
      console.warn("[SyncManager] Failed to check conflict:", error);
      return null;
    }

    // 比较时间戳
    const serverTime = new Date(data.updated_at).getTime();
    const localServerTime = new Date(mindmap.server_updated_at).getTime();

    if (serverTime > localServerTime) {
      // 服务器数据更新,存在冲突
      return { serverUpdatedAt: data.updated_at };
    }

    return null;
  }

  /**
   * 批量上传数据到 Supabase
   */
  private async uploadData(
    mindmap: (Mindmap & { dirty: boolean }) | null,
    nodes: Array<MindmapNode & { dirty: boolean }>
  ): Promise<SyncResult> {
    try {
      // 1. 上传思维导图元数据
      if (mindmap) {
        const { error: mindmapError } = await supabase.from("mindmaps").upsert({
          id: mindmap.id,
          short_id: mindmap.short_id,
          user_id: mindmap.user_id,
          title: mindmap.title,
          description: mindmap.description,
          created_at: mindmap.created_at,
          updated_at: new Date().toISOString(), // 使用当前时间
        });

        if (mindmapError) {
          if (
            mindmapError.code === "PGRST301" ||
            mindmapError.code === "42501"
          ) {
            return {
              success: false,
              error: { type: "auth", message: "Authentication required" },
            };
          }
          return {
            success: false,
            error: { type: "network", message: mindmapError.message },
          };
        }
      }

      // 2. 批量上传节点
      if (nodes.length > 0) {
        // 准备节点数据 (移除持久化相关字段)
        const nodesToUpload = nodes.map((node) => ({
          id: node.id,
          short_id: node.short_id,
          mindmap_id: node.mindmap_id,
          parent_id: node.parent_id,
          parent_short_id: node.parent_short_id,
          title: node.title,
          content: node.content,
          order_index: node.order_index,
          created_at: node.created_at,
          updated_at: new Date().toISOString(), // 使用当前时间
        }));

        if (this.options.debug) {
          console.log(
            "[SyncManager] Uploading nodes:",
            JSON.stringify(nodesToUpload, null, 2)
          );
        }

        const { error: nodesError } = await supabase
          .from("mindmap_nodes")
          .upsert(nodesToUpload);

        if (nodesError) {
          if (nodesError.code === "PGRST301" || nodesError.code === "42501") {
            return {
              success: false,
              error: { type: "auth", message: "Authentication required" },
            };
          }
          return {
            success: false,
            error: { type: "network", message: nodesError.message },
          };
        }
      }

      return {
        success: true,
        uploadedNodes: nodes.length,
        uploadedMindmap: !!mindmap,
      };
    } catch (error) {
      console.error("[SyncManager] Upload failed:", error);
      return {
        success: false,
        error: {
          type: "network",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * 清除脏标记
   */
  private async clearDirtyFlags(mindmapId: string): Promise<void> {
    const db = await getDB();
    const currentTime = new Date().toISOString();

    // 清除思维导图的脏标记
    const mindmap = await db.get("mindmaps", mindmapId);
    if (mindmap && mindmap.dirty) {
      await db.put("mindmaps", {
        ...mindmap,
        dirty: false,
        server_updated_at: currentTime, // 更新服务器时间戳
      });
    }

    if (!mindmap) {
      console.warn(
        `[SyncManager] Mindmap not found in clearDirtyFlags: ${mindmapId}`
      );
      return;
    }

    // 清除所有节点的脏标记 (使用 mindmap.id UUID 进行过滤)
    const tx = db.transaction("mindmap_nodes", "readonly");
    const index = tx.store.index("by-mindmap");
    const relevantNodes = await index.getAll(mindmap.id); // 使用 UUID
    await tx.done;

    const dirtyNodes = relevantNodes.filter((node) => node.dirty);

    // 批量清除脏标记
    const writeTx = db.transaction("mindmap_nodes", "readwrite");
    await Promise.all(
      dirtyNodes.map((node) =>
        writeTx.store.put({
          ...node,
          dirty: false,
        })
      )
    );
    await writeTx.done;

    if (this.options.debug) {
      console.log(
        `[SyncManager] Cleared dirty flags for ${dirtyNodes.length} nodes`
      );
    }
  }

  /**
   * 从服务器重新加载数据,丢弃本地修改
   */
  private async reloadFromServer(mindmapId: string): Promise<void> {
    const db = await getDB();

    // 1. 从 Supabase 加载思维导图
    const { data: mindmap, error: mindmapError } = await supabase
      .from("mindmaps")
      .select("*")
      .eq("short_id", mindmapId)
      .single();

    if (mindmapError) {
      throw new Error(`Failed to reload mindmap: ${mindmapError.message}`);
    }

    // 2. 从 Supabase 加载所有节点
    const { data: nodes, error: nodesError } = await supabase
      .from("mindmap_nodes")
      .select("*")
      .eq("mindmap_id", mindmap.id);

    if (nodesError) {
      throw new Error(`Failed to reload nodes: ${nodesError.message}`);
    }

    // 3. 更新 IndexedDB
    await db.put("mindmaps", {
      ...mindmap,
      dirty: false,
      local_updated_at: new Date().toISOString(),
      server_updated_at: mindmap.updated_at,
    });

    // 清空旧节点
    const oldNodes = await db.getAll("mindmap_nodes");
    const oldMindmapNodes = oldNodes.filter((n) => n.mindmap_id === mindmap.id);
    await Promise.all(
      oldMindmapNodes.map((n) => db.delete("mindmap_nodes", n.short_id))
    );

    // 插入新节点
    await Promise.all(
      (nodes || []).map((node) =>
        db.put("mindmap_nodes", {
          ...node,
          dirty: false,
          local_updated_at: new Date().toISOString(),
        })
      )
    );

    if (this.options.debug) {
      console.log(
        `[SyncManager] Reloaded ${nodes?.length || 0} nodes from server`
      );
    }
  }

  /**
   * 检查是否有未保存的修改
   */
  async hasDirtyData(mindmapId: string): Promise<boolean> {
    const { mindmap, nodes } = await this.collectDirtyData(mindmapId);
    return !!mindmap || nodes.length > 0;
  }
}

/**
 * 创建全局 Sync Manager 实例
 */
export const syncManager = new SyncManager({ debug: false });
