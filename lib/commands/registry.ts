/**
 * 命令注册中心
 *
 * 基于文档: docs/draft/command-system-architecture.md
 */

import type { Command, CommandContext, CommandCategory } from "./types";

/**
 * 命令注册中心
 *
 * 职责:
 * - 管理所有命令的注册和注销
 * - 提供命令查找和执行功能
 * - 支持命令搜索（用于 Command Palette）
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  /**
   * 注册命令
   */
  register(command: Command): void {
    if (this.commands.has(command.id)) {
      console.warn(`Command ${command.id} already registered, overwriting`);
    }
    this.commands.set(command.id, command);
  }

  /**
   * 批量注册命令
   */
  registerAll(commands: Command[]): void {
    commands.forEach((cmd) => this.register(cmd));
  }

  /**
   * 注销命令
   */
  unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  /**
   * 获取命令
   */
  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * 执行命令
   *
   * @throws {Error} 如果命令不存在
   */
  async execute(commandId: string, context: CommandContext): Promise<void> {
    const command = this.commands.get(commandId);

    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    // 检查 when 条件
    if (command.when && !command.when(context)) {
      return;
    }

    await command.handler(context);
  }

  /**
   * 获取所有命令
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * 按分类获取命令
   */
  getByCategory(category: CommandCategory): Command[] {
    return this.getAll().filter((cmd) => cmd.category === category);
  }

  /**
   * 搜索命令（用于 Command Palette）
   *
   * 搜索范围: name, description, tags
   */
  search(query: string): Command[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery) ||
        cmd.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
}
