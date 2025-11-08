# Action 层架构设计

## 文档信息

- **创建日期**: 2025-11-06
- **版本**: 1.0.0
- **相关文档**:
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [MindmapStore 架构设计](./mindmap-store-design.md)

## 概述

Action 层是领域层中负责**状态变更**的核心层，它定义了所有可以对 EditorState 和 IndexedDB 进行的原子操作。每个 Action 代表一个独立的、可逆的、原子性的状态变更。

### 设计目标

1. **原子性**: 每个 Action 是不可分割的最小操作单元
2. **可逆性**: 所有持久化 Action 必须支持 undo/redo
3. **双层应用**: 同时更新内存状态和数据库
4. **类型安全**: 完整的 TypeScript 类型定义
5. **职责单一**: 每个 Action 只做一件事

## 核心接口

### EditorAction 接口

所有 Action 必须实现 `EditorAction` 接口：

```typescript
interface EditorAction {
  // 应用到内存状态（同步）
  applyToEditorState(state: EditorState): void;

  // 应用到数据库（异步）
  applyToIndexedDB(): Promise<void>;

  // 生成逆操作（用于撤销）
  reverse(): EditorAction;

  // Action 类型标识
  type: string;
}
```

### 关键特性

- **applyToEditorState**: 使用 Immer 的 `produce()` 修改 Draft 状态，立即响应用户操作
- **applyToIndexedDB**: 异步持久化到 IndexedDB，保证数据安全
- **reverse**: 生成逆操作，支持 undo/redo 功能
- **type**: 用于日志记录和调试

## Action 分类

### 1. 持久化 Action（修改节点数据）

这类 Action 会修改思维导图的节点数据，需要持久化到数据库，并支持 undo/redo。

#### AddNodeAction

**职责**: 添加新节点到思维导图

**参数**:

```typescript
{
  node: MindmapNode,              // 完整的节点对象
  setAsCurrent?: boolean          // 是否设为当前选中节点
}
```

**状态变更**:

- 将节点添加到 `EditorState.nodes` Map
- 标记节点为 dirty（需要同步）
- 可选：设置为当前节点

**数据库操作**:

- 在 `mindmap_nodes` 表中插入新记录
- 设置 `dirty = true`

**逆操作**: `RemoveNodeAction`

**使用场景**:

- 添加子节点 (Tab)
- 添加兄弟节点 (Enter)

---

#### RemoveNodeAction

**职责**: 删除节点（软删除）

**参数**:

```typescript
{
  nodeId: string,                 // 节点的 short_id
  originalNode: MindmapNode       // 保存原节点数据用于恢复
}
```

**状态变更**:

- 从 `EditorState.nodes` Map 中移除节点
- 从 `collapsedNodes` Set 中移除
- 如果是当前节点，切换到父节点或兄弟节点

**数据库操作**:

- 标记 `deleted = true`
- 更新 `dirty = true`

**逆操作**: `AddNodeAction`

**使用场景**:

- 删除节点 (Delete/Backspace)

**⚠️ 约束**:

- 不能删除根节点
- 删除后需要重新分配兄弟节点的 `order_index`

---

#### UpdateNodeAction

**职责**: 更新节点的字段（标题、内容等）

**参数**:

```typescript
{
  nodeId: string,                 // 节点的 short_id
  updates: Partial<MindmapNode>,  // 要更新的字段
  oldValues: Partial<MindmapNode> // 旧值（用于撤销）
}
```

**状态变更**:

- 合并更新到 `EditorState.nodes` 中的对应节点
- 标记节点为 dirty

**数据库操作**:

- 更新 `mindmap_nodes` 表中的对应字段
- 设置 `dirty = true`
- 更新 `local_updated_at` 时间戳

**逆操作**: `UpdateNodeAction`（使用旧值）

**使用场景**:

- 修改节点标题 (title)
- 更新节点详细说明 (note)
- 移动节点（更新 parent_id 和 order_index）

---

### 2. 非持久化 Action（仅 UI 状态）

