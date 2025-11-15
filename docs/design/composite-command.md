# CompositeCommand 设计文档

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-15
- 最后更新：2025-11-15
- 相关文档：
  - [Command 层架构设计](./command-layer-design.md)
  - [Command 参考手册](./command-reference.md)
  - [Action 层架构设计](./action-layer-design.md)

## 关键概念

| 概念             | 定义                                                                               | 示例/说明                                                            |
| ---------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CompositeCommand | 将多个子命令组合为一个原子操作的命令，所有子命令的 actions 在同一个 HistoryItem 中 | AI 批量操作：一次创建多个节点，一次 undo 撤销所有                    |
| SubCommand       | 组成 CompositeCommand 的子命令定义，包含 commandId 和参数                          | `{ commandId: "node.addChild", params: ["parent-123", 0, "节点1"] }` |
| 原子性           | 批量操作作为一个整体，要么全部成功，要么全部失败                                   | 避免部分执行导致的不一致状态                                         |

## 概述

实现一个组合命令执行器，允许将多个子命令组合为一个原子操作，保证批量操作的原子性和可撤销性。

## 背景和动机

### 问题场景

AI 建议"重组节点结构"时，需要执行一系列操作：

1. 创建一个分组节点
2. 移动节点 A 到分组
3. 移动节点 B 到分组
4. 调整子节点顺序

如果分别执行 4 个命令：

- ❌ 会产生 4 个 HistoryItem
- ❌ 需要 undo 4 次才能完全撤销
- ❌ 中间状态可能不一致

### 设计需求

- **原子性**: 所有子命令的 actions 在同一个 HistoryItem 中
- **可撤销性**: 一次 undo 撤销整个组合命令的所有效果
- **简洁性**: 代码简单，易于理解和维护
- **复用性**: 完全复用现有的 Command 和 Action 系统

## 设计目标

1. 支持将多个子命令组合为一个原子操作
2. 保证批量操作的完整性（全或无）
3. 一次 undo 撤销所有子命令的效果
4. 完全复用现有的 CommandManager 和 HistoryManager
5. 只支持可撤销的命令，保持设计简洁

## 设计方案

### 架构概览

```
AI 操作系统
    ↓ 创建组合命令
createCompositeCommand(description, subCommands)
    ↓ 返回
CommandDefinition (actionBased: true)
    ↓ 执行
commandManager.executeCommand(...)
    ↓ 调用 handler
收集所有子命令的 actions
    ↓ 返回
EditorAction[]
    ↓ 记录
historyManager.execute(allActions)
    ↓ 结果
单个 HistoryItem（一次 undo 撤销全部）
```

### 详细设计

#### 数据模型

**SubCommand 接口**：

```typescript
/**
 * 子命令定义
 *
 * 约束：
 * - 必须是 actionBased: true 的命令
 * - 必须是可撤销的命令（undoable !== false）
 */
export interface SubCommand {
  commandId: string; // 子命令ID，如 "node.addChild"
  params: unknown[]; // 子命令参数
}
```

#### 接口定义

**createCompositeCommand 工厂函数**：

```typescript
/**
 * 创建组合命令
 *
 * 返回一个标准的 CommandDefinition，可以通过 commandManager 执行
 *
 * 约束：
 * - 所有子命令必须是 actionBased: true
 * - 所有子命令必须是 undoable: true（默认）或未显式设置为 false
 *
 * @param description - 操作描述，显示在 undo/redo 历史中
 * @param subCommands - 子命令列表
 * @returns CommandDefinition - 标准命令定义
 */
export function createCompositeCommand(
  description: string,
  subCommands: SubCommand[]
): CommandDefinition;
```

#### 核心逻辑

**执行流程**：

1. **创建阶段**：调用 `createCompositeCommand()` 创建组合命令，返回标准 CommandDefinition
2. **执行阶段**：通过 `commandManager.executeCommand()` 执行
3. **收集阶段**（handler 内部）：
   - 遍历所有子命令
   - 执行 4 个检查点：
     - 命令是否存在
     - 命令是否是 actionBased: true
     - 命令是否是 undoable !== false
     - 命令的 when 条件是否满足
   - 收集所有子命令返回的 actions
4. **返回阶段**：handler 返回收集的所有 actions
5. **记录阶段**：commandManager 自动调用 historyManager 记录为单个 HistoryItem

**错误处理策略**：

- **严格的全或无策略**：任何检查失败都立即抛出错误，中止整个执行
- **fail-fast 模式**：在收集阶段发现错误立即中止，不会执行任何 action
- **数据一致性保证**：只有所有检查通过才会执行，避免部分执行

## 实现要点

### 关键约束

1. **只支持 actionBased: true 的命令**
   - 原因：CompositeCommand 需要收集 actions 并返回
   - 不支持直接执行的命令（actionBased: false）

2. **只支持可撤销的命令（undoable !== false）**
   - 原因：CompositeCommand 的核心价值是原子性和可撤销性
   - 简化设计，降低复杂度

3. **返回标准 CommandDefinition**
   - 使用临时 id（如 `ai.composite.${Date.now()}`）
   - 不需要注册到 commandRegistry
   - 通过 commandManager 执行

### 文件组织

```
src/domain/commands/
├── composite/
│   ├── __tests__/
│   │   └── create-composite-command.test.ts  # 测试文件
│   ├── create-composite-command.ts            # 核心实现
│   └── index.ts                               # 导出
```

## 使用示例

### 示例 1: AI 批量创建节点

