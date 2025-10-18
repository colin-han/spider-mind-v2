# 思维导图编辑器 Store 设计文档

**版本**: v1.2
**创建日期**: 2025-10-02
**最后更新**: 2025-01-11

---

## 1. 概述

本文档描述思维导图编辑器的状态管理设计和实现。编辑器采用 Zustand + Immer 方案实现内存中的状态管理,支持思维导图的创建、编辑、删除等核心操作。

### 1.1 设计目标

- **领域驱动**: 基于领域模型设计状态和操作接口
- **类型安全**: 完整的 TypeScript 类型定义
- **不可变更新**: 使用 Immer 实现安全的状态更新
- **约束保证**: 通过代码强制执行领域约束
- **易于使用**: 简洁的 API,符合 React Hooks 习惯

### 1.2 技术栈

- **Zustand 5.0**: 轻量级状态管理库
- **Immer 10.1**: 不可变数据结构更新
- **TypeScript 5.5**: 类型系统
- **Nanoid 5.1**: 生成 short_id

---

## 2. 关键概念

本节定义该设计文档引入的新概念。

| 概念           | 定义                               | 示例/说明                 |
| -------------- | ---------------------------------- | ------------------------- |
| order_index    | 节点排序索引，维护兄弟节点间的顺序 | 0, 1, 2... 连续递增       |
| currentNode    | 当前激活/焦点节点的short_id        | 单选状态，可为null        |
| isDirty        | 标记是否有未保存的更改             | boolean值，本地编辑标志   |
| isSynced       | 标记是否与服务器同步               | boolean值，同步状态标志   |
| collapsedNodes | 折叠状态的节点集合                 | Set<string>结构，默认展开 |
| position       | 节点插入位置参数                   | 0到子节点数量之间         |
| 级联删除       | 删除节点时自动删除所有子节点       | 递归删除操作              |

---

## 3. 核心概念

### 3.1 节点标识符

在领域模型中,节点有两个 ID:

- **`id`**: UUID,仅用于数据库存储
- **`short_id`**: 短标识符 (10 字符),用于领域模型中的所有操作

**重要**: 文档和代码中的所有 `nodeId` 参数都指 `short_id`。

### 3.2 节点类型

节点类型由 `parent_id` 字段决定:

- **root**: 每个思维导图有且仅有一个根节点 (`parent_id = null`)
- **normal**: 普通节点,有父节点的节点 (`parent_id != null`)

**注意**: v1.2 版本已移除 floating 节点和 node_type 字段。

### 3.3 焦点节点

编辑器维护单个焦点节点:

- **`currentNode`**: 当前焦点节点的 short_id (可为 null)

节点选中状态由 `currentNode === nodeId` 判断,不再支持多选功能。

### 3.4 节点展开状态

节点默认展开,仅记录折叠状态:

- **`collapsedNodes`**: 折叠的节点 short_id 集合
- 展开判断: `!collapsedNodes.has(nodeId)`

### 3.5 节点顺序

节点通过 `order_index` 字段维护在父节点下的顺序:

```typescript
interface MindMapNode {
  order_index: number; // 0, 1, 2, ...
  // ...
}
```

- 同一父节点下的子节点 `order_index` 从 0 开始连续递增
- 所有创建操作都需要明确指定 `position` 参数
- `position` 范围: `0 <= position <= count` (自动 clamp 到有效范围)

---

## 4. 状态结构

### 4.1 EditorState

```typescript
interface EditorState {
  // 核心数据
  currentMindmap: Mindmap | null;
  nodes: Map<string, MindmapNode>; // key 是 short_id

  // 焦点状态
  currentNode: string | null; // short_id

  // 编辑状态
  isDirty: boolean; // 是否有未保存的修改
  isSynced: boolean; // 是否已同步
  isEditing: boolean; // 是否正在编辑节点
  editingNodeId: string | null; // 正在编辑的节点 short_id

  // UI 状态 (默认展开,仅记录折叠状态)
  collapsedNodes: Set<string>; // 折叠的节点集合
}
```

### 4.2 数据结构选择

- **`Map<string, MindmapNode>`**: 节点存储
  - 快速查找: O(1)
  - key 使用 `short_id`

- **`Set<string>`**: 折叠状态
  - 快速添加/删除: O(1)
  - 自动去重

---

## 5. 约束与不变式

所有操作都必须遵守以下约束条件，确保数据一致性。

### 5.1 节点关系约束

- 每个思维导图有且仅有一个根节点
- 节点类型由 parent_id 决定
- 删除节点时必须级联删除所有子节点

### 5.2 数据完整性约束

- 父节点必须存在（除了根节点）
- order_index 在同一父节点下必须连续
- position 参数自动 clamp 到有效范围

### 5.3 根节点保护

- 不能删除根节点
- 根节点的 title 与 Mindmap.title 保持同步

---

## 6. 操作接口

### 6.1 节点创建操作

#### `addChildNode`

在指定父节点下添加子节点。

