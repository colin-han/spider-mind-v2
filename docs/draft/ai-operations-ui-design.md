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

### 1.1 操作列表面板

用于展示 AI 返回的操作列表，支持用户选择性执行部分或全部操作。

**组件定义**:

```typescript
/**
 * 操作列表面板
 */
interface OperationsPanelProps {
  operations: AIOperation[];
  loading: boolean; // 是否正在加载操作
  onAccept: (selectedIds: string[]) => void; // 执行选中的操作
  onReject: () => void; // 拒绝所有操作
}

function OperationsPanel({
  operations,
  loading,
  onAccept,
  onReject,
}: OperationsPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    // 默认全选
    operations.map((op) => op.id)
  );

  const toggleOperation = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === operations.length ? [] : operations.map((op) => op.id)
    );
  };

  return (
    <div className="border border-gray-200 bg-white rounded-lg p-4 mt-2">
      {loading ? (
        // Loading 状态
        <div className="flex items-center gap-2 text-gray-500">
          <Spinner className="w-4 h-4 animate-spin" />
          <span>正在生成操作...</span>
        </div>
      ) : (
        // 操作列表
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              建议的操作 ({operations.length})
            </h4>
            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedIds.length === operations.length ? "取消全选" : "全选"}
            </button>
          </div>

          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {operations.map((op) => (
              <label
                key={op.id}
                className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(op.id)}
                  onChange={() => toggleOperation(op.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {op.description}
                  </div>
                  {op.preview && (
                    <div className="text-xs text-gray-500 mt-1">
                      {op.preview.summary}
                    </div>
                  )}
                  {op.metadata && (
                    <div className="text-xs text-gray-400 mt-1">
                      置信度: {(op.metadata.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2 justify-end border-t pt-3">
            <button
              onClick={onReject}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => onAccept(selectedIds)}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              应用 ({selectedIds.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**功能**:

- **Loading 状态**: 显示加载动画，提示正在生成操作
- **操作列表**: 以 checkbox 列表形式展示所有操作
- **选择控制**:
  - 每个操作可单独选择/取消
  - 提供"全选/取消全选"快捷按钮
  - 默认全选所有操作
- **操作信息**: 显示描述、预览摘要、AI 置信度
- **执行控制**:
  - "应用"按钮：执行选中的操作，显示选中数量
  - "取消"按钮：拒绝所有操作
  - 未选中任何操作时禁用"应用"按钮

**状态管理**:

- `loading`: 正在等待 `</operations>` 标签完成
- `operations`: 解析完成的操作列表
- `selectedIds`: 用户选中的操作 ID 列表

## 2. 交互流程

### 2.1 完整流程

```
用户输入问题
  ↓
发送到 LLM (使用 streamText)
  ↓
LLM 开始流式返回响应
  ↓
前端实时显示文本内容
  ↓
检测到 <operations> 标签
  ↓
停止文本流式输出
  ↓
在输出下方显示 OperationsPanel (loading: true)
  ↓
继续接收流式数据
  ↓
检测到 </operations> 标签
  ↓
解析 JSON，提取操作列表
  ↓
更新 OperationsPanel (loading: false, operations: [...])
  ↓
用户查看操作列表
  ↓
用户选择要执行的操作（checkbox）
  ↓
用户点击"应用" or "取消"
  ↓
  ┌─────────────┴─────────────┐
  │                           │
  ▼                           ▼
执行选中的操作             关闭面板
  ↓
调用 AIOperationExecutor
  ↓
验证操作 (validateOperations)
  ↓
执行操作 (executeBatch)
  ↓
  - 分组 undoable/non-undoable
  - 执行 undoable (CompositeCommand)
  - 执行 non-undoable
  ↓
显示执行结果
  ↓
