# AI Chat 节点编辑能力设计 V2 (基于 Command 系统)

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-15
- 最后更新：2025-11-15
- 状态：草稿
- 相关文档：
  - [CompositeCommand 设计](../design/composite-command.md)
  - [Command 层架构设计](../design/command-layer-design.md)
  - [AI 操作 UI 设计](./ai-operations-ui-design.md)

## 1. 设计原则

**核心理念**: AI 操作应该完全基于现有的 Command 系统，而不是重新发明一套动作系统。

### 1.1 架构优势

1. **复用性**: 复用所有已有的 command 和 action
2. **一致性**: AI 操作和用户手动操作使用同一套基础设施
3. **简化**: 不需要额外的转换层
4. **原子性**: 通过 CompositeCommand 保证事务性

## 2. 数据结构设计

### 2.1 AI Operation

```typescript
/**
 * AI 返回的操作建议
 * 本质上就是一个待执行的 Command
 */
interface AIOperation {
  id: string; // 操作唯一ID
  commandId: string; // 对应的命令ID，如 "node.addChild"
  params: unknown[]; // 命令参数

  // 用户友好的描述
  description: string; // 用户可读描述，如 "为'产品规划'创建5个子节点"

  // 预览信息
  preview?: {
    summary: string; // 简短总结
  };

  // AI 元数据
  metadata?: {
    confidence: number; // 置信度 0-1
    reasoning?: string; // 推理过程
  };
}
```

### 2.2 AI Operation Batch（批量操作）

```typescript
/**
 * AI 返回的批量操作建议
 * 会被转换为一个 CompositeCommand 执行
 */
interface AIOperationBatch {
  id: string; // 批次唯一ID
  description: string; // 整体描述
  operations: AIOperation[]; // 操作列表（按顺序执行）

  // 批次级别的预览
  preview?: {
    totalOperations: number;
    affectedNodes: string[]; // 受影响的节点ID列表
  };
}
```

## 3. CompositeCommand 集成

### 3.1 使用已实现的 CompositeCommand

我们已经实现了 `createCompositeCommand` 工厂函数，详见 [CompositeCommand 设计文档](../design/composite-command.md)。

AI 批量操作可以直接使用这个功能：

```typescript
import { createCompositeCommand } from "@/domain/commands/composite";

// 创建组合命令
const compositeCommand = createCompositeCommand(
  batch.description,
  batch.operations.map((op) => ({
    commandId: op.commandId,
    params: op.params,
  }))
);

// 执行
await root.commandManager!.executeCommand(
  {
    commandId: compositeCommand.id,
    params: [],
  },
  compositeCommand
);
```

### 3.2 执行流程

```
AIOperationBatch
  ↓
创建 CompositeCommand
  ↓
执行 handler
  ↓
顺序执行所有子命令
  ↓
收集所有 EditorAction[]
  ↓
组合成一个 HistoryItem
  ↓
通过 HistoryManager.execute()
  ↓
一次 undo 撤销所有
```

### 3.3 关键优势

1. **原子性**: 所有子命令的 actions 在同一个 HistoryItem 中
2. **可撤销**: 一次 undo 撤销整个批次
3. **类型安全**: 完全复用现有的 command 参数类型
4. **无缝集成**: 不需要修改现有的 command 系统

## 4. 可用命令清单

### 4.1 已有命令映射

基于现有的命令系统，AI 可以返回以下操作：

```typescript
// 节点创建
{
  commandId: "node.addChild",
  params: [parentId, position?, title?]
}

{
  commandId: "node.addSiblingAbove",
  params: [nodeId, title?]
}

{
  commandId: "node.addSiblingBelow",
  params: [nodeId, title?]
}

// 节点更新
{
  commandId: "node.updateTitle",
  params: [nodeId, newTitle]
}

{
  commandId: "node.updateNote",
  params: [nodeId, newNote]
}

// 节点移动
{
  commandId: "node.move",
  params: [nodeId, targetParentId, position]
}

{
  commandId: "node.moveUp",
  params: [nodeId]
}

{
  commandId: "node.moveDown",
  params: [nodeId]
}

// 节点删除
{
  commandId: "node.delete",
  params: [nodeId]
}

// 导航
{
  commandId: "navigation.setCurrentNode",
  params: [nodeId]
}
```