```typescript
addChildNode(params: AddChildNodeParams): MindmapNode

interface AddChildNodeParams {
  parentId: string; // 父节点 short_id
  position: number; // 插入位置
  title: string;
  content?: string;
}
```

**行为**:

1. 验证父节点存在
2. 计算插入位置: `insertPosition = Math.min(position, count)`
3. 创建新节点
4. 更新后续兄弟节点的 `order_index` (+1)
5. 标记 `isDirty = true, isSynced = false`

**约束**:

- 父节点必须存在
- `position >= 0`

### 6.2 节点编辑操作

#### `updateNodeTitle`

更新节点标题。

```typescript
updateNodeTitle(nodeId: string, newTitle: string): void
```

**行为**:

1. 验证节点存在
2. 更新 `node.title` 和 `node.updated_at`
3. **特殊处理**: 如果是根节点,同步更新 `Mindmap.title`
4. 标记 `isDirty = true`

**约束**:

- 节点必须存在

#### `updateNodeContent`

更新节点内容。

```typescript
updateNodeContent(nodeId: string, newContent: string): void
```

**行为**:

1. 验证节点存在
2. 更新 `node.content` 和 `node.updated_at`
3. 标记 `isDirty = true`

### 6.3 节点删除操作

#### `deleteNode`

删除节点及其整个子树。

```typescript
deleteNode(nodeId: string): void
```

**行为**:

1. 验证节点存在
2. **约束检查**: 不能删除根节点
3. 递归收集所有子孙节点
4. 删除所有标记的节点
5. 如果删除的节点是当前焦点节点,清空 `currentNode`
6. 清理折叠状态
7. 重新排序剩余兄弟节点的 `order_index`

**约束**:

- 节点必须存在
- 不能删除根节点 (`parent_id === null`)

### 6.4 节点查询操作

#### `getNode`

获取单个节点。

```typescript
getNode(nodeId: string): MindmapNode | undefined
```

#### `getAllNodes`

获取思维导图的所有节点。

```typescript
getAllNodes(mindmapId: string): MindmapNode[]
```

#### `getRootNode`

获取根节点。

```typescript
getRootNode(mindmapId: string): MindmapNode | undefined
```

#### `getChildren`

获取节点的子节点 (按 `order_index` 排序)。

```typescript
getChildren(nodeId: string): MindmapNode[]
```

**行为**:

1. 查找节点
2. 查找所有 `parent_id` 指向该节点的节点
3. 按 `order_index` 升序排序

### 6.5 状态操作

#### `setCurrentNode`

设置当前焦点节点。

```typescript
setCurrentNode(nodeId: string | null): void
```

**行为**:

- 如果 `nodeId === null`:
  - 设置 `currentNode = null`
- 如果 `nodeId !== null`:
  - 验证节点存在
  - 设置 `currentNode = nodeId`

**约束**:

- 节点必须存在

**注意**: v1.2 版本已移除 `selectNode()` 和 `clearSelection()` 方法,统一使用 `setCurrentNode()`

---

## 7. 实现方案

### 7.1 使用 Immer 中间件

```typescript
export const useMindmapEditorStore = create<MindmapEditorStore>()(
  immer((set, get) => ({
    // 在 set() 中可以直接"修改" state
    // Immer 会自动转换为不可变更新
    addChildNode: (params) => {
      set((state) => {
        // 直接修改,Immer 处理不可变性
        state.nodes.set(shortId, newNode);
        state.isDirty = true;
      });
    },
  }))
);
```

### 7.2 order_index 维护算法

#### 插入节点时

```typescript
// 计算插入位置
const insertPosition = Math.min(position, count);

// 更新后续节点的 order_index
siblings.forEach((sibling) => {
  if (sibling.order_index >= insertPosition) {
    sibling.order_index += 1;
  }
});

// 设置新节点的 order_index
newNode.order_index = insertPosition;
```

#### 删除节点时

```typescript
// 删除后重新排序兄弟节点
siblings.forEach((sibling, index) => {
  sibling.order_index = index;
});
```

### 7.3 根节点与 Mindmap 同步

```typescript
updateNodeTitle: (nodeId, newTitle) => {
  const node = state.nodes.get(nodeId);
  node.title = newTitle;

  // 根节点标题同步到 Mindmap
  if (node.parent_id === null && state.currentMindmap) {
    state.currentMindmap.title = newTitle;
    state.currentMindmap.updated_at = new Date().toISOString();
  }
};
```

### 7.4 递归删除子树

```typescript
// 递归收集所有子孙节点
const toDelete = new Set<string>();

const collectDescendants = (currentNodeId: string) => {
  toDelete.add(currentNodeId);

  const currentNode = state.nodes.get(currentNodeId);
  if (!currentNode) return;

  // 查找子节点
  Array.from(state.nodes.values())
    .filter((n) => n.parent_id === currentNode.id)
    .forEach((child) => collectDescendants(child.short_id));
};

collectDescendants(nodeId);

// 删除所有标记的节点
toDelete.forEach((id) => {
  state.nodes.delete(id);
  // 清理相关状态
});
```

### 7.5 节点展开状态

