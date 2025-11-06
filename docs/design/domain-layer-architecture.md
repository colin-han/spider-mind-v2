# 领域层架构设计

## 元信息

- 创建日期: 2025-11-06
- 作者: Claude Code
- 状态: 正式版本
- 相关文档:
  - [Action 层架构设计](./action-layer-design.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [MindmapStore 架构设计](./mindmap-store-design.md)

## 概述

领域层（Domain Layer）位于 `src/domain/` 目录，实现了思维导图编辑器的核心业务逻辑。采用清晰的分层架构，从用户输入到数据持久化形成完整的数据流。

## 分层设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户交互层                              │
│              (UI Components, Event Handlers)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  快捷键层 (Shortcut)                      │
│   ShortcutManager + ShortcutRegister                    │
│   - 监听键盘事件                                          │
│   - 条件判断 (when)                                       │
│   - 映射到命令                                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   命令层 (Command)                        │
│   CommandManager + CommandRegistry                      │
│   - 命令定义注册                                          │
│   - 条件检查 (when)                                       │
│   - 业务逻辑编排                                          │
│   - 生成 Action 序列                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   动作层 (Action)                         │
│   EditorAction 接口实现                                  │
│   - 原子性状态变更                                        │
│   - 可逆操作 (reverse)                                    │
│   - 双层更新逻辑                                          │
└─────┬──────────────────────────────────────────┬────────┘
      │                                          │
      ↓                                          ↓
┌─────────────────────┐              ┌─────────────────────┐
│  状态层 (EditorState)│              │  历史层 (History)    │
│  Zustand + Immer     │              │  HistoryManager     │
│  - 内存快速响应      │              │  - 撤销栈           │
│  - Map/Set 优化      │              │  - 重做栈           │
└─────────┬───────────┘              │  - 版本管理         │
          │                          └─────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────┐
│                  持久化层 (Persistence)                   │
│  IndexedDB (idb)                                        │
│  - 本地缓存                                              │
│  - 脏标记 (dirty flag)                                   │
│  - 批量同步                                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   服务器层 (Server)                       │
│  Supabase REST API                                      │
│  - 云端存储                                              │
│  - 冲突检测                                              │
│  - 版本控制                                              │
└─────────────────────────────────────────────────────────┘
```

## 各层职责详解

### 1. 快捷键层 (Shortcut Layer)

**位置**: `src/domain/shortcuts/`, `shortcut-manager.ts`, `shortcut-register.ts`

**职责**:

- 监听用户键盘输入
- 根据当前状态条件判断是否激活
- 映射快捷键到命令 ID
- 处理平台差异 (Cmd on Mac, Ctrl on Windows)

**核心组件**:

- `ShortcutManager`: 键盘事件处理器
- `ShortcutRegister`: 快捷键注册表
- `ShortcutDefinition`: 快捷键定义接口

**数据流**:

```
KeyboardEvent → ShortcutManager.handleKeydown()
              → 查找匹配的 ShortcutDefinition
              → 检查 when() 条件
              → 返回 { commandId, params }
              → 调用 CommandManager.execute()
```

**设计特点**:

- ✅ 一个快捷键可以绑定多个命令（通过 `when()` 条件选择）
- ✅ 支持组合键和修饰键
- ✅ 自动 preventDefault() 阻止默认行为
- ❌ 不处理业务逻辑（仅负责映射）

---

### 2. 命令层 (Command Layer)

**位置**: `src/domain/commands/`, `command-manager.ts`, `command-registry.ts`

**职责**:

- 定义所有业务操作（20 个命令）
- 封装业务逻辑和参数验证
- 生成 Action 序列
- 决定是否可撤销

**核心组件**:

- `CommandManager`: 命令执行管理器
- `CommandRegistry`: 命令注册表
- `CommandDefinition`: 命令定义接口

**命令分类**:
| 类别 | 数量 | 可撤销 | 示例 |
|------|------|--------|------|
| Node Commands | 8 | ✅ 是 | addChild, delete, moveUp |
| Navigation Commands | 8 | ❌ 否 | selectParent, collapseNode |
| Global Commands | 4 | 部分 | save (否), undo (否) |
| AI Commands | 1 | 待定 | aiAssist (TODO) |

**数据流**:

```
CommandManager.execute(commandId, params)
  → 查找 CommandDefinition
  → 检查 when() 条件
  → 调用 handler(store, params)
  → 返回 EditorAction[]
  → 判断 undoable
    ├─ 可撤销 → HistoryManager.execute(actions)
    └─ 不可撤销 → store.acceptActions(actions)
```

**设计特点**:

- ✅ 命令与 Action 解耦（命令可以生成多个 Action）
- ✅ 支持异步操作（handler 可以是 async）
- ✅ 灵活的参数系统（params: unknown[]）
- ✅ 条件执行（when() 方法）
- ⚠️ 命令不直接修改状态（通过 Action 间接修改）

---

### 3. 动作层 (Action Layer)

**位置**: `src/domain/actions/`

**职责**:

- 定义原子性状态变更操作
- 实现双层更新（内存 + 数据库）
- 提供可逆操作（undo/redo）
- 保证数据一致性

**核心接口**:

```typescript
interface EditorAction {
  type: string;
  applyToEditorState(draft: EditorState): void;
  applyToIndexedDB?(db: IDBPDatabase): Promise<void>;
  reverse(): EditorAction;
}
```

**Action 分类**:

```
持久化 Action (修改数据):
  - AddNodeAction       → 添加节点到 Map + 数据库
  - RemoveNodeAction    → 从 Map 删除 + 数据库标记删除
  - UpdateNodeAction    → 更新 Map 字段 + 数据库更新

非持久化 Action (仅 UI):
  - SetCurrentNodeAction   → 仅更新 currentNode 字段
  - CollapseNodeAction     → 仅更新 collapsedNodes Set
  - ExpandNodeAction       → 仅更新 collapsedNodes Set
  - SetFocusedAreaAction   → 仅更新 focusedArea 字段
```

**数据流**:

```
store.acceptActions([action1, action2])
  → 开始 Immer produce()
  → 逐个执行 action.applyToEditorState(draft)
  → 提交 Immer draft → 新状态
  → 触发 React 重渲染
  → 异步：逐个执行 action.applyToIndexedDB(db)
  → 更新 isSaved = false
```

**设计特点**:

- ✅ 原子性（每个 Action 是独立的最小操作）
- ✅ 可组合（多个 Action 可以组合成事务）
- ✅ 可逆性（通过 reverse() 实现 undo）
- ✅ 双层更新（内存快 + 数据库安全）
- ⚠️ Action 不应包含复杂业务逻辑（应在 Command 层处理）

---

### 4. 状态层 (State Layer)

**位置**: `mindmap-store.ts`, `mindmap-store.types.ts`

**职责**:

- 全局状态容器（Zustand）
- 协调各个管理器（Command, Shortcut, History）
- 提供统一的状态访问接口
- 管理编辑器生命周期

**核心数据结构**:

```typescript
EditorState {
  // 核心数据 (持久化)
  currentMindmap: Mindmap
  nodes: Map<short_id, MindmapNode>   // O(1) 查询

  // UI 状态 (非持久化)
  collapsedNodes: Set<short_id>       // O(1) 查询
  focusedArea: FocusedArea
  currentNode: string

  // 元数据
  isLoading: boolean
  isSaved: boolean
  version: number                      // 递增版本号
}
```

**性能优化**:

- 使用 `Map` 而非数组，节点查询从 O(n) 降至 O(1)
- 使用 `Set` 存储折叠状态，检查从 O(n) 降至 O(1)
- Immer 实现结构共享，避免不必要的拷贝
- 选择性 re-render（Zustand 浅比较）

**数据流**:

```
openMindmap(mindmapId)
  → 从 IndexedDB 加载数据
  → 初始化 EditorState
  → 初始化 CommandManager, ShortcutManager, HistoryManager
  → 设置 isLoading = false

acceptActions(actions[])
  → Immer produce() 更新内存
  → 递增 version
  → IndexedDB 批量更新
  → 标记 isSaved = false
```

---

### 5. 历史层 (History Layer)

**位置**: `history-manager.ts`

**职责**:

- 管理撤销/重做栈
- 记录操作描述
- 实现版本回退
- 限制历史长度

**核心数据结构**:

```typescript
HistoryManager {
  undoStack: HistoryEntry[]      // 撤销栈
  redoStack: HistoryEntry[]      // 重做栈
  maxHistorySize: 50             // 最大历史数量
}

HistoryEntry {
  actions: EditorAction[]        // 动作序列
  description: string            // 操作描述
  version: number                // 状态版本号
}
```

**数据流**:

```
HistoryManager.execute(actions, description)
  → 清空 redoStack
  → 执行 store.acceptActions(actions)
  → 推入 undoStack
  → 限制栈大小

HistoryManager.undo()
  → 从 undoStack 弹出 entry
  → 对每个 action 调用 reverse()
  → 执行反向 actions
  → 推入 redoStack

HistoryManager.redo()
  → 从 redoStack 弹出 entry
  → 重新执行 actions
  → 推入 undoStack
```

**设计特点**:

- ✅ 支持批量操作（一次 undo 撤销多个 Action）
- ✅ 自动生成描述（通过 Command.getDescription()）
- ✅ 版本号追踪（用于调试和日志）
- ⚠️ 仅支持线性历史（不支持分支）

---

### 6. 持久化层 (Persistence Layer)

**位置**: `src/lib/db/schema.ts`, `src/lib/sync/sync-manager.ts`

**职责**:

- 本地数据缓存（IndexedDB）
- 脏标记管理（dirty flag）
- 批量同步到服务器
- 冲突检测和解决

**核心机制**:

**IndexedDB Schema**:

```typescript
MindmapDB {
  mindmaps: {
    key: short_id
    value: Mindmap & {
      dirty: boolean           // 是否有未保存修改
      local_updated_at: string // 本地修改时间
      server_updated_at: string // 服务器版本时间
    }
  }

  mindmap_nodes: {
    key: short_id
    value: MindmapNode & {
      dirty: boolean
      local_updated_at: string
    }
  }
}
```

**同步流程**:

```
用户点击保存 → SyncManager.syncMindmap()
  → 收集脏数据 (dirty = true)
  → 冲突检测 (比较 server_updated_at)
  ├─ 无冲突
  │   → 批量 upsert 到 Supabase
  │   → 清除 dirty 标记
  │   → 更新 server_updated_at
  └─ 有冲突
      → 提示用户选择策略
      ├─ force_overwrite → 强制覆盖
      ├─ discard_local → 丢弃本地，重新加载
      └─ cancel → 取消保存
```

**设计特点**:

- ✅ 离线优先（本地操作立即响应）
- ✅ 增量同步（只上传脏数据）
- ✅ 冲突感知（基于时间戳）
- ✅ 事务安全（IndexedDB 事务保证）
- ⚠️ 不支持实时协同（未来可扩展）

---

## 数据流总览

### 完整的操作链路

```
用户按下 Tab 键
  ↓
ShortcutManager 捕获事件
  ↓
查找 "tab" → { commandId: "node.addChild", params: [] }
  ↓
CommandManager.execute("node.addChild")
  ↓
检查 when() → 需要选中节点 ✅
  ↓
调用 addChild.handler(store)
  ↓
业务逻辑: 创建新节点、计算 order_index、调整其他节点
  ↓
返回: [
  new AddNodeAction(newNode),
  new SetCurrentNodeAction(oldId, newId),
  ...更新兄弟节点的 UpdateNodeAction[]
]
  ↓
HistoryManager.execute(actions, "添加子节点")
  ↓
store.acceptActions(actions)
  ↓
并行执行:
  ├─ Immer produce() 更新内存状态
  │   ├─ nodes.set(newNode.short_id, newNode)
  │   ├─ currentNode = newNode.short_id
  │   └─ version++
  │   → React 重渲染 UI
  │
  └─ IndexedDB 事务
      ├─ db.put("mindmap_nodes", { ...newNode, dirty: true })
      ├─ db.put("mindmap_nodes", { ...updatedNode, dirty: true })
      └─ 提交事务
  ↓
标记 isSaved = false (顶部显示"未保存"状态)
  ↓
用户点击保存按钮
  ↓
SyncManager.syncMindmap()
  ↓
收集所有 dirty = true 的数据
  ↓
批量 upsert 到 Supabase
  ↓
清除 dirty 标记, 更新 server_updated_at
  ↓
标记 isSaved = true
```

---

## 设计原则

### 1. 单向数据流

```
用户输入 → Command → Action → State → UI
```

- 不允许 UI 直接修改状态
- 所有变更通过 Action 通道
- 便于追踪和调试

### 2. 职责分离

| 层级     | 职责     | 不应该做       |
| -------- | -------- | -------------- |
| Shortcut | 键盘映射 | 不包含业务逻辑 |
| Command  | 业务编排 | 不直接修改状态 |
| Action   | 状态变更 | 不包含复杂计算 |
| State    | 数据存储 | 不包含业务规则 |

### 3. 可测试性

- Command 是纯函数（给定输入 → 确定输出）
- Action 是可重放的（多次执行结果一致）
- 状态是不可变的（Immer 保证）

### 4. 可扩展性

- 插件式注册（Command/Shortcut Register）
- 接口驱动（EditorAction/CommandDefinition）
- 开闭原则（新增功能无需修改核心）

---

## 最佳实践

### ✅ 推荐做法

1. **新增功能从 Command 开始**
   - 先定义命令接口和业务逻辑
   - 再实现 Action（如需持久化）
   - 最后绑定快捷键（如需要）

2. **保持 Action 简单**
   - 一个 Action 只做一件事
   - 复杂操作用多个 Action 组合

3. **使用工具函数**
   - `editor-utils.ts` 提供通用树操作
   - 不要在 Command 中重复实现

4. **善用条件执行**
   - Command 的 `when()` 检查前置条件
   - Shortcut 的 `when()` 检查上下文

### ❌ 避免做法

1. **不要在 UI 中直接修改 store**

   ```typescript
   // ❌ 错误
   store.setState({ currentNode: "abc123" });

   // ✅ 正确
   await executeCommand("navigation.setCurrentNode", ["abc123"]);
   ```

2. **不要在 Action 中调用其他 Action**

   ```typescript
   // ❌ 错误
   applyToEditorState(draft) {
     new AddNodeAction(...).applyToEditorState(draft)
   }

   // ✅ 正确（在 Command 层组合）
   handler(store) {
     return [
       new AddNodeAction(...),
       new UpdateNodeAction(...)
     ]
   }
   ```

3. **不要在 Command 中访问 IndexedDB**

   ```typescript
   // ❌ 错误
   async handler(store) {
     const db = await getDB()
     await db.put(...)
   }

   // ✅ 正确（通过 Action 间接操作）
   handler(store) {
     return [new AddNodeAction(...)]  // Action 会处理 IndexedDB
   }
   ```

---

## 未来优化方向

### 性能优化

1. **虚拟化渲染**
   - 大量节点时使用虚拟滚动
   - 当前所有节点都会渲染

2. **增量持久化**
   - 当前每个 Action 都触发 IndexedDB 写入
   - 可以批量延迟写入（debounce）

3. **内存管理**
   - History 栈无限增长会占用内存
   - 考虑压缩旧历史记录

### 功能扩展

1. **实时协同**
   - WebSocket 推送更新
   - Operational Transform (OT) 或 CRDT

2. **插件系统**
   - 允许第三方扩展命令
   - 自定义 Action 类型

3. **离线编辑**
   - Service Worker 缓存
   - 断线续传机制

---

## 常见问题

**Q: 为什么要分 Command 和 Action 两层？**

A:

- Command 负责业务逻辑编排（可能需要查询、计算、验证）
- Action 负责纯粹的状态变更（原子性、可逆性）
- 分离后更容易测试和维护

**Q: 什么时候 Action 需要实现 applyToIndexedDB？**

A: 只有需要持久化的数据才需要。UI 状态（如 currentNode, focusedArea）无需持久化。

**Q: undo/redo 的性能如何？**

A: 非常快。因为 Action 已经记录了所有变更细节，reverse() 直接生成反向操作，无需重新计算。

**Q: 如何调试数据流？**

A:

1. 开启 Zustand DevTools
2. 在浏览器控制台查看 IndexedDB
3. 在 Command handler 中添加 console.log
4. 检查 HistoryManager 的栈

---

## 相关文档

- [Action 层架构设计](./action-layer-design.md) - Action 详细设计
- [Command 层架构设计](./command-layer-design.md) - Command 详细设计
- [MindmapStore 架构设计](./mindmap-store-design.md) - Store 详细设计
- [命令参考手册](./command-reference.md) - 所有命令列表

---

_本文档描述了领域层的整体架构设计，定期更新以保持与实现一致。_
