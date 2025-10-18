# 思维导图持久化需求文档

## 1. 概述

### 1.1 目标

实现思维导图从用户操作到最终持久化到 Supabase 的完整流程，支持离线编辑、手动保存、以及未来的多人协作扩展。

### 1.2 版本规划

- **第一版 (MVP)**: 基于 IndexedDB 本地缓存 + 手动保存到 Supabase
- **未来版本**: 基于 Supabase Realtime 的多人实时协作

## 2. 核心需求

### 2.1 数据流架构

```
┌─────────────┐
│   用户操作   │ (编辑、添加、删除节点)
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│      Zustand Store (单一数据源)      │
│  - 立即响应用户操作                  │
│  - 通过中间件自动同步到 IndexedDB    │
│  - 标记"脏"数据(未保存到云端)        │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│         IndexedDB (本地缓存)         │
│  - 存储所有节点和思维导图数据        │
│  - 存储操作历史(支持撤销/重做)       │
│  - 标记脏数据(dirty flag)           │
└──────┬──────────────────────────────┘
       │ 手动触发 (Cmd+S 或保存按钮)
       ↓
┌─────────────────────────────────────┐
│      同步层 (Sync Manager)          │
│  - 收集所有脏数据                   │
│  - 时间戳冲突检测                   │
│  - 批量上传到 Supabase              │
│  - 处理保存成功/失败                │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│         Supabase (云端存储)          │
│  - mindmaps 表                      │
│  - mindmap_nodes 表                 │
│  - 权威数据源                       │
└─────────────────────────────────────┘
```

### 2.2 用户操作流程

#### 2.2.1 打开思维导图

```
1. 用户访问 /mindmaps/[shortId]
   ↓
2. 并行加载:
   - 从 Supabase 加载最新数据
   - 从 IndexedDB 加载本地缓存
   ↓
3. 数据选择策略:
   - 比较时间戳 (updated_at)
   - 如果 IndexedDB.updated_at > Supabase.updated_at:
     → 使用 IndexedDB 数据 (有本地未保存的修改)
     → UI 显示"有未保存的修改"状态
   - 否则:
     → 使用 Supabase 数据
     → 更新 IndexedDB 缓存
   ↓
4. 初始化 Zustand Store
5. 渲染 UI
```

#### 2.2.2 编辑操作

```
1. 用户编辑节点内容
   ↓
2. Zustand Store 更新状态
   ↓
3. Persistence Middleware 拦截:
   - 同步到 IndexedDB
   - 标记该节点为"脏"(dirty: true)
   - 记录操作到历史栈(支持撤销)
   ↓
4. UI 更新:
   - 节点内容立即更新
   - 保存状态显示"未保存"或"本地已保存"
```

#### 2.2.3 保存到云端 (Cmd+S)

```
1. 用户按 Cmd+S 或点击保存按钮
   ↓
2. UI 显示"同步中..."状态
   ↓
3. Sync Manager 收集脏数据:
   - 查询 IndexedDB 中所有 dirty: true 的记录
   - 获取当前思维导图的 updated_at 时间戳
   ↓
4. 冲突检测:
   - 从 Supabase 读取最新的 mindmap.updated_at
   - 如果 Supabase.updated_at > 本地保存时的时间戳:
     → 显示冲突提示对话框
     → 选项A: 强制覆盖
     → 选项B: 丢弃本地修改，重新加载服务端数据
     → 选项C: 取消保存
   ↓
5. 执行保存:
   - 批量更新/插入 mindmap_nodes
   - 更新 mindmap.updated_at
   - 使用事务确保原子性
   ↓
6. 保存成功:
   - 清除所有节点的 dirty 标记
   - UI 显示"云端已保存"
   - 更新 IndexedDB 的时间戳
   ↓
7. 保存失败:
   - 保留 dirty 标记
   - UI 显示错误提示
   - 允许用户重试
```

#### 2.2.4 撤销/重做

```
1. 用户按 Cmd+Z (撤销) 或 Cmd+Shift+Z (重做)
   ↓
2. 从 IndexedDB 读取操作历史栈
   ↓
3. 获取上一个/下一个操作:
   - 操作类型 (ADD_NODE, UPDATE_NODE, DELETE_NODE, etc.)
   - 操作数据 (节点快照)
   ↓
4. 执行反向操作:
   - 撤销 ADD_NODE → 删除该节点
   - 撤销 UPDATE_NODE → 恢复旧内容
   - 撤销 DELETE_NODE → 重新添加节点
   ↓
5. 更新 Zustand Store 和 IndexedDB
   ↓
6. 标记受影响的节点为"脏"
   ↓
7. UI 更新并显示"未保存"状态
```

## 3. 技术需求详解

### 3.1 冲突处理策略

#### 选择: **B. 时间戳检查**

**实现方案**:

```typescript
async function saveToSupabase() {
  // 1. 获取本地数据的时间戳
  const localUpdatedAt = store.mindmap.updated_at;

  // 2. 读取服务器最新时间戳
  const { data: serverMindmap } = await supabase
    .from("mindmaps")
    .select("updated_at")
    .eq("short_id", mindmapId)
    .single();

  // 3. 冲突检测
  if (new Date(serverMindmap.updated_at) > new Date(localUpdatedAt)) {
    // 显示冲突对话框
    const action = await showConflictDialog({
      localVersion: localUpdatedAt,
      serverVersion: serverMindmap.updated_at,
    });

    if (action === "cancel") return;

    if (action === "discard_local") {
      // 丢弃本地修改，重新加载云端数据
      await reloadFromServer();
      return;
    }

    // action === 'force_overwrite' 继续执行覆盖
  }

  // 4. 执行保存
  await uploadDirtyNodes();
}
```

**冲突对话框 UI**:

