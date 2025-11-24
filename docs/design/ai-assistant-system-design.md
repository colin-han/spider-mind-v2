# AI 助手系统设计文档

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-16
- 最后更新：2025-11-24
- 相关文档：
  - [Command 层架构设计](./command-layer-design.md)
  - [数据库设计](./database-schema.md)
  - [ID 设计规范](./id-design.md)
  - [命令参考手册](./command-reference.md)

## 关键概念

| 概念              | 定义                                                 | 示例/说明                                                      |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| AIMessage         | 持久化的 AI 对话消息，包含 AI SDK 标准字段和同步字段 | 用户消息、AI 响应，存储在 IndexedDB 和 Supabase                |
| AINodeContext     | 传递给 AI 的节点上下文信息                           | 包含当前节点（含 note）、父节点链（含 note）、兄弟节点、子节点 |
| AIOperation       | AI 返回的操作建议，本质是待执行的 Command            | `{commandId: "node.addChild", params: [...]}`                  |
| operationsApplied | 消息元数据标记，表示用户是否已执行该消息中的操作     | 防止重复执行，状态持久化                                       |
| dirty flag        | 同步状态标记，表示数据是否需要同步到云端             | `dirty: true` 表示待同步                                       |

## 概述

本设计实现了思维导图的 AI 助手系统，包括：对话历史持久化、节点操作执行、操作状态管理三个核心模块，让用户能够与 AI 进行连续性对话，并通过 AI 建议执行节点操作。

## 背景和动机

1. **对话连续性需求** - 用户期望能够在同一节点继续之前的对话，AI 能理解上下文
2. **操作执行控制** - AI 建议的操作需要用户确认和选择性执行
3. **数据持久化** - 对话历史需要跨会话保存，支持本地和云端同步
4. **状态管理** - 避免重复执行操作，记录操作执行状态

## 设计目标

- 实现节点级别的对话隔离和持久化
- 基于 Command 系统复用现有操作能力
- 支持选择性执行 AI 建议的操作
- 操作执行后自动通知 LLM，保持对话上下文完整
- 本地优先，支持云端同步

## 快速参考

### 核心文件

```
# 类型定义
src/lib/types/ai.ts                           # AIMessage 类型定义
src/domain/ai/types.ts                        # AIOperation 类型定义

# 对话持久化
src/lib/ai/conversation-persistence.ts        # 对话持久化服务
src/domain/actions/add-ai-message.ts          # 添加消息 Action
src/domain/actions/update-ai-message-metadata.ts  # 更新消息元数据 Action

# AI 交互
src/lib/ai/system-prompts.ts                  # LLM 系统提示词
src/lib/ai/node-context.ts                    # 节点上下文构建
src/lib/ai/parse-operations.ts                # 操作解析
src/lib/ai/parse-suggestions.ts               # 建议解析（旧格式）

# 操作执行
src/domain/ai/executor.ts                     # 操作执行器
src/domain/ai/validation.ts                   # 操作验证
src/domain/ai/param-transformer.ts            # 参数转换（UUID → short_id）

# UI 组件
src/components/ai/ai-chat-panel.tsx           # AI 聊天面板组件
src/components/ai/message-bubble.tsx          # 消息气泡组件
src/components/ai/operations-panel.tsx        # 操作面板组件
src/components/ai/suggestion-actions.tsx      # 建议操作组件（旧格式）

# 配置
src/lib/config/ai-models.ts                   # AI 模型配置
src/domain/commands/ai/ai-assist.ts           # AI 辅助命令

# API 路由
src/app/api/ai/chat/route.ts                  # AI 聊天 API 端点
```

### 常用操作

```typescript
// 加载对话历史
const messages = await loadConversation(nodeUUID);

// 构建节点上下文（包含 note）
const context = buildNodeContext(nodeId);
// context.currentNode.note - 当前节点的笔记
// context.parentChain[].note - 父节点的笔记

// 创建 AI 消息
const message = createAIMessage(id, role, parts, nodeId, mindmapId);

// 同步到云端
await syncAIMessages(mindmapId);

// 解析 AI 响应中的操作
const operations = extractOperations(aiResponse);

// 验证操作
const validationResult = validateOperations(operations);

// 转换操作参数（UUID → short_id）
const transformedOps = transformOperationsParams(operations);

// 执行 AI 操作
const executor = createAIOperationExecutor();
await executor.executeSelected(transformedOps, "执行 AI 建议");
```

