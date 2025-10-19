/**
 * 快捷键系统主入口
 *
 * 导出所有公共接口
 */

// 类型定义
export type { ShortcutBinding, ShortcutScope } from "./types";

// 快捷键管理器
export { ShortcutManager } from "./manager";

// Hooks
export { useShortcuts } from "./hooks/use-shortcuts";

// 快捷键绑定
export {
  allBindings,
  nodeBindings,
  navigationBindings,
  editBindings,
  globalBindings,
} from "./bindings";
