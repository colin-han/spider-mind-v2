# 思维导图加载体验优化 设计文档

## 元信息

- 作者：Claude Code
- 创建日期：2025-12-06
- 最后更新：2025-12-06
- 相关文档：
  - [思维导图编辑器状态管理设计](./mindmap-editor-store-design.md)
  - [思维导图布局系统设计](./mindmap-layout-design.md)

## 关键概念

> 本节定义该设计文档引入的新概念，不包括外部库或其他文档已定义的概念。

| 概念        | 定义                             | 示例/说明                                                         |
| ----------- | -------------------------------- | ----------------------------------------------------------------- |
| layoutReady | 标识布局计算是否已完成的布尔标志 | 用于控制首次 fitView 执行时机，确保在布局计算完成后才触发自动居中 |

**原则**：

- layoutReady 是本设计引入的新状态字段，用于协调布局计算和视图定位的时序
- LoadingSpinner 是通用组件，不属于设计核心概念
- EditorState、MindmapLayoutService 等概念已在其他设计文档中定义

## 概述

优化思维导图加载体验，解决三个核心问题：加载动画不明显、切换时显示旧内容、首次加载后节点未正确居中。通过引入专业的 LoadingSpinner 组件、立即清除旧状态、以及 layoutReady 标志来协调布局计算和视图定位的时序。

## 背景和动机

在原有实现中，用户从 Dashboard 进入思维导图时存在以下体验问题：

1. **加载反馈不足**：只显示简单的"加载中..."文字，缺乏视觉动画，用户难以感知系统正在工作
2. **内容闪烁**：从思维导图 A 切换到 B 时，会短暂显示 A 的标题、节点等内容，给用户造成困惑
3. **初始定位错误**：首次加载后，根节点出现在画布左上角而非居中位置，需要手动调整视图

这些问题影响了用户体验，特别是在频繁切换思维导图时。

## 设计目标

- **提供明确的加载反馈**：使用专业的旋转动画替代纯文字，让用户清楚系统正在加载
- **避免内容闪烁**：确保在切换思维导图时不显示上一个思维导图的任何内容
- **正确的初始定位**：确保首次加载后节点自动居中显示，无需用户手动调整
- **保持性能**：优化实现避免不必要的重复计算和渲染

## 设计方案

### 架构概览

```
加载流程：
1. 用户点击思维导图卡片
2. 立即清除 currentEditor（显示 LoadingSpinner）
3. 加载数据到 EditorState（layoutReady=false）
4. LayoutService 计算布局
5. 设置 layoutReady=true
6. MindmapGraphViewer 检测到 layoutReady，执行 fitView
7. 节点居中显示

状态流转：
currentEditor=undefined → currentEditor={..., layoutReady=false} → layoutReady=true → fitView
       ↓                              ↓                                    ↓
 LoadingSpinner              显示思维导图（布局中）              节点居中
```

### 详细设计

#### 1. LoadingSpinner 组件

新建通用的加载动画组件，用于替代简单文字。

**文件位置**：`src/components/common/loading-spinner.tsx`

**接口定义**：

```typescript
export interface LoadingSpinnerProps {
  message?: string; // 显示的消息，默认"加载中..."
  size?: "small" | "medium" | "large"; // 尺寸
  fullScreen?: boolean; // 是否全屏显示，默认 true
}
```

**特性**：

- 使用 Lucide 的 Loader2 图标配合 Tailwind 的 animate-spin
- 支持亮色/暗色主题
- 可配置尺寸和消息

#### 2. 状态清除机制

在 `mindmap-store.ts` 的 `openMindmap` 函数中，立即清除旧状态。

**时机**：

- 函数开始时：`state.currentEditor = undefined`
- 错误处理时：同样设置为 undefined

**效果**：

- currentEditor 为 undefined 时，mindmap-editor-container 显示 LoadingSpinner
- 避免显示上一个思维导图的任何内容

#### 3. layoutReady 标志

在 EditorState 中新增 `layoutReady: boolean` 字段，用于标识布局是否已准备好。