节点默认展开,通过 `collapsedNodes` 记录折叠状态:

```typescript
// 判断节点是否展开
const isExpanded = !state.collapsedNodes.has(nodeId);

// 切换展开/折叠
if (isExpanded) {
  state.collapsedNodes.add(nodeId); // 折叠
} else {
  state.collapsedNodes.delete(nodeId); // 展开
}
```

---

## 8. 使用示例

### 8.1 基础用法

```typescript
import { useMindmapEditorStore } from "@/lib/store";

function MindmapEditor() {
  const { currentNode, addChildNode, setCurrentNode } = useMindmapEditorStore();

  // 添加子节点示例
  const handleAddChild = () => {
    if (!currentNode) return;

    const newNode = addChildNode({
      parentId: currentNode,
      position: 0,
      title: "新节点",
    });

    setCurrentNode(newNode.short_id);
  };

  // ... 其他操作类似
}
```

### 8.2 构建节点树与选中

```typescript
// 递归构建节点树
const buildTree = (nodeId: string) => {
  const children = getChildren(nodeId);
  return children.map((child) => ({
    node: child,
    children: buildTree(child.short_id),
  }));
};

// 单选操作
const handleNodeClick = (nodeId: string) => {
  setCurrentNode(nodeId);
};

// 判断节点是否选中
const isSelected = currentNode === nodeId;
```

---

## 9. 设计原则

### 9.1 单一职责

Store 仅负责状态管理和领域操作,不包含:

- UI 逻辑
- 数据持久化 (IndexedDB/Supabase)
- 网络请求
- 撤销/重做历史管理

### 9.2 数据不可变

通过 Immer 中间件确保所有状态更新都是不可变的,避免意外修改导致的 bug。

### 9.3 约束优先

所有领域约束在代码层面强制执行,而不是依赖文档或开发者自觉:

- 不能删除根节点 → 运行时检查并抛出异常
- `order_index` 连续性 → 自动维护,无需手动管理

### 9.4 类型安全

完整的 TypeScript 类型定义,编译时发现问题:

```typescript
// ✅ 类型安全
addChildNode({
  parentId: "abc123",
  position: 0,
  title: "标题",
});

// ❌ 编译错误: 缺少必需的 position 参数
addChildNode({
  parentId: "abc123",
  title: "标题",
});
```

### 9.5 明确的 API

- 所有操作都有清晰的参数类型
- 所有操作都有明确的行为定义
- 所有操作都有必要的约束验证

---

## 10. 附录

### 10.1 文件结构

```
lib/store/
├── index.ts                      # 统一导出
├── mindmap-editor.types.ts       # 类型定义
│   ├── EditorState              # 状态结构
│   ├── MindMapEditorActions     # 操作接口
│   ├── AddChildNodeParams       # 参数类型
│   └── ...
└── mindmap-editor.store.ts       # Store 实现
    └── useMindMapEditorStore    # Zustand store
```

### 10.2 已实现功能清单

- [x] Zustand + Immer 状态管理
- [x] 完整的 TypeScript 类型定义
- [x] 节点创建操作 (1个)
  - [x] `addChildNode` - 添加子节点
- [x] 节点编辑操作 (2个)
  - [x] `updateNodeTitle` - 更新标题
  - [x] `updateNodeContent` - 更新内容
- [x] 节点删除操作 (1个)
  - [x] `deleteNode` - 删除节点及子树
- [x] 节点查询操作 (4个)
  - [x] `getNode` - 获取单个节点
  - [x] `getAllNodes` - 获取所有节点
  - [x] `getRootNode` - 获取根节点
  - [x] `getChildren` - 获取子节点
- [x] 状态操作 (1个)
  - [x] `setCurrentNode` - 设置焦点
- [x] order_index 自动维护
- [x] 根节点与 MindMap.title 同步
- [x] 完整的约束验证
- [x] 递归删除子树
- [ ] ~~撤销/重做支持~~ (已移除，作为未来新功能重新设计)

### 10.3 更新历史

| 日期       | 版本 | 修改内容                                                                                                                                                                             | 作者        |
| ---------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 2025-10-02 | v1.0 | 初始版本                                                                                                                                                                             | -           |
| 2025-01-06 | v1.1 | 添加名词解释章节，调整章节结构，精简示例代码                                                                                                                                         | -           |
| 2025-01-11 | v1.2 | **重大更新**: 移除多选功能(`selectedNodes`, `selectNode`, `clearSelection`)和浮动节点(`floating`),移除`expandedNodes`(改用`collapsedNodes`默认展开),移除`node_type`字段,简化状态管理 | Claude Code |
| 2025-01-11 | v1.3 | 移除撤销/重做功能 (`canUndo`, `canRedo`, `undo()`, `redo()`, `updateUndoRedoState()`), 将作为未来新功能重新设计和实现                                                                | Claude Code |

### 10.4 参考资料

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [Immer 官方文档](https://immerjs.github.io/immer/)

---

**文档维护者**: Claude Code
**文档版本**: v1.2
**最后更新**: 2025-01-11
