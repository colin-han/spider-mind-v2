# 思维导图编辑器 Store 设计文档

**版本**: v1.1
**创建日期**: 2025-10-02
**最后更新**: 2025-01-06

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

| 概念 | 定义 | 示例/说明 |
|------|------|----------|
| order_index | 节点排序索引，维护兄弟节点间的顺序 | 0, 1, 2... 连续递增 |
| currentNode | 当前激活/焦点节点的short_id | 单选状态，可为null |
| selectedNodes | 多选节点的short_id集合 | Set结构，必包含currentNode |
| root节点 | 思维导图根节点，每个导图唯一 | node_type='root' |
| floating节点 | 独立浮动节点，不属于主树结构 | node_type='floating', parent_id=null |
| normal节点 | 普通子节点，属于树结构一部分 | node_type='normal', 有parent_id |
| isDirty | 标记是否有未保存的更改 | boolean值，本地编辑标志 |
| isSynced | 标记是否与服务器同步 | boolean值，同步状态标志 |
| expandedNodes | 展开状态的节点集合 | Set<string>结构 |
| collapsedNodes | 折叠状态的节点集合 | Set<string>结构 |
| position | 节点插入位置参数 | 0到子节点数量之间 |
| 选中状态不变式 | currentNode与selectedNodes的一致性约束 | currentNode必在selectedNodes中 |
| 级联删除 | 删除节点时自动删除所有子节点 | 递归删除操作 |

---

## 3. 核心概念

### 3.1 节点标识符

在领域模型中,节点有两个 ID:

- **`id`**: UUID,仅用于数据库存储
- **`short_id`**: 短标识符 (10 字符),用于领域模型中的所有操作

**重要**: 文档和代码中的所有 `nodeId` 参数都指 `short_id`。

### 3.2 节点类型

```typescript
type NodeType = "root" | "floating" | "normal";
```

- **root**: 每个思维导图有且仅有一个根节点
- **floating**: 浮动节点,独立的节点树 (parent_id = null)
- **normal**: 普通节点,有父节点的节点

**节点类型由结构决定,不可手动修改**:

- `parent_id = null && 是根节点` → `root`
- `parent_id = null && 非根节点` → `floating`
- `parent_id != null` → `normal`

### 3.3 焦点与选中

编辑器维护两个相关状态:

- **`currentNode`**: 当前焦点节点 (单个)
- **`selectedNodes`**: 选中的节点集合 (可多个)

**不变式**:

1. `selectedNodes` 必然包含 `currentNode` (当 `currentNode` 不为 null 时)
2. 如果 `currentNode` 为 null,则 `selectedNodes` 必为空集

### 3.4 节点顺序

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

  // 焦点和选中状态
  currentNode: string | null; // short_id
  selectedNodes: Set<string>; // short_id 集合

  // 编辑状态
  isDirty: boolean; // 是否有未保存的修改
  isSynced: boolean; // 是否已同步
  isEditing: boolean; // 是否正在编辑节点
  editingNodeId: string | null; // 正在编辑的节点 short_id

  // UI 状态
  expandedNodes: Set<string>; // 展开的节点集合
  collapsedNodes: Set<string>; // 折叠的节点集合
}
```

### 4.2 数据结构选择

- **`Map<string, MindmapNode>`**: 节点存储
  - 快速查找: O(1)
  - key 使用 `short_id`

- **`Set<string>`**: 选中和展开/折叠状态
  - 快速添加/删除: O(1)
  - 自动去重

---

## 5. 约束与不变式

所有操作都必须遵守以下约束条件，确保数据一致性。

### 5.1 选择状态约束

1. `selectedNodes` 必然包含 `currentNode` (当 `currentNode` 不为 null 时)
2. 如果 `currentNode` 为 null,则 `selectedNodes` 必为空集

### 5.2 节点关系约束

- 每个思维导图有且仅有一个 root 节点
- 节点类型由结构决定，不可手动修改
- 删除节点时必须级联删除所有子节点

### 5.3 数据完整性约束

- 父节点必须存在（除了 root 和 floating 节点）
- order_index 在同一父节点下必须连续
- position 参数自动 clamp 到有效范围

### 5.4 根节点保护

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
3. 创建新节点,设置 `node_type = 'normal'`
4. 更新后续兄弟节点的 `order_index` (+1)
5. 标记 `isDirty = true, isSynced = false`

**约束**:

- 父节点必须存在
- `position >= 0`

#### `createFloatingNode`

创建浮动节点。

```typescript
createFloatingNode(params: CreateFloatingNodeParams): MindmapNode

interface CreateFloatingNodeParams {
  mindmapId: string;
  position: number; // 在浮动节点列表中的位置
  title: string;
  content?: string;
}
```

**行为**:

1. 验证思维导图存在
2. 创建新节点,设置 `node_type = 'floating', parent_id = null`
3. 更新后续浮动节点的 `order_index`

### 4.2 节点编辑操作

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

### 4.3 节点删除操作

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
5. 如果删除的节点被选中,清空选中状态
6. 清理展开/折叠状态
7. 重新排序剩余兄弟节点的 `order_index`

**约束**:

- 节点必须存在
- 不能删除根节点 (`node_type === 'root'`)

### 4.4 节点查询操作

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

#### `getFloatingNodes`

获取所有浮动节点 (按 `order_index` 排序)。

```typescript
getFloatingNodes(mindmapId: string): MindmapNode[]
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

