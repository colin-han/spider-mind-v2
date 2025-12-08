import { z } from "zod";

/**
 * AI 操作配置
 */
export interface AIOperationConfig {
  /** 命令 ID */
  commandId: string;

  /** 操作名称（用于 action 字段） */
  action: string;

  /** 字段映射规则 */
  fieldMapping: {
    [commandParamName: string]: {
      /** Operation 中的字段名 */
      operationFieldName: string;
      /** 是否转换为必需字段 */
      required?: boolean;
      /** 是否是节点 ID（需要 UUID 转换） */
      isNodeId?: boolean;
    };
  };

  /** 额外的字段定义（不在 command params 中） */
  extraFields?: Record<string, z.ZodTypeAny>;
}

/**
 * 节点树结构（用于 addChildTrees）
 */
export interface NodeTree {
  title: string;
  note?: string | undefined;
  children?: NodeTree[] | undefined;
}

export const NodeTreeSchema: z.ZodType<NodeTree> = z.lazy(() =>
  z.object({
    title: z.string().describe("节点标题"),
    note: z.string().optional().describe("节点笔记"),
    children: z.array(NodeTreeSchema).optional().describe("子节点"),
  })
);

/**
 * AI 操作配置列表
 */
export const AI_OPERATIONS_CONFIG: AIOperationConfig[] = [
  {
    commandId: "node.addChild",
    action: "addChild",
    fieldMapping: {
      parentId: {
        operationFieldName: "targetNodeId",
        required: true,
        isNodeId: true,
      },
      title: {
        operationFieldName: "title",
        required: true,
      },
      position: {
        operationFieldName: "afterSiblingId",
        required: false,
        isNodeId: true,
      },
    },
  },
  {
    commandId: "node.addChildTrees",
    action: "addChildTrees",
    fieldMapping: {
      parentId: {
        operationFieldName: "targetNodeId",
        required: true,
        isNodeId: true,
      },
    },
    extraFields: {
      children: z.array(NodeTreeSchema).describe("要添加的节点树"),
    },
  },
  {
    commandId: "node.updateTitle",
    action: "updateTitle",
    fieldMapping: {
      nodeId: {
        operationFieldName: "targetNodeId",
        required: true,
        isNodeId: true,
      },
      newTitle: {
        operationFieldName: "newTitle",
        required: true,
      },
    },
  },
  {
    commandId: "node.updateNote",
    action: "updateNote",
    fieldMapping: {
      nodeId: {
        operationFieldName: "targetNodeId",
        required: true,
        isNodeId: true,
      },
      newNote: {
        operationFieldName: "newNote",
        required: true,
      },
    },
  },
  {
    commandId: "node.delete",
    action: "deleteNode",
    fieldMapping: {
      nodeId: {
        operationFieldName: "targetNodeId",
        required: true,
        isNodeId: true,
      },
    },
  },
];
