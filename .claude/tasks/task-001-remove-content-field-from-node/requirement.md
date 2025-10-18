# Task-001: 删除未使用的字段

**创建日期**: 2025-10-18
**优先级**: P1
**状态**: Pending

## 任务目标

删除当前未使用的数据库字段，以简化数据模型和减少维护成本：

1. **Mindmap 表**: 删除 `description` 字段
2. **MindmapNode 表**: 删除 `content` 字段

## 背景

当前系统中存在一些预留但未实际使用的字段：

- `mindmap.description` - 思维导图描述字段，目前产品设计中不需要
- `mindmap_node.content` - 节点详细内容字段，目前产品仅使用 `title` 字段

这些字段的存在增加了：

- 数据库存储开销
- 类型定义复杂度
- 同步逻辑的维护成本
- 代码理解的认知负担

## 详细需求

### 1. 删除 mindmap.description 字段

#### 影响范围

**数据库 Schema**:

- Supabase `mindmaps` 表

**TypeScript 类型定义**:

- `lib/types/index.ts` - `Mindmap` interface

**代码实现**:

- `lib/db/schema.ts` - IndexedDB schema (如果存在)
- `lib/sync/sync-manager.ts` - 上传/下载数据映射
- `lib/store/mindmap-editor.store.ts` - Store 状态管理
- UI 组件 - 任何显示或编辑 description 的组件

### 2. 删除 mindmap_node.content 字段

#### 影响范围

**数据库 Schema**:

- Supabase `mindmap_nodes` 表

**TypeScript 类型定义**:

- `lib/types/index.ts` - `MindmapNode` interface
- `lib/types/persistence.ts` - `NodeOperationState` type

**代码实现**:

- `lib/db/schema.ts` - IndexedDB schema
- `lib/sync/sync-manager.ts` - 上传/下载数据映射
- `lib/store/middleware/persistence.middleware.ts` - 操作历史记录
- `lib/store/mindmap-editor.store.ts` - Store 状态管理
- UI 组件 - 任何显示或编辑 content 的组件

**操作历史**:

- `OperationHistory` 中的 `NodeOperationState` 包含 `content` 字段
- `UPDATE_NODE_CONTENT` 操作类型可以删除
- 需要更新相关的撤销/重做逻辑

## 实施步骤

### Phase 1: 代码层面移除（不涉及数据库迁移）

#### 步骤 1: 更新 TypeScript 类型定义

**文件**: `lib/types/index.ts`

删除以下字段：

```typescript
export interface Mindmap {
  description: string; // 删除此行
}

export interface MindmapNode {
  content: string | null; // 删除此行
}
```

**文件**: `lib/types/persistence.ts`

更新 `NodeOperationState`:

```typescript
export type NodeOperationState = {
  nodeId: string;
} & Partial<{
  title: string;
  content: string | null; // 删除此行
  parent_id: string | null;
  order_index: number;
}>;
```

删除 `UPDATE_NODE_CONTENT` 操作类型：

```typescript
export type OperationType =
  | "ADD_NODE"
  | "UPDATE_NODE_TITLE"
  | "UPDATE_NODE_CONTENT" // 删除此行
  | "DELETE_NODE"
  | "MOVE_NODE"
  | "UPDATE_MINDMAP_TITLE";
```

#### 步骤 2: 更新 IndexedDB Schema

**文件**: `lib/db/schema.ts`

1. 更新 DB_VERSION (例如从 2 到 3)
2. mindmap_nodes 表不再存储 content 字段（自动由类型推断）

#### 步骤 3: 更新 Persistence Middleware

**文件**: `lib/store/middleware/persistence.middleware.ts`

删除以下函数：

- `syncUpdateNodeContent()` - 整个函数删除

更新 `syncAddNode()`:

```typescript
after_state: {
  nodeId: node.short_id,
  title: node.title,
  content: node.content, // 删除此行
  parent_id: node.parent_id,
  order_index: node.order_index,
}
```

更新 `syncDeleteNode()`:

```typescript
before_state: {
  nodeId: deletedNodes[0].short_id,
  title: deletedNodes[0].title,
  content: deletedNodes[0].content, // 删除此行
  parent_id: deletedNodes[0].parent_id,
  order_index: deletedNodes[0].order_index,
}
```

#### 步骤 4: 更新 Store

**文件**: `lib/store/mindmap-editor.store.ts`

删除相关方法：

- `updateNodeContent()` - 如果存在

更新撤销/重做逻辑：

- 删除 `UPDATE_NODE_CONTENT` 相关的 case 分支

#### 步骤 5: 更新 Sync Manager

**文件**: `lib/sync/sync-manager.ts`