## 设计方案

### 架构概览

```
用户输入
  ↓
AI Chat Panel ←→ useChat Hook (AI SDK v5)
  ↓
/api/ai/chat (Next.js API Route)
  ↓
LLM API (流式响应)
  ↓
Message Bubble (渲染消息)
  ↓
检测 <operations> 标签 → 解析操作
  ↓
Operations Panel (展示操作建议)
  ↓
用户选择执行
  ↓
验证操作 (validateOperations)
  ↓
转换参数 (UUID → short_id)
  ↓
AIOperationExecutor → CompositeCommand → Command System → Action Layer
  ↓
更新 metadata (operationsApplied=true)
  ↓
发送确认消息给 LLM
  ↓
IndexedDB (本地存储)
  ↓
Supabase (云端同步)
```

### 详细设计

#### 1. 数据模型

##### AIMessage

```typescript
interface AIMessage {
  // AI SDK 标准字段
  id: string;
  role: "user" | "assistant";
  parts: UIMessage["parts"];

  // 持久化字段
  nodeId: string; // 节点 UUID
  mindmapId: string; // 思维导图 UUID
  createdAt: string; // ISO 8601

  // 同步字段
  dirty: boolean;
  local_id: string;
  server_id?: string;
  synced_at?: string;

  // 元数据
  metadata?: {
    operations?: unknown[];
    operationsApplied?: boolean;
    appliedOperationIds?: string[];
    appliedAt?: string;
  };
}
```

**设计决策**：使用 UUID 而非 short_id 作为 nodeId/mindmapId，符合双 ID 机制的内部使用规范。

##### AIOperation

```typescript
interface AIOperation {
  id: string;
  commandId: string; // 如 "node.addChild"
  params: unknown[]; // 命令参数
  description: string; // 用户可读描述

  preview?: {
    summary: string;
  };

  metadata?: {
    confidence: number; // 0-1
    reasoning?: string;
  };
}
```

#### 2. IndexedDB Schema

```typescript
ai_messages: {
  key: string;  // message.id
  value: AIMessage;
  indexes: {
    "by-node": string;     // nodeId
    "by-mindmap": string;  // mindmapId
    "by-created": string;  // createdAt
  };
};
```

#### 3. Supabase Schema

```sql
CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES mindmap_nodes(id),
  mindmap_id uuid NOT NULL REFERENCES mindmaps(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- RLS 策略：用户只能访问自己的消息
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
```

#### 4. 核心流程

##### 对话加载流程

```
节点切换
  ↓
loadConversation(nodeUUID)
  ↓
优先从 IndexedDB 加载
  ↓
若本地无数据 → 从 Supabase 拉取并缓存
  ↓
按时间排序
  ↓
转换为 UIMessage[] 格式
  ↓
setMessages() 更新 useChat
```

##### 操作执行流程

```
用户选择操作并点击"应用"
  ↓
OperationsPanel.handleAccept()
  ↓
转换参数 (transformOperationsParams)
  ├─ UUID → short_id（命令系统使用 short_id）
  └─ 保持其他参数不变
  ↓
验证操作 (validateOperations)
  ├─ 检查命令是否存在
  ├─ 检查节点是否存在
  └─ 验证参数合法性
  ↓
执行操作 (executeSelected)
  ├─ 按 undoable 属性分组
  ├─ undoable 操作 → CompositeCommand（一次 undo 撤销）
  └─ non-undoable 操作 → 依次执行（如 save）
  ↓
执行成功
  ↓
onAccept 回调
  ↓
AIChatPanel.handleOperationsApplied()
  ├─ 更新消息 metadata (operationsApplied=true, appliedOperationIds, appliedAt)
  ├─ 更新本地 metadata 映射
  └─ 发送确认消息给 LLM（"我已执行以下操作：..."）
  ↓
LLM 收到确认，后续对话有上下文
```

##### 操作取消流程

