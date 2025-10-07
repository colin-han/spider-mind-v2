# MindmapViewer 组件实现计划

**版本**: v1.2
**创建日期**: 2025-01-07
**最后更新**: 2025-01-07
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
├── MindmapEditor.tsx              # 容器组件 - 协调 Viewer 和 Panel
├── MindmapViewer.tsx              # 图形化展示 + 交互
├── NodePanel.tsx                  # 节点编辑面板
├── ResizablePanel.tsx             # 可调整宽度面板容器
│
├── viewer/
│   ├── CustomMindNode.tsx         # 自定义节点 (只读)
│   ├── DropIndicator.tsx          # 拖拽指示器
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
 * **不变式保护**:
 * - 如果删除的是 currentNode,自动切换到父节点
 * - 如果父节点不存在,切换到根节点
 * - 确保删除后 currentNode 始终有效
 */
deleteNode(nodeId: string): void;
```

**行为**:
1. 验证节点存在
2. 验证不是根节点
3. **🔑 关键**: 如果 nodeId === currentNode,先切换 currentNode:
   - 优先切换到父节点 (parent_short_id)
   - 如果没有父节点,切换到根节点
4. 递归收集所有子孙节点
5. 删除所有标记的节点
6. 清理 selectedNodes, expandedNodes, collapsedNodes
7. 重新排序剩余兄弟节点的 order_index
8. 标记 isDirty = true, isSynced = false

**实现**:
```typescript
deleteNode: (nodeId: string) => {
  set((state) => {
    const node = state.nodes.get(nodeId);
    if (!node) throw new Error(`节点不存在: ${nodeId}`);
    if (node.node_type === 'root') throw new Error("不能删除根节点");

    // 🔑 保护 currentNode 不变式
    if (state.currentNode === nodeId) {
      if (node.parent_short_id) {
        state.currentNode = node.parent_short_id;
        state.selectedNodes.clear();
        state.selectedNodes.add(node.parent_short_id);
      } else {
        // 切换到根节点 (兜底逻辑)
        const root = Array.from(state.nodes.values()).find(
          (n) => n.node_type === 'root'
        );
        if (root) {
          state.currentNode = root.short_id;
          state.selectedNodes.clear();
          state.selectedNodes.add(root.short_id);
        }
      }
    }

    // 递归删除子树...
  });
}
```

#### 组件通信接口

```typescript
// MindmapEditor.tsx
interface MindmapEditorProps {
  mindmap: Mindmap;
  initialNodes: MindmapNode[];
}

// MindmapViewer.tsx
interface MindmapViewerProps {
  onNodeEdit?: () => void;  // 双击节点时调用
}

// NodePanel.tsx
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
// MindmapEditor.tsx
function MindmapEditor({ mindmap, initialNodes }) {
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
// MindmapViewer.tsx
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
// MindmapEditor.tsx
function MindmapEditor() {
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

// MindmapViewer.tsx
const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
  selectNode(node.id, false);
  onNodeEdit?.();
}, [selectNode, onNodeEdit]);

// NodePanel.tsx
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
// DropIndicator.tsx
interface DropIndicatorProps {
  type: 'line-above' | 'line-below' | 'highlight' | 'forbidden';
  targetNodeId: string;
}

function DropIndicator({ type, targetNodeId }: DropIndicatorProps) {
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
// NodePanel.tsx
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
// ResizablePanel.tsx
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
// CustomMindNode.tsx
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

**最终决策**: 保存到 localStorage

**理由**:
- 用户体验更好,保持个性化设置
- 实现简单,无需后端支持
- localStorage 足够满足单机使用场景

**实现**:
```typescript
// ResizablePanel.tsx
useEffect(() => {
  const savedWidth = localStorage.getItem('mindmap-panel-width');
  if (savedWidth) {
    setWidth(parseInt(savedWidth, 10));
  }
}, []);

const stopResizing = useCallback(() => {
  setIsResizing(false);
  localStorage.setItem('mindmap-panel-width', width.toString());
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

## 12. 关键类型定义

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

**文档作者**: Claude Code
**文档版本**: v1.2
**最后更新**: 2025-01-07
**状态**: 设计完成 - 待实施

## 更新历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-01-07 | 初始版本 |
| v1.1 | 2025-01-07 | 更新架构设计,明确三个核心组件的职责;添加 NodePanel 和 ResizablePanel 设计;移除双击就地编辑,改为聚焦编辑面板;添加 Store 不变式设计 |
| v1.2 | 2025-01-07 | 确认所有设计决策:Panel 宽度保存到 localStorage,输入框 onChange 立即保存,ResizablePanel 保持当前设计,仅支持单节点编辑 |
