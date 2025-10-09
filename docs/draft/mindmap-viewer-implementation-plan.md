# MindmapViewer 组件实现计划

**版本**: v1.6
**创建日期**: 2025-01-07
**最后更新**: 2025-01-09
**状态**: 设计完成 - 待实施

---

## 1. 概述

本文档描述基于 React Flow 实现思维导图可视化组件的完整实现计划。系统由三个核心组件组成:`MindmapEditor` (容器组件), `MindmapViewer` (图形展示), `NodePanel` (编辑面板)。

### 1.1 设计目标

- **图形化展示**: 使用 React Flow 渲染树形思维导图
- **自动布局**: 使用 Dagre 算法自动计算节点位置
- **拖拽重组**: 支持拖拽改变节点顺序和父子关系
- **独立编辑面板**: 可调整宽度的侧边栏编辑面板
- **双向绑定**: 与 Zustand Store 保持状态同步
- **交互友好**: 提供清晰的视觉反馈

### 1.2 技术栈

- **@xyflow/react**: React Flow v12+ (图形渲染引擎)
- **dagre**: 图布局算法库
- **Zustand**: 状态管理 (已有)
- **TypeScript**: 类型安全

---

## 2. 功能范围

### 2.1 本期实现 (MVP)

✅ **基础渲染**
- React Flow 集成
- 树形节点自动布局 (Dagre)
- 自定义节点样式

✅ **节点交互**
- 单击选中节点
- 双击触发编辑 (聚焦到编辑面板)
- 界面始终有选中节点 (默认根节点)

✅ **展开/折叠**
- 点击展开/折叠按钮
- 动态隐藏/显示子树
- 重新计算布局

✅ **拖拽重组**
- 拖拽改变节点顺序 (同级)
- 拖拽改变父子关系 (跨层级)
- 实时视觉反馈 (插入线/高亮边框)
- 约束检查 (禁止循环)

✅ **编辑面板**
- 独立的右侧面板 (NodePanel)
- 宽度可调整 (拖拽边界)
- 编辑标题和内容
- 始终显示当前选中节点

✅ **视图控制**
- 缩放 (滚轮)
- 平移 (拖拽画布)
- 适应视图 (Fit View)
- 小地图 (MiniMap)

### 2.2 暂不实现 (后续迭代)

❌ **动画效果**: 展开/折叠、拖拽的过渡动画
❌ **浮动节点**: 浮动节点的图形化展示
❌ **自由布局**: 用户自定义节点位置
❌ **多选编辑**: 编辑多个选中节点
❌ **性能优化**: 大规模节点 (500+) 的虚拟化渲染

---

## 3. 架构设计

### 3.1 组件结构

```
MindmapEditor (容器组件)
├─ MindmapViewer (图形展示 + 交互)
│  ├─ ReactFlow
│  ├─ CustomMindNode (只读显示)
│  └─ DropIndicator (拖拽指示器)
│
└─ NodePanel (编辑面板 - 右侧)
   ├─ ResizablePanel (可调整宽度容器)
   ├─ 标题输入框
   └─ 内容文本域
```

完整目录结构:
```
components/mindmap/
├── mindmap-editor.tsx             # 容器组件 - 协调 Viewer 和 Panel
├── mindmap-viewer.tsx             # 图形化展示 + 交互
├── node-panel.tsx                 # 节点编辑面板
├── resizable-panel.tsx            # 可调整宽度面板容器
│
├── viewer/
│   ├── custom-mind-node.tsx       # 自定义节点 (只读)
│   ├── drop-indicator.tsx         # 拖拽指示器
│   └── ...
│
├── hooks/
│   ├── use-mindmap-layout.ts      # 布局计算
│   ├── use-mindmap-drag.ts        # 拖拽逻辑
│   └── ...
│
└── utils/
    ├── mindmap-to-flow.ts         # 数据转换
    ├── dagre-layout.ts            # Dagre 布局
    └── drag-validator.ts          # 拖拽验证
```

**命名规范**:
- **文件名**: kebab-case (小写+连字符),如 `mindmap-editor.tsx`
- **组件名**: PascalCase (大驼峰),如 `export function MindmapEditor()`
- **保持一致**: 遵循项目统一的命名规范 (参考 `project-structure.md`)

### 3.2 数据流

```
Zustand Store (Map<string, MindmapNode>)
         ↓
  数据转换 (mindmap-to-flow.ts)
         ↓
  布局计算 (dagre-layout.ts)
         ↓
ReactFlow (nodes[], edges[])
         ↓
  自定义节点渲染 (CustomMindNode)
         ↓
  用户交互 (点击、拖拽)
         ↓
  更新 Store (moveNode, selectNode, etc.)
         ↓
  触发重新渲染 (循环)
```

### 3.3 组件职责

#### MindmapEditor (容器/协调者)

**职责**:
- 组合 Viewer 和 Panel
- 确保始终有选中节点 (初始化时选中根节点)
- 协调 Viewer 和 Panel 的通信 (双击编辑事件)
- 管理整体布局

**不负责**:
- 具体的节点操作逻辑
- 数据转换和布局计算
- 视觉反馈实现

#### MindmapViewer (纯展示+交互)

**职责**:
- 使用 React Flow 渲染思维导图
- 处理视图交互 (点击、拖拽、缩放)
- 调用 store 方法更新状态
- 触发编辑事件 (通过回调)

**不负责**:
- 编辑 UI (输入框、文本域等)
- 节点详情展示
- 数据持久化

#### NodePanel (独立编辑面板)

**职责**:
- 展示当前选中节点的详细信息
- 提供节点编辑 UI (标题、内容)
- 响应聚焦请求 (双击触发)
- 宽度可调整

**不负责**:
- 图形化展示
- 拖拽逻辑
- 布局计算

