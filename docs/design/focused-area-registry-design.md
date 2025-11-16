# FocusedAreaRegistry 设计文档

## 文档信息

- **创建日期**: 2025-11-16
- **版本**: 1.0.0
- **状态**: 已实现
- **相关文档**:
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [命令参考手册](./command-reference.md)

## 概述

FocusedAreaRegistry 是一个无状态的单例模块，负责管理编辑器内不同焦点区域的生命周期回调。它提供了一种统一的方式来处理焦点区域切换时的 UI 行为，如自动聚焦、保存数据等。

### 设计目标

1. **强类型**: 使用 TypeScript 联合类型确保类型安全，新增区域需要更新类型定义
2. **统一的生命周期**: 提供 `onEnter(from)` 和 `onLeave(to)` 回调
3. **UI 层友好**: 提供 React Hook 方便 UI 组件注册
4. **细粒度控制**: 每个独立的编辑区域都有自己的 focusedArea
5. **无状态**: Registry 本身不存储当前焦点状态（状态存储在 EditorState 中）

## 核心架构

### 模块关系

```
┌─────────────┐     使用      ┌──────────────────┐
│  UI 组件    │ ────────────> │ useFocusedArea   │
└─────────────┘               │    (Hook)        │
                              └──────────────────┘
                                      │
                                      │ 注册
                                      ▼
                              ┌──────────────────┐
                              │ FocusedArea      │
                              │    Registry      │
                              └──────────────────┘
                                      ▲
                                      │ 调用生命周期
                                      │
                              ┌──────────────────┐
                              │ SetFocusedArea   │
                              │    Action        │
                              └──────────────────┘
                                      ▲
                                      │ 创建 Action
                                      │
                              ┌──────────────────┐
                              │ setFocusedArea   │
                              │    Command       │
                              └──────────────────┘
```

## 类型定义

### FocusedAreaId

```typescript
// src/domain/focused-area.types.ts

export type FocusedAreaId =
  | "graph" // 图形视图
  | "outline" // 大纲视图
  | "title-editor" // 标题编辑器
  | "note-editor" // 笔记编辑器
  | "ai-chat"; // AI 聊天面板
```

**扩展规则**: 新增焦点区域时，在此联合类型中添加新值。TypeScript 编译器会自动检测使用该类型的代码是否需要更新。

### FocusedAreaHandler

```typescript
export interface FocusedAreaHandler {
  id: FocusedAreaId;
  onEnter?: (from: FocusedAreaId) => void | Promise<void>;
  onLeave?: (to: FocusedAreaId) => void | Promise<void>;
}
```

**参数说明**:

- `onEnter(from)`: 进入区域时调用，`from` 是来源区域
- `onLeave(to)`: 离开区域时调用，`to` 是目标区域

## Registry 单例模块

FocusedAreaRegistry 作为无状态单例模块存在，类似 CommandRegistry：

```typescript
// src/domain/focused-area-registry.ts

const handlers = new Map<FocusedAreaId, FocusedAreaHandler>();

// 注册 handler
export function registerFocusedAreaHandler(
  handler: FocusedAreaHandler
): () => void;

// 在状态更新前调用（由 Action 调用）
export function beforeSetFocusedArea(
  oldArea: FocusedAreaId,
  newArea: FocusedAreaId
): void;

// 在状态更新后调用（由 Action 调用）
export function afterSetFocusedArea(
  oldArea: FocusedAreaId,
  newArea: FocusedAreaId
): void;

// 清空所有 handlers（用于测试）
export function clearFocusedAreaHandlers(): void;
```

**关键特性**:

- 每个 handler 只能注册一次（后注册的会覆盖前者）
- `beforeSetFocusedArea` 同步调用 onLeave
- `afterSetFocusedArea` 同步调用 onEnter
- onEnter/onLeave 返回的 Promise 不会阻塞（fire and forget）
- 错误会被捕获并记录到控制台，不会中断焦点切换

## Action 集成

SetFocusedAreaAction 负责调用 Registry 的生命周期方法：

