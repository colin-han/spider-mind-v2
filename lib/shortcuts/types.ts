/**
 * 快捷键系统类型定义
 *
 * 基于文档: docs/draft/shortcut-system-architecture.md
 */

/**
 * 快捷键作用域
 */
export type ShortcutScope = "global" | "editor";

/**
 * 快捷键绑定
 *
 * 定义一个快捷键到命令的映射
 */
export interface ShortcutBinding {
  /**
   * 快捷键组合
   * 格式: 'ctrl+n', 'cmd+shift+e', 'tab', 'enter'
   * react-hotkeys-hook 会自动处理 Mac/Windows 差异
   */
  keys: string;

  /**
   * 要执行的命令 ID
   * 必须是已注册的命令
   */
  commandId: string;

  /**
   * 快捷键作用域
   * - global: 全局有效
   * - editor: 仅在编辑器中有效
   */
  scope?: ShortcutScope;

  /**
   * 是否阻止默认行为
   * @default true
   */
  preventDefault?: boolean;

  /**
   * 上下文条件表达式（未来扩展）
   * 用于更细粒度的快捷键启用控制
   */
  when?: string;
}
