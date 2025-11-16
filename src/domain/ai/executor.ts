/**
 * AI 操作执行器
 *
 * 负责执行 AI 返回的操作，包括：
 * - 单个操作执行
 * - 批量操作执行（支持选择性执行）
 * - undoable/non-undoable 操作分组
 */

import { createCompositeCommand } from "../commands/composite";
import { useMindmapStore } from "../mindmap-store";
import { getCommand } from "../command-registry";
import type { AIOperation } from "./types";

/**
 * AI 操作执行器类
 */
export class AIOperationExecutor {
  /**
   * 执行单个操作
   *
   * @param operation - AI 操作
   */
  async executeOperation(operation: AIOperation): Promise<void> {
    const root = useMindmapStore.getState();

    await root.commandManager!.executeCommand({
      commandId: operation.commandId,
      params: operation.params,
    });
  }

  /**
   * 执行选中的操作
   *
   * 执行策略：
   * 1. 将操作按 undoable 属性分组
   * 2. 先执行所有 undoable=true 的命令（组合成 CompositeCommand，一次 undo 撤销）
   * 3. 成功后再依次执行 undoable=false 的命令（系统级操作如 save）
   *
   * @param operations - 用户选中的操作列表
   * @param description - 操作批次的描述（用于 undo 历史）
   */
  async executeSelected(
    operations: AIOperation[],
    description: string = "执行 AI 操作"
  ): Promise<void> {
    const root = useMindmapStore.getState();

    // 分组：undoable 和 non-undoable 操作
    const undoableOps: AIOperation[] = [];
    const nonUndoableOps: AIOperation[] = [];

    for (const op of operations) {
      const command = getCommand(op.commandId);
      if (!command) {
        throw new Error(`Unknown command: ${op.commandId}`);
      }

      // 根据 undoable 属性分组（默认为 true）
      if (command.undoable === false) {
        nonUndoableOps.push(op);
      } else {
        undoableOps.push(op);
      }
    }

    // 第一步：执行所有 undoable 操作（组合成一个事务）
    if (undoableOps.length > 0) {
      const compositeCommand = createCompositeCommand(
        description,
        undoableOps.map((op) => ({
          commandId: op.commandId,
          params: op.params,
        }))
      );

      await root.commandManager!.executeCommand(
        {
          commandId: compositeCommand.id,
          params: [],
        },
        compositeCommand
      );
    }

    // 第二步：依次执行 non-undoable 操作（系统级操作）
    for (const op of nonUndoableOps) {
      await root.commandManager!.executeCommand({
        commandId: op.commandId,
        params: op.params,
      });
    }
  }
}

/**
 * 创建 AI 操作执行器实例
 */
export function createAIOperationExecutor(): AIOperationExecutor {
  return new AIOperationExecutor();
}
