/**
 * CommandButton - 命令按钮组件
 *
 * 职责:
 * - 渲染单个命令按钮
 * - 显示图标
 * - 悬停时显示命令信息和快捷键
 * - 执行命令
 */

"use client";

import { useMemo } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCommand } from "@/domain/mindmap-store";
import { getCommand } from "@/domain/command-registry";
import { findShortcutByCommand } from "@/domain/shortcut-register";

/**
 * CommandButton Props
 */
export interface CommandButtonProps {
  /**
   * 命令 ID
   */
  commandId: string;

  /**
   * 图标组件
   */
  icon: LucideIcon;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean;

  /**
   * 按钮变体
   */
  variant?: "default" | "danger";

  /**
   * 显示模式
   * - icon: 仅显示图标
   * - text: 仅显示文字
   * - both: 同时显示图标和文字
   * @default "icon"
   */
  displayMode?: "icon" | "text" | "both";

  /**
   * 测试 ID
   */
  testId?: string;
}

/**
 * 格式化快捷键显示
 */
function formatShortcut(keys: string): string {
  return keys
    .split("+")
    .map((key) => {
      // 映射特殊键名
      const keyMap: Record<string, string> = {
        mod: navigator.platform.includes("Mac") ? "⌘" : "Ctrl",
        cmd: "⌘",
        ctrl: "Ctrl",
        shift: "⇧",
        alt: "⌥",
        option: "⌥",
        enter: "↵",
        tab: "⇥",
        backspace: "⌫",
        delete: "⌦",
        up: "↑",
        down: "↓",
        left: "←",
        right: "→",
      };

      const lowerKey = key.toLowerCase();
      return keyMap[lowerKey] || key.toUpperCase();
    })
    .join("");
}

/**
 * CommandButton 组件
 */
export function CommandButton({
  commandId,
  icon: Icon,
  className,
  disabled = false,
  variant = "default",
  displayMode = "icon",
  testId,
}: CommandButtonProps) {
  // 使用新的 command 系统
  const executeCommand = useCommand(commandId);

  // 获取命令信息
  const command = useMemo(() => getCommand(commandId), [commandId]);

  // 查询快捷键绑定
  const shortcut = useMemo(() => findShortcutByCommand(commandId), [commandId]);

  // 构建 title 文本
  const title = useMemo(() => {
    if (!command) return "";

    const parts: string[] = [command.name];

    if (command.description) {
      parts.push(`- ${command.description}`);
    }

    if (shortcut) {
      parts.push(`(${formatShortcut(shortcut.key)})`);
    }

    return parts.join(" ");
  }, [command, shortcut]);

  // 处理点击
  const handleClick = () => {
    if (!disabled && command) {
      executeCommand().catch((error) => {
        console.error(`Failed to execute command ${commandId}:`, error);
      });
    }
  };

  // 如果命令不存在，不渲染
  if (!command) {
    console.warn(`Command ${commandId} not found`);
    return null;
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={title}
      data-testid={testId}
      className={cn(
        "inline-flex items-center justify-center",
        "border border-transparent rounded-md",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        "transition-colors",
        {
          // Width based on display mode
          "w-8 h-8": displayMode === "icon",
          "h-8 px-3 gap-1.5": displayMode === "both",
          "h-8 px-2": displayMode === "text",

          // Default variant
          "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400":
            variant === "default" && !disabled,
          // Danger variant
          "text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-gray-600 focus:ring-red-500 dark:focus:ring-red-400":
            variant === "danger" && !disabled,
          // Disabled state
          "text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 cursor-not-allowed":
            disabled,
        },
        className
      )}
    >
      {/* 根据 displayMode 渲染图标 */}
      {(displayMode === "icon" || displayMode === "both") && (
        <Icon className="w-4 h-4" />
      )}

      {/* 根据 displayMode 渲染文字 */}
      {(displayMode === "text" || displayMode === "both") && (
        <span className="text-sm font-medium whitespace-nowrap">
          {command.name}
        </span>
      )}
    </button>
  );
}