关闭面板
```

### 2.2 关键状态转换

1. **初始状态**: 正常流式输出文本
2. **检测到 `<operations>`**:
   - 停止文本输出
   - 显示 loading 面板
3. **接收 `</operations>`**:
   - 解析操作
   - 显示操作列表
4. **用户交互**:
   - 选择操作
   - 点击"应用"或"取消"
5. **执行阶段**:
   - 验证选中的操作
   - 执行操作
   - 显示结果

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

在 Chat 组件中处理流式输出，当检测到 `<operations>` 标签时停止文本输出并显示操作面板：

```typescript
// 在 Chat 组件中处理流式输出
function handleStreamingResponse(chunk: string) {
  // 累积接收到的文本
  accumulatedText += chunk;

  // 检测是否遇到 <operations> 标签
  if (hasOperationsTag(accumulatedText)) {
    // 提取说明部分（标签之前的文本）
    const explanation = extractExplanation(accumulatedText);

    // 停止文本流式输出，显示完整的说明
    setDisplayText(explanation);
    setIsStreaming(false);

    // 显示 loading 面板
    setShowOperationsPanel(true);
    setOperationsLoading(true);

    // 等待完整的 </operations> 标签
    if (accumulatedText.includes("</operations>")) {
      // 解析操作列表
      const operations = extractOperations(accumulatedText);

      // 更新面板：显示操作列表
      setOperations(operations);
      setOperationsLoading(false);
    }
  } else {
    // 正常流式显示文本
    setDisplayText(accumulatedText);
  }
}
```

**状态管理**:

```typescript
interface ChatState {
  displayText: string; // 显示的文本内容
  isStreaming: boolean; // 是否正在流式输出
  showOperationsPanel: boolean; // 是否显示操作面板
  operationsLoading: boolean; // 操作面板是否在 loading 状态
  operations: AIOperation[]; // 解析出的操作列表
  accumulatedText: string; // 累积的完整文本
}
```

**流程说明**:

1. **正常流式输出**:
   - 累积文本并实时显示
   - 检测是否包含 `<operations>` 标签

2. **检测到 `<operations>` 标签**:
   - 提取标签之前的说明文本
   - 停止文本流式输出（`setIsStreaming(false)`）
   - 显示完整的说明文本
   - 在说明下方显示 loading 面板

3. **继续接收数据**:
   - 继续累积文本
   - 检测 `</operations>` 结束标签

4. **检测到 `</operations>` 标签**:
   - 解析 JSON，提取操作列表
   - 更新面板：关闭 loading，显示操作列表
   - 用户可以选择操作并执行

**UI 渲染**:

```typescript
function ChatMessage() {
  return (
    <div className="message">
      {/* 显示说明文本 */}
      <div className="prose">
        <ReactMarkdown>{displayText}</ReactMarkdown>
      </div>

      {/* 操作面板（条件渲染） */}
      {showOperationsPanel && (
        <OperationsPanel
          operations={operations}
          loading={operationsLoading}
          onAccept={handleAcceptOperations}
          onReject={handleRejectOperations}
        />
      )}
    </div>
  );
}
```

**优势**:

1. **清晰的状态转换**: 从流式输出平滑切换到操作选择
2. **避免显示不完整数据**:
   - 文本部分完整显示后才停止
   - JSON 部分在 loading 状态下隐藏
3. **良好的用户体验**:
   - Loading 状态提供明确反馈
   - 用户可以先阅读说明，再查看操作
4. **灵活的选择**: 用户可以选择性执行部分操作

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
   * 执行选中的操作
   *
   * 执行策略：
   * 1. 将操作按 undoable 属性分组
   * 2. 先执行所有 undoable=true 的命令（组合成 CompositeCommand，一次 undo 撤销）
   * 3. 成功后再依次执行 undoable=false 的命令（系统级操作如 save）
   *
   * @param operations - 用户选中的操作列表
   * @param description - 操作批次的描述（用于 undo 历史）
   */
  async executeSelected(
    operations: AIOperation[],
    description: string = "执行 AI 操作"
  ): Promise<void> {
    const root = useMindmapStore.getState();

    // 分组：undoable 和 non-undoable 操作
    const undoableOps: AIOperation[] = [];
    const nonUndoableOps: AIOperation[] = [];

    for (const op of operations) {
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
        description,
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

1. **单个操作执行** (`executeOperation`):
   - 直接调用 `commandManager.executeCommand()`
   - 命令会返回相应的 EditorAction[]
   - 自动加入历史记录（如果 `undoable=true`）

2. **选中操作执行** (`executeSelected`):
   - **分组阶段**: 将选中的操作按 `undoable` 属性分为两组
   - **执行 undoable 操作**:
     - 使用 `createCompositeCommand()` 创建组合命令
     - 所有操作的 actions 合并到一个 HistoryItem
     - 一次 undo 可以撤销选中的所有操作
   - **执行 non-undoable 操作**:
     - 依次执行系统级操作（如保存）
     - 这些操作不会进入历史记录
     - 确保只有在 undoable 操作成功后才执行

3. **优势**:
   - 支持选择性执行部分操作
   - 保证批量操作的原子性
   - 正确处理可撤销和不可撤销操作
   - 避免将系统操作加入 undo 历史
   - 失败时可以安全回滚

**使用示例**:

```typescript
// 在 OperationsPanel 组件中
function OperationsPanel({
  operations,
  loading,
  onAccept,
  onReject,
}: OperationsPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    operations.map((op) => op.id)
  );
  const executor = new AIOperationExecutor();

  const handleAccept = async (selectedIds: string[]) => {
    try {
      // 筛选出选中的操作
      const selectedOps = operations.filter((op) =>
        selectedIds.includes(op.id)
      );

      // 验证操作
      const validationResult = validateOperations(selectedOps);
      if (!validationResult.valid) {
        toast.error(`验证失败: ${validationResult.error}`);
        return;
      }

      // 执行选中的操作
      await executor.executeSelected(selectedOps, "执行 AI 建议的操作");

      // 执行成功
      toast.success(`成功执行 ${selectedOps.length} 个操作`);
      onAccept(selectedIds);
    } catch (error) {
      console.error("Failed to execute operations:", error);
      toast.error("执行操作失败");
    }
  };

  return (
    <div>
      {/* ... 操作列表 UI ... */}
      <button onClick={() => handleAccept(selectedIds)}>
        应用 ({selectedIds.length})
      </button>
    </div>
  );
}

