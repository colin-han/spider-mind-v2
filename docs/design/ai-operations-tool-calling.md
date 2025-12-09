# AI 操作 Tool Calling 设计文档

## 元信息

- 作者：Claude Sonnet 4.5
- 创建日期：2025-12-08
- 最后更新：2025-12-08
- 相关文档：
  - [AI 助手系统设计](./ai-assistant-system-design.md)
  - [Command 层设计](./command-layer-design.md)

## 关键概念

> 本节定义该设计文档引入的新概念。

| 概念                 | 定义                                                                  | 示例/说明                                                                                          |
| -------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Tool Calling         | Vercel AI SDK v5 的结构化输出机制，LLM 直接调用预定义的工具函数       | AI 响应中包含 `tool-suggestOperations` 类型的 part                                                 |
| 配置驱动 Schema 生成 | 通过配置对象自动从 Command 定义生成 Zod schemas                       | `AI_OPERATIONS_CONFIG` 配置自动生成 `OperationSchema`                                              |
| OperationWithId      | 带唯一标识符的操作对象，包含 action、targetNodeId、description 等字段 | `{ id: "op-1", action: "addChild", targetNodeId: "uuid...", title: "新节点", description: "..." }` |
| suggestOperations    | AI 工具名称，用于建议思维导图操作                                     | LLM 调用此工具返回操作列表                                                                         |

**外部概念引用**：

- **Zod Schema**：来自 Zod 库的类型验证系统
- **Command**：参见 [Command 层设计](./command-layer-design.md)
- **UUID/short_id**：参见 [ID 设计](./id-design.md)

## 概述

本设计使用 Vercel AI SDK v5 的 Tool Calling 机制重构 AI 操作系统，使 LLM 直接输出结构化的操作数据，替代之前基于文本解析的 `<operations>` 标签方案。通过配置驱动的 Schema 生成系统，从 Command 定义自动生成操作的 Zod schemas，实现了类型安全、易维护、可扩展的 AI 操作架构。

## 背景和动机

### 旧方案的问题

1. **文本解析不可靠**
   - AI 需要手动输出 `<operations>` 标签包裹的 JSON
   - 格式错误导致解析失败
   - 需要复杂的错误处理逻辑

2. **代码重复**
   - Command 参数定义与 AI Operation 参数定义重复
   - 需要手动维护两套类型定义
   - 容易出现不一致

3. **提示词冗长**
   - 需要在系统提示词中详细说明 JSON 格式
   - 需要维护命令列表
   - token 消耗大

### 新方案的优势

1. **原生支持**：AI SDK v5 的 Tool Calling 是 LLM 原生功能
2. **自动生成**：从 Command 定义自动生成 schemas，避免重复
3. **类型安全**：Zod schema 提供运行时验证
4. **简化提示词**：不需要说明 JSON 格式

## 设计目标

- ✅ 使用 AI SDK v5 Tool Calling 替代文本解析
- ✅ 配置驱动：从 Command 定义自动生成 schemas
- ✅ 类型安全：使用 Zod discriminated union
- ✅ 简化提示词：移除手动维护的命令列表
- ✅ 向后兼容：保持相同的操作执行逻辑

## 快速参考

### 添加新操作类型

1. 在 `src/lib/ai/tools/operation-config.ts` 添加配置：

```typescript
{
  commandId: "node.newOperation",
  action: "newOperation",
  fieldMapping: {
    nodeId: {
      operationFieldName: "targetNodeId",
      required: true,
      isNodeId: true,
    },
    // 其他参数映射...
  },
}
```

2. Schema 会自动生成，无需手动定义

### 执行操作

```typescript
import { executeSelectedOperations } from "@/lib/ai/tools";

await executeSelectedOperations(operations, "操作描述");
```

## 设计方案

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Chat API                          │
│  /api/ai/chat                                               │
│  - streamText with tools                                    │
│  - tool: suggestOperations                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tool Definition                            │
│  src/lib/ai/tools/suggest-operations.ts                     │
│  - SuggestOperationsArgsSchema                              │
│  - OperationWithIdSchema                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Schema Generator (配置驱动)                     │
│  src/lib/ai/tools/schema-generator.ts                       │
│  - generateAllOperationSchemas()                            │
│  - 从 Command schemas 提取字段                               │
│  - 应用字段转换规则                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Operation Config                             │
│  src/lib/ai/tools/operation-config.ts                       │
│  - AI_OPERATIONS_CONFIG                                     │
│  - 定义 Command → Operation 字段映射                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Command Registry                           │
│  @/domain/command-registry                                  │
│  - getCommand(commandId)                                    │
│  - Command.paramsSchema                                     │
└─────────────────────────────────────────────────────────────┘

