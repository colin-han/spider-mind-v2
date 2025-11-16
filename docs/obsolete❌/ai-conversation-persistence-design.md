# AI 对话历史持久化设计

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-16
- 状态：草稿（待确认）
- 相关文档：
  - [AI Chat 节点编辑能力设计 V2](./ai-node-operations-v2.md)
  - [AI 操作 UI 设计](./ai-operations-ui-design.md)

## 1. 需求分析

### 1.1 核心需求

1. **对话历史持久化**
   - 保存用户与 AI 的交互记录
   - 对话与特定节点关联
   - 切换节点时自动加载对应的对话历史

2. **连续性对话**
   - 用户可以在同一节点上继续之前的对话
   - AI 能够理解上下文，进行深入讨论
   - 支持多轮对话

3. **数据隔离**
   - 不同节点的对话互相独立
   - 切换节点时清晰地切换对话上下文

### 1.2 用户场景

**场景 1：持续深入讨论**

```
1. 用户在"产品规划"节点与 AI 讨论创建子节点
2. AI 建议 5 个规划步骤，用户应用了其中 3 个
3. 用户切换到其他节点工作
4. 稍后返回"产品规划"节点
5. 对话历史完整显示，用户继续问：
   "刚才你建议的另外 2 个步骤，能否详细说明一下？"
6. AI 基于之前的对话上下文回答
```

**场景 2：多节点独立对话**

```
1. 用户在"技术架构"节点讨论技术选型
2. 切换到"产品规划"节点讨论市场策略
3. 两个节点的对话完全独立
4. 切换回"技术架构"节点，继续技术相关的讨论
```

## 2. 数据模型设计

### 2.1 ID 设计说明

根据项目的[双 ID 机制设计](../design/id-design.md)：

- **UUID (id)** - 内部主键，用于数据库关联和外键引用
- **short_id** - 6字符用户可见标识符，用于 URL 和用户界面

**本设计中的 ID 使用规范**：

| 字段          | 使用的 ID 类型            | 说明                           |
| ------------- | ------------------------- | ------------------------------ |
| `nodeId`      | **UUID** (MindmapNode.id) | 内部数据库操作使用 UUID        |
| `mindmapId`   | **UUID** (Mindmap.id)     | 内部数据库操作使用 UUID        |
| `id` (消息ID) | **随机字符串**            | 由 AI SDK 生成，与节点 ID 无关 |

**为什么使用 UUID 而不是 short_id？**

1. ✅ **符合双 ID 机制设计原则**：内部数据库操作使用 UUID
2. ✅ **更高效的索引**：UUID 是数据库主键，查询性能更好
3. ✅ **全局唯一**：UUID 全局唯一，short_id 仅在范围内唯一
4. ✅ **避免歧义**：不需要额外的范围参数来定位节点

### 2.2 核心实体

#### 对话消息 (AIMessage)

```typescript
/**
 * AI 对话消息
 *
 * 基于 AI SDK 的 UIMessage 类型，添加持久化和同步所需字段
 */
interface AIMessage {
  // AI SDK 标准字段
  id: string; // 消息唯一ID（由 AI SDK 生成）
  role: "user" | "assistant"; // 消息角色
  parts: MessagePart[]; // 消息内容部分

  // 扩展字段（持久化相关）
  nodeId: string; // 关联的节点 UUID (MindmapNode.id)
  mindmapId: string; // 关联的思维导图 UUID (Mindmap.id)
  createdAt: string; // 创建时间 (ISO 8601)

  // 同步相关字段
  dirty: boolean; // 是否有未同步的修改
  local_id: string; // 本地消息 ID（与 id 相同，用于同步映射）
  server_id?: string; // Supabase 中的 UUID（同步后填充）
  synced_at?: string; // 最后同步时间 (ISO 8601)

  // 可选字段
  metadata?: {
    // 执行的操作（如果有）
    operations?: AIOperation[];
    // 用户是否应用了操作
    operationsApplied?: boolean;
    // 其他元数据
    [key: string]: unknown;
  };
}

/**
 * 消息内容部分
 */
type MessagePart = TextPart | ImagePart | ToolCallPart | ToolResultPart;

interface TextPart {
  type: "text";
  text: string;
}

// 其他 part 类型根据需要扩展
```

