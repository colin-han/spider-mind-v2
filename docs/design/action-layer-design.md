# Action 层架构设计

## 文档信息

- **创建日期**: 2025-11-06
- **最后更新**: 2025-12-06
- **版本**: 1.4.0
- **变更说明**:
  - 🆕 重组目录结构：按持久化策略分类（persistent/ 和 ephemeral/）
  - 添加 Action 汇总表（12 个 Action）
  - 添加持久化策略决策树
  - 新增 AI Message 相关 Action（AddAIMessageAction, UpdateAIMessageMetadataAction）
  - 新增 EnsureCurrentNodeVisibleAction
  - 更新 AddNodeAction 和 RemoveNodeAction 描述，与实际实现保持一致
  - 完善相关代码位置索引
- **相关文档**:
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [MindmapStore 架构设计](./mindmap-store-design.md)

## 关键概念

> 本节定义该设计文档引入的新概念，不包括外部库或其他文档已定义的概念。

| 概念                           | 定义                                                      | 示例/说明                                          |
| ------------------------------ | --------------------------------------------------------- | -------------------------------------------------- |
| Action 订阅 (Action Subscribe) | 外部系统订阅特定 Action 类型，在 Action 执行后收到通知    | LayoutService 订阅 addChildNode，触发布局重新计算  |
| 双层订阅 (Dual-Layer)          | Sync 订阅（Store 更新后）+ Async 订阅（IndexedDB 更新后） | Sync 预测布局，Async 测量真实尺寸                  |
| 后处理 (Post-Processing)       | 在所有单个订阅完成后执行，支持批量去重                    | Post-Sync 驱动布局引擎，Post-Async 更新精确布局    |
| Action Payload                 | 订阅通知携带的数据，包含 Action 实例和思维导图 ID         | { action: AddNodeAction, mindmapId: "abc123" }     |
| ActionSubscriptionManager      | 管理所有 Action 订阅者的单例管理器                        | 全局单例，负责注册订阅、派发通知、管理订阅生命周期 |
| 同步订阅者 (SyncSubscriber)    | Store 更新后立即执行的同步处理函数，必须 < 10ms           | (payload) => { predictSize(); updateCache(); }     |
| 异步订阅者 (AsyncSubscriber)   | IndexedDB 更新后执行的异步处理函数，可包含 DOM 操作       | async (payload) => { await measureNode(); }        |
| 后处理器 (Post-Handler)        | 接收按类型分组的 Actions Map，支持批量处理                | (actionsMap) => { engine.layout(...); }            |

**原则**：

- 订阅机制不影响 Action 的核心执行流程
- 订阅者错误不应影响其他订阅者或 Action 执行
- 同步订阅者必须快速完成（< 10ms），不能包含异步操作
- 异步订阅者可以执行 DOM 测量、网络请求等耗时操作
- 后处理器在所有单个订阅完成后执行，用于批量驱动副作用系统

## 概述

Action 层是领域层中负责**状态变更**的核心层，它定义了所有可以对 EditorState 和 IndexedDB 进行的原子操作。每个 Action 代表一个独立的、可逆的、原子性的状态变更。

### 设计目标

1. **原子性**: 每个 Action 是不可分割的最小操作单元
2. **可逆性**: 所有持久化 Action 必须支持 undo/redo
3. **双层应用**: 同时更新内存状态和数据库
4. **类型安全**: 完整的 TypeScript 类型定义
5. **职责单一**: 每个 Action 只做一件事

## Action 汇总表

当前系统中共有 **12 个 Action**，按持久化策略分类并组织在不同目录中：

### 目录结构

```
src/domain/actions/
├── persistent/              # 持久化 Action（会写入 IndexedDB 并同步到 Supabase）
│   ├── add-node.ts
│   ├── remove-node.ts
│   ├── update-node.ts
│   ├── add-ai-message.ts
│   └── update-ai-message-metadata.ts
│
└── ephemeral/              # 临时 Action（不持久化到 IndexedDB）
    ├── set-current-node.ts
    ├── collapse-node.ts
    ├── expand-node.ts
    ├── set-focused-area.ts
    ├── set-viewport.ts
    ├── ensure-current-node-visible.ts
    └── set-saving-status.ts
```

### Action 列表

