/**
 * 保存状态管理 Hook
 *
 * 管理思维导图的保存状态和同步操作
 */

import { useState, useCallback } from "react";
import { syncManager, type ConflictResolution } from "@/lib/sync/sync-manager";

/**
 * 保存状态类型
 */
export type SaveStatus =
  | "saved" // 云端已保存
  | "local_only" // 仅本地保存,未同步
  | "syncing" // 同步中
  | "sync_failed" // 同步失败
  | "conflict"; // 检测到冲突

/**
 * Hook 返回值
 */
export interface UseSaveStatusReturn {
  /**
   * 当前保存状态
   */
  saveStatus: SaveStatus;

  /**
   * 是否正在同步
   */
  isSyncing: boolean;

  /**
   * 最后一次错误信息
   */
  lastError: string | null;

  /**
   * 冲突信息 (仅在 saveStatus === 'conflict' 时有值)
   */
  conflictInfo: {
    serverUpdatedAt: string;
    localUpdatedAt: string;
  } | null;

  /**
   * 执行保存操作
   * @param mindmapId 思维导图 ID
   * @param conflictResolution 冲突解决策略 (可选)
   */
  save: (
    mindmapId: string,
    conflictResolution?: ConflictResolution
  ) => Promise<boolean>;

  /**
   * 检查是否有未保存的修改
   * @param mindmapId 思维导图 ID
   */
  checkDirtyStatus: (mindmapId: string) => Promise<boolean>;

  /**
   * 清除错误状态
   */
  clearError: () => void;
}

/**
 * 使用保存状态 Hook
 */
export function useSaveStatus(): UseSaveStatusReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{
    serverUpdatedAt: string;
    localUpdatedAt: string;
  } | null>(null);

  /**
   * 保存操作
   */
  const save = useCallback(
    async (
      mindmapId: string,
      conflictResolution?: ConflictResolution
    ): Promise<boolean> => {
      try {
        // 设置为同步中
        setIsSyncing(true);
        setSaveStatus("syncing");
        setLastError(null);
        setConflictInfo(null);

        // 执行同步
        const result = await syncManager.syncMindmap(
          mindmapId,
          conflictResolution
        );

        if (result.success) {
          // 同步成功
          setSaveStatus("saved");
          return true;
        } else {
          // 同步失败
          const { error } = result;

          if (error.type === "conflict") {
            // 冲突
            setSaveStatus("conflict");
            setConflictInfo({
              serverUpdatedAt: error.serverUpdatedAt,
              localUpdatedAt: error.localUpdatedAt,
            });
            setLastError("检测到冲突，服务器数据已更新");
          } else if (error.type === "auth") {
            // 认证错误
            setSaveStatus("sync_failed");
            setLastError("需要登录才能保存");
          } else if (error.type === "network") {
            // 网络错误
            setSaveStatus("sync_failed");
            setLastError(`网络错误: ${error.message}`);
          } else {
            // 未知错误
            setSaveStatus("sync_failed");
            setLastError(`保存失败: ${error.message}`);
          }

          return false;
        }
      } catch (error) {
        // 意外错误
        console.error("[useSaveStatus] Unexpected error:", error);
        setSaveStatus("sync_failed");
        setLastError(
          error instanceof Error ? error.message : "保存时发生未知错误"
        );
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  /**
   * 检查脏数据状态
   */
  const checkDirtyStatus = useCallback(
    async (mindmapId: string): Promise<boolean> => {
      try {
        const hasDirty = await syncManager.hasDirtyData(mindmapId);

        if (hasDirty) {
          // 有未保存的修改
          if (saveStatus === "saved") {
            setSaveStatus("local_only");
          }
        } else {
          // 没有未保存的修改
          if (saveStatus === "local_only" || saveStatus === "sync_failed") {
            setSaveStatus("saved");
          }
        }

        return hasDirty;
      } catch (error) {
        console.error("[useSaveStatus] Failed to check dirty status:", error);
        return false;
      }
    },
    [saveStatus]
  );

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setLastError(null);
    setConflictInfo(null);
    if (saveStatus === "sync_failed" || saveStatus === "conflict") {
      setSaveStatus("local_only");
    }
  }, [saveStatus]);

  return {
    saveStatus,
    isSyncing,
    lastError,
    conflictInfo,
    save,
    checkDirtyStatus,
    clearError,
  };
}