**设计说明**：

- 采用单表设计，所有对话消息存储在一个表中
- 通过 `nodeId`（节点 UUID）索引快速查询特定节点的所有消息
- 消息统计信息（数量、最后更新时间等）可以通过查询实时计算
- `nodeId` 和 `mindmapId` 都使用 UUID，遵循双 ID 机制的内部使用规范
- 同步字段（`dirty`, `local_id`, `server_id`, `synced_at`）用于跟踪云端同步状态

### 2.3 IndexedDB Schema 扩展

在现有的 `MindmapDB` schema 中添加一个新表：

```typescript
export interface MindmapDB extends DBSchema {
  // ... 现有表 ...

  /**
   * AI 对话消息表
   */
  ai_messages: {
    key: string; // message.id
    value: AIMessage;
    indexes: {
      "by-node": string; // nodeId - 用于查询特定节点的所有消息
      "by-mindmap": string; // mindmapId - 用于查询特定思维导图的所有消息
      "by-created": string; // createdAt - 用于按时间排序
    };
  };
}
```

**索引说明**：

- `by-node`：最常用的查询场景，切换节点时快速加载该节点的所有消息
- `by-mindmap`：用于清理整个思维导图的对话历史
- `by-created`：用于按时间顺序排序消息

## 3. 存储策略

### 3.1 遵循 Action 架构

根据项目的[领域层架构设计](../design/domain-layer-architecture.md)，**所有持久化操作必须通过 Action 机制**。这是整个系统更新需存储状态的唯一通路，为将来实现客户端和服务端实时同步做好准备。

**核心原则**：

- ✅ 使用 Action 作为状态变更的单一通道
- ✅ Action 实现双层更新（内存 + 数据库）
- ✅ Action 支持可逆操作（undo/redo）
- ✅ 所有写入操作集中管理

### 3.2 AddAIMessageAction 设计

```typescript
/**
 * AI 消息添加 Action
 *
 * 位置: src/domain/actions/add-ai-message-action.ts
 *
 * 注意：AI 对话消息是交互记录，不需要撤销能力
 */
class AddAIMessageAction implements EditorAction {
  type = "ADD_AI_MESSAGE" as const;

  constructor(public message: AIMessage) {}

  applyToEditorState(draft: EditorState): void {
    // AI 消息不影响编辑器核心状态
    // 无需修改 EditorState
  }

  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void> {
    await db.put("ai_messages", this.message);
  }

  // 不需要 reverse() 方法
  // AI 对话消息是交互记录，不支持撤销
}
```

**设计简化说明**：

- ❌ 不需要 `RemoveAIMessageAction`
- ❌ 不需要 `reverse()` 方法（不支持撤销）
- ❌ 不需要 `BatchAddAIMessagesAction`（暂不需要批量添加）
- ✅ 只保留核心的 `AddAIMessageAction`
- ✅ 通过 Action 机制统一管理持久化操作

### 3.5 写入时机

**重要原则**：流式输出阶段的前端显示是中间状态，不需要存储。只有消息完成后才通过 Action 写入。

**用户消息 - 发送时立即写入**：

```typescript
// 用户发送消息时（在调用 AI API 之前）
const userMessage: AIMessage = {
  id: generateId(),
  role: "user",
  parts: [{ type: "text", text: userInput }],
  nodeId,
  mindmapId,
  createdAt: new Date().toISOString(),
};

const action = new AddAIMessageAction(userMessage);
await store.acceptActions([action]);

// 然后发送到 AI
await sendMessage(userInput);
```

**AI 回复 - 流式完成后写入**：

