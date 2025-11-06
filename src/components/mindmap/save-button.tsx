"use client";

/**
 * 思维导图保存按钮组件
 *
 * 功能:
 * - 显示保存按钮
 * - 支持 Cmd+S / Ctrl+S 快捷键
 * - 显示保存状态
 */

import { useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  Cloud,
  CloudOff,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaveStatus, type SaveStatus } from "@/lib/hooks/use-save-status";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/**
 * 保存按钮状态配置
 */
const SAVE_STATUS_CONFIG: Record<
  SaveStatus,
  {
    icon: typeof Save;
    label: string;
    variant: "primary" | "secondary" | "ghost";
    disabled: boolean;
  }
> = {
  saved: {
    icon: Cloud,
    label: "云端已保存",
    variant: "ghost",
    disabled: true,
  },
  local_only: {
    icon: Save,
    label: "保存到云端 (Cmd+S)",
    variant: "primary",
    disabled: false,
  },
  syncing: {
    icon: Loader2,
    label: "正在保存...",
    variant: "ghost",
    disabled: true,
  },
  sync_failed: {
    icon: CloudOff,
    label: "保存失败，点击重试",
    variant: "secondary",
    disabled: false,
  },
  conflict: {
    icon: AlertTriangle,
    label: "检测到冲突",
    variant: "secondary",
    disabled: false,
  },
};

export interface SaveButtonProps {
  /**
   * 思维导图 ID
   */
  mindmapId: string;

  /**
   * 保存成功回调
   */
  onSaveSuccess?: () => void;

  /**
   * 保存失败回调
   */
  onSaveError?: (error: string) => void;

  /**
   * 冲突回调 (返回冲突解决策略)
   */
  onConflict?: (conflictInfo: {
    serverUpdatedAt: string;
    localUpdatedAt: string;
  }) => Promise<"force_overwrite" | "discard_local" | "cancel">;
}

export function SaveButton({
  mindmapId,
  onSaveSuccess,
  onSaveError,
  onConflict,
}: SaveButtonProps) {
  const {
    saveStatus,
    isSyncing,
    lastError,
    conflictInfo,
    save,
    checkDirtyStatus,
  } = useSaveStatus();

  const { isOnline } = useOnlineStatus();

  /**
   * 执行保存操作
   */
  const handleSave = useCallback(async () => {
    // 如果有冲突,先处理冲突
    if (saveStatus === "conflict" && conflictInfo && onConflict) {
      const resolution = await onConflict(conflictInfo);
      if (resolution === "cancel") {
        return;
      }

      const success = await save(mindmapId, resolution);
      if (success) {
        onSaveSuccess?.();
      } else if (lastError) {
        onSaveError?.(lastError);
      }
    } else {
      // 正常保存
      const success = await save(mindmapId);
      if (success) {
        onSaveSuccess?.();
      } else if (lastError) {
        onSaveError?.(lastError);
      }
    }
  }, [
    mindmapId,
    saveStatus,
    conflictInfo,
    lastError,
    save,
    onSaveSuccess,
    onSaveError,
    onConflict,
  ]);

  /**
   * 处理快捷键
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+S (Mac) 或 Ctrl+S (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();

        // 只在有未保存修改时触发保存
        if (saveStatus === "local_only" || saveStatus === "sync_failed") {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, saveStatus]);

  /**
   * 定期检查脏数据状态
   */
  useEffect(() => {
    // 首次检查
    checkDirtyStatus(mindmapId);

    // 每 5 秒检查一次
    const interval = setInterval(() => {
      checkDirtyStatus(mindmapId);
    }, 5000);

    return () => clearInterval(interval);
  }, [mindmapId, checkDirtyStatus]);

  /**
   * 错误提示
   */
  useEffect(() => {
    if (lastError && onSaveError) {
      onSaveError(lastError);
    }
  }, [lastError, onSaveError]);

  const config = SAVE_STATUS_CONFIG[saveStatus];

  // 离线状态覆盖
  const Icon = !isOnline ? WifiOff : config.icon;
  const isDisabled = !isOnline || config.disabled || isSyncing;

  return (
    <Button
      variant={config.variant}
      size="sm"
      onClick={handleSave}
      disabled={isDisabled}
      className="gap-2"
      title={!isOnline ? "网络离线，无法保存到云端" : lastError || config.label}
    >
      <Icon className={isSyncing ? "animate-spin" : ""} size={16} />
      <span className="hidden sm:inline">
        {!isOnline ? "离线" : saveStatus === "saved" ? "已保存" : "保存"}
      </span>
    </Button>
  );
}