### 3.4 核心接口设计

#### Store 不变式

**关键不变式**: `currentNode` 永远指向一个存在的节点

Store 在以下情况自动维护这个不变式:
1. **初始化时**: 如果 `currentNode === null`,自动设置为根节点
2. **节点删除时**: 如果删除的是 `currentNode`,自动切换到父节点

#### Store 新增方法

##### initializeMindmap

```typescript
/**
 * 初始化思维导图
 * - 如果 currentNode 为 null,自动设置为根节点
 * - 确保 currentNode 不变式
 *
 * @param mindmapId - 思维导图 ID
 */
initializeMindmap(mindmapId: string): void;
```

**行为**:
1. 检查 currentNode 是否为 null
2. 如果是 null,查找根节点
3. 设置 currentNode = 根节点 short_id
4. 更新 selectedNodes

**实现**:
```typescript
initializeMindmap: (mindmapId: string) => {
  set((state) => {
    if (!state.currentNode) {
      const root = Array.from(state.nodes.values()).find(
        (node) => node.mindmap_id === mindmapId && node.node_type === 'root'
      );

      if (root) {
        state.currentNode = root.short_id;
        state.selectedNodes.clear();
        state.selectedNodes.add(root.short_id);
      }
    }
  });
}
```

##### moveNode

```typescript
/**
 * 移动节点到新位置
 * @param nodeId - 要移动的节点 short_id
 * @param newParentId - 新父节点 short_id
 * @param position - 在新父节点下的位置 (0-based)
 */
moveNode(params: {
  nodeId: string;
  newParentId: string;
  position: number;
}): void;
```

**行为**:
1. 验证节点存在
2. 验证 newParentId 存在
3. 验证不会造成循环引用 (nodeId 不能是 newParentId 的祖先)
4. 如果 newParentId === 原 parentId: 同级重排序
5. 如果 newParentId !== 原 parentId: 改变父节点
6. 更新相关节点的 order_index
7. 标记 isDirty = true, isSynced = false
8. **不改变 currentNode** (保持用户焦点)

##### deleteNode (修改)

```typescript
/**
 * 删除节点及其整个子树
 *
 * @param nodeId - 要删除的节点 short_id
 *
 * **选中状态不变式保护**:
 * - 从 selectedNodes 中移除所有被删除的节点
 * - 如果 currentNode 被删除且还有其他选中节点,自动切换到其中一个
 * - 如果 currentNode 被删除且没有其他选中节点,设置为 null
 * - 始终维护不变式 1 和 2
 */
deleteNode(nodeId: string): void;
```

**行为**:
1. 验证节点存在
2. 验证不是根节点
3. 递归收集所有子孙节点(包括要删除的节点本身)
4. 删除所有标记的节点,同时从 selectedNodes 中移除
5. 清理 expandedNodes, collapsedNodes
6. **🔑 关键 - 维护选中状态不变式**:
   - 如果 currentNode 被删除:
     - 若 selectedNodes 还有其他节点 → 选择其中一个作为新的 currentNode
     - 若 selectedNodes 为空 → 查找被删除节点最近的存在祖先节点:
       - 向上遍历 parent_short_id 链
       - 找到第一个未被删除的祖先节点
       - 设置为新的 currentNode (同时更新 selectedNodes)
       - 如果所有祖先都被删除(理论上不可能,因为根节点受保护) → 切换到根节点
   - 这样确保:
     - 不变式 1: selectedNodes 包含 currentNode (当 currentNode ≠ null 时)
     - 不变式 2: currentNode = null 时,selectedNodes 为空
     - **UI 友好**: 删除后焦点自动移到最近的有效节点,而不是变成空选中状态
7. 重新排序剩余兄弟节点的 order_index
8. 标记 isDirty = true, isSynced = false

**实现**:
```typescript
deleteNode: (nodeId: string) => {
  set((state) => {
    const node = state.nodes.get(nodeId);
    if (!node) throw new Error(`节点不存在: ${nodeId}`);
    if (node.node_type === 'root') throw new Error("不能删除根节点");

    // 递归收集要删除的节点
    const toDelete = new Set<string>();
    const collectDescendants = (currentNodeId: string) => {
      toDelete.add(currentNodeId);
      const currentNode = state.nodes.get(currentNodeId);
      if (!currentNode) return;

      Array.from(state.nodes.values())
        .filter((n) => n.parent_short_id === currentNodeId)
        .forEach((child) => collectDescendants(child.short_id));
    };

    collectDescendants(nodeId);

    // 删除所有标记的节点
    toDelete.forEach((id) => {
      state.nodes.delete(id);
      // 从选中集合中移除被删除的节点
      state.selectedNodes.delete(id);
      // 清理展开/折叠状态
      state.expandedNodes.delete(id);
      state.collapsedNodes.delete(id);
    });

    // 🔑 维护 currentNode 和 selectedNodes 的不变式
    if (state.currentNode && toDelete.has(state.currentNode)) {
      // currentNode 被删除
      if (state.selectedNodes.size > 0) {
        // 还有其他选中节点,选择其中一个作为新的 currentNode
        const newCurrent = state.selectedNodes.values().next().value;
        state.currentNode = newCurrent;
      } else {
        // 没有其他选中节点,查找最近的存在祖先节点
        let ancestorId = node.parent_short_id;
        let newCurrentNode: string | null = null;

        // 向上遍历祖先链,找到第一个未被删除的节点
        while (ancestorId) {
          if (!toDelete.has(ancestorId)) {
            newCurrentNode = ancestorId;
            break;
          }
          const ancestor = state.nodes.get(ancestorId);
          ancestorId = ancestor?.parent_short_id ?? null;
        }

        // 如果找到祖先节点,设置为新的 currentNode
        if (newCurrentNode) {
          state.currentNode = newCurrentNode;
          state.selectedNodes.add(newCurrentNode);
        } else {
          // 兜底:切换到根节点 (理论上不会发生,因为根节点受保护)
          const root = Array.from(state.nodes.values()).find(
            (n) => n.node_type === 'root'
          );
          if (root) {
            state.currentNode = root.short_id;
            state.selectedNodes.add(root.short_id);
          } else {
            // 极端情况:连根节点都没有
            state.currentNode = null;
          }
        }
      }
    }

    // 重新排序剩余兄弟节点的 order_index
    if (node.parent_short_id) {
      const siblings = Array.from(state.nodes.values())
        .filter((n) => n.parent_short_id === node.parent_short_id)
        .sort((a, b) => a.order_index - b.order_index);

      siblings.forEach((sibling, index) => {
        const siblingNode = state.nodes.get(sibling.short_id);
        if (siblingNode && siblingNode.order_index !== index) {
          siblingNode.order_index = index;
          siblingNode.updated_at = new Date().toISOString();
        }
      });
    }

    state.isDirty = true;
    state.isSynced = false;
  });
}
```

