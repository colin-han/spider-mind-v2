"use client";

import { useContext } from "react";
import { AuthContext } from "@/lib/providers/auth-provider";

/**
 * 认证 Hook
 * 提供用户状态和加载状态
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