```
┌────────────────────────────────────────┐
│  ⚠️  检测到冲突                         │
│                                        │
│  服务器数据已更新:                      │
│  本地版本: 2025-10-03 10:30:00        │
│  云端版本: 2025-10-03 10:35:00        │
│                                        │
│     [强制覆盖]  [丢弃本地修改]  [取消] │
└────────────────────────────────────────┘
```

**说明**:

- **强制覆盖**: 用本地修改覆盖云端数据
- **丢弃本地修改**: 重新加载云端数据，丢弃本地修改
- **取消**: 取消保存操作
- **查看差异**: 暂不支持，作为后续功能扩展

### 3.2 保存粒度

#### 选择: **C. 维护脏数据列表**

**IndexedDB Schema 扩展**:

```typescript
interface MindmapDB extends DBSchema {
  mindmap_nodes: {
    value: {
      // ... 原有字段（id, short_id, mindmap_id, parent_id, parent_short_id, title, content, order_index, created_at, updated_at, deleted_at）

      // 新增字段用于脏数据追踪
      dirty: boolean; // 是否有未保存的修改
      local_updated_at: string; // 本地最后修改时间
    };
  };
}

// 注：完整的 IndexedDB Schema 定义请参见 Section 4.1
```

**脏数据标记逻辑**:

```typescript
// 在 Persistence Middleware 中
async function executeSync(meta: OperationMetadata): Promise<void> {
  const db = await dbPromise;

  switch (meta[OPERATION_TYPE]) {
    case "UPDATE_NODE_CONTENT": {
      const existing = await db.get("mindmap_nodes", meta.nodeId);
      await db.put("mindmap_nodes", {
        ...existing,
        content: meta.content,
        updated_at: meta.updated_at,
        dirty: true, // 标记为脏
        local_updated_at: new Date().toISOString(),
      });
      break;
    }
    // ... 其他操作类似
  }
}
```

**收集脏数据**:

```typescript
async function collectDirtyNodes(): Promise<MindmapNode[]> {
  const db = await dbPromise;
  const allNodes = await db.getAll("mindmap_nodes");
  return allNodes.filter((node) => node.dirty);
}
```

### 3.3 保存反馈

#### 选择: **B. 乐观更新**

**UI 状态机**:

```typescript
type SaveStatus =
  | "saved" // 云端已保存
  | "local_only" // 仅本地保存,未同步
  | "syncing" // 同步中
  | "sync_failed" // 同步失败
  | "conflict"; // 检测到冲突

const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
```

**保存流程**:

```typescript
async function handleSave() {
  // 1. 乐观更新 UI
  setSaveStatus("syncing");

  try {
    // 2. 执行保存
    await saveToSupabase();

    // 3. 成功
    setSaveStatus("saved");
    showToast("已保存到云端");
  } catch (error) {
    // 4. 失败 - 回滚状态
    setSaveStatus("sync_failed");
    showToast("保存失败,请重试", { action: "retry" });
  }
}
```

**UI 显示**:

```tsx
<div className="save-status">
  {saveStatus === "saved" && <CheckIcon />}
  {saveStatus === "local_only" && <CloudOffIcon />}
  {saveStatus === "syncing" && <Spinner />}
  {saveStatus === "sync_failed" && <ErrorIcon />}

  <span>
    {saveStatus === "saved" && "已保存"}
    {saveStatus === "local_only" && "未同步"}
    {saveStatus === "syncing" && "同步中..."}
    {saveStatus === "sync_failed" && "同步失败"}
  </span>
</div>
```

### 3.4 离线支持范围

#### 选择: **B. 离线编辑 + 手动同步**

**网络状态检测**:

```typescript
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

**离线提示**:

```tsx
function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      ⚠️ 当前离线,所有修改将保存在本地,上线后请手动保存
    </div>
  );
}
```

**保存按钮行为**:

```typescript
function SaveButton() {
  const isOnline = useOnlineStatus();
  const hasDirtyData = useHasDirtyData();

  const handleSave = async () => {
    if (!isOnline) {
      showToast('当前离线,无法保存到云端');
      return;
    }

    await saveToSupabase();
  };

  return (
    <button
      onClick={handleSave}
      disabled={!isOnline || !hasDirtyData}
    >
      {isOnline ? '保存' : '离线'}
    </button>
  );
}
```

### 3.5 数据一致性边界

#### 选择: **C. 混合模式**

**数据加载策略**:

```typescript
async function loadMindmapData(shortId: string) {
  const isOnline = navigator.onLine;

  if (!isOnline) {
    // 离线: 只使用 IndexedDB
    const cached = await loadFromIndexedDB(shortId);
    if (!cached) {
      throw new Error("离线状态下无法加载新思维导图");
    }
    return cached;
  }

  // 在线: 并行加载
  const [server, cached] = await Promise.all([
    loadFromSupabase(shortId),
    loadFromIndexedDB(shortId),
  ]);

  // 比较时间戳
  if (cached && new Date(cached.updated_at) > new Date(server.updated_at)) {
    // 本地有未保存的修改
    return {
      data: cached,
      status: "local_only",
      hasUnsavedChanges: true,
    };
  }

  // 使用服务器数据并更新缓存
  await updateIndexedDB(server);
  return {
    data: server,
    status: "saved",
    hasUnsavedChanges: false,
  };
}
```

### 3.6 多设备场景

#### 选择: **A. 不支持 (第一版)**

**说明**:

- 第一版不主动检测多设备/多标签页同时编辑的情况
- 依赖时间戳冲突检测机制,最后保存的设备会触发冲突提示
- 未来版本可通过 Supabase Realtime 实现实时同步

**可选增强** (如果时间允许):

```typescript
// 检测同一浏览器的多标签页
function detectMultipleTabs() {
  const channel = new BroadcastChannel("mindmap-editor");

  channel.postMessage({ type: "TAB_OPENED", mindmapId });

  channel.onmessage = (event) => {
    if (
      event.data.type === "TAB_OPENED" &&
      event.data.mindmapId === mindmapId
    ) {
      showWarning("检测到其他标签页正在编辑此思维导图");
    }
  };
}
```

### 3.7 操作历史/撤销重做

#### 选择: **C. 持久化支持 - 基于操作(Action-based)**

**实现方式**: 纯操作方式 (记录操作类型和参数，撤销时执行反向操作)

**优势**:

- ✅ 存储空间小 (每条操作 ~550 bytes)
- ✅ 语义清晰，知道用户做了什么
- ✅ 易于调试和审计
- ✅ 支持未来的操作合并优化

**操作状态类型定义**:

```typescript
/**
 * 节点操作状态类型
 * 用于记录操作历史中的 before_state 和 after_state
 */
