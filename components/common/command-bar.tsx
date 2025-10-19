/**
 * CommandBar - 命令按钮栏组件
 *
 * 职责:
 * - 渲染一组命令按钮
 * - 支持分隔符
 * - 处理布局和样式
 *
 * 可用于:
 * - NodeToolbar (节点浮动工具栏)
 * - 全局工具栏
 * - 任何需要命令按钮组的地方
 */

"use client";

import { LucideIcon } from "lucide-react";
import { CommandButton } from "./command-button";
import { cn } from "@/lib/utils/cn";

/**
 * 命令按钮配置
 */
export interface CommandButtonConfig {
  /**
   * 命令 ID
   */
  commandId: string;

  /**
   * 图标组件
   */
  icon: LucideIcon;

  /**
   * 按钮变体
   */
  variant?: "default" | "danger";

  /**
   * 测试 ID
   */
  testId?: string;

  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 命令组配置（支持分隔符）
 */
export type CommandGroup = CommandButtonConfig[] | "separator";

/**
 * CommandBar Props
 */
export interface CommandBarProps {
  /**
   * 命令按钮组列表
   * 可以包含多个按钮组，组之间用分隔符分隔
   *
   * @example
   * [
   *   [{ commandId: 'node.addChild', icon: Plus }],
   *   'separator',
   *   [{ commandId: 'ai.assist', icon: Sparkles }]
   * ]
   */
  commands: CommandGroup[];

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 测试 ID
   */
  testId?: string;
}

/**
 * CommandBar 组件
 */
export function CommandBar({ commands, className, testId }: CommandBarProps) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      data-testid={testId}
    >
      {commands.map((group, groupIndex) => {
        // 渲染分隔符
        if (group === "separator") {
          return (
            <div
              key={`separator-${groupIndex}`}
              className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"
              data-testid={
                testId ? `${testId}-separator-${groupIndex}` : undefined
              }
            />
          );
        }

        // 渲染按钮组
        return (
          <div
            key={`group-${groupIndex}`}
            className="flex items-center gap-1"
            data-testid={testId ? `${testId}-group-${groupIndex}` : undefined}
          >
            {group.map((button, buttonIndex) => (
              <CommandButton
                key={`${button.commandId}-${buttonIndex}`}
                commandId={button.commandId}
                icon={button.icon}
                {...(button.variant !== undefined && {
                  variant: button.variant,
                })}
                {...(button.disabled !== undefined && {
                  disabled: button.disabled,
                })}
                {...(button.testId !== undefined && { testId: button.testId })}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
