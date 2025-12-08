import { z } from "zod";
import { AI_OPERATIONS_CONFIG } from "./operation-config";
import { generateAllOperationSchemas } from "./schema-generator";

/**
 * 操作联合类型（自动生成）
 */
export const OperationSchema =
  generateAllOperationSchemas(AI_OPERATIONS_CONFIG);

/**
 * 单个操作类型（带 ID）
 */
export const OperationWithIdSchema = z.intersection(
  OperationSchema,
  z.object({
    id: z.string().describe("操作唯一标识符，如 op-1, op-2"),
  })
);

/**
 * suggestOperations 工具参数
 */
export const SuggestOperationsArgsSchema = z.object({
  operations: z.array(OperationWithIdSchema).describe("建议的操作列表"),
  summary: z.string().describe("对所有操作的简要说明"),
});

/**
 * 类型导出
 */
export type Operation = z.infer<typeof OperationSchema>;
export type OperationWithId = z.infer<typeof OperationWithIdSchema>;
export type SuggestOperationsArgs = z.infer<typeof SuggestOperationsArgsSchema>;

/**
 * 操作类型枚举（用于类型守卫）
 */
export type OperationAction =
  | "addChild"
  | "addChildTrees"
  | "updateTitle"
  | "updateNote"
  | "deleteNode";

/**
 * 从配置生成 action 列表
 */
export const OPERATION_ACTIONS: readonly OperationAction[] =
  AI_OPERATIONS_CONFIG.map((config) => config.action) as OperationAction[];