| Action 名称                      | 类型标识                   | 目录位置      | 持久化目标                                | 支持 Undo | 主要用途                     |
| -------------------------------- | -------------------------- | ------------- | ----------------------------------------- | --------- | ---------------------------- |
| **持久化 Action（persistent/）** |
| `AddNodeAction`                  | addChildNode               | `persistent/` | mindmap_nodes<br>dirty=true               | ✅ 是     | 添加新节点到思维导图         |
| `RemoveNodeAction`               | removeNode                 | `persistent/` | mindmap_nodes<br>deleted=true, dirty=true | ✅ 是     | 软删除节点                   |
| `UpdateNodeAction`               | updateNode                 | `persistent/` | mindmap_nodes<br>dirty=true               | ✅ 是     | 更新节点字段（标题、内容等） |
| `AddAIMessageAction`             | ADD_AI_MESSAGE             | `persistent/` | ai_messages<br>dirty=true                 | ❌ 否     | 添加 AI 对话消息             |
| `UpdateAIMessageMetadataAction`  | UPDATE_AI_MESSAGE_METADATA | `persistent/` | ai_messages<br>dirty=true                 | ❌ 否     | 更新 AI 消息元数据           |
| **临时 Action（ephemeral/）**    |
| `SetCurrentNodeAction`           | setCurrentNode             | `ephemeral/`  | -                                         | ✅ 是     | 设置当前选中节点             |
| `CollapseNodeAction`             | collapseNode               | `ephemeral/`  | -                                         | ✅ 是     | 折叠节点，隐藏子树           |
| `ExpandNodeAction`               | expandNode                 | `ephemeral/`  | -                                         | ✅ 是     | 展开节点，显示子树           |
| `SetFocusedAreaAction`           | setFocusedArea             | `ephemeral/`  | -                                         | ✅ 是     | 设置焦点区域（画布/大纲）    |
| `SetViewportAction`              | setViewport                | `ephemeral/`  | -                                         | ✅ 是     | 更新视口位置和缩放           |
| `EnsureCurrentNodeVisibleAction` | ensureCurrentNodeVisible   | `ephemeral/`  | -                                         | ❌ 否     | 确保当前节点在可视区域       |
| `SetSavingStatusAction`          | setSavingStatus            | `ephemeral/`  | -                                         | ❌ 否     | 管理保存状态显示             |

**目录分类说明**：

- **`persistent/`**: 持久化 Action，会影响 Supabase 中的数据
  - ✅ 实现了 `applyToIndexedDB()` 方法
  - ✅ 会标记 `dirty=true` 等待同步到服务器
  - ✅ 修改的是业务数据（节点、AI 消息等）

- **`ephemeral/`**: 临时 Action，不会影响 Supabase 中的数据
  - ✅ `applyToIndexedDB()` 为空实现或返回 `Promise.resolve()`
  - ✅ 只影响客户端 UI 状态
  - ✅ 修改的是派生状态或临时标志

### 持久化策略说明

| 持久化目标                 | IndexedDB 表                             | 同步到服务端               | 使用场景                           |
| -------------------------- | ---------------------------------------- | -------------------------- | ---------------------------------- |
| **服务端数据**             | mindmaps<br>mindmap_nodes<br>ai_messages | ✅ 是<br>(标记 dirty=true) | 思维导图内容、结构<br>AI 对话记录  |
| **本地会话**<br>(未来实现) | local_sessions                           | ❌ 否                      | 用户会话状态<br>视口位置、折叠状态 |
| **不持久化**               | -                                        | ❌ 否                      | 派生状态、临时标志                 |

**决策树**：

```
这个状态需要在多设备间共享吗？
├─ 是 → 写入 mindmaps/mindmap_nodes/ai_messages，标记 dirty=true
│   └─ 示例：节点内容、AI 对话
│
└─ 否 → 这个状态需要在本地跨会话保留吗？
    ├─ 是 → 未来：写入 local_sessions
    │   └─ 示例：当前节点、视口位置、折叠状态
    │
    └─ 否 → applyToIndexedDB() 空实现
        └─ 示例：保存状态标志、派生布局
```

## 核心接口

### EditorAction 接口

所有 Action 必须实现 `EditorAction` 接口：

```typescript
interface EditorAction {
  // 应用到内存状态（同步）
  applyToEditorState(state: EditorState): void;

  // 应用到数据库（异步）
  applyToIndexedDB(db: IDBPDatabase<MindmapDB>): Promise<void>;

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
  node: MindmapNode; // 完整的节点对象
}
```

**状态变更**:

- 将节点添加到 `EditorState.nodes` Map
- 标记 `isSaved = false`
- 🆕 预测新节点的布局并添加到 `layouts` 中（确保后续操作能立即访问布局信息）

**数据库操作**:

```typescript
await db.put("mindmap_nodes", {
  ...this.node,
  dirty: true, // ✅ 标记为需要同步
  deleted: false, // ✅ 确保清除删除标记（用于 undo 删除）
  local_updated_at: new Date().toISOString(),
});
```

**辅助方法**:

```typescript
getNode(): MindmapNode  // 供 Action 订阅者使用，获取要添加的节点
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
  nodeId: string,              // 节点的 short_id
  deletedNode?: MindmapNode    // 保存原节点数据用于恢复（自动捕获）
}
```

**状态变更**:

- 🆕 在删除前使用 `current()` 捕获节点快照（避免保存 revoked proxy）
- 从 `EditorState.nodes` Map 中移除节点
- 如果删除的是当前节点，自动切换到其父节点
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

#### AddAIMessageAction

**职责**: 添加 AI 对话消息到系统

**参数**:

```typescript
{
  message: AIMessage; // 完整的 AI 消息对象
}
```

**状态变更**:

- 不修改 `EditorState`（AI 消息独立存储）

**数据库操作**:

```typescript
await db.put("ai_messages", {
  ...this.message,
  dirty: true, // ✅ 标记为需要同步
  local_id: this.message.id,
  // server_id 在同步后填充
});
```

**逆操作**: `NoOpAction`（AI 对话消息不支持撤销）

**使用场景**:

- AI 助手回复用户
- 保存用户与 AI 的对话历史

**⚠️ 约束**:

- AI 消息是交互记录，设计上不支持 undo/redo
- reverse() 返回空操作（NoOpAction）

---

#### UpdateAIMessageMetadataAction

**职责**: 更新 AI 消息的元数据

**参数**:

```typescript
{
  messageId: string,                                          // AI 消息 ID
  metadataUpdate: Partial<NonNullable<AIMessage["metadata"]>> // 要更新的元数据字段
}
```

**状态变更**:

- 不修改 `EditorState`（AI 消息独立存储）

**数据库操作**:

```typescript
const existingMessage = await db.get("ai_messages", this.messageId);

await db.put("ai_messages", {
  ...existingMessage,
  metadata: {
    ...existingMessage.metadata,
    ...this.metadataUpdate,
  },
  dirty: true, // ✅ 标记为需要同步
});
```

**逆操作**: `NoOpAction`（不支持撤销）

**使用场景**:

- 标记 AI 建议的操作已执行
- 更新消息的状态信息

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

#### SetViewportAction

**职责**: 更新视口状态（位置、尺寸、缩放）

**参数**:

```typescript
{
  x?: number;       // 视口左边缘的 X 坐标（节点坐标系）
  y?: number;       // 视口上边缘的 Y 坐标（节点坐标系）
  width?: number;   // 视口宽度（节点坐标系）
  height?: number;  // 视口高度（节点坐标系）
  zoom?: number;    // 缩放比例 (0.1 - 2.0)
}
```

**状态变更**:

- 更新 `EditorState.viewport` 的对应字段（支持部分更新）
- 自动限制 zoom 在 [0.1, 2.0] 范围内

**数据库操作**: 无（视口状态不持久化，是派生状态）

**逆操作**: `SetViewportAction`（恢复之前的视口状态）

**使用场景**:

- 视图命令（zoom in/out/reset, pan, fit view）
- 导航命令的节点聚焦
- React Flow → Store 的视口同步

**特性**:

- 部分更新支持（只更新提供的字段）
- 使用节点坐标系（pre-zoom），与节点 x/y 一致
- 通过 MindmapGraphViewer 与 React Flow 双向同步
- 使用值比较机制防止同步循环

**详细设计**: 参见 [视口管理设计](./viewport-management-design.md)

---

#### EnsureCurrentNodeVisibleAction

**职责**: 自动滚动视口，确保当前节点在可视区域内

**参数**:

```typescript
{
  padding?: number  // 可选：安全区域内边距比例（默认 0.15，即 15%）
}
```

**状态变更**:

- 检查当前节点是否在视口的安全区域内
- 如果不在，自动调整 `EditorState.viewport` 的 x 和 y
- 使用节点坐标系计算（pre-zoom）

**数据库操作**: 无（视口状态不持久化）

**逆操作**: 返回自身（空操作，视口变化不需要 undo）

**使用场景**:

- 键盘导航后确保目标节点可见
- 添加新节点后自动聚焦
- 配合 SetCurrentNodeAction 使用

**算法说明**:

```typescript
// 1. 计算安全区域（避免节点贴边）
const safeLeft = viewport.x + viewport.width * padding;
const safeRight = viewport.x + viewport.width * (1 - padding);
const safeTop = viewport.y + viewport.height * padding;
const safeBottom = viewport.y + viewport.height * (1 - padding);

// 2. 检查节点是否在安全区域内
if (nodeRight < safeLeft) {
  // 节点在左侧，向左滚动
  deltaX = safeLeft - nodeRight;
} else if (nodeLeft > safeRight) {
  // 节点在右侧，向右滚动
  deltaX = safeRight - nodeLeft;
}

// 3. 更新视口位置
viewport.x -= deltaX;
viewport.y -= deltaY;
```

**特性**:

- 只在节点超出安全区域时才滚动
- 使用渐进式滚动，体验流畅
- 在 applyToEditorState 执行时才访问 state，支持处理新添加的节点

---

#### SetSavingStatusAction

**职责**: 管理保存操作的状态显示（保存中、已保存、未保存）

**参数**:

```typescript
{
  isSaving: boolean,  // 是否正在保存
  isSaved: boolean    // 是否已保存
}
```

**状态变更**:

- 更新 `EditorState.isSaving` - 保存操作进行中的标志
- 更新 `EditorState.isSaved` - 数据已同步到服务器的标志

**数据库操作**: 无（保存状态是瞬时 UI 状态，不需要持久化到 IndexedDB）

**逆操作**: 不支持（throw Error）

**使用场景**:

- 保存命令（global.save）的状态管理
  - 开始保存: `{ isSaving: true, isSaved: false }`
  - 保存成功: `{ isSaving: false, isSaved: true }`
  - 保存失败: `{ isSaving: false, isSaved: false }`
- UI 显示：
  - 🔵 保存中...（isSaving = true）
  - 🟢 已保存（isSaving = false, isSaved = true）
  - 🟠 未保存（isSaving = false, isSaved = false）

**⚠️ 约束**:

- 此 Action 仅用于 UI 状态管理，不可撤销
- 必须配合保存命令使用，确保所有退出路径都正确重置状态
- 保存命令应在 try-catch 中使用此 Action，避免状态卡住

**实现示例**:

```typescript
// src/domain/commands/global/save.ts
export const saveMindmapCommand: CommandDefinition = {
  handler: async (root: MindmapStore) => {
    // 设置保存中状态
    await root.acceptActions([
      new SetSavingStatusAction({ isSaving: true, isSaved: false }),
    ]);

    try {
      // 执行保存逻辑
      if (noChangesToSave) {
        // ✅ 必须重置状态，避免卡在 saving
        await root.acceptActions([
          new SetSavingStatusAction({ isSaving: false, isSaved: true }),
        ]);
        return;
      }

      // ... 保存到服务器 ...

      // 保存成功
      await root.acceptActions([
        new SetSavingStatusAction({ isSaving: false, isSaved: true }),
      ]);
    } catch (error) {
      // 保存失败
      await root.acceptActions([
        new SetSavingStatusAction({ isSaving: false, isSaved: false }),
      ]);
      throw error;
    }
  },
};
```

---

## Action 执行流程

### 完整执行链（双层订阅架构）

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
  ├─→ 2. notifySync() [同步，预测副作用]
  │    ├─ 调用所有 Sync 订阅者（逐个，同步）
  │    │   └─ LayoutService: 预测尺寸 → 更新缓存
  │    └─ 调用所有 Post-Sync 后处理器（去重）
  │         └─ LayoutService: 使用预测尺寸 → 驱动引擎 → 更新预测布局
  │
  ├─→ 3. applyToIndexedDB() [异步，数据安全]
  │    └─ idb 库操作数据库
  │         └─ 更新 dirty 标志
  │              └─ 等待 save() 同步到服务器
  │
  └─→ 4. notifyAsync() [异步，精确副作用]
       ├─ 调用所有 Async 订阅者（并发，异步）
       │   └─ LayoutService: 测量真实尺寸 → 更新缓存
       └─ 调用所有 Post-Async 后处理器（去重）
            └─ LayoutService: 使用真实尺寸 → 驱动引擎 → 更新精确布局
```

**执行顺序说明**：

1. **同步更新内存（Store）**：立即响应用户操作，UI 实时更新
2. **🆕 同步通知订阅者（Sync + Post-Sync）**：快速预测副作用，优化 UI 响应性
   - Sync 订阅：预测受影响节点的状态（如尺寸）
   - Post-Sync 后处理：批量驱动副作用系统（如布局引擎）
3. **异步持久化（IndexedDB）**：保证数据安全，防止丢失
4. **🆕 异步通知订阅者（Async + Post-Async）**：执行精确副作用，修正预测误差
   - Async 订阅：测量真实状态（如 DOM 尺寸）
   - Post-Async 后处理：批量更新副作用系统（如精确布局）

**双层订阅的优势**：

- ✅ **优化 UI 响应性**：Sync 阶段快速预测，用户无需等待 DOM 测量
- ✅ **保证精确性**：Async 阶段修正预测误差，最终布局完全精确
- ✅ **批量优化**：Post-处理器去重，避免重复驱动布局引擎
- ✅ **渐进式体验**：用户先看到预测布局（快），然后平滑过渡到精确布局（准）

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

## Action 订阅机制（双层 + 后处理架构）

### 设计动机

在 Action 层引入订阅机制的目的是**解耦业务逻辑与副作用**，并**优化 UI 响应性**：

**问题**：

- LayoutService 需要在节点变化时重新计算布局
  - 传统做法：等待 DOM 测量完成 → 计算布局 → 渲染（用户感知延迟）
  - 优化需求：先预测布局 → 立即渲染 → 测量真实尺寸 → 微调布局
- SyncManager 需要在数据变化时同步到云端
- 但这些逻辑不应该耦合在 Action 或 Command 中

**解决方案（双层 + 后处理架构）**：

1. **Sync 订阅**：Store 更新后立即执行，快速预测副作用（如节点尺寸）
2. **Post-Sync 后处理**：所有 Sync 订阅完成后执行，批量驱动副作用系统（如布局引擎）
3. **Async 订阅**：IndexedDB 更新后执行，测量真实状态（如 DOM 尺寸）
4. **Post-Async 后处理**：所有 Async 订阅完成后执行，批量更新副作用系统（如精确布局）

**架构优势**：

- ✅ **解耦业务逻辑与副作用**：Action/Command 不包含布局逻辑
- ✅ **优化 UI 响应性**：Sync 阶段快速预测，用户无感知延迟
- ✅ **保证最终精确性**：Async 阶段修正预测误差
- ✅ **批量优化性能**：后处理器去重，避免重复计算
- ✅ **错误隔离**：订阅者错误不影响 Action 执行

### 核心接口

#### ActionSubscriptionManager

```typescript
class ActionSubscriptionManager {
  // ========================================
  // 四种订阅 API
  // ========================================

  /**
   * 订阅单个 Action 的同步通知（Store 更新后立即执行）
   * 约束：必须是同步函数，应尽快完成（< 10ms）
   */
  subscribeSync(action: ActionType, handler: SyncSubscriber): () => void;

  /**
   * 订阅单个 Action 的异步通知（IndexedDB 更新后执行）
   * 允许：同步或异步函数，可包含异步操作
   */
  subscribeAsync(action: ActionType, handler: AsyncSubscriber): () => void;

  /**
   * 订阅同步后处理（所有 Sync 订阅完成后执行）
   * 特点：
   * - 批量去重：每个 ActionType 只调用一次
   * - 接收该批次中该类型的所有 Actions
   * - 用于批量驱动副作用系统（如布局引擎）
   */
  subscribePostSync(
    actions: ActionType[],
    handler: PostSyncHandler
  ): () => void;