```typescript
// 在 AI Chat Panel 的 onFinish 回调中
// 此时消息已完成流式输出，内容完整
onFinish: async (message) => {
  const aiMessage: AIMessage = {
    id: message.id,
    role: message.role,
    parts: message.parts, // 完整的消息内容
    nodeId,
    mindmapId,
    createdAt: new Date().toISOString(),
  };

  // 通过 Action 机制写入
  const action = new AddAIMessageAction(aiMessage);
  await store.acceptActions([action]);
};
```

**流式输出期间**：

- ❌ 不需要存储中间状态
- ❌ 不需要 Action 来更新
- ✅ UI 状态由 AI SDK 的 `useChat` hook 管理
- ✅ 前端显示实时流式内容（仅内存中）

### 3.3 数据一致性

**策略**：

- ✅ 使用 Action 机制保证一致性
- ✅ IndexedDB 事务保证原子性
- ✅ 消息保存失败不影响用户体验（仅提示警告）
- ✅ 所有统计信息通过查询实时计算，无需维护一致性

### 3.4 撤销支持

**设计决策**：AI 对话消息**不支持直接撤销**

**理由**：

- 对话是用户与 AI 的交互记录，撤销没有实际意义
- 简化实现，不需要 `reverse()` 方法
- Action 不推入 HistoryManager，直接执行

```typescript
// 直接执行 Action，不推入历史栈
await store.acceptActions([new AddAIMessageAction(message)]);
// 而不是：
// await historyManager.execute([action], "添加 AI 消息");
```

## 4. 加载策略

### 4.1 加载时机

1. **节点切换时**：
   - 用户切换到新节点
   - 自动加载该节点的对话历史

2. **首次打开思维导图时**：
   - 加载当前选中节点的对话历史

### 4.2 加载逻辑

```typescript
/**
 * 加载节点的对话历史
 */
async function loadConversation(nodeId: string): Promise<UIMessage[]> {
  const db = await getDB();

  // 从 ai_messages 表查询该节点的所有消息
  const messages = await db.getAllFromIndex("ai_messages", "by-node", nodeId);

  // 按创建时间排序
  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 转换为 UIMessage 格式
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts,
  }));
}

/**
 * 检查节点是否有对话历史
 */
async function hasConversation(nodeId: string): Promise<boolean> {
  const db = await getDB();
  const messages = await db.getAllFromIndex("ai_messages", "by-node", nodeId);
  return messages.length > 0;
}

/**
 * 获取对话统计信息（如需要）
 */
async function getConversationStats(nodeId: string): Promise<{
  messageCount: number;
  firstMessageAt?: string;
  lastMessageAt?: string;
}> {
  const db = await getDB();
  const messages = await db.getAllFromIndex("ai_messages", "by-node", nodeId);

  if (messages.length === 0) {
    return { messageCount: 0 };
  }

  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    messageCount: messages.length,
    firstMessageAt: messages[0].createdAt,
    lastMessageAt: messages[messages.length - 1].createdAt,
  };
}
```

### 4.3 性能优化

1. **分页加载**（可选，未来优化）：
   - 初次加载最近 N 条消息
   - 向上滚动时加载更早的消息

2. **缓存策略**：
   - 内存缓存当前节点的对话
   - 切换节点时清除缓存

## 5. 集成到 AI Chat Panel

### 5.1 组件改造

```typescript
export function AIChatPanel({ nodeId }: AIChatPanelProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // 加载对话历史
  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const messages = await loadConversation(nodeId);
        setInitialMessages(messages);
      } catch (error) {
        console.error("Failed to load conversation history:", error);
        setInitialMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, [nodeId]); // 节点变化时重新加载

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: {
        nodeContext: buildNodeContext(nodeId),
        modelKey: getEnvConfig().NEXT_PUBLIC_DEFAULT_AI_MODEL,
      },
    }),
    // 使用加载的历史消息作为初始消息
    initialMessages,
    // 消息更新时保存
    onFinish: async (message) => {
      await saveMessage(message, nodeId, getMindmapId());
    },
  });

  // 显示加载状态
  if (isLoadingHistory) {
    return <LoadingSpinner />;
  }

  // ... 其余渲染逻辑
}
```