### 4.2 批量创建子节点树 ✅

**已实现**: `node.addChildTrees`

```typescript
// 批量创建子节点（扁平列表）
{
  commandId: "node.addChildTrees",
  params: [
    parentId,
    [
      { title: "节点1" },
      { title: "节点2", note: "笔记" },
      { title: "节点3" }
    ]
  ]
}

// 创建多级节点树
{
  commandId: "node.addChildTrees",
  params: [
    parentId,
    [
      {
        title: "前端",
        children: [
          { title: "React" },
          { title: "TypeScript" }
        ]
      },
      {
        title: "后端",
        children: [
          { title: "Next.js" },
          { title: "Supabase" }
        ]
      }
    ]
  ]
}
```

**接口定义**:

```typescript
interface NodeTree {
  title: string;
  note?: string;
  children?: NodeTree[];
}
```

**特性**:

- 支持扁平列表（批量创建子节点）
- 支持嵌套结构（创建多级树）
- 自动选中第一个创建的节点
- 一次 undo 撤销所有节点

## 5. AI 侧实现

### 5.1 提示词设计

系统提示词现在可以从 `commandRegistry` 动态生成，确保与实际可用命令保持同步。

**生成方式**:

```typescript
import { generateAICommandsPrompt } from "@/domain/command-registry";

// 生成可用命令列表（默认包含 node 和 navigation 分类）
const availableCommands = generateAICommandsPrompt(["node"]);

const SYSTEM_PROMPT = `
你是一个思维导图编辑助手。

## 当前节点上下文
{{nodeContext}}

## 可用命令

${availableCommands}

## NodeTree 接口

对于 node.addChildTrees 命令，children 参数格式：

\`\`\`typescript
interface NodeTree {
  title: string;        // 节点标题
  note?: string;        // 节点笔记（可选）
  children?: NodeTree[]; // 子节点（可选，支持递归）
}
\`\`\`

## 返回格式

当用户请求执行操作时，按以下格式返回：

1. **自然语言说明**：先用自然语言解释要执行的操作及其目的
2. **操作概要**：简要说明将执行哪些操作
3. **操作定义**：使用 `<operations>` 标签包裹 JSON 格式的操作列表

**格式示例**:

```

好的！我为你的产品规划创建了5个关键步骤，涵盖了产品规划的核心环节。

**操作概要**：

- 创建 5 个子节点（市场调研、需求分析、竞品分析、功能规划、时间规划）

<operations>
\`\`\`json
{
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChildTrees",
      "params": ["abc123", [
        {"title": "市场调研"},
        {"title": "需求分析"},
        {"title": "竞品分析"},
        {"title": "功能规划"},
        {"title": "时间规划"}
      ]],
      "description": "为'产品规划'创建5个规划步骤",
      "preview": {
        "summary": "将创建5个新子节点"
      },
      "metadata": {
        "confidence": 0.95,
        "reasoning": "基于产品规划的常见步骤"
      }
    }
  ]
}
\`\`\`
</operations>
```

**重要**:

- 操作定义必须放在回复的最后
- 使用 `<operations>` 和 `</operations>` 标签包裹 JSON 代码块
- 在操作定义前应包含操作概要说明
- 这样设计是为了：
  - 流式输出时，先显示完整的自然语言说明
  - 前端遇到 `<operations>` 标签时切换为确认卡片样式
  - 避免显示不完整的 JSON 造成困扰

## 原则