这类 Action 只影响 UI 显示状态，不修改节点数据，不需要持久化。

#### SetCurrentNodeAction

**职责**: 设置当前选中的节点

**参数**:

```typescript
{
  nodeId: string | null,          // 要选中的节点 ID
  previousNodeId: string | null   // 之前选中的节点（用于撤销）
}
```

**状态变更**:

- 更新 `EditorState.currentNode`

**数据库操作**: 无

**逆操作**: `SetCurrentNodeAction`（恢复之前的节点）

**使用场景**:

- 键盘导航（方向键）
- 鼠标点击节点

---

#### CollapseNodeAction

**职责**: 折叠节点，隐藏其子树

**参数**:

```typescript
{
  nodeId: string; // 要折叠的节点 ID
}
```

**状态变更**:

- 将节点 ID 添加到 `EditorState.collapsedNodes` Set

**数据库操作**: 无

**逆操作**: `ExpandNodeAction`

**使用场景**:

- 折叠快捷键 (-)
- 点击折叠按钮

---

#### ExpandNodeAction

**职责**: 展开节点，显示其子树

**参数**:

```typescript
{
  nodeId: string; // 要展开的节点 ID
}
```

**状态变更**:

- 从 `EditorState.collapsedNodes` Set 中移除节点 ID

**数据库操作**: 无

**逆操作**: `CollapseNodeAction`

**使用场景**:

- 展开快捷键 (=)
- 点击展开按钮
- 切换快捷键 (Space)

---

#### SetFocusedAreaAction

**职责**: 设置当前焦点区域（画布 vs 大纲）

**参数**:

```typescript
{
  area: FocusedArea; // "canvas" | "outline"
}
```

**状态变更**:

- 更新 `EditorState.focusedArea`

**数据库操作**: 无

**逆操作**: `SetFocusedAreaAction`（恢复之前的焦点）

**使用场景**:

- 切换焦点区域

---

## Action 执行流程

### 完整执行链

```
用户操作
  ↓
CommandHandler 生成 Action[]
  ↓
MindmapStore.acceptActions()
  ├─→ applyToEditorState() [同步，立即响应]
  │    └─ Immer produce() 更新 EditorState
  │         └─ Zustand 通知订阅者
  │              └─ UI 自动重新渲染
  │
  └─→ applyToIndexedDB() [异步，数据安全]
       └─ idb 库操作数据库
            └─ 更新 dirty 标志
                 └─ 等待 save() 同步到服务器
```

### 批量执行

多个 Action 可以批量执行，共享单个数据库事务：

```typescript
await acceptActions([
  new UpdateNodeAction(nodeId, { parent_short_id: newParentId }),
  new UpdateNodeAction(nodeId, { order_index: newIndex }),
  new SetCurrentNodeAction(nodeId),
]);
```

**优势**:

- 原子性：要么全部成功，要么全部失败
- 性能：减少数据库 I/O 次数
- 一致性：状态更新是同步的

## 双层存储策略

### 设计原理

```
┌─────────────────────────────────────┐
│      EditorState (内存)              │
│  - 立即响应，O(1) 查询               │
│  - 使用 Map/Set 优化性能             │
│  - Immer 保证不可变性                │
└─────────────────────────────────────┘
           ↓ (异步)
┌─────────────────────────────────────┐
│      IndexedDB (本地数据库)          │
│  - 数据持久化，防止丢失               │
│  - dirty 标志追踪未同步变更          │
│  - 支持离线编辑                      │
└─────────────────────────────────────┘
           ↓ (手动触发)
┌─────────────────────────────────────┐
│      Supabase (服务器数据库)         │
│  - 云端存储，多设备同步               │
│  - 冲突检测和解决                    │
│  - 协作功能基础                      │
└─────────────────────────────────────┘
```

### 性能优化

1. **内存优先**: 使用 Map 和 Set 实现 O(1) 查询
2. **异步持久化**: 不阻塞 UI 响应
3. **批量事务**: 减少数据库操作次数
4. **脏数据追踪**: 只同步变更的节点

