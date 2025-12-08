import { z } from "zod";
import "@/domain/commands"; // 确保所有命令已注册
import { getCommand } from "@/domain/command-registry";
import type { AIOperationConfig } from "./operation-config";

/**
 * 从 Zod schema 中提取字段定义
 */
function extractFieldFromSchema(
  schema: z.ZodTypeAny,
  fieldName: string
): z.ZodTypeAny | null {
  // 处理 z.object()
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    return shape[fieldName] || null;
  }

  return null;
}

/**
 * 获取字段的 description
 */
function getFieldDescription(field: z.ZodTypeAny): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (field as any)._def?.description;
}

/**
 * 转换字段：处理 optional、添加 describe
 */
function transformField(
  field: z.ZodTypeAny,
  mapping: AIOperationConfig["fieldMapping"][string],
  originalDescription?: string
): z.ZodTypeAny {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transformed: any = field;

  // 移除 optional 包装（如果配置要求 required）
  if (mapping.required && field instanceof z.ZodOptional) {
    transformed = field.unwrap();
  }

  // 如果是节点 ID，更新 description 说明是 UUID
  if (mapping.isNodeId) {
    const baseDesc = originalDescription || "节点 ID";
    return transformed.describe(`${baseDesc}（完整 UUID）`);
  } else if (originalDescription && !getFieldDescription(transformed)) {
    // 保留原始 description
    return transformed.describe(originalDescription);
  }

  return transformed;
}

/**
 * 基于配置生成单个 OperationSchema
 */
function generateOperationSchema(
  config: AIOperationConfig
): z.ZodObject<z.ZodRawShape> {
  const command = getCommand(config.commandId);

  if (!command) {
    throw new Error(`Command not found: ${config.commandId}`);
  }

  const fields: Record<string, z.ZodTypeAny> = {
    // action 字段
    action: z.literal(config.action),
  };

  // 遍历字段映射
  for (const [commandParamName, mapping] of Object.entries(
    config.fieldMapping
  )) {
    const originalField = extractFieldFromSchema(
      command.paramsSchema,
      commandParamName
    );

    if (!originalField) {
      console.warn(
        `Field ${commandParamName} not found in command ${config.commandId}`
      );
      continue;
    }

    // 获取原始 description
    const originalDescription = getFieldDescription(originalField);

    // 转换字段
    const transformedField = transformField(
      originalField,
      mapping,
      originalDescription
    );

    // 添加到 fields
    fields[mapping.operationFieldName] = transformedField;
  }

  // 添加 description 字段
  fields["description"] = z.string().describe("操作描述");

  // 添加额外字段
  if (config.extraFields) {
    Object.assign(fields, config.extraFields);
  }

  return z.object(fields);
}

/**
 * 生成所有 OperationSchema
 */
export function generateAllOperationSchemas(
  configs: AIOperationConfig[]
): z.ZodTypeAny {
  const schemas = configs.map((config) => generateOperationSchema(config));

  // 创建 discriminated union
  // 使用类型断言处理 Zod 复杂类型
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return z.discriminatedUnion(
    "action",
    schemas as [z.ZodObject<z.ZodRawShape>, ...z.ZodObject<z.ZodRawShape>[]]
  );
}
