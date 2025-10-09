"use client";

/**
 * 保存状态指示器组件
 *
 * 显示当前的保存状态（已保存/未保存/同步中/失败）
 */

import { Cloud, CloudOff, Loader2, AlertTriangle, Save } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SaveStatus } from "@/lib/hooks/use-save-status";

/**
 * 状态配置
 */
const STATUS_CONFIG: Record<
  SaveStatus,
  {
    icon: typeof Cloud;
    label: string;
    className: string;
  }
> = {
  saved: {
    icon: Cloud,
    label: "云端已保存",
    className: "text-green-600 dark:text-green-400",
  },
  local_only: {
    icon: Save,
    label: "仅本地保存",
    className: "text-yellow-600 dark:text-yellow-400",
  },
  syncing: {
    icon: Loader2,
    label: "正在同步...",
    className: "text-blue-600 dark:text-blue-400 animate-spin",
  },
  sync_failed: {
    icon: CloudOff,
    label: "同步失败",
    className: "text-red-600 dark:text-red-400",
  },
  conflict: {
    icon: AlertTriangle,
    label: "检测到冲突",
    className: "text-orange-600 dark:text-orange-400",
  },
};

export interface SaveStatusIndicatorProps {
  /**
   * 保存状态
   */
  status: SaveStatus;

  /**
   * 是否显示文本标签
   * @default true
   */
  showLabel?: boolean;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 最后保存时间 (可选)
   */
  lastSavedAt?: string;
}

export function SaveStatusIndicator({
  status,
  showLabel = true,
  className,
  lastSavedAt,
}: SaveStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        config.className,
        className
      )}
    >
      <Icon size={16} className={status === "syncing" ? "animate-spin" : ""} />
      {showLabel && (
        <span>
          {config.label}
          {lastSavedAt && status === "saved" && (
            <span className="text-xs text-muted-foreground ml-1">
              ({formatRelativeTime(lastSavedAt)})
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "刚刚";
  } else if (minutes < 60) {
    return `${minutes} 分钟前`;
  } else if (hours < 24) {
    return `${hours} 小时前`;
  } else {
    return `${days} 天前`;
  }
}
