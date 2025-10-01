"use client";

import { useEffect, useRef } from "react";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // 键盘支持：ESC 键关闭
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  // 聚焦管理：打开时聚焦到确认按钮
  useEffect(() => {
    if (open) {
      confirmButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onCancel}
      data-testid="confirm-dialog-overlay"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        data-testid="confirm-dialog"
      >
        <h2
          id="dialog-title"
          className="text-xl font-semibold mb-2 text-gray-900 dark:text-white"
          data-testid="confirm-dialog-title"
        >
          {title}
        </h2>

        <p
          className="text-gray-600 dark:text-gray-400 mb-6"
          data-testid="confirm-dialog-description"
        >
          {description}
        </p>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onCancel}
            data-testid="confirm-dialog-cancel-button"
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant="secondary"
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm-button"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
