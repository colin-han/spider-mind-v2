/**
 * 命令系统 React Context 和 Hooks
 *
 * 基于文档: docs/draft/command-system-architecture.md
 */

"use client";

import { createContext, useContext, useMemo, useCallback } from "react";
import { CommandRegistry } from "./registry";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";
import type { Command, CommandContext } from "./types";

/**
 * 命令注册中心 Context
 */
const CommandRegistryContext = createContext<CommandRegistry | null>(null);

/**
 * Provider 组件
 *
 * 在应用启动时注册所有命令
 */
export function CommandRegistryProvider({
  children,
  commands = [],
}: {
  children: React.ReactNode;
  commands?: Command[];
}) {
  const registry = useMemo(() => {
    const reg = new CommandRegistry();

    // 注册所有命令
    reg.registerAll(commands);

    return reg;
  }, [commands]);

  return (
    <CommandRegistryContext.Provider value={registry}>
      {children}
    </CommandRegistryContext.Provider>
  );
}

/**
 * Hook: 使用命令注册中心
 *
 * @throws {Error} 如果不在 CommandRegistryProvider 内使用
 */
export function useCommandRegistry(): CommandRegistry {
  const registry = useContext(CommandRegistryContext);
  if (!registry) {
    throw new Error(
      "useCommandRegistry must be used within CommandRegistryProvider"
    );
  }
  return registry;
}

/**
 * Hook: 执行命令
 *
 * 返回一个函数，用于执行指定的命令
 * 自动注入 store 到 CommandContext
 */
export function useExecuteCommand() {
  const registry = useCommandRegistry();
  const store = useMindmapEditorStore();

  return useCallback(
    (commandId: string, params?: Record<string, unknown>) => {
      const context: CommandContext = { store };
      if (params !== undefined) {
        context.params = params;
      }
      return registry.execute(commandId, context);
    },
    [registry, store]
  );
}

/**
 * Hook: 获取命令可用性
 *
 * 检查命令的 when 条件是否满足
 */
export function useCommandAvailable(commandId: string): boolean {
  const registry = useCommandRegistry();
  const store = useMindmapEditorStore();

  return useMemo(() => {
    const command = registry.get(commandId);
    if (!command) return false;
    if (!command.when) return true;
    return command.when({ store });
  }, [registry, commandId, store]);
}
