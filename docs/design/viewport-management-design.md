# 视口管理设计文档

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-23
- 最后更新：2025-11-23
- 相关文档：
  - [Command 层架构设计](./command-layer-design.md)
  - [命令参考手册](./command-reference.md)
  - [编辑器 UI 布局设计](./editor-ui-layout-design.md)

## 关键概念

> 本节定义该设计文档引入的新概念，不包括外部库或其他文档已定义的概念。

| 概念              | 定义                                                     | 示例/说明                                            |
| ----------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Viewport（视口）  | 描述用户当前可见区域的状态对象，包含位置、尺寸和缩放比例 | `{x, y, width, height, zoom}`                        |
| 节点坐标系        | 使用节点原始坐标的坐标系统（缩放前）                     | 与节点的 x, y 坐标一致                               |
| 屏幕坐标系        | React Flow 使用的屏幕坐标系统（缩放后）                  | `rfX = -nodeX * zoom`                                |
| 双向同步          | Store ↔ React Flow 之间的视口状态同步机制               | 命令更新 Store → React Flow，用户交互更新 RF → Store |
| 值比较防抖        | 通过比较新旧值的相似性来防止同步循环的机制               | 差值小于 0.0001 则跳过同步                           |
| 节点可见性检测    | 判断节点是否在当前视口内（带边距）的逻辑                 | `ensureNodeVisibleAction()`                          |
| SetViewportAction | 用于更新视口状态的 Action，支持部分更新                  | 只更新 x 和 y，保持其他字段不变                      |

**原则**：

- 仅包含本文档新设计/引入的概念
- 外部库概念（如 React Flow）不应包含
- 其他设计文档已定义的概念应引用原文档
- 定义应聚焦于本设计的独特贡献

## 概述

视口管理系统负责管理思维导图编辑器的可视区域状态，实现 Zustand Store 和 React Flow 之间的双向同步，提供缩放、平移、节点聚焦等视图控制命令，确保用户在编辑和导航时获得流畅的视觉体验。

## 背景和动机

### 问题

1. **自动 fitView 的干扰**：React Flow 默认在每次操作后自动调用 `fitView()`，导致视口状态不受控制
2. **导航后节点不可见**：使用快捷键导航到新节点后，节点可能不在当前视口内
3. **缺少视图控制**：用户无法通过快捷键快速缩放、平移视口
4. **状态不一致**：Store 和 React Flow 的视口状态可能不同步

### 动机

- 提供用户可控的视口状态管理
- 支持快捷键控制视口（缩放、平移、聚焦）
- 自动确保导航目标节点可见
- 保持 Store 和 React Flow 的视口状态同步

## 设计目标

- ✅ 停止 React Flow 的自动 fitView 行为
- ✅ 在 EditorState 中维护 Viewport 状态
- ✅ 实现 Store ↔ React Flow 的双向同步
- ✅ 提供视图控制命令（zoom in/out/reset, fit view, focus node, pan）
- ✅ 导航命令自动确保目标节点可见
- ✅ 防止同步循环（使用值比较机制）
- ✅ 支持用户在 React Flow 中的直接交互（鼠标拖拽、滚轮缩放）

## 快速参考

### 坐标系转换公式

```typescript
// 节点坐标 → 屏幕坐标
rfX = -nodeX * zoom;
rfY = -nodeY * zoom;

// 屏幕坐标 → 节点坐标
nodeX = -rfX / zoom;
nodeY = -rfY / zoom;
```

### 常用命令

| 命令                    | 快捷键  | 功能                         |
| ----------------------- | ------- | ---------------------------- |
| `view.zoomIn`           | `Cmd+=` | 放大 20%                     |
| `view.zoomOut`          | `Cmd+-` | 缩小约 17%                   |
| `view.zoomReset`        | `Cmd+0` | 重置为 100%                  |
| `view.fitView`          | `Cmd+1` | 适应所有节点                 |
| `view.focusCurrentNode` | `Cmd+L` | 确保当前节点可见（15% 边距） |
| `view.panLeft`          | `Alt+←` | 向左平移 100 节点坐标单位    |
| `view.panRight`         | `Alt+→` | 向右平移 100 节点坐标单位    |
| `view.panUp`            | `Alt+↑` | 向上平移 100 节点坐标单位    |
| `view.panDown`          | `Alt+↓` | 向下平移 100 节点坐标单位    |