**关键变更说明**:

与之前设计的主要区别:
- ❌ **旧设计**: 当 currentNode 被删除时,切换到父节点或根节点
- ✅ **新设计**: 当 currentNode 被删除时,按优先级选择新的 currentNode:
  1. 优先从剩余的 selectedNodes 中选择一个 (保持多选上下文)
  2. 如果 selectedNodes 为空,查找最近的存在祖先节点
  3. 兜底:切换到根节点

**为什么这样设计**:

**场景 1: 多选状态下删除 currentNode**
- 用户多选了 A, B, C (currentNode = A),然后删除 A
- 旧逻辑: 切换到 A 的父节点,但 B 和 C 仍在 selectedNodes 中 → 违反不变式
- 新逻辑: 切换到 B 或 C,保持多选上下文 → ✅ 符合用户预期

**场景 2: 单选状态下删除 currentNode**
- 用户选中节点 A,然后删除 A
- 旧逻辑: selectedNodes 被清空,currentNode = null → ❌ UI 变成无选中状态
- 新逻辑: 切换到 A 的父节点(或祖先节点) → ✅ 保持 UI 始终有焦点

**不变式保护**:
- `currentNode === null` ⟺ `selectedNodes.size === 0`
- `currentNode !== null` ⟹ `selectedNodes.has(currentNode)`
- **额外保证**: 在正常情况下,删除后总能找到有效的 currentNode (根节点受保护)

#### 组件通信接口

```typescript
// components/mindmap/mindmap-editor.tsx
interface MindmapEditorProps {
  mindmap: Mindmap;
  initialNodes: MindmapNode[];
}

// components/mindmap/mindmap-viewer.tsx
interface MindmapViewerProps {
  onNodeEdit?: () => void;  // 双击节点时调用
}

// components/mindmap/node-panel.tsx
export interface NodePanelRef {
  focusTitleInput: () => void;  // 聚焦标题输入框
}

export const NodePanel = forwardRef<NodePanelRef>((props, ref) => {
  // ...
});
```

---

## 4. 关键交互流程

### 4.1 初始化流程

```
MindmapEditor 挂载
  ↓
检查 currentNode 是否为 null
  ↓
如果是 null → 自动选中根节点
  ↓
setCurrentNode(rootNode.short_id)
  ↓
NodePanel 显示根节点信息
```

**实现**:
```typescript
// components/mindmap/mindmap-editor.tsx
export function MindmapEditor({ mindmap, initialNodes }: MindmapEditorProps) {
  const { currentNode, setCurrentNode, getRootNode } = useMindmapEditorStore();

  useEffect(() => {
    if (!currentNode) {
      const root = getRootNode(mindmap.id);
      if (root) {
        setCurrentNode(root.short_id);
      }
    }
  }, [currentNode, mindmap.id]);

  // ...
}
```

### 4.2 单击节点流程

```
用户单击节点 A
  ↓
MindmapViewer.onNodeClick
  ↓
selectNode(A, multiSelect)
  ↓
Store.currentNode = A
  ↓
NodePanel 重新渲染
  ↓
显示节点 A 的标题和内容
```

**实现**:
```typescript
// components/mindmap/mindmap-viewer.tsx
const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
  const multiSelect = event.metaKey || event.ctrlKey;
  selectNode(node.id, multiSelect);
}, [selectNode]);
```

### 4.3 双击编辑流程

```
用户双击节点 B
  ↓
MindmapViewer.onNodeDoubleClick
  ↓
selectNode(B)
  ↓
onNodeEdit() 回调
  ↓
MindmapEditor.handleNodeEdit()
  ↓
panelRef.current.focusTitleInput()
  ↓
NodePanel 聚焦标题输入框
  ↓
全选输入框文本
  ↓
用户开始编辑
```

**实现**:
```typescript
// components/mindmap/mindmap-editor.tsx
export function MindmapEditor() {
  const panelRef = useRef<NodePanelRef>(null);

  const handleNodeEdit = useCallback(() => {
    panelRef.current?.focusTitleInput();
  }, []);

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <MindmapViewer onNodeEdit={handleNodeEdit} />
      </div>
      <NodePanel ref={panelRef} />
    </div>
  );
}

// components/mindmap/mindmap-viewer.tsx
const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
  selectNode(node.id, false);
  onNodeEdit?.();
}, [selectNode, onNodeEdit]);

// components/mindmap/node-panel.tsx
export const NodePanel = forwardRef<NodePanelRef>((props, ref) => {
  const titleInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusTitleInput: () => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }));

  // ...
});
```