## Undo/Redo 支持

### 历史栈管理

```
HistoryManager
  ├─ undoStack: EditorAction[][]     // 已执行的操作
  └─ redoStack: EditorAction[][]     // 已撤销的操作
```

### 执行流程

**Undo**:

```typescript
1. 从 undoStack 弹出 actions
2. 对每个 action 调用 reverse()
3. 执行逆 actions（应用到状态和数据库）
4. 将原 actions 推入 redoStack
```

**Redo**:

```typescript
1. 从 redoStack 弹出 actions
2. 重新执行这些 actions
3. 将 actions 推入 undoStack
```

### 可撤销性控制

Command 通过 `undoable` 标志控制是否记录历史：

```typescript
// 可撤销命令（修改数据）
new CommandDefinition({
  id: "node.addChild",
  undoable: true,      // ✅ 记录到历史栈
  handler: () => [new AddNodeAction(...)]
});

// 不可撤销命令（仅 UI）
new CommandDefinition({
  id: "navigation.selectParent",
  undoable: false,     // ❌ 不记录历史
  handler: () => [new SetCurrentNodeAction(...)]
});
```

## 添加新 Action 的最佳实践

### 1. 确定 Action 类型

**决策树**:

```
是否修改节点数据？
├─ 是 → 持久化 Action
│   └─ 需要实现完整的 EditorAction 接口
│   └─ 必须支持 reverse()
│   └─ 必须更新 dirty 标志
│
└─ 否 → 非持久化 Action
    └─ applyToIndexedDB() 返回 Promise.resolve()
    └─ reverse() 可选（如果需要撤销）
```

### 2. 创建 Action 类

**文件位置**: `src/domain/actions/{action-name}.ts`

**命名规范**: `{Verb}{Subject}Action`

- ✅ 好的命名: `AddNodeAction`, `UpdateNodeAction`, `SetCurrentNodeAction`
- ❌ 不好的命名: `NodeAction`, `DoSomethingAction`

**基本模板**:

```typescript
import type { EditorAction, EditorState } from "../mindmap-store.types";
import type { MindmapNode } from "@/lib/types";
import { getDB } from "@/lib/db/schema";

export class MyNewAction implements EditorAction {
  type = "MyNewAction";

  constructor(
    private param1: string,
    private param2: number
  ) {}

  applyToEditorState(state: EditorState): void {
    // 使用 Immer Draft 修改状态
    // state 是可变的，直接修改即可
  }

  async applyToIndexedDB(): Promise<void> {
    // 如果是持久化 Action
    const db = await getDB();
    const tx = db.transaction("mindmap_nodes", "readwrite");
    // ... 数据库操作
    await tx.done;
  }

  reverse(): EditorAction {
    // 返回逆操作
    return new ReverseAction(...);
  }
}
```

### 3. 编写单元测试

**测试文件**: `src/domain/actions/__tests__/{action-name}.test.ts`

**测试要点**:

- ✅ 测试状态变更是否正确
- ✅ 测试数据库操作是否正确
- ✅ 测试 reverse() 是否生成正确的逆操作
- ✅ 测试边界情况和异常处理

### 4. 在 Command 中使用

```typescript
// src/domain/commands/my-feature/my-command.ts
export const myCommandDefinition = new CommandDefinition({
  id: "feature.myCommand",
  description: "执行我的操作",
  undoable: true, // 如果是持久化 Action
  handler: (params) => {
    // 返回 Action 数组
    return [new MyNewAction(param1, param2)];
  },
});
```

### 5. 常见陷阱

**❌ 不要在 applyToEditorState 中调用异步操作**:

```typescript
// 错误示例
applyToEditorState(state: EditorState): void {
  await someAsyncFunction();  // ❌ 不允许
  state.nodes.set(...);
}
```

**❌ 不要在 applyToIndexedDB 中修改 state**:

```typescript
// 错误示例
async applyToIndexedDB(): Promise<void> {
  state.nodes.set(...);  // ❌ state 不可访问
  await db.put(...);
}
```

**❌ 不要忘记更新 dirty 标志**:

```typescript
// 错误示例
async applyToIndexedDB(): Promise<void> {
  await db.put("mindmap_nodes", {
    ...node,
    // dirty: true,  // ❌ 忘记设置
  });
}
```

**✅ 正确示例**:

```typescript
applyToEditorState(state: EditorState): void {
  // 同步修改状态
  const node = state.nodes.get(this.nodeId);
  if (node) {
    node.title = this.newTitle;
  }
}

async applyToIndexedDB(): Promise<void> {
  // 异步持久化
  const db = await getDB();
  const node = await db.get("mindmap_nodes", this.nodeId);
  if (node) {
    await db.put("mindmap_nodes", {
      ...node,
      title: this.newTitle,
      dirty: true,  // ✅ 标记为脏数据
      local_updated_at: new Date().toISOString(),
    });
  }
}
```

## 性能考虑

### 优化策略

1. **使用 Map 和 Set**:
   - `nodes: Map<string, MindmapNode>` - O(1) 查询
   - `collapsedNodes: Set<string>` - O(1) 检查

2. **批量操作**:
   - 多个 Action 共享一个数据库事务
   - 减少 Zustand 的更新通知次数

3. **避免不必要的拷贝**:
   - Immer 只拷贝修改的部分
   - 不要在每个 Action 中深拷贝整个状态

4. **异步持久化**:
   - 不阻塞 UI 线程
   - 使用 IndexedDB 的事务机制

### 性能瓶颈

**已知问题**:

- 大量节点时，遍历所有子节点会变慢（`getDescendantNodes()`）
- 频繁的 dirty 节点同步可能导致性能下降

**改进方向**:

- 添加缓存层（如子节点列表缓存）
- 批量同步 dirty 节点，而不是每次保存时上传所有
- 使用虚拟化技术处理大树

## 设计原则总结

### DO（推荐做法）

1. ✅ **单一职责**: 每个 Action 只做一件事
2. ✅ **不可变性**: 依赖 Immer 保证状态不可变
3. ✅ **类型安全**: 完整的 TypeScript 类型定义
4. ✅ **可测试性**: 每个 Action 都应该有单元测试
5. ✅ **原子性**: 确保操作要么全部成功，要么全部失败

### DON'T（避免做法）

1. ❌ **不要在 applyToEditorState 中调用异步操作**
2. ❌ **不要在 applyToIndexedDB 中访问或修改 state**
3. ❌ **不要忘记实现 reverse()**（对于持久化 Action）
4. ❌ **不要在 Action 中包含业务逻辑**（业务逻辑属于 Command）
5. ❌ **不要直接在组件中创建 Action**（通过 Command 执行）

## 未来扩展方向

### 1. 协作编辑支持

当前限制：不支持多用户同时编辑

改进方向：

- 引入操作变换（Operational Transformation）
- 实现 Action 序列化和反序列化
- 添加冲突自动合并策略

### 2. Action 队列和批处理

当前限制：只能同步执行 Action 数组

改进方向：

- 实现 Action 队列，支持延迟执行
- 添加优先级机制
- 支持 Action 合并优化（如连续的 UpdateNodeAction）

### 3. 更细粒度的 Undo/Redo

当前限制：撤销/重做以 Command 为单位

改进方向：

- 支持 Action 级别的撤销
- 添加选择性撤销（undo specific action）
- 实现更复杂的历史管理（分支历史）

## 相关代码位置

- **Action 接口定义**: `src/domain/mindmap-store.types.ts:152-157`
- **Action 实现目录**: `src/domain/actions/`
- **历史管理器**: `src/domain/history-manager.ts`
- **MindmapStore**: `src/domain/mindmap-store.ts`
- **IndexedDB Schema**: `src/lib/db/schema.ts`

---

**文档维护**: 当添加新的 Action 类型时，请更新本文档的 Action 列表部分。
