# AI Chat 节点编辑能力设计 V2 (基于 Command 系统)

## 1. 设计原则

**核心理念**: AI 操作应该完全基于现有的 Command 系统，而不是重新发明一套动作系统。

### 1.1 架构优势

1. **复用性**: 复用所有已有的 command 和 action
2. **一致性**: AI 操作和用户手动操作使用同一套基础设施
3. **简化**: 不需要额外的转换层
4. **原子性**: 通过 CompositeCommand 保证事务性

## 2. 数据结构设计

### 2.1 AI Operation（简化版）

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
    impact: "low" | "medium" | "high";
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
    impact: "low" | "medium" | "high";
    totalOperations: number;
    affectedNodes: string[]; // 受影响的节点ID列表
  };
}
```

## 3. CompositeCommand 设计

### 3.1 核心实现

```typescript
/**
 * 组合命令
 * 将多个子命令组合为一个原子操作
 * 一次 undo 可以撤销所有子命令的效果
 */
export interface CompositeCommandDefinition extends CommandDefinition {
  id: string;
  name: string;
  description: string;
  category: "ai"; // 属于 AI 分类

  // 子命令列表
  subCommands: {
    commandId: string;
    params: unknown[];
  }[];

  handler: (root: MindmapStore, params?: unknown[]) => Promise<EditorAction[]>;
}

/**
 * 创建组合命令
 */
function createCompositeCommand(
  id: string,
  description: string,
  subCommands: { commandId: string; params: unknown[] }[]
): CompositeCommandDefinition {
  return {
    id,
    name: description,
    description,
    category: "ai",
    subCommands,

    handler: async (root: MindmapStore) => {
      const allActions: EditorAction[] = [];

      // 顺序执行所有子命令，收集所有 actions
      for (const { commandId, params } of subCommands) {
        const command = getCommand(commandId);
        if (!command) {
          throw new Error(`Command ${commandId} not found`);
        }

        // 检查前置条件
        if (command.when && !command.when(root, params)) {
          console.warn(`Command ${commandId} precondition not met, skipping`);
          continue;
        }

        // 执行子命令获取 actions
        const actions = await command.handler(root, params);
        if (actions && Array.isArray(actions)) {
          allActions.push(...actions);
        }
      }

      return allActions;
    },

    // 组合命令的描述可以聚合子命令的描述
    getDescription: (root: MindmapStore) => {
      const subDescriptions = subCommands
        .map(({ commandId, params }) => {
          const cmd = getCommand(commandId);
          if (cmd?.getDescription) {
            return cmd.getDescription(root, params);
          }
          return cmd?.description || commandId;
        })
        .filter(Boolean);

      return `${description} (${subDescriptions.length} 个操作)`;
    },
  };
}
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

## 4. AI Operation 到 Command 的映射

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

### 4.2 需要新增的命令

为了支持 AI 的高级操作，需要新增以下命令：

```typescript
// 1. 批量创建子节点
{
  id: "node.addChildren",
  params: [parentId, children: { title: string; note?: string }[]]
}

// 2. 创建多级节点树
{
  id: "node.createTree",
  params: [parentId, tree: NodeTree]
}

interface NodeTree {
  title: string;
  note?: string;
  children?: NodeTree[];
}

// 3. 批量移动节点
{
  id: "node.moveNodes",
  params: [nodeIds: string[], targetParentId: string]
}

// 4. 重组子节点
{
  id: "node.reorderChildren",
  params: [parentId, newOrder: { nodeId: string; position: number }[]]
}

// 5. 合并节点
{
  id: "node.mergeNodes",
  params: [sourceNodeIds: string[], targetNodeId: string]
}

// 6. 拆分节点
{
  id: "node.splitNode",
  params: [nodeId, splits: { title: string; note?: string }[]]
}
```

## 5. AI 侧实现

### 5.1 提示词设计

```typescript
const SYSTEM_PROMPT = `
你是一个思维导图编辑助手。

## 当前节点上下文
{{nodeContext}}

