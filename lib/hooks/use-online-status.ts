/**
 * 网络状态检测 Hook
 *
 * 功能:
 * - 检测浏览器在线/离线状态
 * - 监听网络状态变化
 * - 提供网络恢复回调
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface OnlineStatusHook {
  isOnline: boolean;
  wasOffline: boolean; // 是否曾经离线（用于显示恢复提示）
}

export interface UseOnlineStatusOptions {
  onOnline?: () => void; // 网络恢复时的回调
  onOffline?: () => void; // 网络断开时的回调
}

/**
 * 使用网络状态检测
 */
export function useOnlineStatus(
  options?: UseOnlineStatusOptions
): OnlineStatusHook {
  const [isOnline, setIsOnline] = useState(() => {
    // 服务端渲染时默认为在线
    if (typeof window === "undefined") {
      return true;
    }
    return navigator.onLine;
  });

  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    console.log("[useOnlineStatus] Network is online");
    setIsOnline(true);
    setWasOffline(true); // 标记曾经离线，用于显示恢复提示

    // 触发回调
    if (options?.onOnline) {
      options.onOnline();
    }
  }, [options]);

  const handleOffline = useCallback(() => {
    console.log("[useOnlineStatus] Network is offline");
    setIsOnline(false);

    // 触发回调
    if (options?.onOffline) {
      options.onOffline();
    }
  }, [options]);

  useEffect(() => {
    // 监听网络状态变化
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    wasOffline,
  };
}

/**
 * 重置 wasOffline 状态（用于关闭恢复提示后）
 */
export function useResetWasOffline() {
  const [, setWasOffline] = useState(false);

  return useCallback(() => {
    setWasOffline(false);
  }, []);
}