执行流程：
LLM → Tool Call → Frontend → executeSelectedOperations → Command
```

### 详细设计

#### 数据模型

**AIOperationConfig**（配置对象）

```typescript
interface AIOperationConfig {
  commandId: string; // Command ID
  action: string; // 操作类型名称
  fieldMapping: {
    [commandParamName: string]: {
      operationFieldName: string; // Operation 中的字段名
      required?: boolean; // 是否必需
      isNodeId?: boolean; // 是否需要 UUID 转换
    };
  };
  extraFields?: Record<string, z.ZodTypeAny>; // 额外字段
}
```

**OperationWithId**（运行时类型）

```typescript
type OperationWithId = {
  id: string; // 操作唯一标识符
  action: OperationAction;
  targetNodeId: string; // 目标节点 UUID
  description: string; // 操作描述
  // 操作特定字段...
};
```

**NodeTree**（树结构）

```typescript
interface NodeTree {
  title: string;
  note?: string;
  children?: NodeTree[];
}
```

#### 接口定义

**Tool 定义**

```typescript
// src/app/api/ai/chat/route.ts
tools: {
  suggestOperations: tool({
    description: "提供思维导图操作建议",
    inputSchema: SuggestOperationsArgsSchema,
  }),
}
```

**Schema 生成**

```typescript
// src/lib/ai/tools/schema-generator.ts
export function generateAllOperationSchemas(
  configs: AIOperationConfig[]
): z.ZodTypeAny;

// 返回 discriminated union:
// z.discriminatedUnion("action", [
//   addChildSchema,
//   addChildTreesSchema,
//   updateTitleSchema,
//   ...
// ])
```

**操作执行**

```typescript
// src/lib/ai/tools/operation-executor.ts
export async function executeSelectedOperations(
  operations: OperationWithId[],
  description?: string
): Promise<void>;
```

#### 核心逻辑

**1. Schema 生成流程**

```
配置对象 → 获取 Command → 提取字段 → 转换字段 → 生成 Schema
```

- 从 Command 的 `paramsSchema` 提取字段定义
- 根据 `fieldMapping` 重命名字段
- 根据 `required` 移除 optional 包装
- 根据 `isNodeId` 更新 description
- 添加 `action` 字段（literal）
- 添加 `description` 字段
- 添加 `extraFields`

**2. 字段转换规则**

```typescript
transformField(field, mapping, originalDescription):
  1. 如果 required && field 是 optional → unwrap
  2. 如果 isNodeId → 添加 "(完整 UUID)" 描述
  3. 否则保留原始 description
```

**3. UUID → short_id 转换**

```typescript
convertUUIDToShortId(uuid):
  从 editor.nodes 中查找 UUID
  返回 node.short_id
```

**4. 批量执行**

```typescript
executeSelectedOperations(operations):
  1. 将所有操作转换为 CommandRun
  2. 使用 createCompositeCommand 组合
  3. 通过 commandManager.executeCommand 执行
  4. 支持原子事务、撤销/重做
```

## 实现要点

### 1. 模块加载顺序

**问题**：Schema 生成时 Commands 可能未注册

**解决**：在 `schema-generator.ts` 顶部导入命令注册入口

```typescript
import "@/domain/commands"; // 确保所有命令已注册
```

### 2. Tool Call 类型处理

AI SDK v5 的 tool call 类型是 `tool-${toolName}`：

```typescript
// 检查 tool call
const toolCall = message.parts.find(
  (part) => part.type === "tool-suggestOperations"
);

// 提取参数
const operations =
  (
    toolCall as unknown as {
      input: { operations: OperationWithId[] };
    }
  ).input?.operations || [];
```

### 3. Zod 类型推断限制

由于 `z.discriminatedUnion` 和 `z.intersection` 的复杂性，TypeScript 无法完全推断类型。使用类型断言：

```typescript
(op as unknown as { description: string }).description;
```

这是 Zod 的已知限制，不影响运行时类型安全。

### 4. Discriminated Union 的 action 字段

每个操作的 `action` 字段必须是 literal 类型：

```typescript
fields.action = z.literal(config.action);
```

这确保了 Zod 能够正确识别 union 的每个分支。

## 使用示例

### 配置新操作

```typescript
// src/lib/ai/tools/operation-config.ts
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
    },
  },
  // ... 其他操作
];
```

### 前端处理 Tool Call

```typescript
// src/components/ai/message-bubble.tsx
const toolCalls = message.parts.filter((part) => part.type.startsWith("tool-"));