### 5.2 节点切换处理

```typescript
// 在 AIChatPanel 组件中
useEffect(() => {
  // 节点ID变化时，重置 useChat
  // AI SDK v5 会在 initialMessages 变化时重新初始化
}, [nodeId]);
```

## 6. 数据清理策略

### 6.1 当前设计

**设计决策**：当前版本不主动清理 AI 消息

- ❌ 节点删除时：不删除 AI 消息（消息成为孤儿，保留以支持 undo）
- ✅ 思维导图删除时：通过 Supabase 外键约束级联删除
- ❌ 用户手动清理：暂不提供

### 6.2 未来计划

孤儿消息清理功能（节点已删除但消息仍存在）将在未来需要时设计实现：

- 后台计划任务定期清理
- 清理策略和保留时间待定
- 可能提供用户手动清理选项

## 7. Supabase 云端存储

### 7.1 设计目标

AI 对话历史需要持久化到 Supabase，与思维导图数据一起同步，确保：

- ✅ 跨设备访问对话历史
- ✅ 数据备份和恢复
- ✅ 与现有同步机制一致

### 7.2 Supabase 表结构

```sql
-- ai_messages 表
CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
  mindmap_id uuid NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),

  -- 消息内容
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL,  -- MessagePart[] 序列化

  -- 时间戳
  created_at timestamptz NOT NULL DEFAULT now(),

  -- 元数据（可选）
  metadata jsonb
);

-- 索引
CREATE INDEX idx_ai_messages_node_id ON ai_messages(node_id);
CREATE INDEX idx_ai_messages_mindmap_id ON ai_messages(mindmap_id);
CREATE INDEX idx_ai_messages_user_id ON ai_messages(user_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);

-- RLS 策略
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的消息
CREATE POLICY "Users can view own messages"
  ON ai_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON ai_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON ai_messages FOR DELETE
  USING (auth.uid() = user_id);
```

**字段说明**：

| 字段         | 类型        | 说明                                   |
| ------------ | ----------- | -------------------------------------- |
| `id`         | uuid        | 消息唯一 ID（Supabase 生成）           |
| `node_id`    | uuid        | 关联的节点 UUID                        |
| `mindmap_id` | uuid        | 关联的思维导图 UUID                    |
| `user_id`    | uuid        | 消息所属用户                           |
| `role`       | text        | 消息角色（user/assistant）             |
| `parts`      | jsonb       | 消息内容部分（序列化的 MessagePart[]） |
| `created_at` | timestamptz | 消息创建时间                           |
| `metadata`   | jsonb       | 可选元数据（operations 等）            |

### 7.3 IndexedDB Schema 扩展（支持同步）

```typescript
interface AIMessage {
  // ... 现有字段 ...

  // 同步相关字段
  dirty: boolean; // 是否有未同步的修改
  local_id: string; // 本地消息 ID（AI SDK 生成）
  server_id?: string; // Supabase 中的 UUID（同步后填充）
  synced_at?: string; // 最后同步时间
}
```

**同步状态**：

- `dirty = true, server_id = undefined`：新消息，未同步
- `dirty = false, server_id = uuid`：已同步
- `dirty = true, server_id = uuid`：已同步但有本地修改（一般不会发生，消息不可编辑）

### 7.4 Save Command 集成

**保存时机**：用户执行 `save` 命令时，同时同步 AI 消息