type NodeOperationState = {
  nodeId: string;
  title?: string;
  content?: string;
  parent_id?: string | null;
  order_index?: number;
};
```

**IndexedDB Schema 扩展**:

```typescript
interface MindmapDB extends DBSchema {
  // 新增操作历史表
  operation_history: {
    key: string; // operation_id
    value: {
      id: string;
      mindmap_id: string;
      operation_type: OperationType;
      timestamp: string;

      // 操作数据快照
      before_state: NodeOperationState; // 操作前的状态
      after_state: NodeOperationState; // 操作后的状态

      // 用于撤销/重做
      is_undone: boolean; // 是否已被撤销
    };
    indexes: {
      "by-mindmap": string;
      "by-timestamp": string;
    };
  };
}
```

**记录操作历史**:

```typescript
// 在 Persistence Middleware 中
async function executeSync(meta: OperationMetadata): Promise<void> {
  const db = await dbPromise;

  // 1. 执行实际操作 (更新 nodes 表)
  await updateNode(meta);

  // 2. 记录到历史
  await db.add("operation_history", {
    id: crypto.randomUUID(),
    mindmap_id: meta.mindmapId,
    operation_type: meta[OPERATION_TYPE],
    timestamp: new Date().toISOString(),
    before_state: meta.before, // 操作前的数据
    after_state: meta.after, // 操作后的数据
    is_undone: false,
  });
}
```

**撤销操作实现**:

```typescript
async function undo() {
  const db = await dbPromise;
  const mindmapId = store.mindmap.id;

  // 1. 获取最后一个未撤销的操作
  const operations = await db.getAllFromIndex(
    "operation_history",
    "by-mindmap",
    mindmapId
  );

  const lastOp = operations
    .filter((op) => !op.is_undone)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

  if (!lastOp) return;

  // 2. 执行反向操作
  await executeReverseOperation(lastOp);

  // 3. 标记为已撤销
  await db.put("operation_history", {
    ...lastOp,
    is_undone: true,
  });
}

function executeReverseOperation(op: OperationHistory) {
  switch (op.operation_type) {
    case "ADD_NODE":
      // 撤销添加 = 删除节点
      store.deleteNode(op.after_state.nodeId);
      break;

    case "UPDATE_NODE_CONTENT":
      // 撤销更新 = 恢复旧内容
      store.updateNodeContent(op.before_state.nodeId, op.before_state.content);
      break;

    case "DELETE_NODE":
      // 撤销删除 = 重新添加
      store.addNode(op.before_state);
      break;

    // ... 其他操作
  }
}
```

**重做操作实现**:

```typescript
async function redo() {
  const db = await dbPromise;

  // 获取最后一个已撤销的操作
  const lastUndoneOp = operations
    .filter((op) => op.is_undone)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

  if (!lastUndoneOp) return;

  // 重新执行该操作
  await executeOperation(lastUndoneOp);

  // 标记为未撤销
  await db.put("operation_history", {
    ...lastUndoneOp,
    is_undone: false,
  });
}
```

**历史栈管理**:

```typescript
// 当执行新操作时,清除所有已撤销的历史
async function clearRedoStack(mindmapId: string) {
  const db = await dbPromise;
  const undoneOps = await db.getAllFromIndex(
    "operation_history",
    "by-mindmap",
    mindmapId
  );

  const toDelete = undoneOps.filter((op) => op.is_undone);

  await Promise.all(
    toDelete.map((op) => db.delete("operation_history", op.id))
  );
}
```

**快捷键绑定**:

```typescript
function useMindmapKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z / Ctrl+Z - 撤销
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z - 重做
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      // Cmd+S / Ctrl+S - 保存
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveToSupabase();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
```

### 3.8 保存状态指示

#### 选择: **B. 详细状态**

**状态类型**:

```typescript
type DetailedSaveStatus =
  | { type: "saved"; timestamp: string } // 云端已保存
  | { type: "local_only"; dirtyCount: number } // 本地已保存,未同步
  | { type: "syncing"; progress?: number } // 同步中
  | { type: "sync_failed"; error: string; retryable: boolean } // 同步失败
  | { type: "conflict"; serverVersion: string } // 冲突
  | { type: "offline"; dirtyCount: number }; // 离线状态
