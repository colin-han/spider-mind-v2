# MindmapStore 和 EditorState 架构设计

## 文档信息

- **创建日期**: 2025-11-06
- **最后更新**: 2025-11-24
- **版本**: 1.1.0
- **相关文档**:
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Action 层架构设计](./action-layer-design.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [持久化中间件设计](./persistence-middleware-design.md) - 三层存储和 Dirty Flag 机制

## 概述

MindmapStore 是思维导图编辑器的**全局状态容器**，基于 Zustand 实现。它负责协调 Command、Action、History、Shortcut 等所有子系统，是领域层的**中央调度器**。

### 设计目标

1. **集中管理**: 所有状态通过单一 Store 管理
2. **不可变性**: 使用 Immer 中间件保证状态不可变
3. **高性能**: 使用 Map 和 Set 优化查询性能
4. **双层持久化**: 内存 + IndexedDB 的混合存储策略
5. **易于测试**: 通过 Hook 接口访问，方便单元测试

## 核心数据结构

### EditorState

EditorState 是编辑器的完整状态快照：

```typescript
interface EditorState {
  // 核心数据
  currentMindmap: Mindmap; // 当前思维导图对象

  // 所有节点（使用 Map 优化查询）
  nodes: Map<string, MindmapNode>; // key 是 short_id

  // UI 状态 (默认展开,仅记录折叠状态)
  collapsedNodes: Set<string>; // 折叠的节点 short_id 集合

  // 焦点状态
  focusedArea: FocusedArea; // "graph" | "panel" | "outline" | "search"
  currentNode: string; // 当前选中的节点 short_id

  // 视口状态（派生状态，不持久化）
  viewport: Viewport; // 视口位置、尺寸和缩放（节点坐标系）

  // 状态
  isLoading: boolean; // 是否正在加载
  isSaved: boolean; // 是否已保存

  // 版本号（每次 acceptActions 递增）
  version: number;
}
```

### 设计要点

#### 1. Map vs Array

**为什么使用 Map 而不是 Array**:

```typescript
// ❌ 使用 Array - O(n) 查询
nodes: MindmapNode[];
const node = nodes.find(n => n.short_id === id);  // 遍历整个数组

// ✅ 使用 Map - O(1) 查询
nodes: Map<string, MindmapNode>;
const node = nodes.get(id);  // 直接获取
```

**优势**:

- 查询节点: O(n) → O(1)
- 更新节点: O(n) → O(1)
- 删除节点: O(n) → O(1)

#### 2. Set vs Array

**为什么使用 Set 存储折叠节点**:

```typescript
// ❌ 使用 Array - O(n) 检查
collapsedNodes: string[];
const isCollapsed = collapsedNodes.includes(nodeId);  // 遍历数组

// ✅ 使用 Set - O(1) 检查
collapsedNodes: Set<string>;
const isCollapsed = collapsedNodes.has(nodeId);  // 直接检查
```

**优势**:

- 检查折叠: O(n) → O(1)
- 添加/删除: O(n) → O(1)
- 自动去重

#### 3. 版本号管理

```typescript
version: number; // 每次 acceptActions() 递增
```

**用途**:

- 追踪状态变更
- 实现乐观更新
- 冲突检测基础
- 调试和日志记录

#### 4. Viewport 管理

```typescript
viewport: Viewport; // 视口状态（派生状态，不持久化）
```

**特性**:

- 使用节点坐标系（pre-zoom），与节点 x/y 一致
- 不持久化到 IndexedDB（每次打开自动 fitView）
- 通过 SetViewportAction 更新
- 与 React Flow 双向同步（值比较防抖）

**字段说明**:

```typescript
interface Viewport {
  x: number; // 视口左边缘在节点坐标系中的 X 坐标
  y: number; // 视口上边缘在节点坐标系中的 Y 坐标
  width: number; // 视口在节点坐标系中的宽度
  height: number; // 视口在节点坐标系中的高度
  zoom: number; // 缩放比例 (0.1 - 2.0)
}
```

**详细设计**: 参见 [视口管理设计](./viewport-management-design.md)

## MindmapStore 结构

### 完整接口

```typescript
interface MindmapStore {
  // 核心状态
  editorState: EditorState | null;

  // 子系统管理器
  commandManager: CommandManager;
  historyManager: HistoryManager;
  shortcutManager: ShortcutManager;

  // 核心方法
  initializeEditor(mindmapId: string): Promise<void>;
  acceptActions(actions: EditorAction[]): Promise<void>;
  save(): Promise<void>;

  // Hook 接口
  useCommand(commandId: string): (...args: any[]) => Promise<void>;
  useCommandManager(): CommandManager | null;
  useMindmapEditorState(): EditorState | null;
}
```

### 职责分配

| 组件                | 职责                     | 代码行数 |
| ------------------- | ------------------------ | -------- |
| **MindmapStore**    | 协调所有子系统、状态管理 | ~100 行  |
| **CommandManager**  | 命令注册、执行、条件检查 | ~40 行   |
| **HistoryManager**  | Undo/Redo 栈管理         | ~65 行   |
| **ShortcutManager** | 快捷键事件处理           | ~54 行   |

### 关键方法详解

#### initializeEditor()

**职责**: 初始化编辑器，加载思维导图数据

**流程**:

```
initializeEditor(mindmapId)
  ↓
1. 从 IndexedDB 加载 mindmap 和 nodes
  ↓
2. 构建 EditorState
  ├─ nodes: Map 转换
  ├─ collapsedNodes: Set 初始化
  ├─ currentNode: 设为根节点
  ├─ version: 0
  └─ isSaved: true
  ↓
3. 清空历史栈
  ↓
4. 设置 editorState
```

**代码位置**: `src/domain/mindmap-store.ts:50-85`

**重要性**: 这是编辑器的入口点，确保正确加载数据

---

#### acceptActions()

**职责**: 应用 Action 数组到状态和数据库

**流程**:

```
acceptActions([action1, action2, ...])
  ↓
1. 使用 Immer produce() 包装
  ↓
2. 对每个 action:
  ├─ 调用 action.applyToEditorState(draft)
  └─ 修改 draft 状态
  ↓
3. version++
  ↓
4. isSaved = false
  ↓
5. Immer 生成新的不可变状态
  ↓
6. Zustand 通知所有订阅者
  ↓
7. 异步：对每个 action 调用 applyToIndexedDB()
  ↓
8. IndexedDB 事务提交
```

**代码位置**: `src/domain/mindmap-store.ts:87-110`

**关键特性**:

- **同步内存更新**: 立即响应用户操作
- **异步数据库更新**: 不阻塞 UI
- **原子性**: 多个 Action 要么全成功，要么全失败
- **不可变性**: Immer 确保状态不可变

---

#### save()

**职责**: 保存思维导图到服务器

**流程**:

```
save()
  ↓
1. 获取所有 dirty 节点
  ↓
2. 调用 Server Action uploadMindmap()
  ↓
3. 上传到 Supabase
  ↓
4. 更新 IndexedDB 中的 dirty 标志
  ↓
5. 设置 isSaved = true
```

**代码位置**: `src/domain/mindmap-store.ts:112-130`

**注意事项**:

- 只上传 dirty = true 的节点
- 上传成功后清除 dirty 标志
- 处理网络错误和冲突

## 状态管理模式

### Zustand + Immer

```typescript
const useMindmapStore = create<MindmapStore>()(
  immer((set, get) => ({
    editorState: null,

    acceptActions: async (actions) => {
      // Immer 的 produce() 自动应用
      set((state) => {
        actions.forEach((action) => {
          action.applyToEditorState(state.editorState!);
        });
        state.editorState!.version++;
        state.editorState!.isSaved = false;
      });

      // 异步持久化
      await Promise.all(actions.map((a) => a.applyToIndexedDB()));
    },
  }))
);
```

### 工作原理

1. **Immer 拦截**: `set()` 内的修改被 Immer 拦截
2. **Draft 状态**: state 是可变的 Draft
3. **自动 Copy-on-Write**: Immer 只拷贝修改的部分
4. **生成新状态**: Immer 生成新的不可变状态
5. **Zustand 通知**: 订阅者接收到状态变更

### 性能优化

```typescript
// ✅ 只拷贝修改的节点
state.editorState.nodes.get(nodeId).title = "new title";
// Immer 只拷贝这个节点对象，其他节点共享

// ❌ 避免整个 Map 重新创建
state.editorState.nodes = new Map(state.editorState.nodes);
// 这会拷贝整个 Map
```

## Hook 接口

### useCommand

**用途**: 在组件中执行命令

```typescript
function MyComponent() {
  const addChild = useCommand("node.addChild");

  return <button onClick={() => addChild()}>添加子节点</button>;
}
```

**实现**:

```typescript
export const useCommand = (commandId: string) => {
  const commandManager = useMindmapStore((state) => state.commandManager);

  return useCallback(
    (...args: any[]) => commandManager.executeCommand(commandId, ...args),
    [commandManager, commandId]
  );
};
```

**优势**:

- 类型安全
- 自动订阅状态变更
- 易于测试

---

### useMindmapEditorState

**用途**: 获取当前编辑器状态

```typescript
function MyComponent() {
  const editorState = useMindmapEditorState();
  const currentNode = editorState?.nodes.get(editorState.currentNode!);

  return <div>{currentNode?.title}</div>;
}
```

**实现**:

```typescript
export const useMindmapEditorState = () => {
  return useMindmapStore((state) => state.editorState);
};
```

**订阅优化**:

```typescript
// ✅ 细粒度订阅
const currentNodeId = useMindmapStore(
  (state) => state.editorState?.currentNode
);

// ❌ 订阅整个状态（性能差）
const state = useMindmapStore();
const currentNodeId = state.editorState?.currentNode;
```

---

### useCommandManager

**用途**: 访问 CommandManager（高级用法）

```typescript
function MyComponent() {
  const commandManager = useCommandManager();
  const canDelete = commandManager?.canExecute("node.delete");

  return <button disabled={!canDelete}>删除</button>;
}
```

## 数据流

### 完整的数据流

```
用户按 Tab
  ↓
ShortcutManager 捕获事件
  ↓
查找绑定的命令: "node.addChild"
  ↓
CommandManager.executeCommand("node.addChild")
  ↓
检查 when() 条件
  ↓ (通过)
调用 handler()
  ↓
返回 [AddNodeAction, SetCurrentNodeAction]
  ↓
HistoryManager.executeActions(actions)  (undoable = true)
  ↓
MindmapStore.acceptActions(actions)
  ↓
┌──────────────────────────────────┐
│ Immer produce() 包装             │
│  ├─ AddNodeAction.applyToEditorState(draft)     │
│  │   └─ draft.nodes.set(id, node)              │
│  ├─ SetCurrentNodeAction.applyToEditorState(draft)  │
│  │   └─ draft.currentNode = id                 │
│  ├─ draft.version++                             │
│  └─ draft.isSaved = false                       │
└──────────────────────────────────┘
  ↓
Immer 生成新状态
  ↓
Zustand 通知订阅者
  ↓
UI 自动重新渲染
  ↓ (并行)
Promise.all([
  AddNodeAction.applyToIndexedDB(),
  SetCurrentNodeAction.applyToIndexedDB()
])
  ↓
IndexedDB 事务提交
  ↓
数据持久化完成
```

### 撤销流程

```
用户按 Cmd+Z
  ↓
global.undo 命令
  ↓
HistoryManager.undo()
  ↓
从 undoStack 弹出 actions
  ↓
对每个 action 调用 reverse()
  ↓
生成逆 actions: [RemoveNodeAction, SetCurrentNodeAction]
  ↓
MindmapStore.acceptActions(reverseActions)
  ↓
[同样的 acceptActions 流程]
  ↓
原 actions 推入 redoStack
```

## 状态持久化

持久化机制实现三层存储架构（内存 → IndexedDB → Supabase），通过 Dirty Flag 追踪变更，支持增量同步和冲突检测。

**核心概念**:

- **三层存储**: EditorState（立即响应） → IndexedDB（离线支持） → Supabase（多设备同步）
- **Dirty Flag**: 标记哪些数据需要同步到服务器
- **版本管理**: 使用三个时间戳（version, local_updated_at, server_updated_at）追踪变更

**详细设计**: 参见 [持久化中间件设计](./persistence-middleware-design.md)，包含三层存储架构、Dirty Flag 机制、冲突检测策略、性能优化等完整说明。

## 初始化流程

### 应用启动

```
应用启动
  ↓
1. 用户选择思维导图
  ↓
2. 调用 initializeEditor(mindmapId)
  ↓
3. 从 IndexedDB 加载数据
  ├─ mindmap 元数据
  └─ mindmap_nodes 节点数据
  ↓
4. 构建 EditorState
  ├─ 转换 nodes 为 Map
  ├─ 初始化 collapsedNodes Set
  ├─ 设置 currentNode 为根节点
  └─ version = 0
  ↓
5. 清空历史栈
  ↓
6. 注册所有命令
  ↓
7. 绑定所有快捷键
  ↓
8. 编辑器就绪
```

### 组件挂载

```
MindmapEditorContainer 挂载
  ↓
1. useEffect() 触发
  ↓
2. 调用 initializeEditor()
  ↓
3. ShortcutManager 开始监听键盘事件
  ↓
4. 订阅 editorState 变更
  ↓
5. 渲染初始 UI
```

## 最佳实践

### DO（推荐做法）

#### 1. 使用 Hook 访问状态

```typescript
// ✅ 正确
function MyComponent() {
  const editorState = useMindmapEditorState();
  const addChild = useCommand("node.addChild");

  return <button onClick={() => addChild()}>添加</button>;
}
```

#### 2. 细粒度订阅

```typescript
// ✅ 只订阅需要的部分
const currentNodeId = useMindmapStore(
  (state) => state.editorState?.currentNode
);

// ❌ 订阅整个状态
const state = useMindmapStore();
```

#### 3. 不要在组件中直接修改状态

```typescript
// ❌ 错误
function MyComponent() {
  const editorState = useMindmapEditorState();
  editorState.currentNode = "new-id"; // 直接修改
}

// ✅ 正确
function MyComponent() {
  const setCurrentNode = useCommand("navigation.setCurrentNode");
  setCurrentNode("new-id"); // 通过命令
}
```

#### 4. 使用工具函数

```typescript
// ✅ 使用封装好的工具函数
import { getChildNodes } from "@/domain/editor-utils";

const children = getChildNodes(editorState, nodeId);

// ❌ 手动遍历
const children = Array.from(editorState.nodes.values()).filter(
  (n) => n.parent_short_id === nodeId
);
```

### DON'T（避免做法）

#### 1. 不要绕过 acceptActions

```typescript
// ❌ 直接修改 Zustand 状态
set((state) => {
  state.editorState.nodes.set(id, node);
});

// ✅ 通过 Action
acceptActions([new AddNodeAction(node)]);
```

#### 2. 不要在 Action 外部访问 IndexedDB

```typescript
// ❌ 组件中直接操作数据库
async function saveNode() {
  const db = await getDB();
  await db.put("mindmap_nodes", node);
}

// ✅ 通过 Action
acceptActions([new UpdateNodeAction(node.short_id, updates)]);
```

#### 3. 不要混淆 draft 和 state

```typescript
// ❌ 在 applyToEditorState 外使用 draft
const draft = state.editorState;  // 这是普通状态，不是 draft

// ✅ 只在 applyToEditorState 内修改 draft
applyToEditorState(state: EditorState) {
  // 这里的 state 是 Immer draft，可以直接修改
  state.nodes.set(id, node);
}
```

## 性能优化

### 已实现的优化

1. **Map/Set 数据结构**: O(1) 查询
2. **Immer Copy-on-Write**: 只拷贝修改的部分
3. **异步持久化**: 不阻塞 UI
4. **批量 Action**: 共享一个事务

### 性能监控

```typescript
// 添加性能监控（开发环境）
acceptActions: async (actions) => {
  const start = performance.now();

  set((state) => {
    actions.forEach((action) => {
      action.applyToEditorState(state.editorState!);
    });
  });

  const syncTime = performance.now() - start;

  await Promise.all(actions.map((a) => a.applyToIndexedDB()));

  const asyncTime = performance.now() - start - syncTime;

  console.log(`Sync: ${syncTime}ms, Async: ${asyncTime}ms`);
};
```

### 潜在瓶颈

1. **大树遍历**: getDescendantNodes() 在大树时较慢
2. **频繁 save()**: 上传所有 dirty 节点
3. **历史栈大小**: 无限制的历史可能占用大量内存

### 改进方向

1. **缓存层**: 缓存常用查询结果
2. **增量同步**: 只同步变更的部分
3. **历史限制**: 限制 undo 栈大小
4. **虚拟化**: 大树的渲染优化

## 测试策略

### 单元测试

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useMindmapStore } from "./mindmap-store";

