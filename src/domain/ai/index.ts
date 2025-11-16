/**
 * AI 操作模块
 *
 * 提供 AI 操作相关的类型定义和验证功能
 *
 * @example
 * ```typescript
 * import { AIOperation, validateOperation } from "@/domain/ai";
 *
 * // 使用类型
 * const operation: AIOperation = {
 *   id: "op-1",
 *   commandId: "node.addChild",
 *   params: ["parent-123", 0, "新节点"],
 *   description: "创建子节点",
 * };
 *
 * // 验证操作
 * const result = validateOperation(operation);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */

// 导出类型
export type {
  AIOperation,
  AIOperationBatch,
  ValidationResult,
  NodeTree,
} from "./types";

// 导出验证函数
export {
  validateOperation,
  validateOperations,
  extractNodeIds,
} from "./validation";