```
用户点击"取消"
  ↓
OperationsPanel.handleReject()
  ↓
onReject 回调
  ↓
AIChatPanel.handleOperationsCancelled()
  ├─ 更新消息 metadata (operationsApplied=true, operationsCancelled=true, cancelledAt)
  ├─ 更新本地 metadata 映射
  └─ 发送取消消息给 LLM（"我已取消了你建议的 N 个操作"）
  ↓
LLM 收到取消通知
```

##### 同步流程

```
用户点击保存
  ↓
save command 执行
  ↓
syncAIMessages(mindmapId)
  ↓
查询所有 dirty=true 的消息
  ↓
批量插入 Supabase
  ↓
更新本地记录 (dirty=false, server_id)
```

#### 5. 参数转换机制

AI 返回的操作中使用的是 UUID（用于数据库持久化），但命令系统内部使用 short_id 进行节点操作。因此需要一个参数转换层。

##### transformOperationsParams()

```typescript
function transformOperationsParams(operations: AIOperation[]): AIOperation[] {
  return operations.map((op) => {
    // 根据命令类型转换参数
    if (isNodeCommand(op.commandId)) {
      // 节点命令：第一个参数（节点ID）从 UUID 转换为 short_id
      const params = [...op.params];
      if (params[0] && typeof params[0] === "string") {
        params[0] = convertUUIDToShortId(params[0]);
      }
      return { ...op, params };
    }
    return op;
  });
}
```

**关键点**：

- 只转换节点相关命令的第一个参数（父节点 ID）
- NodeTree 对象中的节点不需要 ID（系统自动生成）
- 转换失败时抛出错误，防止执行无效操作

#### 6. 操作验证

在执行操作前需要验证操作的有效性，确保：

1. 命令存在于命令注册表
2. 节点存在于当前编辑器
3. 参数格式正确

##### validateOperations()

```typescript
function validateOperations(operations: AIOperation[]): ValidationResult {
  for (const op of operations) {
    // 1. 检查命令是否存在
    const command = getCommand(op.commandId);
    if (!command) {
      return { valid: false, error: `Unknown command: ${op.commandId}` };
    }

    // 2. 检查节点是否存在（针对节点命令）
    if (isNodeCommand(op.commandId)) {
      const nodeId = op.params[0];
      if (!nodeExists(nodeId)) {
        return { valid: false, error: `Node not found: ${nodeId}` };
      }
    }
  }

  return { valid: true };
}
```

#### 7. AI 模型配置

系统支持多种 AI 模型，通过配置文件集中管理。

##### AIModelConfig

```typescript
interface AIModelConfig {
  provider: string; // 提供商：openai, anthropic, deepseek 等
  name: string; // 显示名称
  model: LanguageModel; // AI SDK 的模型实例
  description: string; // 模型描述
  cost: "极低" | "低" | "中" | "高"; // 成本级别
}
```

**支持的模型**：

- GPT-4 Turbo (OpenAI)
- GPT-3.5 Turbo (OpenAI)
- Claude 3.5 Sonnet (Anthropic)
- Claude 3 Haiku (Anthropic)
- DeepSeek Chat
- Moonshot v1
- Qwen Turbo

#### 8. LLM 提示词设计

##### 动态命令生成

系统提示词中的可用命令列表是从命令注册表动态生成的，确保文档与实现同步。

```typescript
const availableCommands = generateAICommandsPrompt(["node", "navigation"]);
```

**优势**：

- 自动包含新增命令
- 避免文档与代码不一致
- 支持按分类过滤命令

##### 操作粒度策略

**原则**：优先使用细粒度操作，让用户有更多选择空间

1. **单层子节点** - 每个节点使用单独的 `node.addChild`
2. **多层级结构** - 每棵独立子树使用一个 `node.addChildTrees`

**示例**：创建 3 个子节点

