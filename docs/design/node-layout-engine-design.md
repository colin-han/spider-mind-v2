# 思维导图布局系统设计文档

## 元信息

- 作者：Colin Han
- 创建日期：2025-01-22
- 最后更新：2025-11-23
- 相关文档：
  - [Action Layer 设计文档](./action-layer-design.md)
  - [MindmapStore 设计文档](./mindmap-editor-store-design.md)

## 关键概念

| 概念          | 定义                                                                                | 示例/说明                     |
| ------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| LayoutEngine  | 无状态的布局计算引擎，纯函数式设计，输入节点数据输出布局结果                        | DagreLayoutEngine             |
| LayoutService | 有状态的布局服务，管理尺寸缓存、双层订阅 Action 变化、驱动 Engine 计算              | MindmapLayoutServiceImpl      |
| 双层订阅      | Sync 订阅（预测尺寸）+ Async 订阅（测量真实尺寸），优化 UI 响应性同时保证最终精确性 | 4 步订阅流程                  |
| 布局预测      | Sync 阶段基于字体度量快速预测节点尺寸，立即渲染预测布局                             | 用户无感知延迟                |
| 布局精确化    | Async 阶段 DOM 测量真实尺寸，平滑过渡到精确布局                                     | 误差通常 < 5px                |
| NodeLayout    | 节点布局数据，包含位置和尺寸信息                                                    | `{ id, x, y, width, height }` |
| SizeGetter    | 异步节点尺寸测量函数，由 UI 层提供                                                  | `(node) => Promise<NodeSize>` |
| 同级节点对齐  | 后处理阶段，让同父节点的兄弟节点左边缘对齐                                          | 提升视觉整齐度                |

## 概述

思维导图布局系统负责计算所有可见节点的位置和尺寸，采用 **Engine + Service 分离架构**，实现关注点分离和算法可替换性。

## 背景和动机

思维导图编辑器需要一个高效、可扩展的布局系统来：

1. 自动计算节点的位置，保证层级清晰
2. 响应节点增删改和折叠/展开操作，实时更新布局
3. 支持不同的布局算法（如 Dagre、D3-hierarchy 等）
4. 与 Zustand Store 集成，实现响应式更新

## 设计目标

- **关注点分离**：Engine 负责纯计算，Service 负责状态管理和生命周期
- **可替换性**：布局算法可以随时替换，不影响其他模块
- **响应式**：通过双层 Action 订阅机制自动响应数据变化
- **性能优化**：尺寸缓存避免重复测量，双层订阅优化 UI 响应性
- **用户体验**：预测布局 + 精确布局，快速响应同时保证准确性

## 设计方案

### 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                  │
│  (MindmapGraphViewer, MindmapNode 组件)                         │
│                          │                                       │
│                          │ sizeGetter                            │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              MindmapLayoutService                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │ │
│  │  │ sizeCache   │  │ subscriptions│  │ engine: Engine   │  │ │
│  │  └─────────────┘  └──────┬──────┘  └─────────┬─────────┘  │ │
│  │                          │                    │             │ │
│  │                          │ Action 通知        │ layout()   │ │
│  └──────────────────────────┼────────────────────┼─────────────┘ │
│                             │                    │               │
│  ┌──────────────────────────┼────────────────────┼─────────────┐ │
│  │     ActionSubscriptionManager                 │             │ │
│  │  addChildNode / updateNode / deleteNode /     │             │ │
│  │  toggleCollapseNode ─────┤                    │             │ │
│  └──────────────────────────┘                    │               │
│                                                  ▼               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              MindmapLayoutEngine (Dagre)                    │ │
│  │  layout() 流程：                                            │ │
│  │  1. 过滤可见节点 → 2. 创建图 → 3. 添加节点 →               │ │
│  │  4. 添加边(排序) → 5. Dagre计算 → 6. 提取结果 → 7. 对齐   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                             │                                   │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  MindmapStore: currentEditor.layouts: Map<string, NodeLayout>│ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 详细设计

#### 数据模型

| 类型              | 字段                              | 说明                                                    |
| ----------------- | --------------------------------- | ------------------------------------------------------- |
| **NodeLayout**    | `id`, `x`, `y`, `width`, `height` | 节点布局数据，x/y 为左上角坐标                          |
| **NodeSize**      | `width`, `height`                 | 节点尺寸                                                |
| **HitTestResult** | `nodeId`, `area`                  | 命中测试结果，area 为 `"above"` / `"below"` / `"child"` |

#### 接口定义

**MindmapLayoutEngine** - 布局引擎接口（无状态）

| 方法                       | 参数                             | 返回值                    | 说明                     |
| -------------------------- | -------------------------------- | ------------------------- | ------------------------ |
| `layout()`                 | nodes, sizeCache, collapsedNodes | `Map<string, NodeLayout>` | 计算布局，只返回可见节点 |
| `getDropIndicatorLayout()` | x, y, layoutCache                | `NodeLayout \| null`      | 获取拖放指示器位置       |

**MindmapLayoutService** - 布局服务接口（有状态）

| 方法                | 说明                                       |
| ------------------- | ------------------------------------------ |
| `init()`            | 初始化服务，设置 Action 订阅，测量所有节点 |
| `measureNode(node)` | 测量单个节点尺寸并缓存                     |
| `updateLayout()`    | 重新计算布局并更新到 Store                 |

**SizeGetter** - 类型定义：`(node: MindmapNode) => Promise<NodeSize>`