## 可用命令

### 节点创建
- node.addChild(parentId, position?, title?) - 添加单个子节点
- node.addChildren(parentId, children[]) - 批量添加子节点
- node.addSiblingAbove(nodeId, title?) - 添加上方兄弟节点
- node.addSiblingBelow(nodeId, title?) - 添加下方兄弟节点
- node.createTree(parentId, tree) - 创建多级节点树

### 节点更新
- node.updateTitle(nodeId, newTitle) - 更新标题
- node.updateNote(nodeId, newNote) - 更新笔记

### 节点移动
- node.move(nodeId, targetParentId, position) - 移动节点
- node.moveUp(nodeId) - 向上移动
- node.moveDown(nodeId) - 向下移动
- node.reorderChildren(parentId, newOrder[]) - 重组子节点

### 节点删除
- node.delete(nodeId) - 删除节点

### 批量操作
- node.mergeNodes(sourceNodeIds[], targetNodeId) - 合并节点
- node.splitNode(nodeId, splits[]) - 拆分节点

## 返回格式

返回一个包含操作列表的JSON对象：

{
  "operations": [
    {
      "commandId": "node.addChildren",
      "params": ["abc123", [
        {"title": "子节点1"},
        {"title": "子节点2"}
      ]],
      "description": "为'产品规划'创建2个子节点",
      "preview": {
        "impact": "low",
        "summary": "将创建2个新节点"
      },
      "metadata": {
        "confidence": 0.9,
        "reasoning": "基于产品规划的常见步骤"
      }
    }
  ]
}

## 原则

1. **优先使用简单命令**: 能用单个命令就不用多个
2. **批量操作**: 多个相同类型的操作使用批量命令
3. **明确影响**: 删除、移动等操作标记为 medium/high impact
4. **保持顺序**: 如果操作有依赖关系，按正确顺序排列
`;
```

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

    // 使用 tool 生成操作
    tools: {
      generateOperations: {
        description: "生成思维导图编辑操作",
        parameters: z.object({
          operations: z.array(
            z.object({
              commandId: z.string(),
              params: z.array(z.unknown()),
              description: z.string(),
              preview: z
                .object({
                  impact: z.enum(["low", "medium", "high"]),
                  summary: z.string(),
                })
                .optional(),
              metadata: z
                .object({
                  confidence: z.number().min(0).max(1),
                  reasoning: z.string().optional(),
                })
                .optional(),
            })
          ),
        }),
        execute: async ({ operations }) => {
          // 验证命令是否存在
          for (const op of operations) {
            const cmd = getCommand(op.commandId);
            if (!cmd) {
              throw new Error(`Unknown command: ${op.commandId}`);
            }
          }

          return { operations };
        },
      },
    },
  });

  return response.toDataStreamResponse();
}
```

## 6. 前端执行流程

### 6.1 执行器实现

```typescript
/**
 * AI 操作执行器
 */
class AIOperationExecutor {
  constructor(private commandManager: CommandManager) {}

  /**
   * 执行单个操作
   */
  async executeOperation(operation: AIOperation): Promise<void> {
    await this.commandManager.executeCommand({
      commandId: operation.commandId,
      params: operation.params,
    });
  }

  /**
   * 执行批量操作（作为一个组合命令）
   */
  async executeBatch(batch: AIOperationBatch): Promise<void> {
    // 创建临时的组合命令
    const compositeCommand = createCompositeCommand(
      `ai.batch.${batch.id}`,
      batch.description,
      batch.operations.map((op) => ({
        commandId: op.commandId,
        params: op.params,
      }))
    );

    // 临时注册（执行后可选择性清理）
    registerCommand(compositeCommand);

    // 执行组合命令
    await this.commandManager.executeCommand({
      commandId: compositeCommand.id,
      params: [],
    });
  }
}
```

### 6.2 UI 组件

```typescript
/**
 * 操作预览卡片
 */