const suggestOperationsCall = toolCalls.find(
  (call) => call.type === "tool-suggestOperations"
);

const operations = suggestOperationsCall
  ? suggestOperationsCall.input?.operations || []
  : [];
```

### 执行操作

```typescript
// src/components/ai/operations-panel.tsx
import { executeSelectedOperations } from "@/lib/ai/tools";

const selectedOps = operations.filter((op) => selectedIds.includes(op.id));

await executeSelectedOperations(selectedOps, "执行 AI 建议的操作");
```

## 设计决策

### 1. 为什么使用配置驱动而不是全自动生成？

**决策**：配置驱动

**理由**：

- 不是所有 Command 都适合 AI 调用
- 需要字段重命名（parentId → targetNodeId）
- 需要字段转换（position 转为 afterSiblingId）
- 提供了灵活性和可控性

**替代方案**：完全自动生成

- 优点：零配置
- 缺点：无法处理字段映射、缺乏灵活性

### 2. 为什么使用 Discriminated Union？

**决策**：`z.discriminatedUnion("action", schemas)`

**理由**：

- 类型安全：TypeScript 能够根据 action 推断具体类型
- 性能优化：Zod 能够快速定位匹配的 schema
- 符合 AI SDK 最佳实践

**替代方案**：`z.union(schemas)`

- 优点：简单
- 缺点：性能差、类型推断不准确

### 3. 为什么保留 description 字段？

**决策**：每个操作包含 `description` 字段

**理由**：

- 用户界面需要显示操作描述
- 帮助用户理解操作意图
- 记录操作历史时有意义的说明

**替代方案**：前端自动生成描述

- 优点：减少 LLM token 消耗
- 缺点：缺少 AI 的语义理解

### 4. 为什么使用 Tool Calling 而不是 Structured Output？

**决策**：Tool Calling (`tool()` 函数)

**理由**：

- 更符合"AI 建议操作"的语义
- 支持多轮对话中的工具调用
- AI SDK 为 Tool Calling 提供了更好的支持

**替代方案**：Structured Output (`generateObject`)

- 优点：更简单
- 缺点：不支持流式输出、缺少工具语义

## 替代方案

### 方案 A：继续使用 `<operations>` 标签

**优点**：

- 无需修改现有代码
- 熟悉的方案

**缺点**：

- 文本解析不可靠
- 代码重复
- 提示词冗长

**结论**：已废弃

### 方案 B：使用装饰器模式

```typescript
@AIOperation("addChild")
class AddChildOperation {
  @AIField("targetNodeId", { isNodeId: true })
  parentId: string;

  @AIField("title")
  title: string;
}
```

**优点**：

- 类型安全
- 元数据清晰

**缺点**：

- 需要 TypeScript 装饰器支持
- 增加复杂度
- 不如配置对象直观

**结论**：未采用

## FAQ

### Q1：如何添加新的操作类型？

在 `AI_OPERATIONS_CONFIG` 中添加新配置即可，Schema 会自动生成。

### Q2：为什么有些字段需要类型断言？

Zod 的复杂 union 类型导致 TypeScript 无法完全推断。这是 Zod 的已知限制，不影响运行时安全。

### Q3：如何处理 UUID 和 short_id？

- AI 使用 UUID（完整 ID，稳定不变）
- Command 系统使用 short_id（短 ID，编辑器内部使用）
- `operation-executor.ts` 自动转换

### Q4：支持哪些操作类型？

目前支持：

- addChild - 添加单个子节点
- addChildTrees - 添加节点树
- updateTitle - 更新标题
- updateNote - 更新笔记
- deleteNode - 删除节点

### Q5：Tool Calling 是否支持所有 AI 模型？

AI SDK v5 支持的模型都支持 Tool Calling，包括：

- Claude 3.5 Sonnet
- Claude 3 Opus
- Claude 3 Haiku
- GPT-4 系列

## 参考资料

- [Vercel AI SDK v5 文档](https://ai-sdk.dev/)
- [Vercel AI SDK Tools](https://ai-sdk.dev/docs/foundations/tools)
- [Zod Documentation](https://zod.dev/)
- [AI SDK v5 发布公告](https://vercel.com/blog/ai-sdk-5)

## 修订历史

| 日期       | 版本 | 修改内容 | 作者              |
| ---------- | ---- | -------- | ----------------- |
| 2025-12-08 | 1.0  | 初始版本 | Claude Sonnet 4.5 |