```typescript
// 在 SyncManager 中扩展
class SyncManager {
  async syncMindmap(mindmapId: string): Promise<void> {
    // 1. 同步思维导图元数据
    await this.syncMindmapMetadata(mindmapId);

    // 2. 同步节点数据
    await this.syncMindmapNodes(mindmapId);

    // 3. 同步 AI 消息（新增）
    await this.syncAIMessages(mindmapId);
  }

  /**
   * 同步 AI 消息到 Supabase
   */
  async syncAIMessages(mindmapId: string): Promise<void> {
    const db = await getDB();

    // 获取该思维导图下所有未同步的消息
    const allMessages = await db.getAllFromIndex(
      "ai_messages",
      "by-mindmap",
      mindmapId
    );

    const dirtyMessages = allMessages.filter((m) => m.dirty);

    if (dirtyMessages.length === 0) {
      return; // 无需同步
    }

    // 批量插入新消息（AI 消息只会新增，不会更新）
    const { data, error } = await supabase
      .from("ai_messages")
      .insert(
        dirtyMessages.map((msg) => ({
          node_id: msg.nodeId,
          mindmap_id: msg.mindmapId,
          user_id: getCurrentUserId(),
          role: msg.role,
          parts: msg.parts,
          created_at: msg.createdAt,
          metadata: msg.metadata,
        }))
      )
      .select("id");

    if (error) {
      throw new Error(`Failed to sync AI messages: ${error.message}`);
    }

    // 更新本地记录：标记为已同步，记录 server_id
    const tx = db.transaction("ai_messages", "readwrite");
    for (let i = 0; i < dirtyMessages.length; i++) {
      const localMessage = dirtyMessages[i];
      const serverId = data[i].id;

      await tx.store.put({
        ...localMessage,
        dirty: false,
        server_id: serverId,
        synced_at: new Date().toISOString(),
      });
    }
    await tx.done;
  }
}
```

### 7.5 AddAIMessageAction 更新

```typescript
class AddAIMessageAction implements EditorAction {
  type = "ADD_AI_MESSAGE" as const;

  constructor(public message: AIMessage) {}

  applyToEditorState(draft: EditorState): void {
    // AI 消息不影响编辑器核心状态
  }

  async applyToIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void> {
    // 标记为 dirty，等待 save 时同步
    await db.put("ai_messages", {
      ...this.message,
      dirty: true, // 标记需要同步
      local_id: this.message.id, // 保存本地 ID
      // server_id 在同步后填充
    });
  }
}
```

### 7.6 从云端加载历史

**场景**：用户在新设备上打开思维导图

```typescript
/**
 * 从 Supabase 加载节点的对话历史
 */
async function loadConversationFromServer(
  nodeId: string
): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("node_id", nodeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  // 转换为本地格式
  return data.map((serverMsg) => ({
    id: serverMsg.id, // 使用 server_id 作为本地 ID
    role: serverMsg.role,
    parts: serverMsg.parts,
    nodeId: serverMsg.node_id,
    mindmapId: serverMsg.mindmap_id,
    createdAt: serverMsg.created_at,
    metadata: serverMsg.metadata,
    dirty: false,
    local_id: serverMsg.id,
    server_id: serverMsg.id,
    synced_at: serverMsg.created_at,
  }));
}

/**
 * 加载对话历史（本地优先，必要时从云端拉取）
 */
async function loadConversation(nodeId: string): Promise<UIMessage[]> {
  const db = await getDB();

  // 先尝试从本地加载
  let messages = await db.getAllFromIndex("ai_messages", "by-node", nodeId);

  // 如果本地没有，从云端加载
  if (messages.length === 0) {
    messages = await loadConversationFromServer(nodeId);

    // 缓存到本地 IndexedDB
    if (messages.length > 0) {
      const tx = db.transaction("ai_messages", "readwrite");
      for (const msg of messages) {
        await tx.store.put(msg);
      }
      await tx.done;
    }
  }

  // 按时间排序并转换为 UIMessage 格式
  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts,
  }));
}
```

### 7.7 数据清理（云端）

**设计决策**：节点删除时，AI 消息**不会被删除**

**节点删除时**：

- 本地：AI 消息保持不变（成为孤儿消息）
- 云端：AI 消息保持不变
- 孤儿消息清理功能留待未来设计

**节点恢复时（undo）**：

- AI 消息从未被删除，所以自动恢复关联

**思维导图删除时**：通过外键约束级联删除