更新 `uploadData()` 方法，删除字段映射：

```typescript
// mindmaps
const mindmapsToUpload = mindmaps.map((mindmap) => ({
  // ...
  description: mindmap.description, // 删除此行
}));

// nodes
const nodesToUpload = nodes.map((node) => ({
  // ...
  content: node.content, // 删除此行
}));
```

#### 步骤 6: 更新 UI 组件

搜索并移除所有引用这些字段的 UI 组件：

- 搜索 `description` 相关组件
- 搜索 `content` 相关组件
- 更新相关的表单和显示逻辑

#### 步骤 7: 更新 undo-manager

**文件**: `lib/store/undo-manager.ts`

更新 `getOperationTypeName()`:

```typescript
export function getOperationTypeName(type: OperationType): string {
  const names: Record<OperationType, string> = {
    ADD_NODE: "添加节点",
    UPDATE_NODE_CONTENT: "更新节点内容", // 删除此行
    UPDATE_NODE_TITLE: "更新节点标题",
    DELETE_NODE: "删除节点",
    MOVE_NODE: "移动节点",
    REORDER_NODE: "重新排序",
    UPDATE_MINDMAP_TITLE: "更新思维导图标题",
  };
  return names[type] || type;
}
```

### Phase 2: 数据库迁移（可选，仅在需要时执行）

#### Supabase Migration

创建新的数据库迁移文件：

```sql
-- Remove description from mindmaps table
ALTER TABLE mindmaps DROP COLUMN IF EXISTS description;

-- Remove content from mindmap_nodes table
ALTER TABLE mindmap_nodes DROP COLUMN IF EXISTS content;
```

**注意**:

- 此步骤会永久删除数据，执行前需要备份
- 如果字段中有重要数据，需要先进行数据迁移
- 建议先在开发环境验证

### Phase 3: 更新文档

**必须更新的设计文档**:

#### 1. 更新持久化设计文档

**文件**: `docs/design/indexeddb-persistence-middleware-design.md` 或 `docs/draft/indexeddb-persistence-middleware-design.md`

需要更新的部分：

- **数据库 Schema 定义**: 删除 `mindmap.description` 和 `mindmap_node.content` 字段
- **操作类型列表**: 删除 `UPDATE_NODE_CONTENT`
- **NodeOperationState 类型**: 删除 `content` 字段
- **API 示例**: 删除所有涉及 content 字段的示例代码

#### 2. 更新 Store 设计文档

**文件**: `docs/design/mindmap-editor-store-design.md`

需要更新的部分：

- **State 接口定义**: 删除 `Mindmap.description` 和 `MindmapNode.content`
- **Actions 列表**: 删除 `updateNodeContent()` 方法
- **示例代码**: 删除所有涉及这些字段的示例

#### 3. 更新数据库设计文档（如果存在）

**文件**: `docs/design/database-schema.md` 或类似文档

需要更新的部分：

- Supabase 表结构定义
- IndexedDB 表结构定义
- 字段说明表格

#### 4. 更新类型定义文档（如果存在）

**文件**: `docs/design/type-definitions.md` 或类似文档

需要更新的部分：

- `Mindmap` interface 定义
- `MindmapNode` interface 定义
- `NodeOperationState` type 定义
- `OperationType` 枚举

#### 5. 创建变更日志

**文件**: `docs/CHANGELOG.md` 或 `.claude/tasks/task-001-remove-content-field-from-node/changelog.md`

记录以下内容：

```markdown
## [版本号] - 2025-10-18

### 删除

- **mindmap.description**: 删除思维导图描述字段（未使用）
- **mindmap_node.content**: 删除节点内容字段（仅使用 title）
- **UPDATE_NODE_CONTENT**: 删除节点内容更新操作类型
- **updateNodeContent()**: 删除 Store 中的相关方法
- **syncUpdateNodeContent()**: 删除 Persistence Middleware 中的相关方法

### 修改

- **IndexedDB Version**: 2 → 3（触发数据清理）
- **NodeOperationState**: 删除 content 字段
- **OperationType**: 删除 UPDATE_NODE_CONTENT 枚举值

### 影响

- 本地 IndexedDB 数据将被清空（版本升级）
- 旧的操作历史记录不再兼容
- 简化了数据模型和同步逻辑
```

### Phase 4: 清理和验证

1. **运行 TypeScript 编译检查**:

   ```bash
   npx tsc --noEmit
   ```

2. **运行 Linter**:

   ```bash
   yarn lint
   ```

3. **运行测试**:

   ```bash
   yarn test
   ```

4. **手动测试**:
   - 创建新的思维导图
   - 添加节点
   - 编辑节点标题
   - 验证同步功能
   - 验证撤销/重做功能

