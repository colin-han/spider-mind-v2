/**
 * Command Schema 基础设施
 *
 * 使用 Zod 定义命令参数 schema，实现：
 * - TypeScript 类型推断
 * - 运行时验证
 * - AI tool schema 生成
 */

import { z } from "zod";

/**
 * 命令参数 schema 的基础类型
 * 所有命令的 paramsSchema 必须是 ZodObject
 */
export type CommandParamsSchema = z.ZodObject<z.ZodRawShape>;

/**
 * 从 schema 推断参数类型
 *
 * @example
 * const schema = z.object({ nodeId: z.string() });
 * type Params = InferParams<typeof schema>; // { nodeId: string }
 */
export type InferParams<T extends CommandParamsSchema> = z.infer<T>;

/**
 * 空参数 schema（用于无参数的命令）
 *
 * @example
 * const undoCommand: CommandDefinition<typeof EmptyParamsSchema> = {
 *   paramsSchema: EmptyParamsSchema,
 *   handler: (root, params) => { ... }
 * };
 */
export const EmptyParamsSchema = z.object({});
export type EmptyParams = z.infer<typeof EmptyParamsSchema>;

/**
 * 验证参数并返回结果
 *
 * @param schema - Zod schema
 * @param params - 待验证的参数
 * @returns 验证结果
 */
export function validateParams<T extends CommandParamsSchema>(
  schema: T,
  params: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(params);
  return result;
}

/**
 * 验证参数，失败时抛出错误
 *
 * @param schema - Zod schema
 * @param params - 待验证的参数
 * @param commandId - 命令 ID（用于错误消息）
 * @returns 验证通过的参数
 * @throws 验证失败时抛出详细错误
 */
export function parseParams<T extends CommandParamsSchema>(
  schema: T,
  params: unknown,
  commandId: string
): z.infer<T> {
  const result = schema.safeParse(params);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid params for ${commandId}: ${errorMessages}`);
  }
  return result.data;
}
