/**
 * 冲突对话框组件
 *
 * 功能:
 * - 显示本地版本和云端版本的时间戳
 * - 提供三个操作选项：强制覆盖、丢弃本地修改、取消
 * - 键盘支持 (ESC 关闭)
 */

"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConflictResolution } from "@/lib/sync/sync-manager";

export interface ConflictDialogProps {
  open: boolean;
  localVersion: string;
  serverVersion: string;
  onResolve: (resolution: ConflictResolution) => void;
}

/**
 * 格式化时间戳为本地时间
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return timestamp;
  }
}

export function ConflictDialog({
  open,
  localVersion,
  serverVersion,
  onResolve,
}: ConflictDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // 键盘支持：ESC 键关闭
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onResolve("cancel");
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onResolve]);

  // 聚焦管理：打开时聚焦到取消按钮（最安全的选项）
  useEffect(() => {
    if (open) {
      cancelButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200"
      onClick={() => onResolve("cancel")}
      data-testid="conflict-dialog-overlay"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        aria-describedby="conflict-dialog-description"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        data-testid="conflict-dialog"
      >
        {/* 标题 */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div className="flex-1">
            <h2
              id="conflict-dialog-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
              data-testid="conflict-dialog-title"
            >
              检测到冲突
            </h2>
          </div>
        </div>

        {/* 描述 */}
        <div
          id="conflict-dialog-description"
          className="mb-6 space-y-3"
          data-testid="conflict-dialog-description"
        >
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            服务器上的数据已被其他设备或用户更新。请选择如何处理：
          </p>

          {/* 版本信息 */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                本地版本:
              </span>
              <span
                className="font-mono text-gray-900 dark:text-white"
                data-testid="conflict-dialog-local-version"
              >
                {formatTimestamp(localVersion)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                云端版本:
              </span>
              <span
                className="font-mono text-gray-900 dark:text-white"
                data-testid="conflict-dialog-server-version"
              >
                {formatTimestamp(serverVersion)}
              </span>
            </div>
          </div>

          {/* 选项说明 */}
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-500">
            <p>
              <strong className="text-gray-700 dark:text-gray-300">
                强制覆盖：
              </strong>
              用你的本地修改覆盖云端数据
            </p>
            <p>
              <strong className="text-gray-700 dark:text-gray-300">
                丢弃本地修改：
              </strong>
              重新加载云端数据，丢弃本地修改
            </p>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-2">
          {/* 强制覆盖 - 危险操作，使用醒目颜色 */}
          <Button
            variant="secondary"
            onClick={() => onResolve("force_overwrite")}
            data-testid="conflict-dialog-force-button"
            className="w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
          >
            强制覆盖云端数据
          </Button>

          {/* 丢弃本地修改 */}
          <Button
            variant="secondary"
            onClick={() => onResolve("discard_local")}
            data-testid="conflict-dialog-discard-button"
            className="w-full"
          >
            丢弃本地修改
          </Button>

          {/* 取消 - 最安全的选项 */}
          <Button
            ref={cancelButtonRef}
            variant="ghost"
            onClick={() => onResolve("cancel")}
            data-testid="conflict-dialog-cancel-button"
            className="w-full"
          >
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