5. **文档审查**:
   - 检查所有更新的文档是否准确
   - 确保示例代码与实际代码一致
   - 验证 CHANGELOG 完整性

## 验证清单

### 代码修改

- [ ] TypeScript 类型定义已更新，无编译错误
- [ ] IndexedDB schema 已更新，版本号已递增
- [ ] Persistence middleware 相关函数已删除/更新
- [ ] Store 方法已删除/更新
- [ ] Sync manager 字段映射已更新
- [ ] UI 组件已清理
- [ ] Undo manager 已更新
- [ ] 所有测试通过
- [ ] 手动功能测试通过
- [ ] 数据库迁移脚本已准备（如需要）

### 文档更新

- [ ] 持久化设计文档已更新
  - [ ] 数据库 Schema 定义已删除相关字段
  - [ ] 操作类型列表已删除 UPDATE_NODE_CONTENT
  - [ ] NodeOperationState 类型已更新
  - [ ] 示例代码已更新
- [ ] Store 设计文档已更新
  - [ ] State 接口定义已更新
  - [ ] Actions 列表已删除相关方法
  - [ ] 示例代码已更新
- [ ] 数据库设计文档已更新（如存在）
- [ ] 类型定义文档已更新（如存在）
- [ ] CHANGELOG 已创建并记录所有变更
- [ ] 所有文档中的示例代码与实际代码一致
- [ ] 文档中没有遗留对已删除字段的引用

## 风险评估

### 低风险

- **description 字段**: 确认未在任何 UI 中使用
- **content 字段**: 确认仅使用 title 字段

### 中等风险

- **IndexedDB 数据清理**: 升级版本会清空本地数据（当前采用简化迁移策略）
- **操作历史兼容性**: 旧的操作历史记录可能包含 content 字段

### 缓解措施

1. **逐步迁移**: 先删除代码引用，后删除数据库字段
2. **版本控制**: 使用 git 分支进行开发，方便回滚
3. **测试验证**: 充分的单元测试和集成测试
4. **用户通知**: 如果会清空本地数据，需要提前通知用户

## 后续任务

完成此任务后，**必须**执行：

1. **文档验证**: 使用 `/doc-verify` 命令验证更新后的文档与代码实现一致
2. **文档审查**: 人工审查所有修改的文档，确保：
   - 没有遗留对已删除字段的引用
   - 示例代码可以正常运行
   - 类型定义与实际代码一致
3. **清理测试用例**: 删除所有测试 `description` 和 `content` 字段的测试用例

可选任务：

1. 检查是否有其他未使用的字段可以清理
2. 优化文档结构和可读性
3. 添加更多示例和最佳实践说明

## 参考文档

- `docs/design/mindmap-editor-store-design.md` - Store 设计文档
- `docs/design/indexeddb-persistence-middleware-design.md` - 持久化设计文档
- `docs/design/id-design.md` - ID 设计规范

## 相关 Issue

- P0-003: TypeScript 类型定义优化
- P0-004: IndexedDB schema 优化

## 注意事项

1. **不要遗漏任何引用**: 使用全局搜索确保删除所有对这些字段的引用
   - 搜索关键词: `description`, `content`, `UPDATE_NODE_CONTENT`, `updateNodeContent`, `syncUpdateNodeContent`
   - 检查代码、文档、测试、配置文件

2. **保持一致性**: 同时更新 Supabase 和 IndexedDB schema
   - 代码中的类型定义
   - 数据库 schema
   - 设计文档中的定义

3. **版本管理**: IndexedDB 版本号必须递增，触发迁移逻辑
   - 当前版本: 2
   - 新版本: 3
   - 迁移策略: 清空所有数据

4. **测试覆盖**: 确保所有受影响的功能都有测试覆盖
   - 节点创建和删除
   - 节点标题更新
   - 数据同步
   - 撤销/重做

5. **文档更新 - 关键要求**:
   - ⚠️ **文档更新与代码修改同步进行**，不要等代码完成后再更新文档
   - ⚠️ **每修改一个代码文件，立即检查相关文档是否需要更新**
   - ⚠️ **文档中的示例代码必须可运行**，不能包含已删除的字段
   - ⚠️ **所有文档更新必须记录在 CHANGELOG 中**
   - ⚠️ **完成后使用 `/doc-verify` 验证文档一致性**

6. **执行顺序建议**:
   ```
   Phase 1 (代码) → Phase 3 (文档) → Phase 4 (验证) → Phase 2 (数据库迁移,可选)
   ```
   先完成代码和文档的更新，验证通过后再考虑数据库迁移