```

**UI 组件**:

```tsx
function SaveStatusIndicator() {
  const status = useSaveStatus();
  const isOnline = useOnlineStatus();

  return (
    <div className="save-status-bar">
      <StatusIcon status={status} />

      <div className="status-text">
        {status.type === "saved" && (
          <>
            <span className="text-green-600">已保存</span>
            <span className="text-gray-500 text-sm ml-2">
              {formatRelativeTime(status.timestamp)}
            </span>
          </>
        )}

        {status.type === "local_only" && (
          <>
            <span className="text-yellow-600">未同步</span>
            <span className="text-gray-500 text-sm ml-2">
              {status.dirtyCount} 个未保存的修改
            </span>
          </>
        )}

        {status.type === "syncing" && (
          <>
            <Spinner className="inline" />
            <span className="ml-2">同步中...</span>
            {status.progress && (
              <span className="ml-2">({status.progress}%)</span>
            )}
          </>
        )}

        {status.type === "sync_failed" && (
          <>
            <span className="text-red-600">同步失败</span>
            <button onClick={retrySave} className="ml-2 text-blue-600">
              重试
            </button>
          </>
        )}

        {status.type === "offline" && (
          <>
            <span className="text-orange-600">离线</span>
            <span className="text-gray-500 text-sm ml-2">
              {status.dirtyCount} 个本地修改待同步
            </span>
          </>
        )}
      </div>
    </div>
  );
}
```

## 4. 数据模型扩展

### 4.1 IndexedDB Schema 完整版

```typescript
interface MindmapDB extends DBSchema {
  mindmaps: {
    key: string; // short_id
    value: {
      // 原有字段
      id: string;
      short_id: string;
      title: string;
      created_at: string;
      updated_at: string;
      user_id: string;
      deleted_at: string | null;

      // 新增字段
      currentNode: string | null;
      dirty: boolean; // 思维导图元数据是否有修改
      local_updated_at: string; // 本地最后修改时间
      server_updated_at: string; // 服务器版本的时间戳
    };
  };

  mindmap_nodes: {
    key: string; // short_id
    value: {
      // === 核心字段（与 Supabase 一致）===
      id: string;
      short_id: string;
      mindmap_id: string;
      parent_id: string | null;
      parent_short_id: string | null; // 父节点的 short_id（用于优化查询）
      title: string; // 节点标题（NOT NULL 字段）
      content: string;
      order_index: number;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;

      // === 本地扩展字段（仅 IndexedDB）===
      dirty: boolean; // 是否有未保存的修改
      local_updated_at: string; // 本地最后修改时间
    };
    indexes: {
      "by-mindmap": string; // mindmap_id
      "by-parent": string; // parent_id
      "by-parent-short": string; // parent_short_id（用于优化查询）
    };
  };

  operation_history: {
    key: string; // operation_id
    value: {
      id: string;
      mindmap_id: string;
      operation_type: OperationType;
      timestamp: string;

      // 操作数据（使用明确的类型定义）
      before_state: NodeOperationState;
      after_state: NodeOperationState;

      // 撤销/重做状态
      is_undone: boolean;
    };
    indexes: {
      "by-mindmap": string;
      "by-timestamp": string;
    };
  };
}
```

### 4.2 Supabase Schema (无需修改)

现有的 `mindmaps` 和 `mindmap_nodes` 表已经满足需求,无需新增字段。

### 4.3 时间戳字段说明

为了准确实现数据同步和冲突检测，需要明确各时间戳字段的语义和更新时机。

#### 4.3.1 字段定义

**mindmaps 表时间戳字段**:

| 字段名              | 类型   | 语义                                    | 更新时机                     |
| ------------------- | ------ | --------------------------------------- | ---------------------------- |
| `created_at`        | string | 思维导图创建时间（服务器时间）          | 创建时设置，永不修改         |
| `updated_at`        | string | 思维导图最后修改时间（服务器时间）      | 每次在服务器端修改数据时更新 |
| `local_updated_at`  | string | 本地最后修改时间（本地时间）            | 每次在本地修改数据时更新     |
| `server_updated_at` | string | 上次同步成功时从服务器读取的 updated_at | 见下方"更新时机"             |

**mindmap_nodes 表时间戳字段**:

| 字段名             | 类型   | 语义                           | 更新时机                     |
| ------------------ | ------ | ------------------------------ | ---------------------------- |
| `created_at`       | string | 节点创建时间（服务器时间）     | 创建时设置，永不修改         |
| `updated_at`       | string | 节点最后修改时间（服务器时间） | 每次在服务器端修改数据时更新 |
| `local_updated_at` | string | 本地最后修改时间（本地时间）   | 每次在本地修改数据时更新     |

#### 4.3.2 server_updated_at 详解

**定义**: `server_updated_at` 存储"上次同步成功时，从服务器读取的 updated_at 值"

**用途**: 用于检测服务器数据是否在本地修改后被其他设备/用户更新

**更新时机**:

1. **首次从服务器加载数据时**

   ```typescript
   async loadFromServer(mindmapId: string) {
     const { data: serverMindmap } = await this.supabase
       .from('mindmaps')
       .select('*')
       .eq('short_id', mindmapId)
       .single();

     if (serverMindmap) {
       await this.db.put('mindmaps', {
         ...serverMindmap,
         dirty: false,
         local_updated_at: new Date().toISOString(),
         server_updated_at: serverMindmap.updated_at,  // ✅ 记录服务器版本
       });
     }
   }
   ```

2. **成功同步到服务器后**

   ```typescript
   async saveToServer(mindmapId: string): Promise<SyncResult> {
     // ... 上传数据到服务器

     const { data: updatedMindmap } = await this.supabase
       .from('mindmaps')
       .update({ /* ... */ })
       .select()
       .single();

     // ✅ 同步成功后更新 server_updated_at
     const localMindmap = await this.db.get('mindmaps', mindmapId);
     await this.db.put('mindmaps', {
       ...localMindmap,
       dirty: false,
       server_updated_at: updatedMindmap.updated_at,  // 更新为服务器最新版本
     });
   }
   ```

3. **从服务器拉取最新数据后**

   ```typescript
   async pullFromServer(mindmapId: string) {
     const { data: serverMindmap } = await this.supabase
       .from('mindmaps')
       .select('*')
       .eq('short_id', mindmapId)
       .single();

     if (serverMindmap) {
       await this.db.put('mindmaps', {
         ...serverMindmap,
         dirty: false,
         local_updated_at: new Date().toISOString(),
         server_updated_at: serverMindmap.updated_at,  // ✅ 更新为服务器最新版本
       });
     }
   }
   ```

**不应更新的情况**:

- ❌ 本地修改数据时（此时应更新 `local_updated_at` 和设置 `dirty = true`）
- ❌ 检测到冲突时（应保持原值，用于冲突解决）

#### 4.3.3 冲突检测逻辑

使用 `server_updated_at` 进行冲突检测的正确逻辑：

```typescript
private async detectConflict(): Promise<ConflictInfo | null> {
  // 1. 获取本地数据（包含上次同步时的服务器版本）
  const localMindmap = await this.db.get("mindmaps", this.mindmapId);

  // 2. 从服务器获取最新版本
  const { data: serverMindmap } = await this.supabase
    .from("mindmaps")
    .select("updated_at")
    .eq("short_id", this.mindmapId)
    .single();

  if (!serverMindmap) {
    throw new Error("Mindmap not found on server");
  }

  // 3. 比较：服务器当前版本 vs 本地存储的服务器版本
  // 如果服务器版本更新，说明有其他设备/用户修改了数据
  if (
    new Date(serverMindmap.updated_at) >
    new Date(localMindmap.server_updated_at)  // 上次同步时的服务器版本
  ) {
    return {
      localVersion: localMindmap.server_updated_at,  // 本地知道的服务器版本
      serverVersion: serverMindmap.updated_at,       // 服务器当前版本
    };
  }

  return null; // 无冲突
}
```

**冲突判定逻辑说明**:

- 如果 `serverMindmap.updated_at > localMindmap.server_updated_at`：
  - 说明在本地上次同步后，服务器数据被其他设备/用户更新了
  - 此时如果本地也有修改（`dirty = true`），则存在冲突
- 如果 `serverMindmap.updated_at == localMindmap.server_updated_at`：
  - 说明服务器数据未变化
  - 可以安全地上传本地修改

### 4.4 命名约定

为了确保代码的一致性和可维护性，项目采用以下命名约定：

#### 4.4.1 基本规则

**数据库层 (Supabase & IndexedDB)**:

- 使用 `snake_case` 命名
- 所有表名、列名、索引名使用小写字母和下划线
- 示例：`mindmap_nodes`, `parent_id`, `by-parent-short`

**TypeScript 应用层**:

- 使用 `camelCase` 命名
- 变量、函数、参数、对象属性使用驼峰命名
- 示例：`mindmapNodes`, `parentId`, `byParentShort`

**类型和接口**:

- 使用 `PascalCase` 命名
- 接口、类型、枚举、类名使用大驼峰命名
- 示例：`MindmapNode`, `OperationType`, `SyncManager`

#### 4.4.2 字段名称对照表

| 数据库字段 (snake_case) | TypeScript 属性 (camelCase) |
| ----------------------- | --------------------------- |
| `short_id`              | `shortId`                   |
| `mindmap_id`            | `mindmapId`                 |
| `parent_id`             | `parentId`                  |
| `parent_short_id`       | `parentShortId`             |
| `order_index`           | `orderIndex`                |
| `created_at`            | `createdAt`                 |
| `updated_at`            | `updatedAt`                 |
| `deleted_at`            | `deletedAt`                 |
| `local_updated_at`      | `localUpdatedAt`            |
| `server_updated_at`     | `serverUpdatedAt`           |
| `user_id`               | `userId`                    |
| `operation_type`        | `operationType`             |
| `is_undone`             | `isUndone`                  |

#### 4.4.3 数据转换规范

**在数据库和应用层之间传递数据时，应遵循以下规则**:

**从数据库读取 → 应用层**: 保持数据库原始命名（不转换）

```typescript
// ✅ 正确 - 保持数据库命名
const mindmap = await db.get("mindmaps", shortId);
console.log(mindmap.short_id); // 使用 snake_case