interface OperationPreviewProps {
  operation: AIOperation;
  onApprove: () => void;
  onReject: () => void;
  status: "pending" | "approved" | "rejected" | "applied";
}

function OperationPreview({ operation, onApprove, onReject, status }: OperationPreviewProps) {
  const impactColor = {
    low: "green",
    medium: "yellow",
    high: "red"
  }[operation.preview?.impact ?? "low"];

  return (
    <div className={`border-${impactColor}-200 bg-${impactColor}-50`}>
      <div className="font-medium">{operation.description}</div>

      {operation.preview && (
        <div className="text-sm text-gray-600">
          {operation.preview.summary}
        </div>
      )}

      {operation.metadata && (
        <div className="text-xs">
          置信度: {(operation.metadata.confidence * 100).toFixed(0)}%
        </div>
      )}

      {status === "pending" && (
        <div className="flex gap-2">
          <button onClick={onApprove}>应用</button>
          <button onClick={onReject}>取消</button>
        </div>
      )}
    </div>
  );
}

/**
 * 批量操作管理器
 */
interface BatchManagerProps {
  batch: AIOperationBatch;
  onApprove: () => void;
  onReject: () => void;
}

function BatchManager({ batch, onApprove, onReject }: BatchManagerProps) {
  return (
    <div>
      <h3>{batch.description}</h3>
      <p>共 {batch.operations.length} 个操作</p>

      <div className="space-y-2">
        {batch.operations.map(op => (
          <div key={op.id} className="text-sm">
            • {op.description}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onApprove}>全部应用</button>
        <button onClick={onReject}>取消</button>
      </div>
    </div>
  );
}
```

## 7. 典型使用场景

### 7.1 场景1: 创建子节点

**用户输入**: "帮我为'产品规划'生成5个规划步骤"

**AI 返回**:

```json
{
  "operations": [
    {
      "commandId": "node.addChildren",
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
        "impact": "low",
        "summary": "将创建5个新子节点"
      },
      "metadata": {
        "confidence": 0.95
      }
    }
  ]
}
```

**执行流程**:

1. 用户点击"应用"
2. 执行 `node.addChildren` 命令
3. 命令返回 5 个 `AddNodeAction`
4. 所有 action 组合成一个 `HistoryItem`
5. 一次 undo 可以撤销所有 5 个节点的创建

### 7.2 场景2: 复杂重组

**用户输入**: "把这些节点按重要性排序，并把相关的归到一起"

**AI 返回** (批量操作):

```json
{
  "id": "batch-456",
  "description": "重组节点结构",
  "operations": [
    {
      "commandId": "node.addChild",
      "params": ["node-parent", 0, "重要功能"],
      "description": "创建分组'重要功能'"
    },
    {
      "commandId": "node.move",
      "params": ["node-a", "node-group-1", 0],
      "description": "移动'功能A'到'重要功能'"
    },
    {
      "commandId": "node.move",
      "params": ["node-b", "node-group-1", 1],
      "description": "移动'功能B'到'重要功能'"
    },
    {
      "commandId": "node.reorderChildren",
      "params": [
        "node-parent",
        [
          { "nodeId": "node-group-1", "position": 0 },
          { "nodeId": "node-other", "position": 1 }
        ]
      ],
      "description": "调整子节点顺序"
    }
  ],
  "preview": {
    "impact": "medium",
    "totalOperations": 4,
    "affectedNodes": ["node-parent", "node-a", "node-b", "node-group-1"]
  }
}
```

**执行流程**:

1. 用户预览批量操作
2. 点击"全部应用"
3. 创建 `CompositeCommand`
4. 顺序执行 4 个子命令
5. 收集所有 actions (可能 10+ 个)
6. 组合成一个 `HistoryItem`
7. 一次 undo 撤销整个重组操作

### 7.3 场景3: 创建多级树

**用户输入**: "展开'技术架构'这个节点，生成完整的技术栈结构"

**AI 返回**:

```json
{
  "operations": [
    {
      "commandId": "node.createTree",
      "params": [
        "node-arch",
        {
          "children": [
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
        }
      ],
      "description": "为'技术架构'创建完整的技术栈结构",
      "preview": {
        "impact": "medium",
        "summary": "将创建3个一级节点和8个二级节点"
      }
    }
  ]
}
```

**执行**:

- 执行 `node.createTree` 命令
- 递归创建所有节点
- 返回 11 个 `AddNodeAction`
- 一次 undo 撤销整棵树

## 8. 新增命令实现

### 8.1 批量创建子节点

```typescript
// src/domain/commands/node/add-children.ts

interface AddChildrenParams {
  parentId: string;
  children: { title: string; note?: string }[];
}

export const addChildrenCommand: CommandDefinition = {
  id: "node.addChildren",
  name: "批量添加子节点",
  description: "批量添加子节点",
  category: "node",

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [parentId, children] = params as [
      string,
      { title: string; note?: string }[],
    ];

    const parentNode = root.currentEditor?.nodes.get(parentId);
    if (!parentNode) return [];

    const siblings = getChildNodes(root.currentEditor!, parentId);
    let nextPosition = siblings.length;

    const actions: EditorAction[] = [];

    // 为每个子节点创建 AddNodeAction
    for (const child of children) {
      const shortId = generateShortId();

      actions.push(
        new AddNodeAction({
          id: crypto.randomUUID(),
          short_id: shortId,
          mindmap_id: root.currentEditor!.currentMindmap.id,
          parent_id: parentNode.id,
          parent_short_id: parentId,
          title: child.title,
          note: child.note ?? null,
          order_index: nextPosition++,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );
    }

    // 如果需要，选中第一个创建的节点
    if (actions.length > 0) {
      const firstNode = (actions[0] as AddNodeAction)["node"];
      actions.push(
        new SetCurrentNodeAction({
          newNodeId: firstNode.short_id,
          oldNodeId: root.currentEditor!.currentNode,
        })
      );
    }

    return actions;
  },

  getDescription: (root, params) => {
    const children = params?.[1] as { title: string }[] | undefined;
    return `批量创建 ${children?.length ?? 0} 个子节点`;
  },
};

registerCommand(addChildrenCommand);
```

### 8.2 创建多级树

```typescript
// src/domain/commands/node/create-tree.ts

interface NodeTreeNode {
  title: string;
  note?: string;
  children?: NodeTreeNode[];
}

export const createTreeCommand: CommandDefinition = {
  id: "node.createTree",
  name: "创建节点树",
  description: "创建多级节点树",
  category: "node",

  handler: (root: MindmapStore, params?: unknown[]) => {
    const [parentId, tree] = params as [string, { children: NodeTreeNode[] }];

    const parentNode = root.currentEditor?.nodes.get(parentId);
    if (!parentNode) return [];

    const actions: EditorAction[] = [];

    // 递归创建节点树
    function createNodes(
      parent: MindmapNode,
      nodes: NodeTreeNode[],
      startPosition: number
    ): void {
      nodes.forEach((node, index) => {
        const shortId = generateShortId();
        const position = startPosition + index;

        // 创建当前节点
        const newNode: MindmapNode = {
          id: crypto.randomUUID(),
          short_id: shortId,
          mindmap_id: root.currentEditor!.currentMindmap.id,
          parent_id: parent.id,
          parent_short_id: parent.short_id,
          title: node.title,
          note: node.note ?? null,
          order_index: position,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        actions.push(new AddNodeAction(newNode));

        // 递归创建子节点
        if (node.children && node.children.length > 0) {
          createNodes(newNode, node.children, 0);
        }
      });
    }

    const siblings = getChildNodes(root.currentEditor!, parentId);
    createNodes(parentNode, tree.children, siblings.length);

    return actions;
  },

  getDescription: (root, params) => {
    const tree = params?.[1] as { children: NodeTreeNode[] } | undefined;

    // 计算节点总数
    function countNodes(nodes: NodeTreeNode[]): number {
      return nodes.reduce((sum, node) => {
        return sum + 1 + (node.children ? countNodes(node.children) : 0);
      }, 0);
    }

    const total = tree ? countNodes(tree.children) : 0;
    return `创建节点树 (${total} 个节点)`;
  },
};

registerCommand(createTreeCommand);
```

## 9. 安全性和验证

### 9.1 命令验证

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

  // 2. 检查参数数量
  // （可以根据命令定义的参数规范进行验证）

  // 3. 检查节点是否存在
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

  // 4. 检查前置条件
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
    case "node.addChildren":
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

### 9.2 执行前确认

```typescript
/**
 * 根据影响程度决定是否需要确认
 */
function needsConfirmation(operation: AIOperation): boolean {
  const impact = operation.preview?.impact ?? "low";

  switch (impact) {
    case "low":
      return false; // 自动执行
    case "medium":
      return true; // 需要确认
    case "high":
      return true; // 需要二次确认
  }
}

/**
 * 判断命令的影响程度
 */
function getCommandImpact(commandId: string): "low" | "medium" | "high" {
  const highImpactCommands = ["node.delete", "node.mergeNodes"];

  const mediumImpactCommands = [
    "node.move",
    "node.moveNodes",
    "node.reorderChildren",
  ];

  if (highImpactCommands.includes(commandId)) {
    return "high";
  }
  if (mediumImpactCommands.includes(commandId)) {
    return "medium";
  }
  return "low";
}
```

## 10. 实现路线图

### Phase 1: 基础设施 ✅

- [x] Command 系统已完成
- [x] HistoryManager 已完成
- [x] 基础命令已实现

### Phase 2: CompositeCommand 支持

- [ ] 实现 `createCompositeCommand` 工厂函数
- [ ] 实现 `AIOperationExecutor`
- [ ] 更新 UI 组件支持批量操作

### Phase 3: 新增命令

- [ ] `node.addChildren` - 批量创建子节点
- [ ] `node.createTree` - 创建多级树
- [ ] `node.reorderChildren` - 重组子节点
- [ ] `node.mergeNodes` - 合并节点
- [ ] `node.splitNode` - 拆分节点

### Phase 4: AI 集成

- [ ] 更新 AI 提示词
- [ ] 实现操作验证
- [ ] 实现预览 UI
- [ ] 添加确认机制

### Phase 5: 体验优化

- [ ] 操作历史记录
- [ ] 批量操作进度显示
- [ ] 错误处理和回滚
- [ ] 性能优化

## 11. 总结

### 11.1 核心优势

1. **完全基于 Command**: 不重复造轮子，复用所有基础设施
2. **原子性保证**: CompositeCommand 确保批量操作的事务性
3. **类型安全**: 完全利用现有的 TypeScript 类型定义
4. **简化实现**: AI 只需返回 `{commandId, params}`，极简设计
5. **一致性**: AI 操作和手动操作完全一致的行为

### 11.2 与 V1 的对比

| 方面      | V1 (独立 Action 系统)     | V2 (基于 Command)          |
| --------- | ------------------------- | -------------------------- |
| 数据结构  | 复杂的 AIAction 类型      | 简单的 {commandId, params} |
| 执行器    | 需要 AIActionExecutor     | 复用 CommandManager        |
| 转换层    | 需要 action->command 转换 | 无需转换                   |
| 批量操作  | 需要自定义批处理逻辑      | CompositeCommand 原生支持  |
| Undo/Redo | 需要额外集成              | 自动支持                   |
| 维护成本  | 高（两套系统）            | 低（一套系统）             |

### 11.3 关键设计点

1. **AIOperation 本质上就是 CommandRun**: 简化为 `{commandId, params, metadata}`
2. **CompositeCommand 是批量操作的关键**: 保证原子性
3. **完全复用现有基础设施**: 无需重新发明
4. **AI 只需了解命令接口**: 提示词更简单清晰

这个设计更加优雅、简洁，充分利用了现有的架构优势！
