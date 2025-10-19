/**
 * 所有快捷键绑定的统一导出
 *
 * 基于文档: docs/draft/shortcut-key-bindings.md
 */

import { nodeBindings } from "./node.bindings";
import { navigationBindings } from "./navigation.bindings";
import { editBindings } from "./edit.bindings";
import { globalBindings } from "./global.bindings";
import type { ShortcutBinding } from "../types";

/**
 * 所有快捷键绑定的集合
 */
export const allBindings: ShortcutBinding[] = [
  ...nodeBindings,
  ...navigationBindings,
  ...editBindings,
  ...globalBindings,
];

/**
 * 导出各个分类的绑定
 */
export { nodeBindings, navigationBindings, editBindings, globalBindings };