### 4.4 拖拽节点流程

```
用户拖拽节点 C 到节点 D 上
  ↓
onNodeDragStart (记录拖拽状态)
  ↓
onNodeDrag (实时计算 drop action + 显示视觉反馈)
  ↓
onNodeDragStop
  ↓
验证操作是否合法
  ↓
调用 moveNode(C, D, position)
  ↓
Store 更新节点关系
  ↓
重新计算布局
  ↓
MindmapViewer 重新渲染
```

### 4.5 调整 Panel 宽度流程

```
用户鼠标悬停在 Panel 左边缘
  ↓
显示拖拽手柄高亮 (蓝色)
  ↓
用户按下鼠标拖拽
  ↓
setIsResizing(true)
  ↓
监听 mousemove 实时更新宽度
  ↓
宽度限制在 minWidth-maxWidth 之间
  ↓
鼠标释放 → setIsResizing(false)
  ↓
停止调整
```

---

## 5. 拖拽重组设计

### 5.1 拖拽行为定义

#### 拖放位置判断

根据鼠标在目标节点上的垂直位置比例判断操作类型:

```typescript
function getDropAction(
  targetNode: Node,
  mouseY: number
): DropAction {
  const ratio = (mouseY - targetNode.position.y) / targetNode.height;

  if (ratio < 0.2) {
    // 上边缘 20%
    return {
      type: 'insert-before',
      parentId: targetNode.data.parentId,
      position: targetNode.data.orderIndex
    };
  } else if (ratio > 0.8) {
    // 下边缘 20%
    return {
      type: 'insert-after',
      parentId: targetNode.data.parentId,
      position: targetNode.data.orderIndex + 1
    };
  } else {
    // 中间 60%
    return {
      type: 'change-parent',
      parentId: targetNode.id,
      position: Infinity  // 插入到最后
    };
  }
}
```

#### 操作类型说明

| 拖放位置 | 操作类型 | 结果 | 视觉反馈 |
|---------|---------|------|---------|
| 上边缘 20% | `insert-before` | 插入到目标节点上方 (同级) | 蓝色插入线 (上方) |
| 中间 60% | `change-parent` | 成为目标节点的子节点 (排最后) | 绿色高亮边框 |
| 下边缘 20% | `insert-after` | 插入到目标节点下方 (同级) | 蓝色插入线 (下方) |

### 5.2 视觉反馈

#### 拖拽过程中的反馈

| 状态 | 视觉效果 |
|------|---------|
| 被拖拽节点 | 半透明 (opacity: 0.5) + 跟随鼠标 |
| 上边缘 20% | 目标节点**上方**显示蓝色水平插入线 |
| 中间 60% | 目标节点**整体**显示绿色高亮边框 |
| 下边缘 20% | 目标节点**下方**显示蓝色水平插入线 |
| 禁止区域 | 红色边框 + 禁止图标 🚫 + `not-allowed` 光标 |

#### DropIndicator 组件

```typescript
// components/mindmap/viewer/drop-indicator.tsx
interface DropIndicatorProps {
  type: 'line-above' | 'line-below' | 'highlight' | 'forbidden';
  targetNodeId: string;
}

export function DropIndicator({ type, targetNodeId }: DropIndicatorProps) {
  // 根据 type 渲染不同的视觉提示
  if (type === 'line-above' || type === 'line-below') {
    // 蓝色水平插入线
    return <div className="drop-line" />;
  }

  if (type === 'highlight') {
    // 绿色高亮边框 (覆盖在节点上)
    return <div className="drop-highlight" />;
  }

  if (type === 'forbidden') {
    // 红色边框 + 禁止图标
    return <div className="drop-forbidden">🚫</div>;
  }
}
```

### 5.3 拖拽约束

#### 禁止的操作

1. **根节点不可拖拽**: `node.data.nodeType === 'root'`
2. **禁止循环引用**: 不能拖到自己的子孙节点下

#### 验证逻辑

```typescript
function validateDrop(
  draggedNodeId: string,
  targetNodeId: string,
  nodesMap: Map<string, MindmapNode>
): boolean {
  // 1. 检查根节点
  const draggedNode = nodesMap.get(draggedNodeId);
  if (draggedNode?.node_type === 'root') {
    return false;
  }

  // 2. 检查循环引用
  if (isDescendant(targetNodeId, draggedNodeId, nodesMap)) {
    return false;
  }

  return true;
}

function isDescendant(
  ancestorId: string,
  descendantId: string,
  nodesMap: Map<string, MindmapNode>
): boolean {
  let current = nodesMap.get(ancestorId);
  while (current) {
    if (current.short_id === descendantId) {
      return true;
    }
    current = current.parent_short_id
      ? nodesMap.get(current.parent_short_id)
      : null;
  }
  return false;
}
```

### 5.4 避免循环更新

**问题**: 双向绑定可能导致循环更新
```
用户拖拽 → 更新 store → 触发重渲染 → 更新 nodes → 触发 onNodesChange?
```

**解决方案**:
1. **只监听 `onNodeDragStop`**: 拖拽结束时才更新 store
2. **不使用 `onNodesChange`**: 避免监听 position 变化
3. **受控模式**: nodes/edges 完全由 store 派生,不允许 React Flow 内部修改

```typescript
// 不使用这个!
// onNodesChange={(changes) => { ... }}

// 只使用这个
onNodeDragStop={(event, node) => {
  // 计算 drop action
  // 验证
  // 更新 store
}}
```

---

## 6. NodePanel 设计

### 6.1 基础结构