```sql
-- 外键约束已定义 ON DELETE CASCADE
-- 当思维导图被删除时，相关的 AI 消息自动删除
REFERENCES mindmaps(id) ON DELETE CASCADE
```

### 7.8 隐私和安全考虑

**RLS 策略**：

- 用户只能访问自己的消息
- 通过 `user_id` 字段确保数据隔离

**数据敏感性**：

- AI 对话可能包含敏感信息
- 所有数据存储在用户自己的账户下
- 通过 Supabase 的加密传输保护数据

### 7.9 同步策略总结

| 操作            | 本地 (IndexedDB)         | 云端 (Supabase)     |
| --------------- | ------------------------ | ------------------- |
| 用户发送消息    | ✅ 立即写入 (dirty=true) | ❌ 等待 save        |
| AI 回复完成     | ✅ 立即写入 (dirty=true) | ❌ 等待 save        |
| 执行 save 命令  | ✅ 更新 dirty=false      | ✅ 批量插入         |
| 节点切换        | ✅ 从本地加载            | ✅ 必要时从云端拉取 |
| 节点删除        | ❌ AI 消息不删除（孤儿） | ❌ AI 消息不删除    |
| 节点恢复 (undo) | ✅ 消息自动重新关联      | ✅ 消息自动重新关联 |
| 思维导图删除    | ✅ 本地清理              | ✅ 级联删除         |

## 8. 关键设计决策

### 8.1 为什么采用单表设计？

**优势**：

- ✅ **简单**：只需维护一个表，降低复杂度
- ✅ **灵活**：统计信息按需计算，无需担心数据一致性
- ✅ **高效**：IndexedDB 索引查询已经足够快，不需要额外的会话表
- ✅ **易于维护**：减少了数据同步的复杂性

**何时需要会话表？**
只有在以下场景才需要考虑添加独立的会话表：

- 需要快速列出所有有对话的节点（不加载消息内容）
- 需要存储对话级别的配置（如指定 AI 模型、温度等）
- 需要为对话添加标签、分类等元数据

当前这些场景都不存在，所以单表设计更合适。

### 8.2 为什么通过 nodeId 关联消息？

**优势**：

- 一对一映射，简单直观
- 便于查询和索引
- 符合业务逻辑（一个节点对应一段对话）

**考虑**：

- 节点删除后对话也删除（符合预期）
- 未来如果需要"对话归档"功能，可以添加软删除标记

### 8.3 为什么实时保存每条消息？

**优势**：

- 数据安全，不会因为意外关闭丢失
- 实现简单，逻辑清晰
- 用户体验好，切换节点立即看到历史

**性能考虑**：

- IndexedDB 写入很快，单条消息保存的性能开销可忽略
- 如果确实有性能问题，可以改为批量保存（但目前无此需求）

### 8.4 是否需要限制消息数量？

**建议**：

- 初期不限制
- 监控实际使用情况
- 如果出现性能问题，可以：
  - 限制加载最近 N 条消息
  - 提供"清除旧对话"功能
  - 添加消息归档功能

### 8.5 为什么节点删除时不删除 AI 消息？

**设计决策**：节点删除时，AI 消息保持不变（成为孤儿消息）

**优势**：

1. **简化实现**：无需额外的 Action 来处理消息删除/恢复
2. **支持 undo/redo**：节点恢复时，AI 消息自动重新关联（因为从未被删除）
3. **数据安全**：避免误删除重要的对话历史
4. **灵活清理**：可以通过计划任务在后台统一清理无效消息

**潜在问题**：

- 孤儿消息会占用存储空间
- 需要定期清理机制

**清理策略**：

- 孤儿消息清理功能留待未来需要时设计实现

## 9. 实现计划

### Phase 1: 核心功能 ✅

1. **IndexedDB Schema 扩展**
   - 添加 `ai_messages` 表（包含同步字段：dirty, local_id, server_id, synced_at）
   - 添加必要的索引（by-node, by-mindmap, by-created）
   - 更新数据库版本