```typescript
// src/domain/actions/set-focused-area.ts

export class SetFocusedAreaAction implements EditorAction {
  applyToEditorState(draft: EditorState): void {
    const { oldArea, newArea } = this.params;

    // 1. 调用 onLeave（状态更新前）
    beforeSetFocusedArea(oldArea, newArea);

    // 2. 更新状态
    draft.focusedArea = newArea;

    // 3. 调用 onEnter（状态更新后）
    queueMicrotask(() => {
      afterSetFocusedArea(oldArea, newArea);
    });
  }
}
```

**时序保证**:

- onLeave 在状态更新前同步执行
- 状态更新在 Immer 内部完成
- onEnter 使用 `queueMicrotask` 延迟执行，确保 Immer 已完成状态更新

## React Hook API

`useFocusedArea` Hook 为 UI 组件提供了便捷的注册方式：

```typescript
// src/lib/hooks/use-focused-area.ts

export function useFocusedArea(handler: FocusedAreaHandler) {
  const handlerRef = useRef(handler);

  // 使用 ref 确保始终使用最新的回调
  useEffect(() => {
    handlerRef.current = handler;
  });

  // 只在 mount/unmount 时注册/取消注册
  useEffect(() => {
    const wrappedHandler = {
      id: handler.id,
      onEnter: (from) => handlerRef.current.onEnter?.(from),
      onLeave: (to) => handlerRef.current.onLeave?.(to),
    };

    const unregister = registerFocusedAreaHandler(wrappedHandler);

    // 如果组件挂载时焦点已在该区域，立即调用 onEnter
    if (editorState?.focusedArea === handler.id) {
      wrappedHandler.onEnter(handler.id);
    }

    return unregister;
  }, [handler.id]); // 不依赖其他变量，避免频繁重新注册
}
```

**设计考虑**:

- 使用 `useRef` 避免因回调闭包变化导致频繁重新注册
- 组件卸载时自动取消注册
- 首次挂载检查：如果焦点已在该区域，立即触发 onEnter

## 已实现的 Handler

| FocusedAreaId  | 组件                   | onEnter 行为               | onLeave 行为         |
| -------------- | ---------------------- | -------------------------- | -------------------- |
| `graph`        | MindmapGraphViewer     | 聚焦容器元素               | -                    |
| `outline`      | MindmapOutlineArborist | 聚焦树组件或容器           | -                    |
| `title-editor` | NodePanel              | 聚焦并选中标题输入框       | 保存标题（如有变化） |
| `note-editor`  | NodePanel              | 切换到笔记 tab，聚焦编辑器 | -                    |
| `ai-chat`      | NodePanel              | 切换到 AI tab，聚焦输入框  | -                    |

## 快捷键集成

焦点区域快捷键定义在 `src/domain/shortcuts/focused-area-shortcuts.ts`：

```typescript
// 功能键快捷键
registerShortcut("f1", "global.setFocusedArea", ["outline"], true);
registerShortcut("f2", "global.setFocusedArea", ["title-editor"], true);
registerShortcut("f3", "global.setFocusedArea", ["note-editor"], true);
registerShortcut("f4", "global.setFocusedArea", ["ai-chat"], true);

// Cmd 组合键
registerShortcut(`${mod}+i`, "global.setFocusedArea", ["ai-chat"], true);
registerShortcut(`${mod}+enter`, "global.setFocusedArea", ["graph"], true);

// 上下文快捷键
registerShortcutForArea(
  "title-editor",
  "enter",
  "global.setFocusedArea",
  ["graph"],
  true
);
```

## 使用示例

### 基本用法

```typescript
import { useFocusedArea } from "@/lib/hooks/use-focused-area";

function MyComponent() {
  const inputRef = useRef<HTMLInputElement>(null);

  useFocusedArea({
    id: "title-editor",
    onEnter: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    onLeave: async () => {
      await saveData();
    },
  });

  return <input ref={inputRef} />;
}
```

### 条件聚焦

```typescript
useFocusedArea({
  id: "note-editor",
  onEnter: () => {
    // 切换 tab 后再聚焦
    setActiveTab("note");
    setTimeout(() => {
      editorRef.current?.focus();
    }, 0);
  },
});
```

### 使用来源/目标信息