```typescript
// components/mindmap/node-panel.tsx
export interface NodePanelRef {
  focusTitleInput: () => void;
}

export const NodePanel = forwardRef<NodePanelRef>((props, ref) => {
  const { currentNode, getNode, updateNodeTitle, updateNodeContent } =
    useMindmapEditorStore();

  const titleInputRef = useRef<HTMLInputElement>(null);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    focusTitleInput: () => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }));

  const node = getNode(currentNode!); // currentNode 永远不为 null

  if (!node) {
    return <div className="w-96 border-l p-4">未选中节点</div>;
  }

  return (
    <ResizablePanel
      defaultWidth={384}
      minWidth={300}
      maxWidth={600}
      className="border-l"
    >
      <div className="p-4 space-y-4">
        {/* 标题编辑 */}
        <div>
          <label className="text-sm font-medium text-gray-700">标题</label>
          <input
            ref={titleInputRef}
            value={node.title}
            onChange={(e) => updateNodeTitle(node.short_id, e.target.value)}
            className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 内容编辑 */}
        <div>
          <label className="text-sm font-medium text-gray-700">内容</label>
          <textarea
            value={node.content || ''}
            onChange={(e) => updateNodeContent(node.short_id, e.target.value)}
            rows={20}
            className="w-full mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </ResizablePanel>
  );
});
```

### 6.2 可调整宽度的面板

```typescript
// components/mindmap/resizable-panel.tsx
interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  className?: string;
}

export function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth,
  className
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;

    // 从右往左拖拽
    const newWidth = window.innerWidth - e.clientX;
    const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
    setWidth(clampedWidth);
  }, [isResizing, minWidth, maxWidth]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing, resize, stopResizing]);

  return (
    <div
      ref={panelRef}
      className={cn('relative', className)}
      style={{ width }}
    >
      {/* 拖拽手柄 */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          'cursor-col-resize transition-colors',
          'hover:bg-blue-500',
          isResizing && 'bg-blue-500'
        )}
        onMouseDown={startResizing}
      />

      {/* 内容区域 */}
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
```

---

## 7. CustomMindNode 设计

### 7.1 节点组件 (只读显示)

由于所有编辑都在 NodePanel 中完成,CustomMindNode 只负责显示:

```typescript
// components/mindmap/viewer/custom-mind-node.tsx
interface CustomMindNodeData {
  shortId: string;
  title: string;
  content: string | null;
  nodeType: 'root' | 'normal' | 'floating';
  orderIndex: number;
  parentId: string | null;
  hasChildren: boolean;
}

export function CustomMindNode({ data }: NodeProps<CustomMindNodeData>) {
  const { selectedNodes, expandedNodes } = useMindmapEditorStore();

  const isSelected = selectedNodes.has(data.shortId);
  const isExpanded = expandedNodes.has(data.shortId);
  const isRoot = data.nodeType === 'root';

  // 展开/折叠
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();

    useMindmapEditorStore.setState((state) => {
      if (isExpanded) {
        state.expandedNodes.delete(data.shortId);
        state.collapsedNodes.add(data.shortId);
      } else {
        state.collapsedNodes.delete(data.shortId);
        state.expandedNodes.add(data.shortId);
      }
    });
  };

  return (
    <div className={cn('mind-node', {
      'selected': isSelected,
      'root': isRoot
    })}>
      {/* 展开/折叠按钮 */}
      {data.hasChildren && (
        <button
          onClick={toggleExpand}
          className="expand-button"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      )}

      {/* 节点图标 */}
      <span className="icon">
        {isRoot ? '👑' : '📄'}
      </span>

      {/* 标题 (只读) */}
      <span className="title">{data.title}</span>

      {/* Handles (连接点) */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

### 7.2 节点样式

```css
.mind-node {
  padding: 12px 16px;
  border-radius: 8px;
  background: white;
  border: 2px solid #e5e7eb;
  min-width: 150px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
  cursor: pointer;
}

.mind-node.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.mind-node.root {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  border-color: #5a67d8;
}

.mind-node .icon {
  font-size: 18px;
}

.mind-node .title {
  flex: 1;
  font-size: 14px;
}

.mind-node .expand-button {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.15s;
}

.mind-node .expand-button:hover {
  color: #111827;
}
```

---

## 8. Dagre 布局集成

### 8.1 安装依赖

```bash
volta run yarn add @xyflow/react dagre
volta run yarn add -D @types/dagre
```

### 8.2 布局函数实现

```typescript
// lib/utils/dagre-layout.ts
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction: 'TB' | 'LR';  // 垂直 or 水平
  nodeWidth: number;        // 默认节点宽度
  nodeHeight: number;       // 默认节点高度
  rankSep: number;          // 层级间距
  nodeSep: number;          // 节点间距
}

const defaultOptions: LayoutOptions = {
  direction: 'TB',
  nodeWidth: 172,
  nodeHeight: 50,
  rankSep: 80,
  nodeSep: 40
};

export function calculateDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: Partial<LayoutOptions> = {}
): Node[] {
  const opts = { ...defaultOptions, ...options };

  // 创建 dagre 图
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // 设置图布局
  dagreGraph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep
  });

  // 添加节点
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, {
      width: node.width || opts.nodeWidth,
      height: node.height || opts.nodeHeight
    });
  });

  // 添加边
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 执行布局计算
  dagre.layout(dagreGraph);

  // 应用计算结果
  return nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        // Dagre 的锚点是中心,React Flow 是左上角
        x: nodeWithPosition.x - (node.width || opts.nodeWidth) / 2,
        y: nodeWithPosition.y - (node.height || opts.nodeHeight) / 2
      }
    };
  });
}
```

---

## 9. 数据转换实现

```typescript
// lib/utils/mindmap-to-flow.ts
import type { Node, Edge } from '@xyflow/react';
import type { MindmapNode } from '@/lib/types';