### 关键常量

```typescript
const ZOOM_STEP = 1.2; // 缩放步进（20%）
const MIN_ZOOM = 0.1; // 最小缩放比例
const MAX_ZOOM = 2.0; // 最大缩放比例
const PAN_STEP = 100; // 平移步长（节点坐标单位）
const NODE_PADDING = 0.15; // 节点可见性检测边距（15%）
const VIEWPORT_SYNC_THRESHOLD = 0.0001; // 同步阈值
const VIEWPORT_ANIMATION_DURATION = 200; // 视口动画时长（ms）
const DEBOUNCE_DELAY = 50; // 防抖延迟（ms）
```

## 设计方案

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                       MindmapGraphViewer                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     用户交互                            │ │
│  │  • 鼠标拖拽视口                                         │ │
│  │  • 滚轮缩放                                             │ │
│  │  • 快捷键（Cmd+=/-, Cmd+0/1/L, Alt+arrows）            │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              双向同步（值比较防抖）                     │ │
│  │                                                          │ │
│  │  Store ─────────────────────▶ React Flow                │ │
│  │    (useEffect)       动画200ms       (rfSetViewport)    │ │
│  │                                                          │ │
│  │  Store ◀───────────────────── React Flow                │ │
│  │    (setViewportCmd) 防抖50ms  (onViewportChange)        │ │
│  │                                                          │ │
│  │  lastSyncedViewportRef: 存储上次同步的值                │ │
│  │  isSimilarViewport(): 比较阈值 0.0001                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     EditorState.viewport                     │
│  {x, y, width, height, zoom} (节点坐标系)                    │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                    SetViewportAction                         │
│  • 部分更新支持                                              │
│  • 缩放比例限制 (0.1 - 2.0)                                  │
│  • 可撤销（undoable: false）                                 │
│  • 不持久化到 IndexedDB                                      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                      视图控制命令                            │
│  • view.zoomIn/Out/Reset                                     │
│  • view.fitView                                              │
│  • view.focusCurrentNode                                     │
│  • view.panLeft/Right/Up/Down                                │
│  • view.setViewport (内部命令)                               │
└─────────────────────────────────────────────────────────────┘
```

### 详细设计

#### 数据模型

**Viewport 接口**

```typescript
export interface Viewport {
  x: number; // 视口左边缘在节点坐标系中的 X 坐标
  y: number; // 视口上边缘在节点坐标系中的 Y 坐标
  width: number; // 视口在节点坐标系中的宽度
  height: number; // 视口在节点坐标系中的高度
  zoom: number; // 缩放比例 (0.1 - 2.0)
}
```

**EditorState 扩展**

```typescript
export interface EditorState {
  // ... 其他字段 ...
  viewport: Viewport; // 视口状态（派生状态，不持久化）
}
```

**React Flow Viewport**

```typescript
// React Flow 使用的视口结构
interface RFViewport {
  x: number; // 屏幕坐标 X
  y: number; // 屏幕坐标 Y
  zoom: number; // 缩放比例
}
```

#### 坐标系转换

**节点坐标系 → 屏幕坐标系**

```typescript
export function nodeViewportToRfViewport(viewport: Viewport): RFViewport {
  const { x, y, zoom } = viewport;
  return {
    x: -x * zoom,
    y: -y * zoom,
    zoom,
  };
}
```

**屏幕坐标系 → 节点坐标系**

```typescript
export function rfViewportToNodeViewport(
  rfViewport: RFViewport,
  containerWidth: number,
  containerHeight: number
): Viewport {
  const { x: rfX, y: rfY, zoom } = rfViewport;
  return {
    x: -rfX / zoom,
    y: -rfY / zoom,
    width: containerWidth / zoom,
    height: containerHeight / zoom,
    zoom,
  };
}
```

#### SetViewportAction

**特性**

- 支持部分更新（只更新提供的字段）
- 自动限制缩放比例在 [0.1, 2.0] 范围内
- 不持久化到 IndexedDB（视图状态是派生状态）
- 可撤销（通过 reverse() 方法）

**实现**

```typescript
export class SetViewportAction implements EditorAction {
  readonly type = "setViewport";