```json
// 推荐：3 个独立操作
{
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChild",
      "params": ["b1520189-176f-4592-b64a-bb60d7420836", null, "节点1"]
    },
    {
      "id": "op-2",
      "commandId": "node.addChild",
      "params": ["b1520189-176f-4592-b64a-bb60d7420836", null, "节点2"]
    },
    {
      "id": "op-3",
      "commandId": "node.addChild",
      "params": ["b1520189-176f-4592-b64a-bb60d7420836", null, "节点3"]
    }
  ]
}

// 不推荐：打包成一个操作
{
  "operations": [
    {"id": "op-1", "commandId": "node.addChildTrees", "params": ["parentId", [...]]}
  ]
}
```

**注意**：AI 必须使用上下文中提供的完整 UUID，禁止使用占位符或短ID。

##### 返回格式

````
自然语言说明
  ↓
操作概要
  ↓
<operations>
```json
{ "operations": [...] }
````

</operations>
```

**解析机制**：

- `hasOperationsTag()` - 检测流式输出中是否包含 `<operations>` 标签
- `hasCompleteOperations()` - 检测是否接收完整的 `</operations>` 结束标签
- `extractExplanation()` - 提取标签前的说明文本
- `extractOperations()` - 解析 JSON 获取操作列表

**流式输出优化**：

- 前端检测到 `<operations>` 标签时立即切换为操作面板
- 避免显示不完整的 JSON 造成困扰
- 在 `</operations>` 完成后才开始解析和验证操作

## 实现要点

### 1. Action 设计

- `AddAIMessageAction` - 添加新消息，无撤销支持，设置 dirty=true
- `UpdateAIMessageMetadataAction` - 更新消息 metadata，保持 dirty=true
- 消息只新增不修改，避免冲突

### 2. 参数转换实现

- `transformOperationsParams()` - UUID → short_id 转换
- `convertUUIDToShortId()` - 从 store 中查找节点的 short_id
- 只转换节点命令的第一个参数（节点 ID）
- NodeTree 中的节点不需要转换（系统自动生成）

### 3. 操作验证实现

- `validateOperations()` - 执行前验证
- 检查命令是否在注册表中
- 检查节点是否存在于当前编辑器
- 验证失败时中断执行并提示用户

### 4. 状态管理

- `messageMetadataMap` - 映射 messageId 到 metadata（本地状态）
- `operationsPanelVisible` - 控制面板显示
- `operationsAlreadyApplied` - 防止重复执行
- `operationsCancelled` - 标记用户取消

### 5. 类型安全

- UIMessagePart[] 转换为 Json 类型（Supabase）
- 使用索引访问属性（`metadata?.["appliedOperationIds"]`）
- 数组访问使用非空断言（验证后）
- AIOperation 类型严格定义参数结构

### 6. 同步策略

- 本地优先，写操作只写 IndexedDB
- 保存时批量同步到 Supabase
- AI 消息同步失败不影响主流程
- 消息只新增不更新，避免冲突

### 7. UI 交互优化

- 流式输出时先显示说明文本
- 检测到 `<operations>` 标签后切换显示
- 操作面板默认全选，支持多选和单选
- 执行中禁用操作，显示 loading 状态
- 执行后显示成功状态和已应用标记

### 8. 错误处理

- 转换失败：提示节点不存在
- 验证失败：显示具体错误信息
- 执行失败：toast 提示并保持面板可用
- 网络失败：对话历史降级到本地

## 使用示例

### 加载和保存对话

```typescript
// 组件挂载时加载历史
useEffect(() => {
  const messages = await loadConversation(nodeUUID);
  setInitialMessages(messages);
}, [nodeId]);

// 消息完成时保存
onFinish: async ({ message }) => {
  const aiMessage = createAIMessage(
    message.id,
    "assistant",
    message.parts,
    nodeId,
    mindmapId
  );
  await store.acceptActions([new AddAIMessageAction(aiMessage)]);
};
```

### 转换和验证操作

```typescript
// 1. 转换参数（UUID → short_id）
const transformedOps = transformOperationsParams(operations);

// 2. 验证操作
const validationResult = validateOperations(transformedOps);
if (!validationResult.valid) {
  toast.error(`验证失败: ${validationResult.error}`);
  return;
}

// 3. 执行操作
const executor = createAIOperationExecutor();
await executor.executeSelected(transformedOps, "执行 AI 建议");
```

### 处理操作执行回调

