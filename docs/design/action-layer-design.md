# Action 层架构设计

## 文档信息

- **创建日期**: 2025-11-06
- **最后更新**: 2025-11-22
- **版本**: 1.1.0
- **相关文档**:
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [MindmapStore 架构设计](./mindmap-store-design.md)

## 关键概念

> 本节定义该设计文档引入的新概念，不包括外部库或其他文档已定义的概念。

| 概念                           | 定义                                                    | 示例/说明                                          |
| ------------------------------ | ------------------------------------------------------- | -------------------------------------------------- |
| Action 订阅 (Action Subscribe) | 外部系统订阅特定 Action 类型，在 Action 执行后收到通知  | LayoutService 订阅 addChildNode，触发布局重新计算  |
| Action Payload                 | 订阅通知携带的数据，包含 Action 实例和执行上下文        | { action: AddNodeAction, timestamp: 1732248000 }   |
| ActionSubscriptionManager      | 管理所有 Action 订阅者的单例管理器                      | 全局单例，负责注册订阅、派发通知、管理订阅生命周期 |
| 订阅者 (Subscriber)            | 订阅 Action 的处理函数，接收 ActionPayload 并执行副作用 | async (payload) => { await measureNode(); }        |

**原则**：

- 订阅机制不影响 Action 的核心执行流程
- 订阅者错误不应影响其他订阅者或 Action 执行
- 订阅者应当是纯粹的副作用逻辑，不应修改状态

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

**职责**: 添加新节点到思维导图（或恢复已删除的节点）

**参数**:

```typescript
{
  node: MindmapNode,              // 完整的节点对象
  setAsCurrent?: boolean          // 是否设为当前选中节点
}
```

**状态变更**:

- 将节点添加到 `EditorState.nodes` Map
- 标记 `isSaved = false`
- 可选：设置为当前节点

**数据库操作**:

```typescript
await db.put("mindmap_nodes", {
  ...this.node,
  dirty: true, // ✅ 标记为需要同步
  deleted: false, // ✅ 确保清除删除标记（用于 undo 删除）
  local_updated_at: new Date().toISOString(),
});
```

**为什么要清除 deleted 标记？**

当 `AddNodeAction` 作为 `RemoveNodeAction` 的逆操作时（Undo 删除），被恢复的节点可能仍带有 `deleted: true` 标记。显式设置 `deleted: false` 确保：

- ✅ Undo 删除操作后节点正常显示
- ✅ 加载逻辑不会过滤掉恢复的节点
- ✅ 保存时将节点同步到服务器（而不是删除）

**逆操作**: `RemoveNodeAction`

**使用场景**:

- 添加子节点 (Tab)
- 添加兄弟节点 (Enter)
- Undo 删除操作（恢复节点）

---

#### RemoveNodeAction

**职责**: 删除节点（软删除机制）

**参数**:

```typescript
{
  nodeId: string,                 // 节点的 short_id
  originalNode?: MindmapNode      // 保存原节点数据用于恢复（自动捕获）
}
```

**状态变更**:

- 从 `EditorState.nodes` Map 中移除节点
- 从 `collapsedNodes` Set 中移除
- 如果是当前节点，切换到父节点或兄弟节点
- 标记 `isSaved = false`

**数据库操作（软删除）**:

```typescript
await db.put("mindmap_nodes", {
  ...this.deletedNode,
  deleted: true, // ✅ 标记为已删除
  dirty: true, // ✅ 标记为需要同步
  local_updated_at: new Date().toISOString(),
});
```

**软删除机制说明**:

1. **内存层**: 立即从 `EditorState.nodes` 中移除，UI 不再显示
2. **IndexedDB 层**: 标记 `deleted: true` 和 `dirty: true`，不立即删除
3. **同步层**: 保存时找到这些已删除节点，同步到服务器删除
4. **清理层**: 同步成功后，从 IndexedDB 中真正删除

**为什么使用软删除？**

- ✅ 支持离线删除：删除操作可以稍后同步到服务器
- ✅ 支持 Undo：撤销时可以恢复已删除的节点
- ✅ 数据安全：避免未同步时意外刷新导致数据丢失

**逆操作**: `AddNodeAction`（清除 deleted 标记）

**使用场景**:

- 删除节点 (Delete/Backspace)
- 批量删除子树

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
  ├─→ 1. applyToEditorState() [同步，立即响应]
  │    └─ Immer produce() 更新 EditorState
  │         └─ Zustand 通知订阅者
  │              └─ UI 自动重新渲染
  │
  ├─→ 2. applyToIndexedDB() [异步，数据安全]
  │    └─ idb 库操作数据库
  │         └─ 更新 dirty 标志
  │              └─ 等待 save() 同步到服务器
  │
  └─→ 3. actionSubscriptionManager.notify() [异步，副作用]
       └─ 并发调用所有订阅者
            ├─ LayoutService: 测量尺寸 + 更新布局
            ├─ SyncManager: 同步到云端
            └─ ... 其他订阅者