  constructor(
    private newViewport: SetViewportParams,
    private oldViewport: SetViewportParams
  ) {}

  applyToEditorState(draft: EditorState): void {
    if (this.newViewport.x !== undefined) draft.viewport.x = this.newViewport.x;
    if (this.newViewport.y !== undefined) draft.viewport.y = this.newViewport.y;
    if (this.newViewport.width !== undefined)
      draft.viewport.width = this.newViewport.width;
    if (this.newViewport.height !== undefined)
      draft.viewport.height = this.newViewport.height;
    if (this.newViewport.zoom !== undefined) {
      draft.viewport.zoom = Math.max(0.1, Math.min(2.0, this.newViewport.zoom));
    }
  }

  async applyToIndexedDB(): Promise<void> {
    // 视口状态不持久化
  }

  reverse(): EditorAction {
    const reverseParams: SetViewportParams = {};
    if (this.newViewport.x !== undefined) reverseParams.x = this.oldViewport.x;
    // ... 其他字段类似
    return new SetViewportAction(reverseParams, this.newViewport);
  }
}
```

#### 双向同步机制

**核心原理**

使用 `lastSyncedViewportRef` 存储上次同步的值，通过 `isSimilarViewport()` 函数比较新旧值，只有差值超过阈值（0.0001）时才进行同步。

**Store → React Flow**

```typescript
useEffect(() => {
  if (!viewport) return;

  // 检查是否与上次同步的值相似
  if (
    lastSyncedViewportRef.current &&
    isSimilarViewport(
      { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
      lastSyncedViewportRef.current
    )
  ) {
    return; // 跳过同步
  }

  // 更新 lastSyncedViewportRef
  lastSyncedViewportRef.current = {
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  };

  // 转换坐标系并应用到 React Flow
  const rfViewport = nodeViewportToRfViewport(viewport);
  rfSetViewport(rfViewport, { duration: 200 });
}, [viewport, rfSetViewport, isSimilarViewport]);
```

**React Flow → Store（防抖）**

```typescript
const debouncedSync = useCallback(
  (rfVp: RFViewport) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const container = reactFlowWrapper.current;
      if (!container) return;

      const nodeVp = rfViewportToNodeViewport(
        rfVp,
        container.clientWidth,
        container.clientHeight
      );

      // 检查是否与上次同步的值相似
      if (
        lastSyncedViewportRef.current &&
        isSimilarViewport(
          { x: nodeVp.x, y: nodeVp.y, zoom: nodeVp.zoom },
          lastSyncedViewportRef.current
        )
      ) {
        return;
      }

      // 更新 lastSyncedViewportRef
      lastSyncedViewportRef.current = {
        x: nodeVp.x,
        y: nodeVp.y,
        zoom: nodeVp.zoom,
      };

      // 更新 Store
      setViewportCmd(
        nodeVp.x,
        nodeVp.y,
        nodeVp.width,
        nodeVp.height,
        nodeVp.zoom
      );
    }, 50);
  },
  [setViewportCmd, isSimilarViewport]
);
```

**值比较函数**

```typescript
const isSimilarViewport = useCallback(
  (
    vp1: { x: number; y: number; zoom: number },
    vp2: { x: number; y: number; zoom: number }
  ) => {
    const threshold = 0.0001;
    return (
      Math.abs(vp1.x - vp2.x) < threshold &&
      Math.abs(vp1.y - vp2.y) < threshold &&
      Math.abs(vp1.zoom - vp2.zoom) < threshold
    );
  },
  []
);
```

#### 节点可见性检测

**ensureNodeVisibleAction**

检查节点是否在视口内（带 15% 边距），如果不在则最小化移动距离将节点移入视口。

```typescript
export function ensureNodeVisibleAction(
  nodeId: string,
  state: EditorState
): SetViewportAction | null {
  const node = state.nodeTree.get(nodeId);
  if (!node) return null;

  const nodeLayout = state.nodeLayouts.get(nodeId);
  if (!nodeLayout) return null;

  const viewport = state.viewport;
  const padding = 0.15; // 15% 边距

  const paddingX = viewport.width * padding;
  const paddingY = viewport.height * padding;

  // 检查节点是否在视口内
  const nodeLeft = nodeLayout.x;
  const nodeRight = nodeLayout.x + nodeLayout.width;
  const nodeTop = nodeLayout.y;
  const nodeBottom = nodeLayout.y + nodeLayout.height;

  const viewLeft = viewport.x + paddingX;
  const viewRight = viewport.x + viewport.width - paddingX;
  const viewTop = viewport.y + paddingY;
  const viewBottom = viewport.y + viewport.height - paddingY;

  const isVisible =
    nodeLeft >= viewLeft &&
    nodeRight <= viewRight &&
    nodeTop >= viewTop &&
    nodeBottom <= viewBottom;

  if (isVisible) return null;

  // 计算需要移动的最小距离
  let newX = viewport.x;
  let newY = viewport.y;

  if (nodeLeft < viewLeft) {
    newX = nodeLeft - paddingX;
  } else if (nodeRight > viewRight) {
    newX = nodeRight + paddingX - viewport.width;
  }

  if (nodeTop < viewTop) {
    newY = nodeTop - paddingY;
  } else if (nodeBottom > viewBottom) {
    newY = nodeBottom + paddingY - viewport.height;
  }

  return new SetViewportAction(
    { x: newX, y: newY },
    { x: viewport.x, y: viewport.y }
  );
}
```

#### 视图控制命令

所有视图命令的共同特性：

- `actionBased: true`
- `undoable: false`（视图操作不可撤销）
- `category: "view"`

**缩放命令示例（zoomIn）**

```typescript
export const zoomIn: CommandDefinition = {
  id: "view.zoomIn",
  name: "放大视图",
  description: "放大视图（缩放比例增加 20%）",
  category: "view",
  actionBased: true,
  undoable: false,
  handler: (root: MindmapStore) => {
    const viewport = root.currentEditor!.viewport;
    const newZoom = Math.min(2.0, viewport.zoom * 1.2);

    // 保持视口中心点不变
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;
    const newWidth = viewport.width * (viewport.zoom / newZoom);
    const newHeight = viewport.height * (viewport.zoom / newZoom);
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;

    return [
      new SetViewportAction(
        { x: newX, y: newY, width: newWidth, height: newHeight, zoom: newZoom },
        viewport
      ),
    ];
  },
};
```

**平移命令示例（panLeft）**

```typescript
export const panLeft: CommandDefinition = {
  id: "view.panLeft",
  name: "向左平移",
  description: "向左平移视口",
  category: "view",
  actionBased: true,
  undoable: false,
  handler: (root: MindmapStore) => {
    const viewport = root.currentEditor!.viewport;
    const newX = viewport.x - 100; // 平移 100 节点坐标单位
    return [new SetViewportAction({ x: newX }, { x: viewport.x })];
  },
};
```

**fitView 命令（命令式）**

```typescript
export const fitView: CommandDefinition = {
  id: "view.fitView",
  name: "适应视图",
  description: "缩放视口以适应所有节点",
  category: "view",
  actionBased: false, // 命令式命令
  undoable: false,
  handler: (root: MindmapStore) => {
    const rfInstance = root.reactFlowInstance;
    if (rfInstance) {
      rfInstance.fitView({ padding: 0.1, duration: 200 });
    }
  },
};
```

## 实现要点

### 1. 防止同步循环

**问题**：Store 更新 → RF 动画 → RF 回调 → Store 更新 → ... 无限循环

**解决方案**：

- 使用 `lastSyncedViewportRef` 记录上次同步的值
- 使用 `isSimilarViewport()` 比较新旧值（阈值 0.0001）
- 只有差值超过阈值才进行同步

### 2. 坐标系一致性

**原则**：

- EditorState.viewport 使用节点坐标系（与节点 x/y 一致）
- React Flow 使用屏幕坐标系
- 所有转换都通过 `viewport-utils.ts` 中的工具函数

### 3. 部分更新支持

SetViewportAction 支持部分更新，避免不必要的字段修改：

```typescript
// 只更新 x，不影响其他字段
new SetViewportAction({ x: newX }, { x: oldX });
```

### 4. 首次加载的 fitView

思维导图首次加载时需要调用 fitView，但之后的操作不应自动 fitView：

```typescript
useEffect(() => {
  if (currentMindmapId.current !== mindmapId) {
    currentMindmapId.current = mindmapId;
    hasInitializedRef.current = false;
    lastSyncedViewportRef.current = null;
  }

  if (!hasInitializedRef.current && nodes.length > 0) {
    hasInitializedRef.current = true;
    setTimeout(() => {
      const rfInstance = getReactFlowInstance();
      if (rfInstance) {
        rfInstance.fitView({ padding: 0.1, duration: 200 });
        // 同步 fitView 后的视口状态到 lastSyncedViewportRef
      }
    }, 100);
  }
}, [mindmapId, nodes.length]);
```

### 5. 导航命令的节点聚焦

所有导航命令（如 `navigation.nextSibling`）都应确保目标节点可见：

```typescript
handler: (root: MindmapStore) => {
  const state = root.currentEditor!;
  // ... 导航逻辑 ...

  const actions: EditorAction[] = [new SetCurrentNodeAction(newNodeId)];

  // 确保新节点可见
  const viewportAction = ensureNodeVisibleAction(newNodeId, state);
  if (viewportAction) {
    actions.push(viewportAction);
  }

  return actions;
};
```

### 6. 动画时长的平衡

- Store → RF：200ms（用户感知流畅）
- RF → Store：防抖 50ms（减少频繁更新）

## 使用示例

### 在命令中使用视口

```typescript
import { SetViewportAction } from "@/domain/actions/set-viewport";