### 4.5 状态操作

#### `setCurrentNode`

设置当前焦点节点。

```typescript
setCurrentNode(nodeId: string | null): void
```

**行为**:

- 如果 `nodeId === null`:
  - 设置 `currentNode = null`
  - 清空 `selectedNodes`
- 如果 `nodeId !== null`:
  - 验证节点存在
  - 设置 `currentNode = nodeId`
  - 清空 `selectedNodes` 并添加该节点

**约束**:

- 保持不变式: `selectedNodes` 包含 `currentNode`

#### `selectNode`

选中节点。

```typescript
selectNode(nodeId: string, multiSelect?: boolean): void
```

**参数**:

- `nodeId`: 要选中的节点
- `multiSelect`: 是否多选模式 (默认 false)

**行为**:

- 如果 `multiSelect = false`:
  - 清空 `selectedNodes`
  - 添加该节点到 `selectedNodes`
  - 设置 `currentNode = nodeId`
- 如果 `multiSelect = true`:
  - 添加该节点到 `selectedNodes`
  - 设置 `currentNode = nodeId`

**约束**:

- 节点必须存在
- 保持不变式: `currentNode` 在 `selectedNodes` 中

#### `clearSelection`

清空所有选中。

```typescript
clearSelection(): void
```

**行为**:

- 设置 `currentNode = null`
- 清空 `selectedNodes`

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
    }
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
  if (node.node_type === "root" && state.currentMindmap) {
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

### 7.5 选中状态维护

所有修改选中状态的操作都确保不变式:

```typescript
// 不变式检查伪代码
function checkInvariant(state: EditorState) {
  if (state.currentNode === null) {
    assert(state.selectedNodes.size === 0);
  } else {
    assert(state.selectedNodes.has(state.currentNode));
  }
}
```


---

## 8. 使用示例

### 8.1 基础用法

```typescript
import { useMindmapEditorStore } from '@/lib/store';

function MindmapEditor() {
  const { currentNode, addChildNode, selectNode } = useMindmapEditorStore();

  // 添加子节点示例
  const handleAddChild = () => {
    if (!currentNode) return;

    const newNode = addChildNode({
      parentId: currentNode,
      position: 0,
      title: '新节点'
    });

    selectNode(newNode.short_id);
  };

  // ... 其他操作类似
}
```

### 8.2 构建节点树与多选

```typescript
// 递归构建节点树
const buildTree = (nodeId: string) => {
  const children = getChildren(nodeId);
  return children.map(child => ({
    node: child,
    children: buildTree(child.short_id)
  }));
};

// 多选操作
const handleNodeClick = (nodeId: string, event: React.MouseEvent) => {
  const multiSelect = event.metaKey || event.ctrlKey;
  selectNode(nodeId, multiSelect);
};
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
- 焦点与选中的不变式 → 所有相关操作自动维护
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
- [x] 节点创建操作 (2个)
  - [x] `addChildNode` - 添加子节点
  - [x] `createFloatingNode` - 创建浮动节点
- [x] 节点编辑操作 (2个)
  - [x] `updateNodeTitle` - 更新标题
  - [x] `updateNodeContent` - 更新内容
- [x] 节点删除操作 (1个)
  - [x] `deleteNode` - 删除节点及子树
- [x] 节点查询操作 (5个)
  - [x] `getNode` - 获取单个节点
  - [x] `getAllNodes` - 获取所有节点
  - [x] `getRootNode` - 获取根节点
  - [x] `getFloatingNodes` - 获取浮动节点
  - [x] `getChildren` - 获取子节点
- [x] 状态操作 (3个)
  - [x] `setCurrentNode` - 设置焦点
  - [x] `selectNode` - 选中节点
  - [x] `clearSelection` - 清空选中
- [x] order_index 自动维护
- [x] 根节点与 MindMap.title 同步
- [x] 焦点与选中的不变式维护
- [x] 完整的约束验证
- [x] 递归删除子树

### 10.3 更新历史

| 日期 | 版本 | 修改内容 | 作者 |
|------|------|---------|------|
| 2025-10-02 | v1.0 | 初始版本 | - |
| 2025-01-06 | v1.1 | 添加名词解释章节，调整章节结构，精简示例代码 | - |

### 10.4 参考资料

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [Immer 官方文档](https://immerjs.github.io/immer/)
- [领域模型设计文档](../.claude/logs/mindmap-domain-model.md)
- [实现总结文档](../.claude/logs/mindmap-store-implementation.md)

---

**文档维护者**: Claude Code
**文档版本**: v1.0
**最后更新**: 2025-10-02