```

**执行顺序说明**：

1. **同步更新内存**：立即响应用户操作，UI 实时更新
2. **异步持久化**：保证数据安全，防止丢失
3. **通知订阅者**：触发副作用逻辑（布局计算、同步等）

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

## Action 订阅机制

### 设计动机

在 Action 层引入订阅机制的目的是**解耦业务逻辑与副作用**：

**问题**：

- LayoutService 需要在节点变化时重新计算布局
- SyncManager 需要在数据变化时同步到云端
- 但这些逻辑不应该耦合在 Action 或 Command 中

**解决方案**：

- 外部系统订阅特定的 Action 类型
- Action 执行后自动通知订阅者
- 订阅者执行各自的副作用逻辑

### 核心接口

#### ActionSubscriptionManager

```typescript
class ActionSubscriptionManager {
  /**
   * 订阅单个 Action 类型
   * @returns unsubscribe 函数，调用即可取消订阅（类似 React useEffect）
   */
  subscribe(action: ActionType, handler: Subscriber): () => void;

  /**
   * 订阅多个 Action 类型
   * @returns unsubscribe 函数，调用即可取消所有订阅
   */
  subscribeMultiple(actions: ActionType[], handler: Subscriber): () => void;

  /**
   * 通知订阅者（内部使用，由 MindmapStore 调用）
   */
  notify(action: ActionType, payload: ActionPayload): Promise<void>;

  /**
   * 清空所有订阅（主要用于测试）
   */
  clear(): void;

  /**
   * 获取订阅统计（调试用）
   */
  getStats(): Record<ActionType, number>;
}
```

**API 设计说明**:

- ✅ `subscribe()` 返回 `unsubscribe` 函数，使用者无需保持 handler 引用
- ✅ 类似 React `useEffect` 的清理函数模式，避免内存泄漏
- ✅ 不提供公开的 `unsubscribe(action, handler)` 方法，防止误用

#### ActionPayload

```typescript
interface ActionPayload {
  action: EditorAction; // Action 实例
  timestamp: number; // 执行时间戳
}
```

#### Subscriber

```typescript
type Subscriber = (payload: ActionPayload) => void | Promise<void>;
```

### 使用示例

#### 1. 订阅节点变化（LayoutService）

```typescript
import { actionSubscriptionManager } from "@/domain/action-subscription-manager";
import { AddNodeAction } from "@/domain/actions/add-node";

class MindmapLayoutService {
  private unsubscribeFns: Array<() => void> = [];

  init(): void {
    // 订阅节点添加
    const unsubAdd = actionSubscriptionManager.subscribe(
      "addChildNode",
      async (payload) => {
        const action = payload.action as AddNodeAction;
        console.log("[LayoutService] Node added:", action.node.short_id);

        // 测量新节点尺寸
        await this.measureNode(action.node);

        // 触发重新布局
        this.updateLayout();
      }
    );

    // 订阅节点更新
    const unsubUpdate = actionSubscriptionManager.subscribe(
      "updateNode",
      async (payload) => {
        const action = payload.action as UpdateNodeAction;

        // 检查是否需要重新测量
        if ("title" in action.updates || "note" in action.updates) {
          const node = this.getNode(action.nodeId);
          if (node) {
            await this.measureNode(node);
          }
        }

        this.updateLayout();
      }
    );

    // 订阅节点删除
    const unsubRemove = actionSubscriptionManager.subscribe(
      "removeNode",
      (payload) => {
        const action = payload.action as RemoveNodeAction;

        // 清理缓存
        this.clearCache(action.nodeId);

        // 触发重新布局
        this.updateLayout();
      }
    );

    // 保存取消订阅函数
    this.unsubscribeFns.push(unsubAdd, unsubUpdate, unsubRemove);
  }