// ❌ 错误 - 不要在读取时转换
const mindmap = toCamelCase(await db.get("mindmaps", shortId));
```

**应用层 → 数据库写入**: 保持数据库原始命名（不转换）

```typescript
// ✅ 正确 - 直接使用 snake_case
await db.put("mindmaps", {
  short_id: "abc123",
  mindmap_id: "xyz789",
  parent_id: null,
});

// ❌ 错误 - 不要在写入时转换
await db.put(
  "mindmaps",
  toSnakeCase({
    shortId: "abc123",
    mindmapId: "xyz789",
    parentId: null,
  })
);
```

**理由**:

1. **类型安全**: IndexedDB 和 Supabase 的类型定义都使用 `snake_case`，转换会导致类型不匹配
2. **性能**: 避免不必要的对象转换开销
3. **一致性**: 数据库字段名与代码中的字段名保持一致，减少混淆

#### 4.4.4 代码示例

**IndexedDB 操作示例**:

```typescript
// ✅ 正确的命名使用
async function saveNode(node: MindmapNode): Promise<void> {
  const tx = db.transaction("mindmap_nodes", "readwrite");
  await tx.objectStore("mindmap_nodes").put({
    short_id: node.short_id,
    mindmap_id: node.mindmap_id,
    parent_id: node.parent_id,
    parent_short_id: node.parent_short_id,
    title: node.title,
    order_index: node.order_index,
    created_at: node.created_at,
    updated_at: node.updated_at,
    dirty: true,
    local_updated_at: new Date().toISOString(),
  });
}
```

**Supabase 操作示例**:

```typescript
// ✅ 正确的命名使用
async function uploadNode(node: MindmapNode): Promise<void> {
  const { error } = await supabase.from("mindmap_nodes").insert({
    short_id: node.short_id,
    mindmap_id: node.mindmap_id,
    parent_id: node.parent_id,
    parent_short_id: node.parent_short_id,
    title: node.title,
    order_index: node.order_index,
  });
}
```

**Zustand Store 示例**:

```typescript
// ✅ 正确的命名使用
interface MindmapEditorStore {
  nodes: Map<string, MindmapNode>; // 使用 camelCase 作为变量名
  currentMindmap: Mindmap | null;