```typescript
useFocusedArea({
  id: "graph",
  onEnter: (from) => {
    if (from === "title-editor") {
      // 从标题编辑器返回，可能需要刷新视图
      refreshView();
    }
    containerRef.current?.focus();
  },
  onLeave: (to) => {
    if (to === "outline") {
      // 切换到大纲视图，保存当前视图状态
      saveViewState();
    }
  },
});
```

## 快捷键禁用策略

在编辑区域内，部分快捷键需要被禁用：

```typescript
// src/domain/shortcut-register.ts

const EDITING_AREAS: FocusedAreaId[] = [
  "title-editor",
  "note-editor",
  "ai-chat",
];

export function registerNonEditShortcut(key: string, commandId: string) {
  registerShortcut({
    key,
    when: (root) => {
      const currentArea = root.currentEditor!.focusedArea as FocusedAreaId;
      if (EDITING_AREAS.includes(currentArea)) {
        return false; // 在编辑区域内禁用
      }
      // 同时检查 DOM 焦点
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA"
      ) {
        return false;
      }
      return true;
    },
    run: () => ({ commandId, params: [] }),
  });
}
```

## 设计原则

### DO（推荐做法）

1. ✅ **无副作用的 handler**: onEnter/onLeave 应该只处理 UI 聚焦和数据保存
2. ✅ **快速返回**: 避免在 onEnter/onLeave 中执行耗时操作
3. ✅ **错误处理**: handler 内部应该处理可能的错误
4. ✅ **使用 ref**: 在 React 组件中使用 ref 而不是状态来聚焦元素
5. ✅ **延迟聚焦**: 如果需要等待渲染，使用 setTimeout 或 requestAnimationFrame

### DON'T（避免做法）

1. ❌ **不要在 onEnter/onLeave 中修改 focusedArea 状态**（会导致循环）
2. ❌ **不要依赖返回的 Promise 完成**（fire and forget）
3. ❌ **不要在 onLeave 中阻塞太久**（可能影响用户体验）
4. ❌ **不要重复注册相同的 handler**（会被覆盖）
5. ❌ **不要忘记处理组件卸载**（使用 useFocusedArea hook 会自动处理）

## 扩展指南

### 添加新的焦点区域

1. **更新类型定义** (`src/domain/focused-area.types.ts`):

   ```typescript
   export type FocusedAreaId =
     | "graph"
     | "outline"
     | "title-editor"
     | "note-editor"
     | "ai-chat"
     | "search"; // 新增
   ```

2. **在组件中注册 handler**:

   ```typescript
   useFocusedArea({
     id: "search",
     onEnter: () => searchInputRef.current?.focus(),
   });
   ```

3. **可选：添加快捷键**:

   ```typescript
   registerShortcut("f5", "global.setFocusedArea", ["search"], true);
   ```

4. **更新快捷键禁用列表**（如果是编辑区域）:
   ```typescript
   const EDITING_AREAS: FocusedAreaId[] = [
     "title-editor",
     "note-editor",
     "ai-chat",
     "search", // 新增
   ];
   ```

## 与 CommandRegistry 的对比

| 特性     | CommandRegistry    | FocusedAreaRegistry  |
| -------- | ------------------ | -------------------- |
| 职责     | 管理命令定义和执行 | 管理焦点区域生命周期 |
| 状态     | 无状态             | 无状态               |
| 注册时机 | 应用启动时         | 组件挂载时           |
| 调用方   | CommandManager     | SetFocusedAreaAction |
| 返回值   | Action 数组        | void/Promise<void>   |

## 文件位置

- **类型定义**: `src/domain/focused-area.types.ts`
- **Registry 模块**: `src/domain/focused-area-registry.ts`
- **React Hook**: `src/lib/hooks/use-focused-area.ts`
- **Action**: `src/domain/actions/set-focused-area.ts`
- **Command**: `src/domain/commands/global/set-focused-area.ts`
- **快捷键**: `src/domain/shortcuts/focused-area-shortcuts.ts`

## 相关文档

- [Command 层架构设计](./command-layer-design.md) - 了解 Command 和 Action 的关系
- [命令参考手册](./command-reference.md) - 查看所有快捷键定义
- [MindmapStore 架构设计](./mindmap-store-design.md) - 了解 EditorState 结构

---

**文档维护**: 当添加新的焦点区域或修改生命周期行为时，请更新本文档。
