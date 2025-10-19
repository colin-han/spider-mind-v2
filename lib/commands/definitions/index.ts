/**
 * 所有命令定义的统一导出
 *
 * 共 26 个命令:
 * - 节点操作: 11 个
 * - 导航: 7 个
 * - 编辑: 4 个
 * - 全局: 3 个
 * - AI: 1 个
 */

import { nodeCommands } from "./node.commands";
import { navigationCommands } from "./navigation.commands";
import { editCommands } from "./edit.commands";
import { globalCommands } from "./global.commands";
import { aiCommands } from "./ai.commands";
import type { Command } from "../types";

/**
 * 所有命令的集合
 */
export const allCommands: Command[] = [
  ...nodeCommands,
  ...navigationCommands,
  ...editCommands,
  ...globalCommands,
  ...aiCommands,
];

/**
 * 导出各个分类的命令
 */
export {
  nodeCommands,
  navigationCommands,
  editCommands,
  globalCommands,
  aiCommands,
};