  addNode: (node: MindmapNode) => void;
  updateNodeTitle: (shortId: string, title: string) => void; // 函数名使用 camelCase
}

// 在 Store 中操作数据时，仍然使���数据库的 snake_case 字段名
const addNode = (node: MindmapNode) => {
  set((state) => {
    state.nodes.set(node.short_id, {
      // ✅ 使用 snake_case
      ...node,
      dirty: true,
      local_updated_at: new Date().toISOString(),
    });
  });
};
```

#### 4.4.5 特殊情况说明

**索引名称**: IndexedDB 索引名称使用连字符分隔

```typescript
// ✅ 正确
indexes: {
  'by-mindmap': 'mindmap_id',
  'by-parent': 'parent_id',
  'by-parent-short': 'parent_short_id',
  'by-timestamp': 'timestamp',
}
```

**计数变量**: 统计类变量使用 camelCase

```typescript
// ✅ 正确
const dirtyCount = dirtyNodes.length;
const pendingOperationCount = operations.filter((op) => !op.is_undone).length;

// ❌ 错误
const dirty_count = dirtyNodes.length;
```

**常量**: 全局常量使用 SCREAMING_SNAKE_CASE

```typescript
// ✅ 正确
const DB_VERSION = 3;
const MAX_OPERATION_HISTORY = 100;
const DEFAULT_RETRY_COUNT = 3;
```

## 5. 核心模块设计

### 5.1 Sync Manager (同步管理器)

```typescript
// lib/sync/sync-manager.ts
export class SyncManager {
  private mindmapId: string;
  private db: IDBPDatabase<MindmapDB>;
  private supabase: SupabaseClient;

  async saveToCloud(): Promise<SyncResult> {
    // 1. 收集脏数据
    const dirtyNodes = await this.collectDirtyNodes();
    const dirtyMindmap = await this.getDirtyMindmap();

    if (dirtyNodes.length === 0 && !dirtyMindmap) {
      return { success: true, message: "无需保存" };
    }

    // 2. 冲突检测
    const conflict = await this.detectConflict();
    if (conflict) {
      return { success: false, conflict };
    }

    // 3. 上传数据
    const result = await this.uploadData(dirtyNodes, dirtyMindmap);

    // 4. 清除脏标记（传入服务器更新后的数据）
    if (result.success) {
      await this.clearDirtyFlags(result.updatedMindmap);
    }

    return result;
  }

  private async detectConflict(): Promise<ConflictInfo | null> {
    // 1. 获取本地数据（包含上次同步时的服务器版本）
    const localMindmap = await this.db.get("mindmaps", this.mindmapId);

    // 2. 从服务器获取最新版本
    const { data: serverMindmap } = await this.supabase
      .from("mindmaps")
      .select("updated_at")
      .eq("short_id", this.mindmapId)
      .single();

    if (!serverMindmap) {
      throw new Error("Mindmap not found on server");
    }

    // 3. 比较：服务器当前版本 vs 本地存储的服务器版本
    // 如果服务器版本更新，说明有其他设备/用户修改了数据
    if (
      new Date(serverMindmap.updated_at) >
      new Date(localMindmap.server_updated_at) // 上次同步时的服务器版本
    ) {
      return {
        localVersion: localMindmap.server_updated_at, // 本地知道的服务器版本
        serverVersion: serverMindmap.updated_at, // 服务器当前版本
      };
    }

    return null; // 无冲突
  }

  private async uploadData(nodes: MindmapNode[], mindmap?: Mindmap) {
    let updatedMindmap = null;

    // 1. 更新思维导图元数据
    if (mindmap) {
      const { data, error } = await this.supabase
        .from("mindmaps")
        .update({
          title: mindmap.title,
          updated_at: new Date().toISOString(),
        })
        .eq("short_id", this.mindmapId)
        .select() // ✅ 获取服务器更新后的数据
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      updatedMindmap = data;
    }

    // 2. 批量更新节点
    if (nodes.length > 0) {
      const { error } = await this.supabase.from("mindmap_nodes").upsert(
        nodes.map((node) => ({
          id: node.id,
          short_id: node.short_id,
          mindmap_id: node.mindmap_id,
          content: node.content,
          parent_id: node.parent_id,
          order_index: node.order_index,
          updated_at: node.updated_at,
        }))
      );

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true, updatedMindmap };
  }

  private async clearDirtyFlags(updatedMindmap?: any) {
    const tx = this.db.transaction(["mindmaps", "mindmap_nodes"], "readwrite");

    // 清除 mindmap 的 dirty 标记
    const mindmap = await tx.objectStore("mindmaps").get(this.mindmapId);
    if (mindmap) {
      await tx.objectStore("mindmaps").put({
        ...mindmap,
        dirty: false,
        // ✅ 使用服务器返回的 updated_at（如果有）
        server_updated_at:
          updatedMindmap?.updated_at || mindmap.server_updated_at,
      });
    }

    // 清除所有节点的 dirty 标记
    const nodes = await tx.objectStore("mindmap_nodes").getAll();
    await Promise.all(
      nodes
        .filter((n) => n.dirty)
        .map((n) =>
          tx.objectStore("mindmap_nodes").put({
            ...n,
            dirty: false,
          })
        )
    );

    await tx.done;
  }
}
```

### 5.2 Undo/Redo Manager

```typescript
// lib/store/undo-manager.ts
export class UndoManager {
  private db: IDBPDatabase<MindmapDB>;
  private mindmapId: string;

  async undo(): Promise<boolean> {
    const lastOp = await this.getLastOperation();
    if (!lastOp) return false;

    await this.executeReverse(lastOp);
    await this.markAsUndone(lastOp.id);

    return true;
  }