export const zoomIn: CommandDefinition = {
  id: "view.zoomIn",
  // ...
  handler: (root: MindmapStore) => {
    const viewport = root.currentEditor!.viewport;
    // ... 计算新视口状态 ...
    return [new SetViewportAction(newParams, oldParams)];
  },
};
```

### 确保节点可见

```typescript
import { ensureNodeVisibleAction } from "@/domain/utils/viewport-utils";

const actions: EditorAction[] = [
  /* ... */
];

// 添加节点聚焦
const viewportAction = ensureNodeVisibleAction(targetNodeId, state);
if (viewportAction) {
  actions.push(viewportAction);
}

return actions;
```

### 在 UI 中使用视图命令

```typescript
import { useCommand } from "@/domain/mindmap-store";

function CustomControls() {
  const zoomIn = useCommand("view.zoomIn");
  const fitView = useCommand("view.fitView");

  return (
    <Panel position="bottom-left">
      <button onClick={() => zoomIn()}>放大</button>
      <button onClick={() => fitView()}>适应</button>
    </Panel>
  );
}
```

## 设计决策

### 1. 为什么使用节点坐标系？

**决策**：EditorState.viewport 使用节点坐标系（pre-zoom）

**理由**：

- 与节点的 x/y 坐标保持一致，便于计算节点可见性
- 视口的 width/height 在缩放时有意义（表示可见的节点范围）
- 转换逻辑集中在边界（MindmapGraphViewer），核心逻辑更简单

**替代方案**：使用屏幕坐标系

- 需要频繁转换坐标
- 视口 width/height 与容器尺寸耦合
- 节点可见性计算更复杂

### 2. 为什么使用值比较而不是标志位？

**决策**：使用 `lastSyncedViewportRef` + `isSimilarViewport()` 防止同步循环

**理由**：

- 标志位（`isInternalUpdate`）有时序依赖，动画期间可能出现状态不一致
- 值比较更可靠，不依赖事件触发顺序
- 代码逻辑更清晰，易于理解和维护

**替代方案**：使用 `isInternalUpdate` 标志

- 在 Store → RF 时设置标志，RF → Store 时检查标志
- 问题：RF 动画期间会触发 `onViewportChange`，标志位被提前清除
- 导致下一次命令更新被跳过

### 3. 为什么 SetViewportAction 不持久化？

**决策**：`applyToIndexedDB()` 为空实现

**理由**：

- 视口状态是派生状态（derived state），不是核心数据
- 每次打开思维导图时都应该 fitView，而不是恢复上次的视口
- 减少 IndexedDB 的写入操作

### 4. 为什么 focusCurrentNode 只移动最小距离？

**决策**：`ensureNodeVisibleAction()` 只将节点移入视口，而不是居中

**理由**：

- 最小化视口移动，减少用户视觉干扰
- 节点已经在视口内时不移动
- 用户可以通过 `Cmd+L` 快速将节点移入可见区域，而不会打乱整个布局

**替代方案**：总是将节点居中

- 视口移动幅度大，可能让用户失去上下文
- 频繁导航时会产生大量无意义的视口跳转

### 5. 为什么视图命令不可撤销？

**决策**：`undoable: false`

**理由**：

- 视图操作（缩放、平移）不修改数据，只改变显示状态
- 撤销视图操作没有实际意义（用户可以直接反向操作）
- 避免撤销栈被大量视图操作填满

## 替代方案

### 方案 1：完全依赖 React Flow

**描述**：不在 Store 中维护 viewport 状态，完全依赖 React Flow 的状态管理。

**优点**：

- 实现简单，不需要双向同步
- 减少状态重复

**缺点**：

- 无法在命令中访问视口状态
- 无法实现节点可见性检测
- 无法支持视图命令

**结论**：不采用

### 方案 2：使用 Redux/Zustand 中间件

**描述**：使用状态管理中间件来自动同步 Store 和 React Flow。

**优点**：

- 更规范的状态管理
- 可复用的同步逻辑

**缺点**：

- 增加复杂度
- 对当前架构改动较大
- 仍需要解决同步循环问题

**结论**：不采用，当前方案已足够简单有效

### 方案 3：只在用户交互时更新 Store

**描述**：命令直接调用 React Flow API，不更新 Store，只在用户交互时同步到 Store。

**优点**：

- 减少 Store 更新频率
- 简化单向同步

**缺点**：

- Store 状态不完整，无法在命令中访问视口
- 无法实现节点可见性检测
- 状态不一致

**结论**：不采用

## FAQ

### Q: 为什么视口状态不持久化到 IndexedDB？

A: 视口状态是派生状态，每次打开思维导图时应该自动 fitView，而不是恢复上次的视口位置。这样用户总是能看到完整的思维导图，而不是上次关闭时的局部视图。

### Q: 如何添加新的视图命令？

A: 参考现有命令（如 `zoom-in.ts`），创建新的命令文件，返回 `SetViewportAction`，并在 `src/domain/commands/view/index.ts` 中注册。

### Q: 为什么缩放时视口中心点保持不变？

A: 这是用户的预期行为，类似于地图应用的缩放。如果中心点变化，用户会失去视觉参照点，体验不佳。

### Q: 可以修改防抖延迟和阈值吗？

A: 可以，但需要在 `mindmap-graph-viewer.tsx` 和 `viewport-utils.ts` 中同步修改。建议保持当前值（50ms 防抖，0.0001 阈值），这些值经过测试，在性能和响应性之间取得了良好平衡。

### Q: 如何处理容器尺寸变化？

A: 容器尺寸变化时，React Flow 会自动触发 `onViewportChange`，我们的防抖同步机制会自动更新 Store 中的 viewport.width 和 viewport.height。

### Q: 为什么 fitView 是命令式命令而不是 ActionBased？

A: fitView 需要 React Flow 自动计算最佳视口位置，无法在命令中预先计算。所以直接调用 React Flow API，然后通过 `onViewportChange` 回调同步状态到 Store。

## 参考资料

- [React Flow Documentation](https://reactflow.dev/)
- [React Flow Viewport API](https://reactflow.dev/api-reference/types/viewport)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Immer Documentation](https://immerjs.github.io/immer/)

## 修订历史

| 日期       | 版本 | 修改内容 | 作者        |
| ---------- | ---- | -------- | ----------- |
| 2025-11-23 | 1.0  | 初始版本 | Claude Code |