**状态定义**：

```typescript
export interface EditorState {
  // ... 其他字段
  layoutReady: boolean; // 布局是否已准备好（用于初始视图定位）
}
```

**状态流转**：

1. openMindmap 创建 EditorState 时：`layoutReady = false`
2. LayoutService 完成测量和计算后：`layoutReady = true`
3. MindmapGraphViewer 检测到 layoutReady 为 true：执行 fitView

#### 4. fitView 执行时机控制

在 `mindmap-graph-viewer.tsx` 中，通过 useEffect 监听 layoutReady 变化。

**关键逻辑**：

```typescript
useEffect(() => {
  if (!editorState) return;

  // 1. 检测新思维导图（通过 ID 判断）
  const mindmapId = editorState.currentMindmap.id;
  const isNewMindmap = currentMindmapId.current !== mindmapId;

  if (isNewMindmap) {
    currentMindmapId.current = mindmapId;
    hasInitializedRef.current = false;
    lastSyncedViewportRef.current = null;
    return; // 早期返回，等待 layoutReady
  }

  // 2. 等待布局准备好
  if (!editorState.layoutReady) return;

  // 3. 执行 fitView（只执行一次）
  if (nodes.length > 0 && !hasInitializedRef.current) {
    hasInitializedRef.current = true;
    fitView({ padding: 0.2, duration: 300 });
    // ... 同步视口到 Store
  }
}, [editorState?.layoutReady, nodes.length, fitView, ...]);
```

**优化要点**：

- 使用早期返回（early return）避免在错误时机执行 fitView
- 依赖数组包含 `editorState?.layoutReady`，确保在 layoutReady 变化时触发
- 使用 ref 确保 fitView 只执行一次

## 实现要点

### 1. TypeScript 类型注意事项

由于项目启用了 `exactOptionalPropertyTypes: true`，可选字段必须显式声明 `undefined`：

```typescript
// ❌ 错误
readonly currentEditor?: EditorState;

// ✅ 正确
readonly currentEditor?: EditorState | undefined;
```

赋值时也必须使用 `undefined` 而非 `null`：

```typescript
// ❌ 错误
state.currentEditor = null;

// ✅ 正确
state.currentEditor = undefined;
```

### 2. React useEffect 依赖

fitView effect 的依赖数组必须包含：

- `editorState?.layoutReady` - 触发 layoutReady 变化时执行
- `editorState` - 确保获取最新状态
- `nodes.length` - 确保有节点时才执行
- `fitView`、`getViewport`、`setViewportCmd` - 引用的函数

### 3. 错误处理

LayoutService 在测量失败时也应设置 layoutReady，避免永久阻塞：

```typescript
try {
  // 测量和计算布局
  this.updateLayout();
  useMindmapStore.setState((state) => {
    if (state.currentEditor) {
      state.currentEditor.layoutReady = true;
    }
  });
} catch (error) {
  // 即使失败也标记为准备好
  useMindmapStore.setState((state) => {
    if (state.currentEditor) {
      state.currentEditor.layoutReady = true;
    }
  });
}
```

### 4. 日志保留

保留关键日志用于调试：

- `[LayoutService] Layout ready` - 标记布局完成
- `[MindmapGraphViewer] Calling fitView for mindmap ${mindmapId}...` - 追踪 fitView 执行
- `[MindmapGraphViewer] fitView called` - 确认 fitView 被调用

## 使用示例

### 在编辑器容器中使用 LoadingSpinner

```typescript
// src/components/mindmap/mindmap-editor-container.tsx
import { LoadingSpinner } from "@/components/common/loading-spinner";

export function MindmapEditor({ mindmapId }: MindmapEditorProps) {
  const editorState = useMindmapEditorState();

  // 加载中状态
  if (!editorState) {
    return <LoadingSpinner message="加载思维导图..." />;
  }

  return <MindmapEditorLayout />;
}
```

### 在其他场景使用 LoadingSpinner