  async redo(): Promise<boolean> {
    const lastUndone = await this.getLastUndoneOperation();
    if (!lastUndone) return false;

    await this.executeOperation(lastUndone);
    await this.markAsNotUndone(lastUndone.id);

    return true;
  }

  async recordOperation(meta: OperationMetadata) {
    // 清除所有已撤销的操作(重做栈)
    await this.clearRedoStack();

    // 记录新操作
    await this.db.add("operation_history", {
      id: crypto.randomUUID(),
      mindmap_id: this.mindmapId,
      operation_type: meta[OPERATION_TYPE],
      timestamp: new Date().toISOString(),
      before_state: meta.before,
      after_state: meta.after,
      is_undone: false,
    });
  }

  private async getLastOperation() {
    const ops = await this.db.getAllFromIndex(
      "operation_history",
      "by-mindmap",
      this.mindmapId
    );

    return ops
      .filter((op) => !op.is_undone)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
  }

  private async executeReverse(op: OperationHistory) {
    const store = useMindmapEditorStore.getState();

    switch (op.operation_type) {
      case "ADD_NODE":
        store.deleteNode(op.after_state.short_id);
        break;
      case "UPDATE_NODE_CONTENT":
        store.updateNodeContent(
          op.before_state.short_id,
          op.before_state.content
        );
        break;
      case "DELETE_NODE":
        store.addNode(op.before_state);
        break;
      // ... 其他操作
    }
  }
}
```

## 6. UI/UX 需求

### 6.1 保存按钮

- 位置: 右上角工具栏
- 状态:
  - 无修改时: 灰色禁用,显示"已保存"
  - 有本地修改时: 蓝色高亮,显示"保存 (Cmd+S)"
  - 同步中: 显示 Spinner
  - 离线时: 显示离线图标,禁用
  - 冲突时: 显示警告图标

### 6.2 状态栏

- 位置: 页面顶部或底部
- 显示内容:
  - 保存状态 (已保存/未保存/同步中/失败)
  - 最后保存时间
  - 未保存修改数量
  - 网络状态 (在线/离线)

### 6.3 快捷键

- `Cmd/Ctrl + S`: 保存到云端
- `Cmd/Ctrl + Z`: 撤销
- `Cmd/Ctrl + Shift + Z`: 重做

### 6.4 冲突对话框

- 显示本地和云端的版本时间
- 提供三个选项:
  - **强制覆盖**: 用本地修改覆盖云端数据
  - **丢弃本地修改**: 重新加载云端数据，丢弃本地修改
  - **取消**: 取消保存操作
- 样式: Modal 对话框,居中显示
- **注**: "查看差异"功能暂不支持，作为后续扩展

### 6.5 离线提示

- 检测到离线时,顶部显示横幅提示
- 提示内容: "当前离线,所有修改将保存在本地,上线后请手动保存"
- 可关闭,但状态栏仍显示离线图标

## 7. 测试需求

### 7.1 单元测试

- SyncManager 的各个方法
- UndoManager 的撤销/重做逻辑
- 冲突检测算法
- 脏数据收集逻辑

### 7.2 集成测试

- 完整的编辑 → 保存 → 加载流程
- 离线编辑 → 上线保存流程
- 冲突检测和处理流程
- 撤销/重做 → 保存流程

### 7.3 E2E 测试

- 用户编辑节点并保存
- 模拟网络断开和恢复
- 多标签页同时编辑(可选)
- 撤销/重做操作

## 8. 性能指标

### 8.1 保存性能

- 收集脏数据: < 10ms
- 冲突检测: < 50ms (一次网络请求)
- 上传 100 个节点: < 500ms
- 清除脏标记: < 20ms
- **总体目标**: 保存 100 个修改的节点 < 1s

### 8.2 撤销/重做性能

- 单次撤销: < 50ms
- 单次重做: < 50ms
- 历史栈查询: < 10ms

### 8.3 内存占用

- 操作历史栈: 最多保留 1000 条记录
- 超过限制时,删除最早的记录
- 预期内存占用: < 10MB

## 9. 未来扩展

### 9.1 实时协作 (Phase 2)

基于当前设计,未来可以升级为实时协作:

```typescript
// 订阅 Supabase Realtime
supabase
  .channel(`mindmap:${mindmapId}`)
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "mindmap_nodes" },
    (payload) => {
      // 收到其他用户的修改
      handleRemoteChange(payload);
    }
  )
  .subscribe();

function handleRemoteChange(payload) {
  // 1. 检查是否是自己的修改
  if (payload.user_id === currentUserId) return;

  // 2. 应用远程修改到本地 Store
  applyRemoteChange(payload);

  // 3. 显示协作者信息
  showCollaboratorCursor(payload.user_id);
}
```

### 9.2 差异对比视图 (Phase 2)

当检测到冲突时,在对话框中显示本地和云端的差异:

```tsx
function ConflictDialog({ localVersion, serverVersion }) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <Dialog>
      <DialogHeader>⚠️ 检测到冲突</DialogHeader>

      <DialogContent>
        <p>服务器数据已更新:</p>
        <p>本地版本: {localVersion}</p>
        <p>云端版本: {serverVersion}</p>

        {showDiff && <DiffView local={localData} server={serverData} />}
      </DialogContent>

      <DialogFooter>
        <Button onClick={() => setShowDiff(!showDiff)}>
          {showDiff ? "隐藏差异" : "查看差异"}
        </Button>
        <Button onClick={forceOverwrite}>强制覆盖</Button>
        <Button onClick={discardLocal}>丢弃本地修改</Button>
        <Button onClick={cancel}>取消</Button>
      </DialogFooter>
    </Dialog>
  );
}