export function convertToFlowData(
  rootNodeId: string,
  nodesMap: Map<string, MindmapNode>,
  expandedNodes: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];
  const visited = new Set<string>();

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodesMap.get(nodeId);
    if (!node) return;

    // 获取子节点
    const children = Array.from(nodesMap.values())
      .filter(n => n.parent_short_id === nodeId)
      .sort((a, b) => a.order_index - b.order_index);

    // 转换为 Flow Node
    flowNodes.push({
      id: node.short_id,
      type: 'customMindNode',
      position: { x: 0, y: 0 },  // 位置由 dagre 计算
      data: {
        shortId: node.short_id,
        title: node.title,
        content: node.content,
        nodeType: node.node_type,
        orderIndex: node.order_index,
        parentId: node.parent_short_id,
        hasChildren: children.length > 0
      }
    });

    // 添加边
    if (node.parent_short_id) {
      flowEdges.push({
        id: `${node.parent_short_id}-${node.short_id}`,
        source: node.parent_short_id,
        target: node.short_id,
        type: 'smoothstep'
      });
    }

    // 如果节点已展开,递归处理子节点
    if (expandedNodes.has(nodeId)) {
      children.forEach(child => traverse(child.short_id));
    }
  }

  traverse(rootNodeId);

  return { nodes: flowNodes, edges: flowEdges };
}
```

---

## 10. 设计决策

### 决策 1: Panel 宽度持久化 ✅

**最终决策**: 仅使用 localStorage,不通过 IndexedDB 持久化中间件

**理由**:

**1. 定位为纯 UI 偏好设置**
- ResizablePanel 的宽度是**用户的视觉偏好**,不是业务数据
- 类似于其他 UI 设置:主题、字体大小、侧边栏折叠状态等
- 这类设置通常只在**当前设备**生效,不需要跨设备同步

**2. 不需要云端同步**
- 不同设备的屏幕尺寸不同,同步面板宽度没有意义
  - 桌面端: 可能设置 400px
  - 笔记本: 可能设置 350px
  - 不同分辨率下最佳宽度不同
- 与 IndexedDB 中的思维导图数据不同,后者需要跨设备访问

**3. 简化系统架构**
- localStorage 是浏览器原生 API,不需要额外的持久化层
- 避免引入不必要的中间件复杂度
- 独立于 IndexedDB 持久化系统,不影响数据同步逻辑

**4. 性能优化**
- 面板宽度调整频繁,localStorage 读写更快
- 避免频繁触发 IndexedDB 事务
- 不占用 IndexedDB 存储配额

**与 IndexedDB 持久化中间件的关系**:
- IndexedDB 持久化中间件 (`indexeddb-persistence-middleware-design.md`) 负责:
  - 思维导图数据 (`Mindmap`, `MindmapNode`)
  - 编辑状态 (`currentNode`, `selectedNodes`, `expandedNodes`)
- localStorage 负责:
  - **纯 UI 偏好设置** (ResizablePanel 宽度)
  - 不影响数据完整性的本地化配置

**实现**:
```typescript
// ResizablePanel.tsx
const STORAGE_KEY = 'mindmap-panel-width';

useEffect(() => {
  const savedWidth = localStorage.getItem(STORAGE_KEY);
  if (savedWidth) {
    setWidth(parseInt(savedWidth, 10));
  }
}, []);

const stopResizing = useCallback(() => {
  setIsResizing(false);
  localStorage.setItem(STORAGE_KEY, width.toString());
}, [width]);
```

### 决策 2: 输入框保存策略 ✅

**最终决策**: onChange 立即保存 (实时同步)

**理由**:
- 避免用户遗忘保存导致数据丢失
- Store 中已有防抖机制 (通过 isSynced 控制)
- 实现最简单直接

**实现**:
```typescript
// NodePanel.tsx
<input
  value={node.title}
  onChange={(e) => updateNodeTitle(node.short_id, e.target.value)}
/>

<textarea
  value={node.content || ''}
  onChange={(e) => updateNodeContent(node.short_id, e.target.value)}