  /**
   * 订阅异步后处理（所有 Async 订阅完成后执行）
   * 特点：同 Post-Sync，但在 Async 阶段之后
   */
  subscribePostAsync(
    actions: ActionType[],
    handler: PostAsyncHandler
  ): () => void;

  // ========================================
  // 通知方法（内部使用，由 MindmapStore 调用）
  // ========================================

  /**
   * 通知同步订阅者（在 applyToEditorState 之后调用）
   */
  notifySync(actions: EditorAction[], mindmapId: string): void;

  /**
   * 通知异步订阅者（在 applyToIndexedDB 之后调用）
   */
  notifyAsync(actions: EditorAction[], mindmapId: string): Promise<void>;

  // ========================================
  // 调试和维护方法
  // ========================================

  /**
   * 清空所有订阅（主要用于测试）
   */
  clear(): void;

  /**
   * 获取订阅统计（调试用）
   */
  getStats(): {
    sync: Record<ActionType, number>;
    async: Record<ActionType, number>;
    postSync: number;
    postAsync: number;
  };
}
```

**API 设计说明**:

- ✅ 所有订阅方法返回 `unsubscribe` 函数（类似 React `useEffect`）
- ✅ 四种订阅方式覆盖不同的执行时机和用途
- ✅ Sync/Async 订阅接收单个 Action，Post-订阅接收批量 Actions
- ✅ 性能监控：开发模式下警告慢 Sync 订阅者（> 5ms）

#### 类型定义

```typescript
// Action Payload（单个 Action 通知）
interface ActionPayload {
  action: EditorAction; // Action 实例
  mindmapId: string; // 思维导图 ID
}

// 同步订阅者（Store 更新后立即执行）
type SyncSubscriber = (payload: ActionPayload) => void;

// 异步订阅者（IndexedDB 更新后执行）
type AsyncSubscriber = (payload: ActionPayload) => void | Promise<void>;

// 同步后处理器（所有 Sync 订阅完成后执行）
type PostSyncHandler = (actionsMap: Map<ActionType, EditorAction[]>) => void;

// 异步后处理器（所有 Async 订阅完成后执行）
type PostAsyncHandler = (
  actionsMap: Map<ActionType, EditorAction[]>
) => void | Promise<void>;
```

**设计约束**：

- ⚠️ **SyncSubscriber 必须是同步函数**：不能返回 Promise，不能包含 `await`
- ⚠️ **SyncSubscriber 应尽快完成**：建议 < 10ms，避免阻塞 UI
- ✅ **AsyncSubscriber 可以异步**：可以包含 DOM 测量、网络请求等
- ✅ **Post-Handler 接收 Map**：`Map<ActionType, EditorAction[]>` 支持批量处理

### 使用示例

#### 1. LayoutService 的 4 步订阅流程（完整示例）

```typescript
import { actionSubscriptionManager } from "@/domain/action-subscription-manager";
import type { MindmapNode } from "@/lib/types";
import { predictNodeSize } from "./layout-predictor";

class MindmapLayoutService {
  private unsubscribeFns: Array<() => void> = [];
  private sizeCache: Map<string, NodeSize> = new Map();

  init(): void {
    // ========================================
    // 步骤 1: Sync 订阅 - 预测受影响节点的尺寸
    // ========================================
    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribeSync("addChildNode", ({ action }) => {
        const addAction = action as { getNode?: () => MindmapNode };
        if (addAction.getNode) {
          const newNode = addAction.getNode();
          console.log(
            "[LayoutService] Sync: predicting new node",
            newNode.short_id
          );

          // 快速预测新节点尺寸（基于字体度量）
          const predictedSize = predictNodeSize(newNode);
          this.sizeCache.set(newNode.short_id, predictedSize);
        }
      })
    );

    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribeSync("updateNode", ({ action }) => {
        const updateAction = action as { getNodeId?: () => string };
        if (updateAction.getNodeId) {
          const nodeId = updateAction.getNodeId();
          const node = this.getCurrentState().nodes.get(nodeId);

          if (node) {
            console.log(
              "[LayoutService] Sync: predicting updated node",
              nodeId
            );

            // 重新预测更新后的尺寸
            const predictedSize = predictNodeSize(node);
            this.sizeCache.set(nodeId, predictedSize);
          }
        }
      })
    );

    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribeSync("removeNode", ({ action }) => {
        const deleteAction = action as { getNodeId?: () => string };
        if (deleteAction.getNodeId) {
          const nodeId = deleteAction.getNodeId();
          console.log("[LayoutService] Sync: removing node from cache", nodeId);

          // 清理缓存
          this.sizeCache.delete(nodeId);
        }
      })
    );

    // ========================================
    // 步骤 2: Post-Sync 后处理 - 使用预测尺寸驱动布局引擎
    // ========================================
    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribePostSync(
        [
          "addChildNode",
          "updateNode",
          "removeNode",
          "collapseNode",
          "expandNode",
        ],
        (actionsMap) => {
          console.log(
            "[LayoutService] Post-sync: updating layout with predictions,",
            actionsMap.size,
            "action types"
          );

          // 使用缓存的预测尺寸驱动布局引擎
          this.updateLayout();
        }
      )
    );

    // ========================================
    // 步骤 3: Async 订阅 - 测量节点的真实尺寸
    // ========================================
    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribeAsync(
        "addChildNode",
        async ({ action }) => {
          const addAction = action as { getNode?: () => MindmapNode };
          if (addAction.getNode) {
            const newNode = addAction.getNode();
            console.log(
              "[LayoutService] Async: measuring new node",
              newNode.short_id
            );

            // 异步测量真实尺寸（需要 DOM 渲染完成）
            const actualSize = await this.measureNode(newNode);
            this.sizeCache.set(newNode.short_id, actualSize);
          }
        }
      )
    );

    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribeAsync(
        "updateNode",
        async ({ action }) => {
          const updateAction = action as { getNodeId?: () => string };
          if (updateAction.getNodeId) {
            const nodeId = updateAction.getNodeId();
            const node = this.getCurrentState().nodes.get(nodeId);

            if (node) {
              console.log(
                "[LayoutService] Async: measuring updated node",
                nodeId
              );

              // 异步测量真实尺寸
              const actualSize = await this.measureNode(node);
              this.sizeCache.set(nodeId, actualSize);
            }
          }
        }
      )
    );

    // ========================================
    // 步骤 4: Post-Async 后处理 - 使用真实尺寸更新精确布局
    // ========================================
    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribePostAsync(
        [
          "addChildNode",
          "updateNode",
          "removeNode",
          "collapseNode",
          "expandNode",
        ],
        async (actionsMap) => {
          console.log(
            "[LayoutService] Post-async: updating layout with actual sizes,",
            actionsMap.size,
            "action types"
          );

          // 使用真实尺寸驱动布局引擎
          this.updateLayout();
        }
      )
    );

    console.log(
      `[LayoutService] Subscribed with dual-layer architecture: ${this.unsubscribeFns.length} subscriptions`
    );
  }

  private updateLayout(): void {
    const { nodes, collapsedNodes } = this.getCurrentState();
    const layouts = this.engine.layout(nodes, this.sizeCache, collapsedNodes);
    this.populateLayoutsToStore(layouts);
  }

  dispose(): void {
    // 取消所有订阅
    this.unsubscribeFns.forEach((fn) => fn());
    this.unsubscribeFns = [];
  }
}
```

**执行流程说明**：

```
用户添加节点（Enter）
  ↓