function DiffView({ local, server }) {
  return (
    <div className="diff-view">
      <div className="local-version">
        <h3>本地版本</h3>
        <MindmapPreview data={local} />
      </div>

      <div className="diff-indicator">
        <ArrowIcon />
      </div>

      <div className="server-version">
        <h3>云端版本</h3>
        <MindmapPreview data={server} />
      </div>
    </div>
  );
}
```

### 9.3 自动保存 (Phase 2)

在实时协作模式下,可以实现自动保存:

```typescript
// 定时自动保存
useEffect(() => {
  const interval = setInterval(async () => {
    if (hasDirtyData && isOnline) {
      await saveToSupabase({ silent: true });
    }
  }, 30000); // 每 30 秒

  return () => clearInterval(interval);
}, [hasDirtyData, isOnline]);
```

## 10. 实施计划

### Phase 1: 核心持久化 (3-4 天)

**Day 1-2: IndexedDB 扩展**

- [ ] 扩展 Schema (dirty 字段、operation_history 表)
- [ ] 实现脏数据标记逻辑
- [ ] 更新 Persistence Middleware
- [ ] 单元测试

**Day 3: 同步管理器**

- [ ] 实现 SyncManager 类
- [ ] 实现冲突检测逻辑
- [ ] 实现数据上传和清除脏标记
- [ ] 单元测试

**Day 4: UI 集成**

- [ ] 实现保存按钮和快捷键
- [ ] 实现状态指示器
- [ ] 实现冲突对话框
- [ ] E2E 测试

### Phase 2: 撤销/重做 (2-3 天)

**Day 5-6: 操作历史**

- [ ] 实现 operation_history 表操作
- [ ] 在 Middleware 中记录操作历史
- [ ] 实现 UndoManager 类
- [ ] 单元测试

**Day 7: UI 集成**

- [ ] 实现撤销/重做快捷键
- [ ] 实现历史栈 UI (可选)
- [ ] E2E 测试

### Phase 3: 离线支持优化 (1-2 天)

**Day 8-9:**

- [ ] 实现网络状态检测
- [ ] 实现离线提示 Banner
- [ ] 优化离线时的 UI 状态
- [ ] 网络恢复时的自动保存提示
- [ ] E2E 测试

### Phase 4: 测试和优化 (1-2 天)

**Day 10-11:**

- [ ] 性能测试和优化
- [ ] 边界情况测试
- [ ] 用户体验优化
- [ ] 文档更新

## 11. 设计决策总结

基于与用户的讨论，最终确定以下设计决策：

### 11.1 操作历史的保留策略

**选择: A. 按数量限制**

- 保留最近 **1000 条**操作记录
- 超过限制时，删除最早的记录
- 简单可靠，避免历史无限增长

**实现**:

```typescript
async function cleanupHistory(mindmapId: string) {
  const db = await dbPromise;
  const ops = await db.getAllFromIndex(
    "operation_history",
    "by-mindmap",
    mindmapId
  );

  if (ops.length > 1000) {
    const sorted = ops.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const toDelete = sorted.slice(0, ops.length - 1000);
    await Promise.all(
      toDelete.map((op) => db.delete("operation_history", op.id))
    );
  }
}
```

### 11.2 大批量节点保存

**选择: B. 使用 Supabase 的批量 upsert**

- 利用 Supabase 的批量操作，性能好
- 无需手动分批，Supabase 会自动优化
- 代码简洁，易于维护

**实现**:

```typescript
private async uploadData(nodes: MindmapNode[]) {
  // Supabase 支持批量 upsert，无需手动分批
  const { error } = await this.supabase
    .from('mindmap_nodes')
    .upsert(nodes.map(node => ({
      id: node.id,
      short_id: node.short_id,
      mindmap_id: node.mindmap_id,
      content: node.content,
      parent_id: node.parent_id,
      order_index: node.order_index,
      updated_at: node.updated_at,
    })));

  if (error) throw error;
}
```

### 11.3 保存失败的重试策略

**选择: 不实现重试机制**

- 保持系统简单，避免增加复杂度
- 避免重试机制导致的问题重现困难
- 用户手动重试更可控
- 后续有明确需求时再添加

**实现**:

```typescript
async function handleSave() {
  setSaveStatus("syncing");

  try {
    await saveToSupabase();
    setSaveStatus("saved");
    showToast("已保存到云端");
  } catch (error) {
    setSaveStatus("sync_failed");
    showToast("保存失败，请重试", {
      action: "retry",
      onAction: handleSave, // 用户手动重试
    });
  }
}
```

### 11.4 操作历史的云端同步

**选择: A. 不需要 - 历史仅在本地**

- 撤销/重做是即时操作，跨设备意义不大
- 减少系统复杂度和存储成本
- 用户切换设备时通常不需要撤销之前的操作
- 历史记录仅在 IndexedDB 中，不同步到 Supabase

---

## 12. 最终架构总结

### 12.1 核心技术栈

- **状态管理**: Zustand + Immer + 自定义中间件
- **本地存储**: IndexedDB (idb 库)
- **云端存储**: Supabase PostgreSQL
- **撤销/重做**: 基于操作(Action-based)，存储在 IndexedDB

### 12.2 数据流

```
用户操作
  → Zustand Store (单一数据源)
  → Persistence Middleware (自动同步到 IndexedDB + 标记脏数据 + 记录历史)
  → IndexedDB (本地缓存 + 脏标记 + 操作历史)
  → 用户手动保存 (Cmd+S)
  → Sync Manager (冲突检测 + 批量上传)
  → Supabase (云端存储)
```

### 12.3 关键特性

✅ 离线编辑支持
✅ 手动保存到云端
✅ 时间戳冲突检测
✅ 基于操作的撤销/重做 (持久化到 IndexedDB)
✅ 脏数据追踪
✅ 详细的保存状态指示
✅ 简单可靠，无重试机制

### 12.4 未来扩展路径

- 实时协作 (Supabase Realtime)
- 差异对比视图
- 自动保存
- 操作合并优化