describe("MindmapStore", () => {
  beforeEach(() => {
    // 重置 store
    useMindmapStore.setState({ editorState: null });
  });

  it("should initialize editor state", async () => {
    const { initializeEditor } = useMindmapStore.getState();
    await initializeEditor("test-mindmap-id");

    const { editorState } = useMindmapStore.getState();
    expect(editorState).not.toBeNull();
    expect(editorState!.mindmapId).toBe("test-mindmap-id");
  });

  it("should accept actions", async () => {
    // 测试 acceptActions
  });

  it("should save dirty nodes", async () => {
    // 测试 save
  });
});
```

### 集成测试

```typescript
it("should execute command through full stack", async () => {
  // 1. 初始化
  await initializeEditor("test-id");

  // 2. 执行命令
  const addChild = useCommand("node.addChild");
  await addChild();

  // 3. 验证状态
  const { editorState } = useMindmapStore.getState();
  expect(editorState!.nodes.size).toBe(2); // 根节点 + 新节点

  // 4. 验证数据库
  const db = await getDB();
  const nodes = await db.getAll("mindmap_nodes");
  expect(nodes.length).toBe(2);
});
```

## 故障排查

### 常见问题

#### 1. 状态不更新

**症状**: UI 不响应状态变化

**检查**:

- 是否正确使用 Hook 订阅状态？
- 是否直接修改了状态而不是通过 Action？
- Immer 是否正确配置？

#### 2. 数据丢失

**症状**: 刷新后数据消失

**检查**:

- Action 是否正确实现 applyToIndexedDB()？
- IndexedDB 是否有权限？
- 是否调用了 save() 同步到服务器？

#### 3. 性能问题

**症状**: 操作卡顿

**检查**:

- 是否订阅了整个状态而不是部分？
- 是否有不必要的遍历？
- 是否批量执行了大量 Action？

## 相关代码位置

- **MindmapStore 实现**: `src/domain/mindmap-store.ts`
- **EditorState 类型定义**: `src/domain/mindmap-store.types.ts:20-32`
- **Hook 接口**: `src/domain/mindmap-store.ts:140-160`
- **IndexedDB Schema**: `src/lib/db/schema.ts`
- **工具函数**: `src/domain/editor-utils.ts`

---

**文档维护**: 当修改 MindmapStore 或 EditorState 结构时，请及时更新本文档。