// 在 ChatMessage 组件中的集成
function ChatMessage() {
  const handleAcceptOperations = async (selectedIds: string[]) => {
    // OperationsPanel 已经执行了操作
    // 这里只需要关闭面板
    setShowOperationsPanel(false);
  };

  const handleRejectOperations = () => {
    // 用户拒绝操作
    setShowOperationsPanel(false);
  };

  return (
    <div className="message">
      <div className="prose">
        <ReactMarkdown>{displayText}</ReactMarkdown>
      </div>

      {showOperationsPanel && (
        <OperationsPanel
          operations={operations}
          loading={operationsLoading}
          onAccept={handleAcceptOperations}
          onReject={handleRejectOperations}
        />
      )}
    </div>
  );
}
```

## 4. 已排除的功能

以下功能经过讨论后确定不需要实现：

### 4.1 影响评估

- ❌ ~~如何评估操作的影响程度~~（不需要，系统有 undo 能力）
- ❌ ~~是否需要不同的确认级别~~（不需要，系统有 undo 能力）
- ❌ ~~删除等高风险操作的二次确认~~（不需要，系统有 undo 能力）

### 4.2 操作历史

- ❌ ~~是否需要显示 AI 操作历史~~（不需要，合并到 undo/redo 历史中）
- ❌ ~~如何展示已执行的批量操作~~（不需要，合并到 undo/redo 历史中）
- ❌ ~~是否支持重新应用历史操作~~（不需要，合并到 undo/redo 历史中）

### 4.3 进度反馈

- ❌ ~~批量操作执行时的进度显示~~（不需要，操作执行很快）
- ❌ ~~单个操作失败的错误处理 UI~~（不需要，操作执行很快，失败时直接 toast 提示）
- ❌ ~~部分成功的状态展示~~（不需要，操作执行很快）

### 4.4 预览优化

- ❌ ~~是否需要更详细的预览（如节点树可视化）~~（不需要）
- ❌ ~~是否支持编辑 AI 建议的操作~~（不需要）
- ✅ ~~是否支持部分应用批量操作~~（已在当前设计中支持）

## 5. 设计总结

### 5.1 核心设计决策

1. **操作选择性执行**:
   - 用户可以通过 checkbox 选择要执行的操作
   - 默认全选，支持单选、多选、全选/取消全选
   - 只执行用户选中的操作

2. **流式输出处理**:
   - 检测 `<operations>` 标签后停止文本流式输出
   - 显示 loading 面板，等待 `</operations>` 标签
   - 解析完成后显示操作列表

3. **操作面板设计**:
   - Loading 状态：显示加载动画
   - 操作列表：checkbox 列表，显示描述、预览、置信度
   - 控制按钮："应用"（显示选中数量）、"取消"

4. **执行逻辑**:
   - 在面板内部完成验证和执行
   - 执行成功后通过回调通知父组件
   - 支持 undoable/non-undoable 分组执行

### 5.2 用户体验优势

1. **清晰的状态反馈**:
   - 流式输出 → loading → 操作列表 → 执行结果
   - 每个阶段都有明确的视觉反馈

2. **灵活的控制**:
   - 用户可以选择性执行部分操作
   - 避免执行不需要或有风险的操作

3. **避免显示不完整数据**:
   - 文本部分在 loading 前完整显示
   - JSON 在 loading 状态下隐藏
   - 操作列表解析完成后才显示

4. **原子性保证**:
   - 选中的所有 undoable 操作在一个事务中
   - 一次 undo 可以撤销选中的所有操作

### 5.3 技术要点

1. **状态管理**:
   - `isStreaming`: 是否正在流式输出
   - `showOperationsPanel`: 是否显示操作面板
   - `operationsLoading`: 面板是否在 loading 状态
   - `operations`: 解析出的操作列表
   - `selectedIds`: 用户选中的操作 ID

2. **执行器设计**:
   - `executeOperation()`: 执行单个操作
   - `executeSelected()`: 执行选中的操作列表
   - 支持 undoable/non-undoable 分组

3. **验证机制**:
   - 执行前验证所有选中的操作
   - 检查命令存在性、节点存在性、前置条件
   - 验证失败时阻止执行并提示错误

## 6. 集成到 Chat Panel

UI 组件需要集成到 Chat Panel 中，具体集成方案待讨论：

- 操作面板的位置和布局（当前设计：在消息下方）
- 与对话消息的交互方式
- 多个操作建议的展示方式（如果 AI 返回多组操作）
- 操作状态的持久化（已执行的操作如何标记）

## 7. 下一步

**设计确认**:

1. ✅ 确认操作选择性执行的交互流程
2. ✅ 确认流式输出的处理方式
3. ✅ 确认操作面板的设计
4. ⏳ 待用户确认后开始实施

**实施计划**（待确认后执行）:

1. 实现 OperationsPanel 组件
2. 实现流式输出处理逻辑
3. 实现 AIOperationExecutor 类
4. 集成到 Chat 组件
5. 添加错误处理和用户反馈
6. 测试和优化
