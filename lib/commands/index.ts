/**
 * 命令系统公共接口
 *
 * 基于文档: docs/draft/command-system-architecture.md
 */

// 类型定义
export type { Command, CommandContext, CommandCategory } from "./types";

// 命令注册中心
export { CommandRegistry } from "./registry";

// React Context 和 Hooks
export {
  CommandRegistryProvider,
  useCommandRegistry,
  useExecuteCommand,
  useCommandAvailable,
} from "./context";

// 所有命令定义
export {
  allCommands,
  nodeCommands,
  navigationCommands,
  editCommands,
  globalCommands,
} from "./definitions";