[步骤 1] Sync 订阅：预测新节点尺寸（10ms）
  └─ predictNodeSize() → 更新 sizeCache
  ↓
[步骤 2] Post-Sync 后处理：驱动布局引擎
  └─ updateLayout() → 使用预测尺寸 → 更新 Store
  ↓ (UI 立即显示预测布局，用户感知快速响应)
  ↓
[步骤 3] Async 订阅：测量真实尺寸（50ms）
  └─ measureNode() → DOM 测量 → 更新 sizeCache
  ↓
[步骤 4] Post-Async 后处理：更新精确布局
  └─ updateLayout() → 使用真实尺寸 → 更新 Store
  ↓ (UI 平滑过渡到精确布局，误差通常 < 5px)
```

**为什么需要 4 步？**

- **步骤 1 + 2**：快速预测 → 优化 UI 响应性（用户无感知延迟）
- **步骤 3 + 4**：精确测量 → 保证最终布局准确（修正预测误差）
- **分离 Sync/Async**：避免阻塞 Store 更新（DOM 测量可能需要 50-100ms）
- **后处理去重**：批量操作时只驱动一次布局引擎（性能优化）

#### 2. 简单的异步订阅（SyncManager）

```typescript
class SyncManager {
  private unsubscribeFns: Array<() => void> = [];

