/**
 * 快捷键注册 Hook
 *
 * 基于文档: docs/draft/shortcut-system-architecture.md
 */

"use client";

import { useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useCommandRegistry } from "@/lib/commands/context";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import type { ShortcutBinding } from "../types";

/**
 * Hook: 注册快捷键
 *
 * 使用 react-hotkeys-hook 注册所有快捷键绑定
 * 自动检查命令的 when 条件
 *
 * @param bindings - 快捷键绑定列表
 */
export function useShortcuts(bindings: ShortcutBinding[]) {
  const commandRegistry = useCommandRegistry();
  const store = useMindmapEditorStore();

  // 使用 useMemo 缓存计算结果
  const { allKeys, bindingMap } = useMemo(() => {
    // 将所有快捷键组合成一个字符串（用逗号分隔）
    // react-hotkeys-hook 支持这种格式
    const keys = bindings.map((b) => b.keys).join(", ");

    // 创建快捷键到绑定的映射
    const map = new Map<string, ShortcutBinding>();
    bindings.forEach((binding) => {
      map.set(binding.keys, binding);
    });

    return { allKeys: keys, bindingMap: map };
  }, [bindings]);

  // 注册所有快捷键
  useHotkeys(
    allKeys,
    (event, hotkeysEvent) => {
      // 获取实际按下的快捷键
      const pressedKeys = hotkeysEvent.keys?.join("+") || "";
      const binding = bindingMap.get(pressedKeys);

      if (!binding) {
        // 尝试查找匹配的绑定
        for (const [keys, b] of bindingMap.entries()) {
          if (keys === pressedKeys || hotkeysEvent.keys?.includes(keys)) {
            const { commandId, preventDefault = true } = b;

            const command = commandRegistry.get(commandId);

            if (!command) {
              console.warn(
                `Command ${commandId} not found for shortcut ${keys}`
              );
              return;
            }

            // 创建命令上下文
            const context = { store };

            // 检查 when 条件
            if (command.when && !command.when(context)) {
              // 命令不满足条件，让事件继续传播给其他组件
              return;
            }

            // 命令满足条件，执行命令并阻止事件传播
            if (preventDefault) {
              event.preventDefault();
            }
            // 阻止事件传播到其他组件，避免冲突
            event.stopPropagation();

            // 执行命令
            commandRegistry.execute(commandId, context);
            return;
          }
        }
        return;
      }

      const { commandId, preventDefault = true } = binding;

      const command = commandRegistry.get(commandId);

      if (!command) {
        console.warn(
          `Command ${commandId} not found for shortcut ${pressedKeys}`
        );
        return;
      }

      // 创建命令上下文
      const context = { store };

      // 检查 when 条件
      if (command.when && !command.when(context)) {
        // 命令不满足条件，让事件继续传播给其他组件
        return;
      }

      // 命令满足条件，执行命令并阻止事件传播
      if (preventDefault) {
        event.preventDefault();
      }
      // 阻止事件传播到其他组件，避免冲突
      event.stopPropagation();

      // 执行命令
      commandRegistry.execute(commandId, context);
    },
    {
      // 在表单元素中默认禁用
      enableOnFormTags: false,
      // 启用所有快捷键
      enabled: true,
      // 在捕获阶段监听事件，优先级高于组件的默认行为
      eventListenerOptions: { capture: true },
    },
    [store, commandRegistry, allKeys, bindingMap]
  );
}
