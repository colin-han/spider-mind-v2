/**
 * AI 操作模块
 *
 * 提供 AI 操作相关的类型定义、验证功能和执行器
 *
 * @example
 * ```typescript
 * import {
 *   AIOperation,
 *   validateOperation,
 *   createAIOperationExecutor,
 * } from "@/domain/ai";
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
 *   return;
 * }
 *
 * // 执行操作
 * const executor = createAIOperationExecutor();
 * await executor.executeOperation(operation);
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

// 导出参数转换函数
export {
  transformOperationParams,
  transformOperationsParams,
} from "./param-transformer";

// 导出执行器
export { AIOperationExecutor, createAIOperationExecutor } from "./executor";