  init(): void {
    // 订阅所有需要同步的 Actions（Async 阶段）
    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribeAsync(
        "addChildNode",
        async (payload) => {
          console.log("[SyncManager] Syncing added node");
          await this.syncNodeToCloud(payload.action);
        }
      )
    );

    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribeAsync(
        "updateNode",
        async (payload) => {
          console.log("[SyncManager] Syncing updated node");
          await this.syncNodeToCloud(payload.action);
        }
      )
    );

    // 或者使用 Post-Async 批量处理
    this.unsubscribeFns.push(
      actionSubscriptionManager.subscribePostAsync(
        ["addChildNode", "updateNode", "removeNode"],
        async (actionsMap) => {
          console.log(
            `[SyncManager] Batch syncing ${actionsMap.size} action types`
          );
          await this.batchSyncToCloud(actionsMap);
        }
      )
    );
  }

  dispose(): void {
    this.unsubscribeFns.forEach((fn) => fn());
    this.unsubscribeFns = [];
  }
}
```

### 集成点

订阅通知集成在 `MindmapStore.acceptActions()` 中，分两个阶段触发：

```typescript
// src/domain/mindmap-store.ts
acceptActions: async (actions) => {
  const mindmapId = state.currentEditor.currentMindmap.id;

  // 1. 批量更新内存状态（同步）
  set((state) => {
    actions.forEach((action) => {
      action.applyToEditorState(state.currentEditor!);
    });
    state.currentEditor.version++;
  });

  // 🆕 2. 通知同步订阅者（同步）
  actionSubscriptionManager.notifySync(actions, mindmapId);

  // 3. 批量持久化到 IndexedDB（异步）
  const db = await getDB();
  const tx = db.transaction("mindmap_nodes", "readwrite");
  for (const action of actions) {
    if (action.applyToIndexedDB) {
      await action.applyToIndexedDB(db);
    }
  }
  await tx.done;

  // 🆕 4. 通知异步订阅者（异步）
  await actionSubscriptionManager.notifyAsync(actions, mindmapId);
},
```

**关键特性**：

- ✅ **Sync 通知在 Store 更新后立即执行**：优化 UI 响应性
- ✅ **Async 通知在 IndexedDB 更新后执行**：保证持久化完成
- ✅ **批量通知**：`notifySync` 和 `notifyAsync` 接收整个 Actions 数组
- ✅ **性能监控**：开发模式下警告慢订阅者

### 错误处理

订阅机制使用 `Promise.allSettled()` 和 `try-catch` 实现错误隔离：

#### Sync 阶段错误处理（同步）

```typescript
notifySync(actions: EditorAction[], mindmapId: string): void {
  // 1. 调用所有 Sync 订阅者
  for (const action of actions) {
    const subscribers = this.syncSubscriptions.get(action.type);
    if (subscribers) {
      for (const sub of subscribers) {
        try {
          sub.handler({ action, mindmapId });
        } catch (error) {
          // 错误隔离：不中断其他订阅者
          console.error(
            `[ActionSubscriptionManager] Sync subscriber error for ${action.type}:`,
            error
          );
        }
      }
    }
  }

  // 2. 调用 Post-Sync 后处理器
  for (const postSub of this.postSyncSubscriptions) {
    const relevantActions = this.filterRelevantActions(actionsMap, postSub.actionTypes);
    if (relevantActions.size > 0) {
      try {
        postSub.handler(relevantActions);
      } catch (error) {
        console.error(`[ActionSubscriptionManager] Post-sync handler error:`, error);
      }
    }
  }
}
```

#### Async 阶段错误处理（异步）

```typescript
async notifyAsync(actions: EditorAction[], mindmapId: string): Promise<void> {
  // 1. 并发调用所有 Async 订阅者
  for (const action of actions) {
    const subscribers = this.asyncSubscriptions.get(action.type);
    if (subscribers) {
      const promises = Array.from(subscribers).map((sub) =>
        Promise.resolve(sub.handler({ action, mindmapId })).catch((error) => {
          console.error(
            `[ActionSubscriptionManager] Async subscriber error for ${action.type}:`,
            error
          );
        })
      );
      await Promise.allSettled(promises);
    }
  }

  // 2. 并发调用 Post-Async 后处理器
  const promises = this.postAsyncSubscriptions.map(async (postSub) => {
    const relevantActions = this.filterRelevantActions(actionsMap, postSub.actionTypes);
    if (relevantActions.size > 0) {
      try {
        await postSub.handler(relevantActions);
      } catch (error) {
        console.error(`[ActionSubscriptionManager] Post-async handler error:`, error);
      }
    }
  });
  await Promise.allSettled(promises);
}
```

**关键特性**：

- ✅ **Sync 阶段**: 使用 `try-catch` 捕获同步错误
- ✅ **Async 阶段**: 使用 `Promise.allSettled()` 并发执行，错误隔离
- ✅ **错误不传播**: 一个订阅者的错误不影响其他订阅者或 Action 执行
- ✅ **完整日志**: 所有错误都会被记录到控制台
- ✅ **错误上下文**: 日志包含 ActionType 和错误堆栈

### 性能考虑

#### 性能优化策略

1. **Sync 阶段串行执行**：
   - Sync 订阅者必须同步，按顺序执行
   - 开发模式警告慢订阅者（> 5ms）
   - 总时间 > 10ms 时警告

2. **Async 阶段并发执行**：
   - 所有 Async 订阅者并发执行
   - 使用 `Promise.allSettled()` 避免阻塞

3. **后处理器去重**：
   - 批量操作时，每个 ActionType 只调用一次
   - 避免重复驱动布局引擎（性能关键）

4. **订阅管理 O(1)**：
   - 使用 `Map<ActionType, Set<Subscription>>` 存储
   - 订阅/取消订阅/查询都是 O(1)

#### 性能监控（开发模式）

```typescript
// notifySync 中的性能监控
const startTime = performance.now();

// ... 执行订阅者 ...

const duration = performance.now() - startTime;
if (duration > 10) {
  console.warn(
    `[ActionSubscriptionManager] Sync notification took ${duration.toFixed(2)}ms (> 10ms threshold)`
  );
}

// 单个 Sync 订阅者的性能监控
const subStartTime = performance.now();
sub.handler(payload);
const subDuration = performance.now() - subStartTime;