/>
```

### 决策 3: ResizablePanel 视觉反馈 ✅

**最终决策**: 保持当前设计

**设计细节**:
- 默认: 1px 宽透明手柄
- hover: 蓝色高亮 (`bg-blue-500`)
- 拖拽中: 蓝色加粗保持
- 光标: `cursor-col-resize`

**无需额外调整**,当前设计已足够清晰。

### 决策 4: 编辑范围限制 ✅

**最终决策**: 仅支持单节点编辑 (currentNode)

**理由**:
- 多选编辑功能复杂度高
- MVP 阶段暂不需要
- 未来如需支持,可作为独立迭代

**当前行为**:
- Panel 始终显示 `currentNode` 的内容
- 即使 `selectedNodes.size > 1`,也只编辑 `currentNode`
- 多选状态仅用于批量操作 (如批量删除),不用于编辑

---

## 11. 实施步骤

### Phase 1: 基础设施 (2-3天)

- [ ] 安装依赖 (`@xyflow/react`, `dagre`)
- [ ] 创建基础组件结构
- [ ] 实现数据转换函数 (`convertToFlowData`)
- [ ] 实现布局计算函数 (`calculateDagreLayout`)

### Phase 2: 核心组件 (3-4天)

- [ ] 实现 `MindmapEditor` (容器组件)
- [ ] 实现 `MindmapViewer` (图形展示)
- [ ] 实现 `CustomMindNode` (只读节点)
- [ ] 实现初始化逻辑 (自动选中根节点)

### Phase 3: 编辑面板 (2-3天)

- [ ] 实现 `NodePanel` (基础版)
- [ ] 实现 `ResizablePanel` (可调整宽度)
- [ ] 实现双击编辑流程 (聚焦输入框)
- [ ] 测试编辑同步

### Phase 4: 展开/折叠 (1-2天)

- [ ] 在节点上添加展开/折叠按钮
- [ ] 实现展开/折叠逻辑
- [ ] 重新计算布局
- [ ] 测试状态同步

### Phase 5: 拖拽重组 (4-5天)

- [ ] 实现拖拽事件处理
- [ ] 实现 Drop 位置检测
- [ ] 实现视觉指示器 (`DropIndicator`)
- [ ] 实现拖拽验证逻辑
- [ ] 在 Store 中添加 `moveNode` 方法
- [ ] 测试拖拽功能

### Phase 6: 视图控制 (1天)

- [ ] 添加 Fit View 按钮
- [ ] 添加 MiniMap
- [ ] 添加 Controls 面板
- [ ] 测试缩放和平移

### Phase 7: 整合和测试 (2-3天)

- [ ] 完整 E2E 测试
- [ ] 性能测试 (100+ 节点)
- [ ] 浏览器兼容性测试
- [ ] 代码优化和重构

**总计**: 15-21 天

---

## 12. E2E 测试规范

### 12.1 data-testid 定义

根据项目测试规范 (参考: `testing-guide.md:128-136`),所有交互元素必须添加 `data-testid` 属性以便进行 E2E 测试。

#### 核心组件 test-id

| 组件 | test-id | 说明 |
|------|---------|------|
| MindmapEditor | `mindmap-editor` | 容器组件根元素 |
| MindmapViewer | `mindmap-viewer` | React Flow 容器 |
| NodePanel | `node-panel` | 编辑面板容器 |
| ResizablePanel | `resizable-panel` | 可调整宽度容器 |

#### 节点相关 test-id

| 元素 | test-id 格式 | 示例 |
|------|-------------|------|
| 单个节点元素 | `mindmap-node-{short_id}` | `mindmap-node-abc123` |
| 节点标题 | `mindmap-node-{short_id}-title` | `mindmap-node-abc123-title` |
| 展开/折叠按钮 | `mindmap-node-{short_id}-expand` | `mindmap-node-abc123-expand` |

#### NodePanel 相关 test-id

| 元素 | test-id | 说明 |
|------|---------|------|
| 标题输入框 | `node-panel-title-input` | 节点标题编辑输入框 |
| 内容文本域 | `node-panel-content-textarea` | 节点内容编辑文本域 |
| 拖拽手柄 | `resizable-panel-handle` | 面板宽度调整手柄 |

#### 拖拽相关 test-id

| 元素 | test-id | 说明 |
|------|---------|------|
| 拖拽指示器 | `drop-indicator` | 拖拽时的视觉反馈组件 |
| 插入线 (上) | `drop-indicator-line-above` | 在节点上方插入的指示线 |
| 插入线 (下) | `drop-indicator-line-below` | 在节点下方插入的指示线 |
| 高亮边框 | `drop-indicator-highlight` | 成为子节点的高亮边框 |
| 禁止拖放 | `drop-indicator-forbidden` | 不允许拖放的提示 |

#### 视图控制 test-id

| 元素 | test-id | 说明 |
|------|---------|------|
| Fit View 按钮 | `mindmap-viewer-fit-view` | 适应视图按钮 |
| MiniMap | `mindmap-viewer-minimap` | 小地图组件 |
| Controls 面板 | `mindmap-viewer-controls` | 缩放控制面板 |

### 12.2 实现示例

```typescript
// components/mindmap/mindmap-editor.tsx
export function MindmapEditor() {
  return (
    <div data-testid="mindmap-editor" className="flex h-screen">
      <div className="flex-1">
        <MindmapViewer onNodeEdit={handleNodeEdit} />
      </div>
      <NodePanel ref={panelRef} />
    </div>
  );
}

// components/mindmap/mindmap-viewer.tsx
export function MindmapViewer() {
  return (
    <div data-testid="mindmap-viewer" className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        // ...
      />
      <button
        data-testid="mindmap-viewer-fit-view"
        onClick={fitView}
      >
        Fit View
      </button>
    </div>
  );
}

