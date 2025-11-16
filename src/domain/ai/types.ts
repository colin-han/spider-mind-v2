/**
 * AI 操作类型定义
 *
 * 这个模块定义了 AI 返回的操作相关的类型，包括：
 * - AIOperation: 单个操作
 * - AIOperationBatch: 批量操作
 * - ValidationResult: 验证结果
 */

// 重新导出 NodeTree 类型，方便统一引用
export type { NodeTree } from "../commands/node/create-tree";

/**
 * AI 返回的操作建议
 * 本质上就是一个待执行的 Command
 */
export interface AIOperation {
  /** 操作唯一ID */
  id: string;

  /** 对应的命令ID，如 "node.addChild" */
  commandId: string;

  /** 命令参数 */
  params: unknown[];

  /** 用户可读描述，如 "为'产品规划'创建5个子节点" */
  description: string;

  /** 预览信息 */
  preview?: {
    /** 简短总结 */
    summary: string;
  };

  /** AI 元数据 */
  metadata?: {
    /** 置信度 0-1 */
    confidence: number;
    /** 推理过程 */
    reasoning?: string;
  };
}

/**
 * AI 返回的批量操作建议
 * 会被转换为一个 CompositeCommand 执行
 */
export interface AIOperationBatch {
  /** 批次唯一ID */
  id: string;

  /** 整体描述 */
  description: string;

  /** 操作列表（按顺序执行） */
  operations: AIOperation[];

  /** 批次级别的预览 */
  preview?: {
    /** 总操作数 */
    totalOperations: number;
    /** 受影响的节点ID列表 */
    affectedNodes: string[];
  };
}

/**
 * 操作验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;

  /** 错误信息（验证失败时） */
  error?: string;
}
