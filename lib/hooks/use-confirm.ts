"use client";

import { useContext } from "react";
import { ConfirmContext } from "@/components/ui/confirm-provider";

/**
 * Hook 用于调用确认对话框
 * @example
 * const confirm = useConfirm();
 * const confirmed = await confirm({
 *   title: '删除思维导图',
 *   description: '确定要删除吗？'
 * });
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }

  return context.confirm;
}