  dispose(): void {
    // 取消所有订阅
    this.unsubscribeFns.forEach((fn) => fn());
    this.unsubscribeFns = [];
  }
}
```

#### 2. 订阅多个 Actions（简化写法）

```typescript
class SyncManager {
  init(): void {
    // 订阅所有需要同步的 Actions
    const unsubscribe = actionSubscriptionManager.subscribeMultiple(
      ["addChildNode", "updateNode", "removeNode"],
      async (payload) => {
        console.log("[SyncManager] Syncing action:", payload.action.type);

        // 同步到云端
        await this.syncToCloud(payload.action);
      }
    );

    this.unsubscribeFns.push(unsubscribe);
  }
}
```

#### 3. 在 React 组件中使用

```typescript
function MindmapGraphViewer() {
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    // 订阅布局相关的 Actions，触发组件重新渲染
    const unsubscribe = actionSubscriptionManager.subscribeMultiple(
      [
        "addChildNode",
        "updateNode",
        "removeNode",
        "collapseNode",
        "expandNode",
      ],
      () => {
        // 触发重新渲染
        setForceUpdate((prev) => prev + 1);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // ... 渲染逻辑
}
```

### 集成点

订阅通知在 `MindmapStore.acceptActions()` 的最后一步触发：

```typescript
// src/domain/mindmap-store.ts
acceptActions: async (actions) => {
  // 1. 批量更新内存状态（同步）
  set((state) => {
    actions.forEach((action) => {
      action.applyToEditorState(state.currentEditor!);
    });
  });

  // 2. 批量持久化到 IndexedDB（异步）
  const db = await getDB();
  for (const action of actions) {
    if (action.applyToIndexedDB) {
      await action.applyToIndexedDB(db);
    }
  }

  // ✅ 3. 通知订阅者（新增）
  const timestamp = Date.now();
  for (const action of actions) {
    await actionSubscriptionManager.notify(action.type, {
      action,
      timestamp,
    });
  }
},
```

### 错误处理

订阅机制使用 `Promise.allSettled()` 实现错误隔离：

```typescript
async notify(action: ActionType, payload: ActionPayload): Promise<void> {
  const handlers = this.subscribers.get(action);
  if (!handlers || handlers.size === 0) {
    return;
  }

  // 并发执行所有订阅者，错误隔离
  const results = await Promise.allSettled(
    Array.from(handlers).map((handler) =>
      (async () => {
        await handler(payload);
      })()
    )
  );

  // 记录错误，但不中断执行
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `[ActionSubscriptionManager] Handler ${index} for action "${action}" failed:`,
        result.reason
      );
    }
  });
}
```

**关键特性**：

- ✅ 一个订阅者的错误不影响其他订阅者
- ✅ 订阅者的错误不影响 Action 的执行
- ✅ 所有错误都会被记录到控制台

### 性能考虑

1. **并发执行**：所有订阅者并发执行，不会串行阻塞
2. **异步通知**：订阅通知是异步的，不阻塞 Action 执行
3. **订阅管理**：使用 Map 和 Set 实现 O(1) 查询和删除

### 最佳实践

#### DO（推荐做法）

1. ✅ **使用返回的 unsubscribe 函数**：

   ```typescript
   const unsubscribe = manager.subscribe("addNode", handler);
   // 取消订阅时
   unsubscribe(); // ✅ 正确
   ```

2. ✅ **在服务类的 init() 中设置订阅**：确保订阅生命周期与服务一致

3. ✅ **在 dispose() 中取消订阅**：

   ```typescript
   dispose(): void {
     this.unsubscribeFns.forEach(fn => fn());
     this.unsubscribeFns = [];
   }
   ```

4. ✅ **订阅者执行纯粹的副作用**：不修改 EditorState

5. ✅ **使用类型断言访问具体 Action 数据**：`const action = payload.action as AddNodeAction`

#### DON'T（避免做法）

1. ❌ **不要尝试手动保存 handler 引用来取消订阅**：

   ```typescript
   const handler = (payload) => { ... };
   manager.subscribe('addNode', handler);
   // ❌ 错误：没有公开的 unsubscribe(action, handler) 方法
   ```

2. ❌ **不要在订阅者中修改 state**：订阅者只能读取 state，不能修改

3. ❌ **不要在订阅者中执行 Action**：会导致无限循环

4. ❌ **不要忘记取消订阅**：会导致内存泄漏和重复执行

5. ❌ **不要在订阅者中抛出未捕获的错误**：应该自己处理错误

### 测试

订阅机制包含完整的单元测试：

```bash
volta run yarn test src/domain/__tests__/action-subscription-manager.test.ts
```

**测试覆盖**：

- ✅ 订阅和取消订阅
- ✅ 单个和批量订阅
- ✅ 通知分发
- ✅ 错误隔离
- ✅ 订阅统计

---

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

- **Action 接口定义**: `src/domain/mindmap-store.types.ts`
- **Action 实现目录**: `src/domain/actions/`
- **订阅机制**:
  - 类型定义: `src/domain/action-subscription.types.ts`
  - 管理器实现: `src/domain/action-subscription-manager.ts`
  - 单元测试: `src/domain/__tests__/action-subscription-manager.test.ts`
- **历史管理器**: `src/domain/history-manager.ts`
- **MindmapStore**: `src/domain/mindmap-store.ts`
- **IndexedDB Schema**: `src/lib/db/schema.ts`

---

**文档维护**: 当添加新的 Action 类型时，请更新本文档的 Action 列表部分。