if (process.env.NODE_ENV === "development" && subDuration > 5) {
  console.warn(
    `[ActionSubscriptionManager] Slow sync subscriber for ${action.type}: ${subDuration.toFixed(2)}ms`
  );
}
```

**性能指标**：

- ✅ **Sync 订阅者**: 建议 < 5ms，警告阈值 5ms
- ✅ **Sync 总时间**: 建议 < 10ms，警告阈值 10ms
- ✅ **Async 订阅者**: 无时间限制，可以包含 DOM 测量（50-100ms）
- ✅ **后处理器**: 应尽快完成，但允许驱动布局引擎（10-50ms）

### 最佳实践

#### DO（推荐做法）

1. ✅ **使用返回的 unsubscribe 函数**：

   ```typescript
   const unsubscribe = manager.subscribeSync("addChildNode", handler);
   // 取消订阅时
   unsubscribe(); // ✅ 正确
   ```

2. ✅ **在服务类的 init() 中设置订阅**：确保订阅生命周期与服务一致

3. ✅ **在 dispose() 中取消所有订阅**：

   ```typescript
   dispose(): void {
     this.unsubscribeFns.forEach(fn => fn());
     this.unsubscribeFns = [];
   }
   ```

4. ✅ **Sync 订阅者必须同步且快速**：
   - 不能返回 Promise
   - 不能包含 `await`
   - 建议 < 5ms

5. ✅ **Async 订阅者可以异步**：
   - 可以返回 Promise
   - 可以包含 DOM 测量、网络请求
   - 使用 try-catch 处理自己的错误

6. ✅ **优先使用后处理器批量驱动副作用系统**：
   - 使用 `subscribePostSync` 或 `subscribePostAsync`
   - 避免在每个单独的订阅者中驱动布局引擎

7. ✅ **使用类型断言访问具体 Action 数据**：

   ```typescript
   const addAction = action as { getNode?: () => MindmapNode };
   ```

8. ✅ **订阅者执行纯粹的副作用**：不修改 EditorState（通过 Store 读取状态）

#### DON'T（避免做法）

1. ❌ **不要在 Sync 订阅者中使用 async/await**：

   ```typescript
   // ❌ 错误：Sync 订阅者不能异步
   manager.subscribeSync("addChildNode", async (payload) => {
     await measureNode(); // ❌ 会导致类型错误
   });

   // ✅ 正确：使用 Async 订阅
   manager.subscribeAsync("addChildNode", async (payload) => {
     await measureNode(); // ✅ 正确
   });
   ```

2. ❌ **不要在每个订阅者中重复驱动布局引擎**：

   ```typescript
   // ❌ 错误：批量操作时会重复驱动 3 次
   manager.subscribeSync("addChildNode", () => this.updateLayout());
   manager.subscribeSync("updateNode", () => this.updateLayout());
   manager.subscribeSync("removeNode", () => this.updateLayout());

   // ✅ 正确：使用后处理器，批量操作只驱动 1 次
   manager.subscribePostSync(["addChildNode", "updateNode", "removeNode"], () =>
     this.updateLayout()
   );
   ```

3. ❌ **不要在订阅者中修改 EditorState**：订阅者只能读取 state，不能修改

4. ❌ **不要在订阅者中执行 Action**：会导致无限循环

5. ❌ **不要忘记取消订阅**：会导致内存泄漏和重复执行

6. ❌ **不要在订阅者中抛出未捕获的错误**：应该自己处理错误（特别是 Async 订阅者）

7. ❌ **不要混淆 Sync 和 Async 的使用场景**：
   - Sync 用于快速预测（如预测尺寸、更新缓存）
   - Async 用于耗时操作（如 DOM 测量、网络请求）

### 测试

订阅机制包含完整的单元测试：

```bash
volta run yarn test src/domain/__tests__/action-subscription-manager.test.ts
```

**测试覆盖**：

- ✅ 四种订阅方式（Sync/Async/Post-Sync/Post-Async）
- ✅ 订阅和取消订阅
- ✅ Sync 通知分发（同步执行）
- ✅ Async 通知分发（并发执行）
- ✅ 后处理器去重机制
- ✅ 错误隔离（Sync try-catch，Async Promise.allSettled）
- ✅ 性能监控（慢订阅者警告）
- ✅ 订阅统计（getStats）

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

### Action 实现文件

**持久化 Action（persistent/）**:

- `src/domain/actions/persistent/add-node.ts` - AddNodeAction
- `src/domain/actions/persistent/remove-node.ts` - RemoveNodeAction
- `src/domain/actions/persistent/update-node.ts` - UpdateNodeAction
- `src/domain/actions/persistent/add-ai-message.ts` - AddAIMessageAction
- `src/domain/actions/persistent/update-ai-message-metadata.ts` - UpdateAIMessageMetadataAction

**临时 Action（ephemeral/）**:

- `src/domain/actions/ephemeral/set-current-node.ts` - SetCurrentNodeAction
- `src/domain/actions/ephemeral/collapse-node.ts` - CollapseNodeAction
- `src/domain/actions/ephemeral/expand-node.ts` - ExpandNodeAction
- `src/domain/actions/ephemeral/set-focused-area.ts` - SetFocusedAreaAction
- `src/domain/actions/ephemeral/set-viewport.ts` - SetViewportAction
- `src/domain/actions/ephemeral/ensure-current-node-visible.ts` - EnsureCurrentNodeVisibleAction
- `src/domain/actions/ephemeral/set-saving-status.ts` - SetSavingStatusAction

### 核心基础设施

- **Action 接口定义**: `src/domain/mindmap-store.types.ts`
- **订阅机制**:
  - 类型定义: `src/domain/action-subscription.types.ts`
  - 管理器实现: `src/domain/action-subscription-manager.ts`
  - 单元测试: `src/domain/__tests__/action-subscription-manager.test.ts`
- **历史管理器**: `src/domain/history-manager.ts`
- **MindmapStore**: `src/domain/mindmap-store.ts`
- **IndexedDB Schema**: `src/lib/db/schema.ts`

---

**文档维护**: 当添加新的 Action 类型时，请同时更新：

1. 本文档顶部的 Action 汇总表
2. 对应章节的详细描述
3. 本节的相关代码位置列表
4. 将 Action 文件放到正确的目录（`persistent/` 或 `ephemeral/`）