1. **优先使用 node.addChild**: 创建单层子节点时，每个节点使用单独的 \`node.addChild\` 命令，这样用户可以选择性执行
2. **多层级使用 node.addChildTrees**: 只有需要创建包含子节点的树结构时才使用 \`node.addChildTrees\`
3. **一棵树一个 operation**: 使用 \`node.addChildTrees\` 时，每棵独立的子树应该是一个单独的 operation，便于用户细粒度控制
4. **保持顺序**: 如果操作有依赖关系，按正确顺序排列
5. **友好说明**: 在 JSON 前后添加自然语言说明，解释操作的目的
6. **细粒度控制**: 尽量将操作拆分成独立的单元，让用户有更多选择空间

### 操作粒度策略

为了给用户更好的控制体验，AI 应遵循以下粒度策略：

**单层子节点场景**:

- 使用多个 `node.addChild` 操作，每个节点一个 operation
- 用户可以选择性地接受部分建议
- 例如：创建 5 个子节点 → 5 个独立的 operation

**多层级结构场景**:

- 使用 `node.addChildTrees`，但每棵逻辑独立的子树是一个 operation
- 保持树结构的完整性，同时允许用户选择不同的子树
- 例如：创建 3 个模块（每个含子功能）→ 3 个独立的 operation

**反面示例（不推荐）**:

```json
// 不好：所有节点打包成一个 operation，用户无法细粒度选择
{
  "id": "op-1",
  "commandId": "node.addChildTrees",
  "params": [
    "parent-id",
    [
      { "title": "节点1" },
      { "title": "节点2" },
      { "title": "节点3" },
      { "title": "节点4" },
      { "title": "节点5" }
    ]
  ],
  "description": "创建5个子节点"
}
```

**推荐示例**:

```json
// 好：每个节点一个 operation，用户可以选择
{
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChild",
      "params": ["parent-id", "节点1"],
      "description": "创建'节点1'"
    },
    {
      "id": "op-2",
      "commandId": "node.addChild",
      "params": ["parent-id", "节点2"],
      "description": "创建'节点2'"
    }
    // ... 更多独立操作
  ]
}
```

`;

````

### 5.2 API 实现

```typescript
// app/api/ai/chat/route.ts
export async function POST(req: Request) {
  const { messages, nodeContext, modelKey } = await req.json();

  const systemPrompt = buildSystemPrompt(nodeContext);

  const response = await streamText({
    model: getModel(modelKey),
    system: systemPrompt,
    messages,
  });

  return response.toDataStreamResponse();
}
````

**说明**:

- AI 会在回复内容中直接包含 JSON 格式的操作列表
- 前端解析 markdown 中的 ```json 代码块
- 用户可以选择执行哪些操作
- 不使用 AI SDK 的 tools 功能，保持简单灵活

## 6. 后端流程

> **注**: 前端相关实现（包括解析 AI 返回、流式输出处理、执行器实现等）已移至 [AI 操作 UI 设计](./ai-operations-ui-design.md) 文档的第 3 章节。

本章节聚焦于后端的 AI 相关逻辑，前端的操作执行、UI 组件等内容请参考 UI 设计文档。

## 7. 典型使用场景

### 7.1 场景1: 批量创建子节点

**用户输入**: "帮我为'产品规划'生成5个规划步骤"

**AI 返回**:

```
好的！我为你的产品规划创建了5个关键步骤，涵盖了产品规划的核心环节。

**操作概要**：
- 创建 5 个子节点（市场调研、需求分析、竞品分析、功能规划、时间规划）

<operations>
\`\`\`json
{
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChildTrees",
      "params": [
        "node-123",
        [
          { "title": "市场调研" },
          { "title": "需求分析" },
          { "title": "竞品分析" },
          { "title": "功能规划" },
          { "title": "时间规划" }
        ]
      ],
      "description": "为'产品规划'创建5个规划步骤",
      "preview": {
        "summary": "将创建5个新子节点"
      },
      "metadata": {
        "confidence": 0.95
      }
    }
  ]
}
\`\`\`
</operations>
```

**执行流程**:

1. 用户点击"应用"
2. 执行 `node.addChildTrees` 命令
3. 命令返回 5 个 `AddNodeAction` 和 1 个 `SetCurrentNodeAction`
4. 所有 action 组合成一个 `HistoryItem`
5. 一次 undo 可以撤销所有 5 个节点的创建

### 7.2 场景2: 创建多级树

**用户输入**: "展开'技术架构'这个节点，生成完整的技术栈结构"

**AI 返回**:

```
好的！我为你的技术架构生成了一个完整的技术栈结构，这个结构涵盖了一个现代化 Web 应用的主要技术组件。

**操作概要**：
- 创建 3 个一级节点（前端、后端、部署）
- 创建 8 个二级节点（各技术栈组件）

<operations>
\`\`\`json
{
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChildTrees",
      "params": [
        "node-arch",
        [
          {
            "title": "前端",
            "children": [
              { "title": "React" },
              { "title": "TypeScript" },
              { "title": "Tailwind CSS" }
            ]
          },
          {
            "title": "后端",
            "children": [
              { "title": "Next.js" },
              { "title": "Supabase" },
              { "title": "PostgreSQL" }
            ]
          },
          {
            "title": "部署",
            "children": [{ "title": "Vercel" }, { "title": "Docker" }]
          }
        ]
      ],
      "description": "为'技术架构'创建完整的技术栈结构",
      "preview": {
        "summary": "将创建3个一级节点和8个二级节点"
      },
      "metadata": {
        "confidence": 0.92
      }
    }
  ]
}
\`\`\`
</operations>
```

**执行**:

- 执行 `node.addChildTrees` 命令
- 递归创建所有节点
- 返回 11 个 `AddNodeAction`
- 一次 undo 撤销整棵树

### 7.3 场景3: 复杂重组操作

**用户输入**: "把这些节点按重要性排序，并把相关的归到一起"

**AI 返回** (批量操作):

```
明白了！我会帮你重组这些节点，按照重要性创建分组并重新组织结构。

**操作概要**：
- 创建 1 个分组节点（"重要功能"）
- 移动 2 个节点到新分组

<operations>
\`\`\`json
{
  "id": "batch-456",
  "description": "重组节点结构",
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChild",
      "params": ["node-parent", 0, "重要功能"],
      "description": "创建分组'重要功能'",
      "metadata": {
        "confidence": 0.85
      }
    },
    {
      "id": "op-2",
      "commandId": "node.move",
      "params": ["node-a", "node-group-1", 0],
      "description": "移动'功能A'到'重要功能'",
      "metadata": {
        "confidence": 0.88
      }
    },
    {
      "id": "op-3",
      "commandId": "node.move",
      "params": ["node-b", "node-group-1", 1],
      "description": "移动'功能B'到'重要功能'",
      "metadata": {
        "confidence": 0.88
      }
    }
  ],
  "preview": {
    "summary": "将创建1个分组节点并移动2个节点"
  }
}
\`\`\`
</operations>
```

**执行流程**:

1. 用户预览批量操作
2. 点击"全部应用"
3. **分组阶段**: 所有操作都是 `undoable=true` (节点操作)
4. **执行阶段**:
   - 将 3 个操作组合成 `CompositeCommand`
   - 顺序执行并收集所有 actions
   - 组合成一个 `HistoryItem`
5. **结果**: 一次 undo 撤销整个重组操作

### 7.4 场景4: 混合操作（创建+保存）

**用户输入**: "创建这些节点，然后保存"

**AI 返回** (混合 undoable 和 non-undoable):

```
好的！我会为你创建这些节点，并在创建成功后自动保存到云端。

**操作概要**：
- 创建 2 个子节点（任务1、任务2）
- 保存到云端

**执行顺序**：先创建节点，成功后再保存。如果创建失败，保存操作不会执行。

<operations>
\`\`\`json
{
  "id": "batch-789",
  "description": "创建节点并保存",
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChildTrees",
      "params": ["parent-id", [
        { "title": "任务1" },
        { "title": "任务2" }
      ]],
      "description": "创建2个子节点",
      "metadata": {
        "confidence": 0.95
      }
    },
    {
      "id": "op-2",
      "commandId": "global.save",
      "params": [],
      "description": "保存到云端",
      "metadata": {
        "confidence": 1.0
      }
    }
  ],
  "preview": {
    "summary": "将创建2个节点并保存"
  }
}
\`\`\`
</operations>
```

**执行流程**:

1. 用户点击"应用"
2. **分组阶段**:
   - `undoable=true`: `node.addChildTrees` (节点创建)
   - `undoable=false`: `global.save` (系统操作)
3. **执行阶段1** (undoable 操作):
   - 创建 `CompositeCommand` 包含 `node.addChildTrees`
   - 执行并返回 `AddNodeAction[]`
   - 加入历史记录，可以 undo
4. **执行阶段2** (non-undoable 操作):
   - 执行 `global.save`
   - 保存到云端（系统级操作，不可 undo）
5. **优势**:
   - 节点创建失败时，不会触发保存
   - 保存操作不会被包含在 undo 历史中
   - 保证了操作的正确顺序

## 8. 安全性和验证

### 8.1 命令验证

```typescript
/**
 * 验证 AI 操作的合法性
 */
function validateOperation(operation: AIOperation): ValidationResult {
  // 1. 检查命令是否存在
  const command = getCommand(operation.commandId);
  if (!command) {
    return {
      valid: false,
      error: `未知命令: ${operation.commandId}`,
    };
  }

  // 2. 检查节点是否存在
  const root = useMindmapStore.getState();
  const nodeIds = extractNodeIds(operation);
  for (const nodeId of nodeIds) {
    if (!root.currentEditor?.nodes.has(nodeId)) {
      return {
        valid: false,
        error: `节点不存在: ${nodeId}`,
      };
    }
  }

  // 3. 检查前置条件
  if (command.when && !command.when(root, operation.params)) {
    return {
      valid: false,
      error: `命令前置条件不满足`,
    };
  }

  return { valid: true };
}

/**
 * 从参数中提取节点ID（用于验证）
 */
function extractNodeIds(operation: AIOperation): string[] {
  const nodeIds: string[] = [];

  // 根据命令类型提取节点ID
  switch (operation.commandId) {
    case "node.addChild":
    case "node.addChildTrees":
      nodeIds.push(operation.params[0] as string); // parentId
      break;
    case "node.updateTitle":
    case "node.updateNote":
    case "node.delete":
      nodeIds.push(operation.params[0] as string); // nodeId
      break;
    case "node.move":
      nodeIds.push(operation.params[0] as string); // nodeId
      nodeIds.push(operation.params[1] as string); // targetParentId
      break;
    // ... 其他命令
  }

  return nodeIds;
}
```

## 9. 实现状态

### 已完成 ✅

- [x] Command 系统完整实现
- [x] HistoryManager 完整实现
- [x] CompositeCommand 工厂函数实现
- [x] `node.addChildTrees` 命令实现（支持扁平和嵌套）
- [x] 所有基础节点操作命令（add/update/move/delete）
- [x] 所有导航命令
- [x] 完整的 undo/redo 支持

### 待实现 ⏳

- [ ] AI 侧实现（提示词、API）
- [ ] 前端执行器（AIOperationExecutor）
- [ ] 操作验证和安全检查
- [ ] UI 组件集成（详见 [AI 操作 UI 设计](./ai-operations-ui-design.md)）

## 10. 总结

### 10.1 核心优势

1. **完全基于 Command**: 不重复造轮子，复用所有基础设施
2. **原子性保证**: CompositeCommand 确保批量操作的事务性
3. **类型安全**: 完全利用现有的 TypeScript 类型定义
4. **简化实现**: AI 只需返回 `{commandId, params}`，极简设计
5. **一致性**: AI 操作和手动操作完全一致的行为

### 10.2 关键设计点

1. **AIOperation 本质上就是 CommandRun**: 简化为 `{commandId, params, metadata}`
2. **CompositeCommand 是批量操作的关键**: 保证原子性
3. **完全复用现有基础设施**: 无需重新发明
4. **AI 只需了解命令接口**: 提示词更简单清晰

### 10.3 下一步

**后端/核心逻辑**:

1. 实现 AI 提示词和 API
2. 创建 AIOperationExecutor 类
3. 添加操作验证机制

**UI 设计**: 4. 详见 [AI 操作 UI 设计](./ai-operations-ui-design.md)

这个设计更加优雅、简洁，充分利用了现有的架构优势！