```typescript
const handleOperationsApplied = async (messageId, selectedIds, operations) => {
  // 1. 更新 metadata
  await store.acceptActions([
    new UpdateAIMessageMetadataAction(messageId, {
      operationsApplied: true,
      appliedOperationIds: selectedIds,
      appliedAt: new Date().toISOString(),
    }),
  ]);

  // 2. 更新本地 metadata 映射
  setMessageMetadataMap((prev) => {
    const newMap = new Map(prev);
    newMap.set(messageId, {
      ...prev.get(messageId),
      operationsApplied: true,
      appliedOperationIds: selectedIds,
      appliedAt: new Date().toISOString(),
    });
    return newMap;
  });

  // 3. 发送确认消息
  const selectedOps = operations.filter((op) => selectedIds.includes(op.id));
  const confirmText = `我已执行以下操作：\n${selectedOps.map((op) => `- ${op.description}`).join("\n")}`;
  sendMessage({ text: confirmText });
};
```

### 处理操作取消回调

```typescript
const handleOperationsCancelled = async (messageId, operations) => {
  // 1. 更新 metadata 标记为已取消
  await store.acceptActions([
    new UpdateAIMessageMetadataAction(messageId, {
      operationsApplied: true,
      operationsCancelled: true,
      cancelledAt: new Date().toISOString(),
    }),
  ]);

  // 2. 更新本地 metadata 映射
  setMessageMetadataMap((prev) => {
    const newMap = new Map(prev);
    newMap.set(messageId, {
      ...prev.get(messageId),
      operationsApplied: true,
      operationsCancelled: true,
      cancelledAt: new Date().toISOString(),
    });
    return newMap;
  });

  // 3. 发送取消消息
  const cancellationText = `我已取消了你建议的 ${operations.length} 个操作。`;
  sendMessage({ text: cancellationText });
};
```

## 设计决策

### 1. 单表设计 vs 对话表+消息表

**选择**：单表（ai_messages）

**理由**：

- 简化数据模型，无需管理对话实体
- 通过 nodeId 索引即可查询特定节点的所有消息
- 减少 JOIN 操作，查询性能更好

### 2. 基于 Command 系统 vs 独立操作系统

**选择**：复用 Command 系统

**理由**：

- 复用已有的 command 和 action
- AI 操作与用户手动操作使用同一套基础设施
- 通过 CompositeCommand 保证原子性和可撤销性

### 3. 操作粒度策略

**选择**：优先细粒度操作

**理由**：

- 用户可以选择性接受部分建议
- 更好的控制体验
- 避免全有或全无的限制

### 4. 参数转换策略

**选择**：在操作执行前转换参数（UUID → short_id）

**理由**：

- AI 对话使用 UUID（数据库持久化标准）
- 命令系统使用 short_id（内部操作标准）
- 转换层解耦两个系统
- 转换失败能及时发现并报错

**替代方案**：让命令系统同时支持 UUID 和 short_id

- **未采用原因**：增加命令系统复杂度，破坏单一职责原则

### 5. 操作验证策略

**选择**：执行前验证所有操作

**理由**：

- 提前发现错误，避免部分执行
- 给用户明确的错误提示
- 保护系统不执行非法操作

**验证内容**：

- 命令是否存在
- 节点是否存在
- 参数类型是否正确

### 6. 确认消息策略

**选择**：自动发送用户消息告知 LLM

**理由**：

- 保持对话上下文完整
- LLM 知道用户执行了哪些操作
- 后续对话更加连贯

### 7. 取消操作策略

**选择**：取消时也发送消息并更新 metadata

**理由**：

- 让 LLM 知道用户拒绝了建议
- 避免 LLM 重复提出相同建议
- 保持对话连续性

**实现方式**：

- 设置 `operationsApplied=true`（表示用户已处理）
- 同时设置 `operationsCancelled=true`（表示是取消而非执行）

## 替代方案

### 1. 使用对话 ID 而非节点 ID 索引

**未采用原因**：

- 需要额外管理对话生命周期
- 同一节点可能有多个对话，增加复杂性
- 不符合"一个节点一个对话历史"的用户心智模型

### 2. 实时同步（每次消息立即同步）

**未采用原因**：

- 增加网络请求开销
- 离线场景处理复杂
- 批量同步更高效