2. **Supabase Schema 扩展**
   - 创建 `ai_messages` 表（包含外键约束和 RLS 策略）
   - 添加索引（node_id, mindmap_id, user_id, created_at）
   - 配置级联删除（ON DELETE CASCADE）

3. **Action 实现**
   - 实现 `AddAIMessageAction` - 写入 IndexedDB 并标记 dirty
   - 无需 reverse() 方法（不支持直接撤销消息）
   - 无需软删除/恢复 Action（节点删除时消息保持不变）

4. **同步逻辑实现**
   - 扩展 `SyncManager.syncMindmap()` 添加 `syncAIMessages()` 方法
   - 批量上传 dirty 消息到 Supabase
   - 更新本地 server_id 和 synced_at

5. **加载逻辑实现**
   - 实现 `loadConversation()` - 本地优先加载
   - 实现 `loadConversationFromServer()` - 云端拉取（本地为空时）

6. **集成到 AI Chat Panel**
   - 节点切换时加载历史消息作为 `initialMessages`
   - 用户消息发送时通过 Action 写入
   - AI 回复完成时（onFinish）通过 Action 写入

### Phase 2: 优化和扩展 🔜

1. **性能优化**
   - 分页加载
   - 内存缓存

2. **用户体验**
   - 加载状态优化
   - 清除历史按钮

3. **数据管理**
   - 导出对话历史
   - 搜索对话内容

## 10. 待确认问题

### 10.1 数据保留策略

**问题**：对话历史是否需要设置保留期限？

**选项**：

1. 永久保留（推荐）
2. 保留最近 N 天
3. 保留最近 N 条消息

**建议**：初期永久保留，后续根据使用情况调整

### 10.2 节点删除后对话处理

**问题**：节点删除后，对话历史如何处理？

**已决定方案**：

- 节点删除时，AI 消息不删除（成为孤儿消息）
- 通过后台计划任务定期清理孤儿消息
- 这样支持节点恢复（undo），同时简化实现

**清理策略待定**：

- 清理周期（每日/每周）
- 孤儿消息保留时间（30天/永久）
- 是否需要用户确认

### 10.3 对话历史导出

**问题**：是否需要提供对话历史导出功能？

**选项**：

1. 暂不提供（推荐）
2. 导出为 Markdown
3. 导出为 JSON

**建议**：Phase 2 考虑

### 10.4 多设备同步

**问题**：对话历史是否需要在多设备间同步？

**选项**：

1. 暂不支持（推荐）
2. 通过云端同步

**建议**：暂不支持，专注本地体验

## 11. 风险评估

### 11.1 数据丢失风险

**风险**：IndexedDB 数据可能被浏览器清理

**缓解措施**：

- 提示用户不要清除浏览器数据
- 未来添加导出功能

### 11.2 性能风险

**风险**：对话历史过长可能影响加载速度

**缓解措施**：

- 监控实际使用情况
- 必要时实现分页加载

### 11.3 隐私风险

**风险**：对话内容可能包含敏感信息

**缓解措施**：

- 仅本地存储，不上传云端
- 提供清除功能

## 12. 总结

本设计提供了一个简单、可靠的 AI 对话历史持久化方案：

**核心特性**：

1. ✅ 采用单表设计，简单高效
2. ✅ 对话与节点一对一关联
3. ✅ 实时保存，切换节点即时加载
4. ✅ 完整的数据模型和 IndexedDB schema
5. ✅ 清晰的存储和加载策略
6. ✅ 合理的数据清理机制

**设计优势**：

- **简单**：只需维护一个表，降低复杂度
- **灵活**：统计信息按需计算，无需担心数据一致性
- **可扩展**：未来如需会话元数据，可轻松添加会话表

**实现简单**：

- 利用现有的 IndexedDB 基础设施
- 最小化对现有代码的修改
- 充分利用 AI SDK 的 hooks
- 无需维护多表之间的数据一致性

**用户体验好**：

- 对话历史自动保存
- 切换节点流畅
- 支持连续深入讨论