// components/mindmap/viewer/custom-mind-node.tsx
export function CustomMindNode({ data }: NodeProps<CustomMindNodeData>) {
  return (
    <div
      data-testid={`mindmap-node-${data.shortId}`}
      className="mind-node"
    >
      {data.hasChildren && (
        <button
          data-testid={`mindmap-node-${data.shortId}-expand`}
          onClick={toggleExpand}
          className="expand-button"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      )}

      <span
        data-testid={`mindmap-node-${data.shortId}-title`}
        className="title"
      >
        {data.title}
      </span>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// components/mindmap/node-panel.tsx
export const NodePanel = forwardRef<NodePanelRef>((props, ref) => {
  return (
    <ResizablePanel
      data-testid="node-panel"
      defaultWidth={384}
      minWidth={300}
      maxWidth={600}
      className="border-l"
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">标题</label>
          <input
            data-testid="node-panel-title-input"
            ref={titleInputRef}
            value={node.title}
            onChange={(e) => updateNodeTitle(node.short_id, e.target.value)}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">内容</label>
          <textarea
            data-testid="node-panel-content-textarea"
            value={node.content || ''}
            onChange={(e) => updateNodeContent(node.short_id, e.target.value)}
            rows={20}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
      </div>
    </ResizablePanel>
  );
});

// components/mindmap/resizable-panel.tsx
export function ResizablePanel({ children, ...props }: ResizablePanelProps) {
  return (
    <div
      data-testid="resizable-panel"
      ref={panelRef}
      className="relative"
      style={{ width }}
    >
      <div
        data-testid="resizable-panel-handle"
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize"
        onMouseDown={startResizing}
      />
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// components/mindmap/viewer/drop-indicator.tsx
export function DropIndicator({ type, targetNodeId }: DropIndicatorProps) {
  if (type === 'line-above') {
    return <div data-testid="drop-indicator-line-above" className="drop-line" />;
  }

  if (type === 'line-below') {
    return <div data-testid="drop-indicator-line-below" className="drop-line" />;
  }

  if (type === 'highlight') {
    return <div data-testid="drop-indicator-highlight" className="drop-highlight" />;
  }

  if (type === 'forbidden') {
    return <div data-testid="drop-indicator-forbidden" className="drop-forbidden">🚫</div>;
  }

  return null;
}
```

### 12.3 E2E 测试用例示例

```typescript
// e2e/mindmap-viewer.spec.ts
import { test, expect } from '@playwright/test';

test.describe('MindmapViewer', () => {
  test('应该渲染思维导图', async ({ page }) => {
    await page.goto('/mindmap/test-id');

    // 验证组件存在
    await expect(page.getByTestId('mindmap-editor')).toBeVisible();
    await expect(page.getByTestId('mindmap-viewer')).toBeVisible();
    await expect(page.getByTestId('node-panel')).toBeVisible();
  });

  test('应该能单击选中节点', async ({ page }) => {
    await page.goto('/mindmap/test-id');

    // 获取根节点
    const rootNode = page.getByTestId(/mindmap-node-/).first();
    await rootNode.click();

    // 验证节点被选中 (样式变化)
    await expect(rootNode).toHaveClass(/selected/);
  });

  test('应该能双击编辑节点', async ({ page }) => {
    await page.goto('/mindmap/test-id');

    // 双击节点
    const node = page.getByTestId(/mindmap-node-/).first();
    await node.dblclick();

    // 验证标题输入框获得焦点
    const titleInput = page.getByTestId('node-panel-title-input');
    await expect(titleInput).toBeFocused();
  });

  test('应该能展开/折叠节点', async ({ page }) => {
    await page.goto('/mindmap/test-id');

    // 点击展开按钮
    const expandButton = page.getByTestId(/mindmap-node-.*-expand/).first();
    await expandButton.click();

    // 验证子节点显示/隐藏
    // ...
  });

  test('应该能调整 Panel 宽度', async ({ page }) => {
    await page.goto('/mindmap/test-id');

    const handle = page.getByTestId('resizable-panel-handle');
    const panel = page.getByTestId('resizable-panel');

    // 获取初始宽度
    const initialWidth = await panel.boundingBox();

    // 拖拽手柄
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(-100, 0);
    await page.mouse.up();

    // 验证宽度变化
    const newWidth = await panel.boundingBox();
    expect(newWidth!.width).toBeGreaterThan(initialWidth!.width);
  });
});
```

---

## 13. 关键类型定义

```typescript
// React Flow 相关类型
import type { Node, Edge, NodeProps } from '@xyflow/react';

// 自定义节点数据
export interface CustomNodeData {
  shortId: string;
  title: string;
  content: string | null;
  nodeType: 'root' | 'normal' | 'floating';
  orderIndex: number;
  parentId: string | null;
  hasChildren: boolean;
}

// 拖拽状态
export interface DragState {
  draggedNodeId: string;
  targetNodeId: string | null;
  dropAction: DropAction | null;
  isValid: boolean;
}

// Drop Action 类型
export type DropAction = {
  type: 'insert-before' | 'insert-after';
  parentId: string;
  position: number;
} | {
  type: 'change-parent';
  parentId: string;
  position: number;  // Infinity = 插入最后
};

// NodePanel Ref
export interface NodePanelRef {
  focusTitleInput: () => void;
}
```

---

## 修订历史

| 修订版本 | 修订日期 | 修订作者 | 修订内容 |
|----------|----------|----------|----------|
| v1.0 | 2025-01-07 | Claude Code | 初始版本:定义 MindmapViewer 组件整体架构和实现计划 |
| v1.1 | 2025-01-07 | Claude Code | 更新架构设计,明确三个核心组件的职责;添加 NodePanel 和 ResizablePanel 设计;移除双击就地编辑,改为聚焦编辑面板;添加 Store 不变式设计 |
| v1.2 | 2025-01-07 | Claude Code | 确认所有设计决策:Panel 宽度保存到 localStorage,输入框 onChange 立即保存,ResizablePanel 保持当前设计,仅支持单节点编辑 |
| v1.3 | 2025-01-09 | Claude Code | **重大修改**: 修复 deleteNode 的选中状态不变式违反问题。当 currentNode 被删除时,优先从剩余的 selectedNodes 中选择一个作为新的 currentNode,而不是切换到父节点。确保始终维护不变式: `currentNode === null ⟺ selectedNodes.size === 0` |
| v1.4 | 2025-01-09 | Claude Code | **优化 deleteNode**: 当 selectedNodes 为空时,不再设置 currentNode = null,而是查找被删除节点的最近存在祖先作为新的 currentNode。这样确保删除后 UI 始终有焦点节点,避免空选中状态,提供更好的用户体验 |
| v1.5 | 2025-01-09 | Claude Code | **明确持久化策略**: 详细说明 ResizablePanel 宽度仅使用 localStorage 的理由,不通过 IndexedDB 持久化中间件。定位为纯 UI 偏好设置,不需要跨设备同步,简化系统架构,优化性能 |
| v1.6 | 2025-01-09 | Claude Code | **补充测试规范**: 添加 E2E 测试所需的 data-testid 定义 (包括核心组件、节点元素、编辑面板、拖拽指示器、视图控制等);提供完整实现示例和测试用例示例;统一修订历史表格格式以符合项目规范 |

---

**文档作者**: Claude Code
**文档版本**: v1.6
**最后更新**: 2025-01-09
**状态**: 设计完成 - 待实施
