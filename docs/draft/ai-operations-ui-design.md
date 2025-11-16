# AI 操作 UI 设计

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-15
- 状态：草稿
- 相关文档：
  - [AI Chat 节点编辑能力设计 V2](./ai-node-operations-v2.md)

## 概述

本文档描述 AI 操作的用户界面设计，包括操作预览、批量操作管理等 UI 组件。

## 1. 核心组件

### 1.1 操作预览卡片

用于展示单个 AI 操作的详细信息，让用户在执行前预览和确认。

**组件定义**:

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

function OperationPreview({
  operation,
  onApprove,
  onReject,
  status,
}: OperationPreviewProps) {
  return (
    <div className="border-gray-200 bg-gray-50 p-3 rounded">
      <div className="font-medium">{operation.description}</div>

      {operation.preview && (
        <div className="text-sm text-gray-600 mt-1">
          {operation.preview.summary}
        </div>
      )}

      {operation.metadata && (
        <div className="text-xs text-gray-500 mt-1">
          置信度: {(operation.metadata.confidence * 100).toFixed(0)}%
        </div>
      )}

      {status === "pending" && (
        <div className="flex gap-2 mt-2">
          <button onClick={onApprove}>应用</button>
          <button onClick={onReject}>取消</button>
        </div>
      )}
    </div>
  );
}
```

**功能**:

- 显示操作描述
- 显示预览摘要（如果有）
- 显示 AI 置信度（如果有）
- 提供"应用"和"取消"按钮
- 支持不同的状态显示

**状态说明**:

- `pending`: 等待用户确认
- `approved`: 用户已批准，待执行
- `rejected`: 用户已拒绝
- `applied`: 已执行

### 1.2 批量操作管理器

用于管理和预览批量 AI 操作。

**组件定义**:

```typescript
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
        {batch.operations.map((op) => (
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

**功能**:

- 显示批量操作的整体描述
- 显示操作数量
- 列出所有子操作的描述
- 提供"全部应用"和"取消"按钮

## 2. 交互流程

### 2.1 单个操作流程

```
AI 返回操作
  ↓
显示 OperationPreview (status: pending)
  ↓
用户点击"应用" or "取消"
  ↓
执行 onApprove() or onReject()
  ↓
更新状态: approved/rejected
  ↓
(如果 approved) 执行命令
  ↓
更新状态: applied
```

### 2.2 批量操作流程

```
AI 返回批量操作
  ↓
显示 BatchManager
  ↓
列出所有子操作
  ↓
用户点击"全部应用" or "取消"
  ↓
执行 onApprove() or onReject()
  ↓
(如果 approved) 执行 AIOperationExecutor.executeBatch()
  ↓
  - 分组 undoable/non-undoable
  - 执行 undoable (CompositeCommand)
  - 执行 non-undoable
```

## 3. 前端执行流程

### 3.1 解析 AI 返回的操作

AI 的回复中会使用 `<operations>` 标签包裹 JSON 代码块，前端需要解析出操作列表：

````typescript
/**
 * 从 AI 回复中提取操作列表
 * 支持 <operations> 标签包裹的 JSON 代码块
 */
function extractOperations(aiResponse: string): AIOperation[] {
  // 匹配 <operations>...</operations> 标签内的 JSON 代码块
  const operationsRegex =
    /<operations>\s*```json\s*\n([\s\S]*?)\n```\s*<\/operations>/g;
  const matches = [...aiResponse.matchAll(operationsRegex)];

  if (matches.length === 0) {
    return [];
  }

  const operations: AIOperation[] = [];

  for (const match of matches) {
    try {
      const jsonStr = match[1];
      const parsed = JSON.parse(jsonStr);

      // 验证格式
      if (parsed.operations && Array.isArray(parsed.operations)) {
        operations.push(...parsed.operations);
      }
    } catch (error) {
      console.error("Failed to parse operations:", error);
    }
  }

  return operations;
}

/**
 * 检测流式输出中是否包含 <operations> 标签
 * 用于在流式输出时切换显示模式
 */
function hasOperationsTag(text: string): boolean {
  return text.includes("<operations>");
}

/**
 * 提取 <operations> 标签之前的文本
 * 用于在流式输出时显示说明部分
 */
function extractExplanation(text: string): string {
  const operationsIndex = text.indexOf("<operations>");
  if (operationsIndex === -1) {
    return text;
  }
  return text.substring(0, operationsIndex).trim();
}
````

**使用示例**:

```typescript
// AI 返回的文本
const aiResponse = `
好的！我为你的产品规划创建了5个关键步骤。

**操作概要**：
- 创建 5 个子节点

<operations>
\`\`\`json
{
  "operations": [
    {
      "id": "op-1",
      "commandId": "node.addChildTrees",
      "params": ["parent-123", [
        {"title": "市场调研"},
        {"title": "需求分析"}
      ]],
      "description": "创建2个规划步骤"
    }
  ]
}
\`\`\`
</operations>
`;

// 提取操作
const operations = extractOperations(aiResponse);
// operations.length === 1

// 检测是否包含操作标签
const hasOps = hasOperationsTag(aiResponse);
// hasOps === true

// 提取说明部分（用于流式输出）
const explanation = extractExplanation(aiResponse);
// explanation === "好的！我为你的产品规划创建了5个关键步骤。\n\n**操作概要**：\n- 创建 5 个子节点"
```

### 3.2 流式输出处理

在 Chat 组件中处理流式输出，当检测到 `<operations>` 标签时切换为卡片确认模式：

```typescript
// 在 Chat 组件中处理流式输出
function handleStreamingResponse(chunk: string) {
  // 累积接收到的文本
  accumulatedText += chunk;

  // 检测是否遇到 <operations> 标签
  if (hasOperationsTag(accumulatedText)) {
    // 提取说明部分
    const explanation = extractExplanation(accumulatedText);

    // 显示说明文本（普通样式）
    setExplanation(explanation);

    // 切换为卡片确认模式
    setShowOperationCard(true);

    // 等待完整的 </operations> 标签
    if (accumulatedText.includes("</operations>")) {
      // 解析操作
      const operations = extractOperations(accumulatedText);
      setOperations(operations);
    }
  } else {
    // 正常显示文本
    setText(accumulatedText);
  }
}
```

**流程说明**:

1. **累积文本**: 将流式接收的文本片段累积起来
2. **检测标签**: 检测是否包含 `<operations>` 开始标签
3. **提取说明**: 提取标签之前的自然语言说明
4. **切换模式**: 从普通文本显示切换为操作卡片显示
5. **等待完整**: 等待 `</operations>` 结束标签
6. **解析操作**: 解析 JSON 并提取操作列表
7. **显示卡片**: 以卡片形式展示操作供用户确认

**优势**:

- 先显示完整的自然语言说明，用户可以快速理解操作意图
- 避免显示不完整的 JSON 代码，提升用户体验
- 卡片模式提供明确的确认交互，避免误操作

### 3.3 执行器实现

前端执行器负责执行 AI 返回的操作，包括单个操作和批量操作的执行逻辑。

```typescript
import { createCompositeCommand } from "@/domain/commands/composite";
import { useMindmapStore } from "@/domain/mindmap-store";
import { getCommand } from "@/domain/command-registry";

/**
 * AI 操作执行器
 */
class AIOperationExecutor {
  /**
   * 执行单个操作
   */
  async executeOperation(operation: AIOperation): Promise<void> {
    const root = useMindmapStore.getState();

    await root.commandManager!.executeCommand({
      commandId: operation.commandId,
      params: operation.params,
    });
  }

  /**
   * 执行批量操作
   *
   * 执行策略：
   * 1. 将操作按 undoable 属性分组
   * 2. 先执行所有 undoable=true 的命令（组合成 CompositeCommand，一次 undo 撤销）
   * 3. 成功后再依次执行 undoable=false 的命令（系统级操作如 save）
   */
  async executeBatch(batch: AIOperationBatch): Promise<void> {
    const root = useMindmapStore.getState();

    // 分组：undoable 和 non-undoable 操作
    const undoableOps: AIOperation[] = [];
    const nonUndoableOps: AIOperation[] = [];

    for (const op of batch.operations) {
      const command = getCommand(op.commandId);
      if (!command) {
        throw new Error(`Unknown command: ${op.commandId}`);
      }

      // 根据 undoable 属性分组（默认为 true）
      if (command.undoable === false) {
        nonUndoableOps.push(op);
      } else {
        undoableOps.push(op);
      }
    }

    // 第一步：执行所有 undoable 操作（组合成一个事务）
    if (undoableOps.length > 0) {
      const compositeCommand = createCompositeCommand(
        batch.description,
        undoableOps.map((op) => ({
          commandId: op.commandId,
          params: op.params,
        }))
      );

      await root.commandManager!.executeCommand(
        {
          commandId: compositeCommand.id,
          params: [],
        },
        compositeCommand
      );
    }

    // 第二步：依次执行 non-undoable 操作（系统级操作）
    for (const op of nonUndoableOps) {
      await root.commandManager!.executeCommand({
        commandId: op.commandId,
        params: op.params,
      });
    }
  }
}
```

**执行流程说明**:

1. **单个操作执行**:
   - 直接调用 `commandManager.executeCommand()`
   - 命令会返回相应的 EditorAction[]
   - 自动加入历史记录（如果 `undoable=true`）

2. **批量操作执行**:
   - **分组阶段**: 将操作按 `undoable` 属性分为两组
   - **执行 undoable 操作**:
     - 使用 `createCompositeCommand()` 创建组合命令
     - 所有操作的 actions 合并到一个 HistoryItem
     - 一次 undo 可以撤销整个批次
   - **执行 non-undoable 操作**:
     - 依次执行系统级操作（如保存）
     - 这些操作不会进入历史记录
     - 确保只有在 undoable 操作成功后才执行

3. **优势**:
   - 保证批量操作的原子性
   - 正确处理可撤销和不可撤销操作
   - 避免将系统操作加入 undo 历史
   - 失败时可以安全回滚

**使用示例**:

```typescript
// 在 OperationPreview 组件中
function OperationPreview({ operation, onApprove, onReject, status }) {
  const executor = new AIOperationExecutor();

  const handleApply = async () => {
    try {
      await executor.executeOperation(operation);
      // 更新状态为 applied
    } catch (error) {
      console.error("Failed to execute operation:", error);
      // 显示错误信息
    }
  };

  return (
    // ... UI 代码
    <button onClick={handleApply}>应用</button>
  );
}

// 在 BatchManager 组件中
function BatchManager({ batch, onApprove, onReject }) {
  const executor = new AIOperationExecutor();

  const handleApplyAll = async () => {
    try {
      await executor.executeBatch(batch);
      // 更新状态为 applied
    } catch (error) {
      console.error("Failed to execute batch:", error);
      // 显示错误信息
    }
  };

  return (
    // ... UI 代码
    <button onClick={handleApplyAll}>全部应用</button>
  );
}
```

## 4. 待设计内容

以下功能暂未设计，留待后续讨论：

### 4.1 影响评估

- ❓ 如何评估操作的影响程度
- ❓ 是否需要不同的确认级别
- ❓ 删除等高风险操作的二次确认

### 4.2 操作历史

- ❓ 是否需要显示 AI 操作历史
- ❓ 如何展示已执行的批量操作
- ❓ 是否支持重新应用历史操作

### 4.3 进度反馈

- ❓ 批量操作执行时的进度显示
- ❓ 单个操作失败的错误处理 UI
- ❓ 部分成功的状态展示

### 4.4 预览优化

- ❓ 是否需要更详细的预览（如节点树可视化）
- ❓ 是否支持编辑 AI 建议的操作
- ❓ 是否支持部分应用批量操作

## 5. 集成到 Chat Panel

UI 组件需要集成到 Chat Panel 中，具体集成方案待讨论：

- 操作卡片的位置和布局
- 与对话消息的交互方式
- 多个操作建议的展示方式
- 操作状态的持久化

## 6. 下一步

1. 实现前端解析和流式输出处理逻辑
2. 确定影响评估和确认机制的设计
3. 设计操作历史的展示方式
4. 确定进度反馈和错误处理的交互
5. 设计 Chat Panel 集成方案
6. 实现原型并收集用户反馈
