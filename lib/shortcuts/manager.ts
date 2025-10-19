/**
 * 快捷键管理器
 *
 * 基于文档: docs/draft/shortcut-system-architecture.md
 */

import type { ShortcutBinding, ShortcutScope } from "./types";

/**
 * 快捷键管理器
 *
 * 职责:
 * - 管理快捷键绑定的注册和注销
 * - 提供查询功能
 * - 支持按作用域过滤
 */
export class ShortcutManager {
  private bindings: ShortcutBinding[] = [];

  /**
   * 注册快捷键绑定
   */
  register(binding: ShortcutBinding): void {
    // 检查是否已存在相同的快捷键
    const existing = this.bindings.find((b) => b.keys === binding.keys);
    if (existing) {
      console.warn(
        `Shortcut ${binding.keys} already registered for command ${existing.commandId}, overwriting with ${binding.commandId}`
      );
      this.unregister(binding.keys);
    }

    this.bindings.push(binding);
  }

  /**
   * 批量注册快捷键绑定
   */
  registerAll(bindings: ShortcutBinding[]): void {
    bindings.forEach((b) => this.register(b));
  }

  /**
   * 注销快捷键绑定
   */
  unregister(keys: string): void {
    this.bindings = this.bindings.filter((b) => b.keys !== keys);
  }

  /**
   * 根据快捷键查找绑定
   */
  find(keys: string): ShortcutBinding | undefined {
    return this.bindings.find((b) => b.keys === keys);
  }

  /**
   * 根据命令 ID 查找绑定
   */
  findByCommand(commandId: string): ShortcutBinding | undefined {
    return this.bindings.find((b) => b.commandId === commandId);
  }

  /**
   * 获取所有快捷键绑定
   */
  getAll(): ShortcutBinding[] {
    return this.bindings;
  }

  /**
   * 按作用域获取快捷键绑定
   */
  getByScope(scope: ShortcutScope): ShortcutBinding[] {
    return this.bindings.filter((b) => b.scope === scope);
  }

  /**
   * 清空所有快捷键绑定
   */
  clear(): void {
    this.bindings = [];
  }
}
