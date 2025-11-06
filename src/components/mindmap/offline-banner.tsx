/**
 * 离线提示横幅组件
 *
 * 功能:
 * - 显示离线状态提示
 * - 显示网络恢复提示
 * - 提供自动保存选项
 */

"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi, X, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { syncManager } from "@/lib/sync/sync-manager";

export interface OfflineBannerProps {
  mindmapId?: string;
  onAutoSave?: () => void;
}

export function OfflineBanner({ mindmapId, onAutoSave }: OfflineBannerProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [hasDirtyData, setHasDirtyData] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // 检查是否有未保存的数据
  useEffect(() => {
    const checkDirtyData = async () => {
      if (!mindmapId) return;

      try {
        const dirty = await syncManager.hasDirtyData(mindmapId);
        setHasDirtyData(dirty);
      } catch (error) {
        console.error("[OfflineBanner] Failed to check dirty data:", error);
      }
    };

    void checkDirtyData();

    // 定期检查（每 10 秒）
    const interval = setInterval(() => {
      void checkDirtyData();
    }, 10000);

    return () => clearInterval(interval);
  }, [mindmapId]);

  // 网络恢复时显示横幅
  useEffect(() => {
    if (wasOffline && isOnline && hasDirtyData) {
      setShowRecoveryBanner(true);
    }
  }, [wasOffline, isOnline, hasDirtyData]);

  const handleAutoSave = async () => {
    if (!mindmapId) return;

    setIsChecking(true);
    try {
      // 触发自动保存
      if (onAutoSave) {
        onAutoSave();
      }
      // 等待一小段时间让保存完成
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowRecoveryBanner(false);
    } catch (error) {
      console.error("[OfflineBanner] Auto save failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = () => {
    setShowRecoveryBanner(false);
  };

  // 离线状态横幅
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  当前处于离线状态
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  你的修改将自动保存到本地，网络恢复后可以同步到云端
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 网络恢复横幅
  if (showRecoveryBanner && hasDirtyData) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-50 border-b border-green-200 dark:bg-green-900/20 dark:border-green-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  网络已恢复
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  你有未同步的本地修改，是否立即保存到云端？
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoSave}
                disabled={isChecking}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-600"
              >
                <CloudUpload className="h-4 w-4" />
                {isChecking ? "保存中..." : "立即保存"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-md p-1 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-800/50"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