```typescript
import { createCompositeCommand } from "@/domain/commands/composite";
import { useMindmapStore } from "@/domain/mindmap-store";

const root = useMindmapStore.getState();

// 1. 创建组合命令
const compositeCommand = createCompositeCommand("批量创建子节点", [
  { commandId: "node.addChild", params: ["parent-123", 0, "节点1"] },
  { commandId: "node.addChild", params: ["parent-123", 1, "节点2"] },
  { commandId: "node.addChild", params: ["parent-123", 2, "节点3"] },
]);

// 2. 通过 commandManager 执行
await root.commandManager!.executeCommand(
  {
    commandId: compositeCommand.id,
    params: [],
  },
  compositeCommand
);

// 结果：
// - 创建了 3 个节点
// - 所有 actions 在一个 HistoryItem 中
// - 一次 undo 撤销所有 3 个节点
```

### 示例 2: AI 复杂重组操作

```typescript
const batch = {
  description: "重组节点结构",
  operations: [
    { commandId: "node.addChild", params: ["parent-id", 0, "重要功能"] },
    { commandId: "node.move", params: ["node-a-id", "group-node-id", 0] },
    { commandId: "node.move", params: ["node-b-id", "group-node-id", 1] },
  ],
};

const compositeCommand = createCompositeCommand(
  batch.description,
  batch.operations
);

await root.commandManager!.executeCommand(
  {
    commandId: compositeCommand.id,
    params: [],
  },
  compositeCommand
);

// 结果：
// - 执行了 3 个子命令
// - 产生了约 10+ 个 EditorAction
// - 所有 actions 在一个 HistoryItem 中
// - 一次 undo 撤销整个重组操作
```

### 示例 3: AI 操作系统集成

```typescript
// src/lib/ai/ai-operation-executor.ts

import { createCompositeCommand } from "@/domain/commands/composite";

class AIOperationExecutor {
  async executeBatch(batch: AIOperationBatch): Promise<void> {
    const root = useMindmapStore.getState();

    // 创建组合命令
    const compositeCommand = createCompositeCommand(
      batch.description,
      batch.operations
    );

    // 执行
    await root.commandManager!.executeCommand(
      {
        commandId: compositeCommand.id,
        params: [],
      },
      compositeCommand
    );
  }
}
```

## 设计决策

### 为什么返回 CommandDefinition 而不是独立执行函数？

**选择**：返回标准 CommandDefinition

**理由**：

1. **架构一致性**：完全利用现有的 commandManager 执行流程
2. **复用 HistoryManager**：自动记录到历史栈，无需特殊处理
3. **简化实现**：不需要实现独立的执行逻辑
4. **代码量更少**：约 50 行（vs 独立执行函数约 80 行）

### 为什么不支持 undoable: false 的命令？

**选择**：只支持可撤销的命令

**理由**：

1. **简化设计**：降低复杂度，减少边界情况处理
2. **核心价值聚焦**：CompositeCommand 的核心价值是原子性和可撤销性
3. **实际需求**：AI 批量操作通常都需要 undo
4. **替代方案可用**：不可撤销的操作可以在批量操作完成后单独执行

**复杂性对比**：

| 方面         | 支持 undoable: false      | 不支持 undoable: false |
| ------------ | ------------------------- | ---------------------- |
| handler 实现 | 需要分类收集、分别处理    | 直接收集所有 actions   |
| 执行流程     | 两阶段（收集、执行）      | 单阶段（收集、返回）   |
| 边界情况     | 需处理"只有 non-undoable" | 无边界情况             |
| 代码行数     | ~80 行                    | ~50 行                 |

### 为什么使用临时 id？

**选择**：使用 `ai.composite.${Date.now()}` 作为 id

**理由**：

1. **不需要注册**：直接传递给 commandManager 执行
2. **避免冲突**：时间戳保证唯一性
3. **历史显示**：HistoryItem 使用 description 而非 id 显示

## 替代方案

### 方案 A：独立执行函数（未采用）

**设计**：

```typescript
async function executeCompositeCommand(
  root: MindmapStore,
  description: string,
  subCommands: SubCommand[]
): Promise<void>;
```

**优点**：

- 不需要临时 id
- 直接执行，更直观

**缺点**：

- 需要实现独立的执行逻辑（绕过 commandManager）
- 需要手动调用 historyManager
- 架构不一致
- 代码量更多（约 80 行）

**不采用理由**：架构一致性更重要，临时 id 的问题可以接受

## FAQ

### Q: 可以嵌套 CompositeCommand 吗？

A: 不支持。子命令必须是具体的操作命令（如 node.addChild），不能是另一个 CompositeCommand。

### Q: 如果子命令执行失败会怎样？

A: 采用严格的全或无策略，任何失败都会中止整个执行并抛出错误，不会执行任何 action。

### Q: 可以混合使用可撤销和不可撤销的命令吗？

A: 不支持。所有子命令必须是可撤销的（undoable !== false）。如果需要混合，应该分开执行。

### Q: CompositeCommand 的性能如何？

A: 性能与单独执行子命令相同。只是将多个 actions 合并到一个 HistoryItem 中，不会增加额外开销。

### Q: 何时使用 CompositeCommand？

A:

- ✅ AI 返回的批量操作
- ✅ 需要保证原子性的多步操作
- ✅ 需要一次 undo 撤销的操作序列
- ❌ 单个命令（直接使用 CommandManager）
- ❌ 不需要 undo 的操作

## 参考资料

- [Command 层架构设计](./command-layer-design.md) - 命令系统的完整设计
- [Command 参考手册](./command-reference.md) - 所有可用命令的列表
- [Action 层架构设计](./action-layer-design.md) - Action 系统设计

## 修订历史

| 日期       | 版本 | 修改内容                              | 作者        |
| ---------- | ---- | ------------------------------------- | ----------- |
| 2025-11-15 | 1.0  | 初始版本，基于实现完成的 V10 简化设计 | Claude Code |