#### 核心逻辑

##### DagreLayoutEngine 布局流程（7 步）

1. **过滤可见节点**：排除折叠节点的所有后代
2. **创建 Dagre 图**：配置 `rankdir: "LR"`（从左到右）、间距参数
3. **添加节点**：从 sizeCache 获取尺寸，默认 100x40
4. **添加边**：按 `order_index` 排序后添加，保证兄弟节点顺序
5. **运行 Dagre**：调用 `dagre.layout(g)` 计算
6. **提取结果**：将 Dagre 中心点坐标转换为左上角坐标
7. **同级对齐**：调整兄弟节点使其左边缘对齐

##### 同级节点左对齐算法

- 按父节点将节点分组
- 对每组找到最宽节点的宽度
- 调整每个节点的 x 坐标：`x = x - (maxWidth - nodeWidth) / 2`

##### MindmapLayoutService 状态管理

**构造**：接收 `engine` 和 `sizeGetter`

**初始化**：

- 设置 Action 订阅
- 异步测量所有节点并计算初始布局

**私有状态**：

- `sizeCache: Map<string, NodeSize>` - 节点尺寸缓存
- `unsubscribeFunctions: Array<() => void>` - 订阅清理函数

##### Action 订阅机制

LayoutService 使用 ActionSubscription 的双层订阅机制（Sync → Post-Sync → Async → Post-Async）优化 UI 响应性：

- **Sync 阶段**: 快速预测节点尺寸并更新缓存
- **Post-Sync 阶段**: 使用预测尺寸驱动布局引擎，立即渲染预测布局
- **Async 阶段**: DOM 测量真实尺寸并更新缓存
- **Post-Async 阶段**: 使用真实尺寸更新精确布局，平滑过渡

**订阅的 Action 类型**: `addChildNode`、`updateNode`、`removeNode`、`collapseNode`、`expandNode`

**订阅机制详细说明**: 参见 [Action 层架构设计 - Action 订阅机制](./action-layer-design.md#action-订阅机制双层--后处理架构)

## 实现要点

### 1. order_index 排序的重要性

Dagre 按照边添加的顺序决定兄弟节点的垂直排列位置。必须在添加边之前按 `order_index` 排序，确保用户定义的顺序被正确保持。

### 2. 坐标转换

Dagre 返回节点中心点坐标，需转换为左上角：

- `x = dagreNode.x - dagreNode.width / 2`
- `y = dagreNode.y - dagreNode.height / 2`

### 3. 可见性过滤

递归检查祖先链，若任一祖先在 `collapsedNodes` 中则节点不可见。根节点始终可见。

### 4. 尺寸缓存策略

| 场景     | 策略               |
| -------- | ------------------ |
| 初始化   | 测量所有节点       |
| 新增节点 | 测量该节点         |
| 更新节点 | 清除缓存，重新测量 |
| 删除节点 | 缓存自动失效       |

### 5. 从 Store 获取状态

由于 Zustand + Immer 的不可变更新，必须通过 `useMindmapStore.getState()` 获取最新的 `nodes` 和 `collapsedNodes`。

## 设计决策

### 1. 为什么采用 Engine + Service 分离？

- **Engine 无状态**：便于测试，算法可替换
- **Service 有状态**：统一管理缓存和订阅
- **关注点分离**：Engine 只负责计算，Service 负责生命周期

### 2. 为什么使用双层 Action 订阅？

**传统做法的问题**：

- Store 订阅：无法区分变化类型，无法获取具体节点数据
- 单层 Action 订阅：等待 DOM 测量完成才能更新布局，用户感知延迟（50-100ms）

**双层订阅的优势**：

- **Sync 阶段**：Action 携带语义信息，可以快速预测尺寸并立即渲染
- **Async 阶段**：DOM 测量修正预测误差，保证最终精确性
- **后处理器**：批量去重，避免重复驱动布局引擎
- **用户体验**：渐进式加载，快速响应 + 平滑过渡

**实测数据**：

- 预测误差：通常 < 5px（字体度量校准后）
- Sync 延迟：~10ms（用户无感知）
- Async 延迟：~50ms（后台修正）
- 总体感知：从 100ms 延迟降低到 10ms

### 3. 为什么在 Engine 内部做同级对齐？

- 对齐是布局的一部分，保持 Engine 的职责完整
- 避免在 Service 或 UI 层重复实现
- 对齐逻辑与布局算法紧密相关

## 文件清单

| 文件路径                                                      | 说明                |
| ------------------------------------------------------------- | ------------------- |
| `src/lib/utils/mindmap/mindmap-layout.ts`                     | 接口定义            |
| `src/lib/utils/mindmap/layout-service.ts`                     | Service 实现        |
| `src/lib/utils/mindmap/layout-engines/dagre-layout-engine.ts` | Dagre Engine 实现   |
| `src/domain/mindmap-store.types.ts`                           | NodeLayout 类型定义 |

## 修订历史

| 日期       | 版本 | 修改内容                                     | 作者      |
| ---------- | ---- | -------------------------------------------- | --------- |
| 2025-01-22 | 1.0  | 初始版本                                     | Colin Han |
| 2025-01-23 | 1.1  | 添加同级节点左对齐功能                       | Colin Han |
| 2025-01-23 | 1.2  | 精简代码示例，改用表格和流程描述             | Colin Han |
| 2025-11-23 | 1.3  | 更新为双层订阅机制，添加布局预测与精确化设计 | Colin Han |