### 3. 操作预览可视化（树形图预览）

**未采用原因**：

- 系统有完善的 undo 能力
- 执行速度快，预览价值有限
- 增加实现复杂度

### 4. 命令系统同时支持 UUID 和 short_id

**未采用原因**：

- 增加命令系统复杂度
- 破坏单一职责原则
- 参数转换层更清晰

### 5. 不验证操作直接执行

**未采用原因**：

- 可能导致部分执行失败
- 错误信息不清晰
- 用户体验差

### 6. 取消操作时不通知 LLM

**未采用原因**：

- LLM 不知道用户拒绝了建议
- 可能重复提出相同建议
- 对话上下文不完整

## FAQ

**Q: 为什么 node.addChild 的参数是 [parentId, null, title] 而不是 [parentId, title]？**

A: `node.addChild` 命令的参数顺序是 `[parentId, position?, title?]`，第二个参数是插入位置。使用 `null` 表示默认位置（末尾），第三个参数才是标题。

**Q: 如何避免用户重复执行同一组操作？**

A: 通过消息的 `metadata.operationsApplied` 字段标记。执行后设置为 true，MessageBubble 检测到此标记后不再显示操作面板，而是显示"已执行 N 个操作"。

**Q: 操作执行失败怎么办？**

A: 失败时 toast 提示错误，不更新 metadata，面板保持可用状态。用户可以重新尝试或取消。由于有 undo 能力，即使部分成功也可以撤销。

**Q: 同步冲突如何处理？**

A: AI 消息只有新增，没有更新，不会产生冲突。同步时批量插入新消息，更新本地 server_id。

**Q: AI 能看到节点的笔记（note）吗？**

A: 是的。`buildNodeContext` 函数会为 `currentNode` 和 `parentChain` 中的每个节点提取 note 字段。AI 可以根据当前节点和父节点的笔记内容生成更精准的建议。兄弟节点和子节点只包含标题，不包含笔记，以控制上下文大小。

**Q: 为什么需要参数转换（UUID → short_id）？**

A: AI 对话持久化使用 UUID（数据库标准），但命令系统内部使用 short_id 进行节点操作（符合 ID 设计规范）。参数转换层解耦了两个系统，保持各自的设计一致性。

**Q: 操作验证失败会怎样？**

A: 验证失败时会立即中断执行，显示具体错误信息（如"节点不存在"或"未知命令"），不会执行任何操作。用户可以查看错误后重试或取消。

**Q: 用户取消操作后会发生什么？**

A: 系统会：1）更新消息 metadata 标记为已取消；2）发送取消消息给 LLM；3）隐藏操作面板并显示"已取消"状态。LLM 会知道用户拒绝了建议，避免重复提出相同建议。

**Q: 如何保证操作原子性？**

A: 所有 undoable 操作被组合成一个 CompositeCommand 执行，任何一个失败都会回滚所有操作。Non-undoable 操作（如 save）在 undoable 操作成功后才依次执行。

**Q: 支持哪些 AI 模型？**

A: 当前支持 GPT-4 Turbo、GPT-3.5 Turbo、Claude 3.5 Sonnet、Claude 3 Haiku、DeepSeek Chat、Moonshot v1、Qwen Turbo 等模型，通过配置文件统一管理。

## 参考资料

- [AI SDK v5 文档](https://ai.vercel.com/docs)
- [idb 库文档](https://github.com/jakearchibald/idb)
- [Supabase RLS 文档](https://supabase.com/docs/guides/auth/row-level-security)

## 修订历史

| 日期       | 版本 | 修改内容                                                                                                                           | 作者        |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2025-11-24 | 1.2  | 补充参数转换机制、操作验证、取消操作流程、AI 模型配置、动态命令生成、流式输出优化、UI 交互细节等实现内容，使文档与代码实现完全一致 | Claude Code |
| 2025-11-16 | 1.1  | 为 currentNode 和 parentChain 添加 note 字段，增强 AI 上下文理解能力                                                               | Claude Code |
| 2025-11-16 | 1.0  | 初始版本，整合对话持久化、操作系统、UI 设计                                                                                        | Claude Code |