```typescript
// 小尺寸，非全屏
<LoadingSpinner size="small" fullScreen={false} />

// 自定义消息
<LoadingSpinner message="正在保存..." />
```

### 访问 layoutReady 状态

```typescript
const editorState = useMindmapEditorState();
if (editorState?.layoutReady) {
  // 布局已准备好，可以执行视图操作
}
```

## 设计决策

### 决策 1：使用 layoutReady 标志而非延迟

**背景**：初始实现使用 setTimeout 延迟执行 fitView，但无法准确判断布局何时完成。

**决策**：引入 layoutReady 标志，由 LayoutService 主动通知布局完成。

**理由**：

- 更准确：布局完成时机由布局服务决定，而非固定延迟
- 更可靠：避免延迟过短（布局未完成）或过长（用户等待时间长）的问题
- 更清晰：状态驱动的模式符合 React 最佳实践

### 决策 2：早期返回（Early Return）而非复杂条件

**背景**：需要在 useEffect 中处理多个条件：新思维导图、layoutReady、是否初始化。

**决策**：使用早期返回模式，逐步检查条件。

**理由**：

- 代码更清晰：每个条件独立检查，易于理解
- 避免重复执行：新思维导图检测后立即返回，等待下次执行
- 更容易调试：每个检查点都可以独立验证

### 决策 3：立即清除旧状态而非渐进加载

**背景**：可以选择在新数据加载完成前保留旧内容，或立即清除。

**决策**：立即清除旧状态，显示 LoadingSpinner。

**理由**：

- 避免混淆：显示 A 的内容但标题是 B 会让用户困惑
- 明确反馈：LoadingSpinner 清楚告知用户正在加载
- 简化逻辑：不需要处理新旧内容的过渡状态

## 替代方案

### 方案 1：使用 requestAnimationFrame 延迟

**描述**：使用 `requestAnimationFrame` 等待下一帧再执行 fitView。

**优点**：

- 不需要新增状态字段
- 代码改动较小

**缺点**：

- 时机不准确：下一帧时布局可能还未完成
- 仍然是基于时间的猜测，不如事件驱动可靠

**未采用原因**：无法保证布局已完成，可能仍然出现错位。

### 方案 2：监听 DOM 变化

**描述**：使用 MutationObserver 监听节点 DOM 的变化，判断布局完成。

**优点**：

- 基于实际 DOM 状态
- 不需要修改 LayoutService

**缺点**：

- 实现复杂：需要判断哪些 DOM 变化表示布局完成
- 性能开销：MutationObserver 会监听大量 DOM 变化
- 耦合度高：依赖 DOM 结构，不够健壮

**未采用原因**：复杂度高，性能和可维护性不如状态标志。

## FAQ

### Q1: layoutReady 何时重置为 false？

A: 在 `openMindmap` 创建新的 EditorState 时，layoutReady 初始化为 false。每次打开新思维导图时都会重置。

### Q2: 如果 LayoutService 测量失败怎么办？

A: LayoutService 在 catch 块中也会设置 layoutReady = true，避免永久阻塞 UI。虽然布局可能不准确，但至少不会让用户一直看到加载状态。

### Q3: LoadingSpinner 是否支持取消操作？

A: 当前版本不支持。如果需要取消加载，应该在调用 openMindmap 的外层处理（例如添加取消按钮，调用 router.back()）。

### Q4: 为什么 fitView 的依赖数组包含 editorState？

A: 虽然只需要 layoutReady，但包含 editorState 确保在状态更新时获取最新的引用。这是 React Hooks 的最佳实践。

## 参考资料

- [React Hooks 依赖数组最佳实践](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies)
- [Zustand 中间件使用指南](https://github.com/pmndrs/zustand#middleware)
- [Tailwind CSS 动画](https://tailwindcss.com/docs/animation)

## 修订历史

| 日期       | 版本 | 修改内容 | 作者        |
| ---------- | ---- | -------- | ----------- |
| 2025-12-06 | 1.0  | 初始版本 | Claude Code |
