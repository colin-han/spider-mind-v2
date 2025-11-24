# Command 层架构设计

## 文档信息

- **创建日期**: 2025-11-06
- **版本**: 1.0.0
- **相关文档**:
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Action 层架构设计](./action-layer-design.md)
  - [Command 参考手册](./command-reference.md)
  - [FocusedAreaRegistry 设计](./focused-area-registry-design.md)

## 概述

Command 层是领域层中负责**业务逻辑**的核心层，它将用户意图（通过快捷键或 UI 交互）转换为具体的 Action 序列。Command 层实现了**命令模式（Command Pattern）**，将操作请求封装为对象。

### 设计目标

1. **业务逻辑封装**: 将复杂的业务规则封装在 Command 中
2. **可扩展性**: 通过注册机制轻松添加新命令
3. **条件执行**: 支持动态判断命令是否可执行
4. **撤销支持**: 区分可撤销和不可撤销的命令
5. **统一接口**: 所有命令遵循相同的定义规范

## 核心概念

### CommandDefinition

命令定义使用判别联合类型（Discriminated Union），通过 `actionBased` 字段区分两种命令类型：

#### ActionBasedCommandDefinition

返回 EditorAction[] 的命令，支持 undo/redo：

```typescript
export interface ActionBasedCommandDefinition {
  id: string; // 唯一标识符
  name: string; // 命令名称
  description: string; // 命令描述
  category: CommandCategory; // 命令分类
  actionBased: true; // 类型标记
  undoable?: boolean; // 是否可撤销，默认为 true
  handler: (
    root: MindmapStore,
    params?: unknown[]
  ) => EditorAction[] | Promise<EditorAction[]> | void | Promise<void>;
  when?: (root: MindmapStore, params?: unknown[]) => boolean;
  getDescription?: (root: MindmapStore, params?: unknown[]) => string;
}
```

**特点**：

- 返回 EditorAction 数组
- 默认可撤销（undoable 默认为 true）
- 适用于修改数据的命令（如节点操作）

#### ImperativeCommandDefinition

直接执行、不返回 actions 的命令：

```typescript
export interface ImperativeCommandDefinition {
  id: string; // 唯一标识符
  name: string; // 命令名称
  description: string; // 命令描述
  category: CommandCategory; // 命令分类
  actionBased: false; // 类型标记
  undoable?: boolean; // 是否可撤销
  handler: (root: MindmapStore, params?: unknown[]) => void | Promise<void>;
  when?: (root: MindmapStore, params?: unknown[]) => boolean;
  getDescription?: (root: MindmapStore, params?: unknown[]) => string;
}
```

**特点**：

- 直接执行，不返回值
- 适用于 UI 操作或系统级操作（如 undo/redo、save）

#### 联合类型

```typescript
export type CommandDefinition =
  | ActionBasedCommandDefinition
  | ImperativeCommandDefinition;
```

### 关键特性

- **id**: 使用分层命名空间（如 `node.addChild`, `navigation.selectParent`）
- **name**: 命令的显示名称
- **description**: 命令的详细描述
- **category**: 命令分类（node、navigation、global、ai）
- **actionBased**: 类型标记，用于编译时和运行时类型区分
- **undoable**: 控制是否记录到历史栈
- **when**: 可选的前置条件检查
- **handler**: 执行逻辑，根据 actionBased 返回不同类型
- **getDescription**: 可选的动态描述生成函数

## Command 分类

### 命令分布统计

| 分类                | 命令数 | actionBased | 特点         | 是否可撤销 |
| ------------------- | ------ | ----------- | ------------ | ---------- |
| Node Commands       | 8      | ✅ true     | 修改节点数据 | ✅ 是      |
| Navigation Commands | 8      | ✅ true     | 改变 UI 状态 | ❌ 否      |
| Global Commands     | 4      | ❌ false    | 系统级操作   | 部分       |
| AI Commands         | 1      | ❌ false    | AI 辅助功能  | ⏳ 待实现  |

**总计**: 21 个命令（20 个已实现 + 1 个待实现）

**说明**：

- **actionBased: true** - 返回 EditorAction[]，适用于数据修改和 UI 状态变化
- **actionBased: false** - 直接执行，适用于系统级操作（undo/redo/save）

### 1. Node Commands（节点操作）

这类命令修改思维导图的节点数据，所有操作都支持 undo/redo。

#### node.addChild

**功能**: 为当前节点添加子节点

**快捷键**: `Tab`

**执行条件**: 当前有选中节点

**业务逻辑**:

1. 获取当前节点
2. 计算新节点的 `order_index`（子节点数量）
3. 生成新节点对象（包含 short_id, title, parent_id 等）
4. 返回 `AddNodeAction` 和 `SetCurrentNodeAction`

**示例流程**:

```
用户按 Tab
  → 检查 currentNode 存在
  → 创建新节点（parent = currentNode, order_index = childCount）
  → 返回 [AddNodeAction, SetCurrentNodeAction]
  → acceptActions() 执行
  → 新节点添加到状态和数据库
  → 自动选中新节点
```

**文件位置**: `src/domain/commands/node/add-child.ts`

---

#### node.addSiblingBelow

**功能**: 在当前节点下方添加兄弟节点

**快捷键**: `Enter`

**执行条件**:

- 当前有选中节点
- 当前节点不是根节点

**业务逻辑**:

1. 获取当前节点和父节点
2. 计算新节点的 `order_index`（当前节点 order_index + 1）
3. 更新后续兄弟节点的 `order_index`（全部 +1）
4. 返回 UpdateNodeAction 数组和 AddNodeAction

**示例流程**:

```
用户按 Enter
  → 检查 currentNode 不是根节点
  → 获取所有兄弟节点
  → 为后续兄弟生成 UpdateNodeAction（order_index + 1）
  → 创建新节点（order_index = current + 1）
  → 返回 [...updateActions, addAction, selectAction]
```

**文件位置**: `src/domain/commands/node/add-sibling-below.ts`

---

#### node.delete

**功能**: 删除当前节点及其子树

**快捷键**: `Delete` 或 `Backspace`

**执行条件**:

- 当前有选中节点
- 当前节点不是根节点

**业务逻辑**:

1. 获取当前节点及其所有子孙节点
2. 决定删除后的选中节点（父节点或上一个兄弟）
3. 为每个节点生成 RemoveNodeAction
4. 更新后续兄弟节点的 order_index

**递归删除**:

```
删除节点 A
  → 获取 A 的所有子孙 [B, C, D, ...]
  → 生成 RemoveNodeAction 数组
  → 选中父节点或上一个兄弟
  → 重新分配兄弟节点顺序
```

**文件位置**: `src/domain/commands/node/delete.ts`

**⚠️ 约束**: 不能删除根节点

---

#### node.moveUp / node.moveDown

**功能**: 在兄弟节点中上移/下移

**快捷键**: `Cmd+Shift+↑` / `Cmd+Shift+↓`

**执行条件**:

- 当前有选中节点
- 当前节点不是根节点
- 有可交换的兄弟节点

**业务逻辑**:

1. 获取当前节点和目标兄弟节点
2. 交换两者的 `order_index`
3. 返回两个 UpdateNodeAction

**示例流程**:

```
节点顺序: [A(0), B(1), C(2)]
用户在 B 上按 Cmd+Shift+↑
  → 找到上一个兄弟 A
  → 交换 order_index: A=1, B=0
  → 返回 [UpdateNodeAction(A), UpdateNodeAction(B)]
  → 新顺序: [B(0), A(1), C(2)]
```

**文件位置**:

- `src/domain/commands/node/move-up.ts`
- `src/domain/commands/node/move-down.ts`

---

#### node.move

**功能**: 移动节点到新的父节点下

**快捷键**: 无（通过 UI 拖拽触发）

**执行条件**:

- 源节点和目标节点都存在
- 目标节点不是源节点的子孙（防止循环引用）
- 源节点不是根节点

**业务逻辑**:

1. 验证移动的有效性
2. 更新源节点的 `parent_short_id` 和 `order_index`
3. 重新分配原父节点下剩余兄弟的 `order_index`
4. 重新分配新父节点下所有子节点的 `order_index`

**复杂性**: 需要同时处理三个层级的节点顺序

**文件位置**: `src/domain/commands/node/move.ts`

**⚠️ 约束**:

- 不能移动到自己的子孙节点下
- 不能移动根节点

---

#### node.updateTitle / node.updateContent

**功能**: 更新节点的标题或内容

**快捷键**: 无（通过 UI 输入触发）

**执行条件**: 当前有选中节点

**业务逻辑**:

1. 获取当前节点的旧值
2. 返回 UpdateNodeAction（包含 oldValues 用于撤销）

**文件位置**:

- `src/domain/commands/node/update-title.ts`
- `src/domain/commands/node/update-content.ts`

---

### 2. Navigation Commands（导航操作）

这类命令只改变 UI 状态（如当前选中节点、折叠状态），不修改数据，不支持 undo/redo。

#### navigation.selectParent

**功能**: 选中当前节点的父节点

**快捷键**: `←` (左箭头)

**执行条件**:

- 当前有选中节点
- 当前节点不是根节点

**业务逻辑**:

1. 获取当前节点的 parent_short_id
2. 返回 SetCurrentNodeAction

**文件位置**: `src/domain/commands/navigation/select-parent.ts`

---

#### navigation.selectFirstChild

**功能**: 选中当前节点的第一个子节点

**快捷键**: `→` (右箭头)

**执行条件**:

- 当前有选中节点
- 当前节点未折叠
- 当前节点有子节点

**业务逻辑**:

1. 获取当前节点的所有子节点
2. 按 order_index 排序，选择第一个
3. 返回 SetCurrentNodeAction

**文件位置**: `src/domain/commands/navigation/select-first-child.ts`

---

#### navigation.selectPreviousSibling / selectNextSibling

**功能**: 选中上一个/下一个兄弟节点

**快捷键**: `↑` / `↓` (上/下箭头)

**执行条件**:

- 当前有选中节点
- 当前节点不是根节点
- 存在上一个/下一个兄弟

**业务逻辑**:

1. 获取所有兄弟节点
2. 按 order_index 排序
3. 找到当前节点的上一个/下一个
4. 返回 SetCurrentNodeAction

**环绕行为**: 当前版本不支持环绕，到达第一个/最后一个后停止

**文件位置**:

- `src/domain/commands/navigation/select-previous-sibling.ts`
- `src/domain/commands/navigation/select-next-sibling.ts`

---

#### navigation.collapseNode / expandNode / toggleCollapse

**功能**: 折叠/展开/切换节点的展开状态

**快捷键**:

- `-` (折叠)
- `=` (展开)
- `Space` (切换)

**执行条件**:

- 当前有选中节点
- 节点有子节点

**业务逻辑**:

1. 检查当前节点的折叠状态
2. 返回对应的 CollapseNodeAction 或 ExpandNodeAction

**文件位置**:

- `src/domain/commands/navigation/collapse-node.ts`
- `src/domain/commands/navigation/expand-node.ts`
- `src/domain/commands/navigation/toggle-collapse.ts`

---

### 3. View Commands（视图操作）

这类命令用于控制视口的缩放、平移和聚焦，不支持 undo/redo（因为是视图状态操作，不修改数据）。

#### view.zoomIn

**功能**: 放大视图（缩放比例增加 20%）

**快捷键**: `Cmd+=`

**执行条件**: 当前缩放比例 < 2.0

**业务逻辑**:

1. 计算新缩放比例：`newZoom = Math.min(2.0, viewport.zoom * 1.2)`
2. 保持视口中心点不变
3. 根据新缩放比例重新计算视口的 x, y, width, height
4. 返回 SetViewportAction

**特殊性**:

- actionBased: true
- undoable: false（视图操作不可撤销）
- 缩放比例上限为 2.0

**文件位置**: `src/domain/commands/view/zoom-in.ts`

---

#### view.zoomOut

**功能**: 缩小视图（缩放比例减少约 17%）

**快捷键**: `Cmd+-`

**执行条件**: 当前缩放比例 > 0.1

**业务逻辑**:

1. 计算新缩放比例：`newZoom = Math.max(0.1, viewport.zoom / 1.2)`
2. 保持视口中心点不变
3. 根据新缩放比例重新计算视口的 x, y, width, height
4. 返回 SetViewportAction

**特殊性**:

- actionBased: true
- undoable: false
- 缩放比例下限为 0.1

**文件位置**: `src/domain/commands/view/zoom-out.ts`

---

#### view.zoomReset

**功能**: 重置缩放比例为 100%（1.0）

**快捷键**: `Cmd+0`

**执行条件**: 无（总是可执行）

**业务逻辑**:

1. 保持视口中心点不变
2. 将缩放比例设置为 1.0
3. 根据新缩放比例重新计算视口的 x, y, width, height
4. 返回 SetViewportAction

**特殊性**:

- actionBased: true
- undoable: false

**文件位置**: `src/domain/commands/view/zoom-reset.ts`

---

#### view.fitView

**功能**: 缩放视口以适应所有节点

**快捷键**: `Cmd+1`

**执行条件**: 无（总是可执行）

**业务逻辑**:

1. 委托给 React Flow 的 `fitView()` 方法
2. React Flow 会自动计算最佳缩放比例和视口位置
3. 通过 `onViewportChange` 回调同步视口状态到 Store

**特殊性**:

- actionBased: false（命令式命令，直接调用 React Flow API）
- undoable: false
- 不返回 Action，直接操作 React Flow

**文件位置**: `src/domain/commands/view/fit-view.ts`

---

#### view.focusCurrentNode

**功能**: 确保当前节点在视口中可见（保留 15% 边距）

**快捷键**: `Cmd+L`

**执行条件**: 存在当前节点

**业务逻辑**:

1. 调用 `ensureNodeVisibleAction(currentNode, state)`
2. 检查当前节点是否在视口内（带 15% 边距）
3. 如果不在视口内，最小化移动距离将节点移入视口
4. 返回 SetViewportAction 或 null

**特殊性**:

- actionBased: true
- undoable: false
- 使用 `ensureNodeVisibleAction` 工具函数
- 只在节点不可见时才移动视口

**文件位置**: `src/domain/commands/view/focus-current-node.ts`

---

#### view.panLeft / Right / Up / Down

**功能**: 向指定方向平移视口（移动 100 节点坐标单位）

**快捷键**:

- `Alt+ArrowLeft` (向左平移)
- `Alt+ArrowRight` (向右平移)
- `Alt+ArrowUp` (向上平移)
- `Alt+ArrowDown` (向下平移)

**执行条件**: 无（总是可执行）

**业务逻辑**:

1. 根据方向调整视口的 x 或 y 坐标
2. 平移距离为 100 节点坐标单位
3. 返回 SetViewportAction（只更新 x 或 y，不更新其他字段）

**特殊性**:

- actionBased: true
- undoable: false
- 平移距离固定为 100 节点坐标单位

**文件位置**:

- `src/domain/commands/view/pan-left.ts`
- `src/domain/commands/view/pan-right.ts`
- `src/domain/commands/view/pan-up.ts`
- `src/domain/commands/view/pan-down.ts`

---

#### view.setViewport

**功能**: 设置视口状态（用于 React Flow → Store 同步）

**快捷键**: 无（不直接暴露给用户）

**执行条件**: 无（总是可执行）

**业务逻辑**:

1. 接收完整的视口参数 (x, y, width, height, zoom)
2. 返回 SetViewportAction
3. 主要用于 MindmapGraphViewer 中的双向同步

**特殊性**:

- actionBased: true
- undoable: false
- 内部命令，不绑定快捷键
- 用于处理用户在 React Flow 中的交互（鼠标拖拽、滚轮缩放等）

**文件位置**: `src/domain/commands/view/set-viewport.ts`

---

### 4. Global Commands（全局操作）

这类命令是系统级操作，部分支持 undo/redo。

#### global.save

**功能**: 保存当前思维导图到服务器

**快捷键**: `Cmd+S`

**执行条件**: 无（总是可执行）

**业务逻辑**:

1. 获取所有 dirty 节点
2. 调用 Server Action 上传到 Supabase
3. 清除 dirty 标志
4. 更新 isSaved 状态

**特殊性**:

- 不返回 Action（直接调用异步函数）
- 不支持 undo（保存操作不可逆）

**文件位置**: `src/domain/commands/global/save.ts`

---

#### global.undo / redo

**功能**: 撤销/重做最近的操作

**快捷键**:

- `Cmd+Z` (撤销)
- `Cmd+Shift+Z` (重做)

**执行条件**:

- undo: 历史栈不为空
- redo: 重做栈不为空

**业务逻辑**:

1. 调用 HistoryManager 的 undo() 或 redo()
2. 不返回 Action（直接操作历史栈）

**特殊性**: 不通过 Action 执行，直接调用 HistoryManager

**文件位置**:

- `src/domain/commands/global/undo.ts`
- `src/domain/commands/global/redo.ts`

---

#### global.loadMindmap

**功能**: 加载指定的思维导图

**快捷键**: 无（通过 UI 触发）

**执行条件**: 无

**业务逻辑**:

1. 从 IndexedDB 加载思维导图数据
2. 重建 EditorState
3. 清空历史栈

**特殊性**:

- 完全重置状态
- 不支持 undo

**文件位置**: `src/domain/commands/global/load-mindmap.ts`

---

## CommandManager

### 职责

CommandManager 是命令执行的中央调度器，负责：

1. **命令注册**: 将 CommandDefinition 注册到命令表
2. **命令查找**: 根据 id 查找命令
3. **条件检查**: 执行命令前检查 when() 条件
4. **执行命令**: 调用 handler 并处理返回的 Action
5. **历史记录**: 决定是否记录到 HistoryManager

### 核心方法

```typescript
class CommandManager {
  // 注册命令
  registerCommand(definition: CommandDefinition): void;

  // 执行命令
  async executeCommand(commandId: string, ...args: any[]): Promise<void>;

  // 检查命令是否可执行
  canExecute(commandId: string): boolean;

  // 获取命令描述
  getDescription(commandId: string): string;
}
```

### 执行流程

```
executeCommand("node.addChild")
  ↓
1. 查找 CommandDefinition
  ↓
2. 检查 when() 条件（如果有）
  ↓ (条件通过)
3. 调用 handler()
  ↓
4. 获取返回的 Action[]
  ↓
5. 判断 undoable 标志
  ↓ (undoable = true)
6. 调用 HistoryManager.executeActions(actions)
  ↓
7. HistoryManager 调用 acceptActions()
  ↓
8. acceptActions() 应用 Action 到状态和数据库
  ↓
9. 将 actions 记录到 undoStack
```

**如果 undoable = false**:

```
5. 判断 undoable 标志
  ↓ (undoable = false)
6. 直接调用 acceptActions()
  ↓
7. 不记录到历史栈
```

### 文件位置

- **CommandManager 实现**: `src/domain/command-manager.ts`
- **Hook 接口**: `src/domain/mindmap-store.ts` (useCommand, useCommandManager)

## 命令注册系统

### 注册机制

所有命令在 MindmapStore 初始化时自动注册：

```typescript
// src/domain/mindmap-store.ts
import { nodeCommands } from "./commands/node";
import { navigationCommands } from "./commands/navigation";
import { globalCommands } from "./commands/global";

// 注册所有命令
[...nodeCommands, ...navigationCommands, ...globalCommands].forEach((cmd) =>
  commandManager.registerCommand(cmd)
);
```

### 命令导出结构

每个命令目录都有一个 `index.ts` 导出所有命令：

```typescript
// src/domain/commands/node/index.ts
export const nodeCommands = [
  addChildCommandDefinition,
  addSiblingBelowCommandDefinition,
  deleteCommandDefinition,
  moveUpCommandDefinition,
  moveDownCommandDefinition,
  moveCommandDefinition,
  updateTitleCommandDefinition,
  updateContentCommandDefinition,
];
```

## 条件执行（when）

### when() 方法

`when()` 是一个可选的函数，用于动态判断命令是否可执行：

```typescript
new CommandDefinition({
  id: "node.addChild",
  when: () => {
    const state = useMindmapStore.getState().editorState;
    return state.currentNode !== null;
  },
  handler: () => {
    /* ... */
  },
});
```

### 常见条件

1. **当前节点存在**: `state.currentNode !== null`
2. **不是根节点**: `node.parent_short_id !== null`
3. **有子节点**: `getChildNodes(nodeId).length > 0`
4. **节点未折叠**: `!state.collapsedNodes.has(nodeId)`
5. **有上一个兄弟**: `getPreviousSibling(nodeId) !== null`

### 条件检查时机

- **快捷键注册**: 注册时不检查，按下时检查
- **UI 按钮**: 渲染时检查，决定是否禁用
- **命令执行**: executeCommand() 内部自动检查

## 添加新 Command 的最佳实践

### 1. 确定命令分类

**决策树**:

```
命令是否修改节点数据？
├─ 是 → Node Command
│   └─ undoable = true
│   └─ 返回持久化 Action
│
└─ 否 → 是否改变 UI 状态？
    ├─ 是 → Navigation Command
    │   └─ undoable = false
    │   └─ 返回非持久化 Action
    │
    └─ 否 → Global Command
        └─ 根据具体情况决定
```

### 2. 创建命令文件

**文件位置**: `src/domain/commands/{category}/{command-name}.ts`

**命名规范**:

- 文件名: kebab-case（如 `add-child.ts`）
- 变量名: camelCase + "CommandDefinition"（如 `addChildCommandDefinition`）
- 命令 ID: `{category}.{commandName}`（如 `node.addChild`）

**基本模板**:

```typescript
import { CommandDefinition } from "../../command-manager";
import { useMindmapStore } from "../../mindmap-store";
import { MyAction } from "../../actions/my-action";

export const myCommandDefinition = new CommandDefinition({
  id: "category.myCommand",

  description: "执行我的操作",
  // 或动态描述
  // description: () => {
  //   const state = useMindmapStore.getState().editorState;
  //   return `操作 ${state.currentNode}`;
  // },

  undoable: true, // 或 false

  when: () => {
    const state = useMindmapStore.getState().editorState;
    // 返回 true/false
    return state.currentNode !== null;
  },

  handler: (...args) => {
    const state = useMindmapStore.getState().editorState!;

    // 1. 获取必要的数据
    const currentNode = state.nodes.get(state.currentNode!);

    // 2. 执行业务逻辑
    // ...

    // 3. 返回 Action 数组
    return [
      new MyAction(param1, param2),
      // ...
    ];
  },
});
```

### 3. 注册命令

在对应的 `index.ts` 中导出：

```typescript
// src/domain/commands/category/index.ts
import { myCommandDefinition } from "./my-command";

export const categoryCommands = [
  // ... 其他命令
  myCommandDefinition,
];
```

### 4. 绑定快捷键（可选）

在 `src/domain/shortcuts/index.ts` 中注册：

```typescript
export const shortcutDefinitions: ShortcutDefinition[] = [
  // ...
  {
    key: "k",
    modifiers: ["cmd"], // 或 ["ctrl"]
    commandId: "category.myCommand",
    when: () => {
      // 可选的额外条件
      return true;
    },
    preventDefault: true,
  },
];
```

### 5. 在 UI 中使用

```typescript
// 在组件中
import { useCommand } from "@/domain/mindmap-store";

function MyComponent() {
  const executeMyCommand = useCommand("category.myCommand");

  return (
    <button onClick={() => executeMyCommand(arg1, arg2)}>
      执行我的命令
    </button>
  );
}
```

### 6. 编写测试

**测试文件**: `src/domain/commands/{category}/__tests__/{command-name}.test.ts`

**测试要点**:

- ✅ 测试 when() 条件是否正确
- ✅ 测试 handler 返回的 Action 是否正确
- ✅ 测试边界情况（如节点不存在、根节点等）
- ✅ 测试异步 handler（如果有）

### 7. 常见陷阱

**❌ 在 handler 中直接修改状态**:

```typescript
// 错误示例
handler: () => {
  const state = useMindmapStore.getState().editorState!;
  state.currentNode = "new-id"; // ❌ 直接修改
};
```

**✅ 正确做法 - 返回 Action**:

```typescript
handler: () => {
  return [new SetCurrentNodeAction("new-id")]; // ✅ 返回 Action
};
```

**❌ when() 中包含副作用**:

```typescript
// 错误示例
when: () => {
  console.log("checking..."); // ❌ 副作用
  someGlobalVar++; // ❌ 修改状态
  return true;
};
```

**✅ when() 应该是纯函数**:

```typescript
when: () => {
  const state = useMindmapStore.getState().editorState;
  return state.currentNode !== null; // ✅ 纯函数
};
```

**❌ 忘记处理空值**:

```typescript
// 错误示例
handler: () => {
  const state = useMindmapStore.getState().editorState!;
  const node = state.nodes.get(state.currentNode!);
  return [new UpdateNodeAction(node.short_id, ...)];
  // ❌ node 可能为 undefined
}
```

**✅ 正确处理空值**:

```typescript
handler: () => {
  const state = useMindmapStore.getState().editorState!;
  const node = state.nodes.get(state.currentNode!);
  if (!node) return;  // ✅ 提前返回

  return [new UpdateNodeAction(node.short_id, ...)];
}
```

## 设计模式

### Command Pattern（命令模式）

**定义**: 将请求封装为对象，从而使你可以用不同的请求对客户进行参数化。

**应用**:

- CommandDefinition = Command 对象
- CommandManager = Invoker（调用者）
- handler = Execute 方法
- EditorAction = Receiver（接收者）

**优势**:

- 解耦调用者和执行者
- 支持撤销/重做
- 可以记录命令日志
- 支持命令队列

### Strategy Pattern（策略模式）

**定义**: 定义一系列算法，把它们一个个封装起来，并且使它们可以互换。

**应用**:

- handler 是策略
- when() 是策略的前置条件
- 不同的 handler 实现不同的业务逻辑

**优势**:

- 业务逻辑易于扩展
- 可以在运行时切换策略
- 避免大量的 if-else

---

## 批量操作 - CompositeCommand

### 概述

CompositeCommand 实现了组合命令执行器，允许将多个子命令组合为一个原子操作，保证批量操作的原子性和可撤销性。

### 关键概念

| 概念             | 定义                                                                               | 示例/说明                                                            |
| ---------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CompositeCommand | 将多个子命令组合为一个原子操作的命令，所有子命令的 actions 在同一个 HistoryItem 中 | AI 批量操作：一次创建多个节点，一次 undo 撤销所有                    |
| SubCommand       | 组成 CompositeCommand 的子命令定义，包含 commandId 和参数                          | `{ commandId: "node.addChild", params: ["parent-123", 0, "节点1"] }` |
| 原子性           | 批量操作作为一个整体，要么全部成功，要么全部失败                                   | 避免部分执行导致的不一致状态                                         |

### 背景和动机

#### 问题场景

AI 建议"重组节点结构"时，需要执行一系列操作：

1. 创建一个分组节点
2. 移动节点 A 到分组
3. 移动节点 B 到分组
4. 调整子节点顺序

如果分别执行 4 个命令：

- ❌ 会产生 4 个 HistoryItem
- ❌ 需要 undo 4 次才能完全撤销
- ❌ 中间状态可能不一致

#### 设计需求

- **原子性**: 所有子命令的 actions 在同一个 HistoryItem 中
- **可撤销性**: 一次 undo 撤销整个组合命令的所有效果
- **简洁性**: 代码简单，易于理解和维护
- **复用性**: 完全复用现有的 Command 和 Action 系统

### 设计目标

1. 支持将多个子命令组合为一个原子操作
2. 保证批量操作的完整性（全或无）
3. 一次 undo 撤销所有子命令的效果
4. 完全复用现有的 CommandManager 和 HistoryManager
5. 只支持可撤销的命令，保持设计简洁

### 架构概览

```
AI 操作系统
    ↓ 创建组合命令
createCompositeCommand(description, subCommands)
    ↓ 返回
CommandDefinition (actionBased: true)
    ↓ 执行
commandManager.executeCommand(...)
    ↓ 调用 handler
收集所有子命令的 actions
    ↓ 返回
EditorAction[]
    ↓ 记录
historyManager.execute(allActions)
    ↓ 结果
单个 HistoryItem（一次 undo 撤销全部）
```

### 接口定义

#### SubCommand 接口

```typescript
/**
 * 子命令定义
 *
 * 约束：
 * - 必须是 actionBased: true 的命令
 * - 必须是可撤销的命令（undoable !== false）
 */
export interface SubCommand {
  commandId: string; // 子命令ID，如 "node.addChild"
  params: unknown[]; // 子命令参数
}
```

#### createCompositeCommand 工厂函数

```typescript
/**
 * 创建组合命令
 *
 * 返回一个标准的 CommandDefinition，可以通过 commandManager 执行
 *
 * 约束：
 * - 所有子命令必须是 actionBased: true
 * - 所有子命令必须是 undoable: true（默认）或未显式设置为 false
 *
 * @param description - 操作描述，显示在 undo/redo 历史中
 * @param subCommands - 子命令列表
 * @returns CommandDefinition - 标准命令定义
 */
export function createCompositeCommand(
  description: string,
  subCommands: SubCommand[]
): CommandDefinition;
```

### 执行流程

1. **创建阶段**：调用 `createCompositeCommand()` 创建组合命令，返回标准 CommandDefinition
2. **执行阶段**：通过 `commandManager.executeCommand()` 执行
3. **收集阶段**（handler 内部）：
   - 遍历所有子命令
   - 执行 4 个检查点：
     - 命令是否存在
     - 命令是否是 actionBased: true
     - 命令是否是 undoable !== false
     - 命令的 when 条件是否满足
   - 收集所有子命令返回的 actions
4. **返回阶段**：handler 返回收集的所有 actions
5. **记录阶段**：commandManager 自动调用 historyManager 记录为单个 HistoryItem

### 错误处理策略

- **严格的全或无策略**：任何检查失败都立即抛出错误，中止整个执行
- **fail-fast 模式**：在收集阶段发现错误立即中止，不会执行任何 action
- **数据一致性保证**：只有所有检查通过才会执行，避免部分执行

### 关键约束

1. **只支持 actionBased: true 的命令**
   - 原因：CompositeCommand 需要收集 actions 并返回
   - 不支持直接执行的命令（actionBased: false）

2. **只支持可撤销的命令（undoable !== false）**
   - 原因：CompositeCommand 的核心价值是原子性和可撤销性
   - 简化设计，降低复杂度

3. **返回标准 CommandDefinition**
   - 使用临时 id（如 `ai.composite.${Date.now()}`）
   - 不需要注册到 commandRegistry
   - 通过 commandManager 执行

### 使用示例

#### 示例 1: AI 批量创建节点

```typescript
import { createCompositeCommand } from "@/domain/commands/composite";
import { useMindmapStore } from "@/domain/mindmap-store";

const root = useMindmapStore.getState();

// 1. 创建组合命令
const compositeCommand = createCompositeCommand("批量创建子节点", [
  { commandId: "node.addChild", params: ["parent-123", 0, "节点1"] },
  { commandId: "node.addChild", params: ["parent-123", 1, "节点2"] },
  { commandId: "node.addChild", params: ["parent-123", 2, "节点3"] },
]);

// 2. 通过 commandManager 执行
await root.commandManager!.executeCommand(
  {
    commandId: compositeCommand.id,
    params: [],
  },
  compositeCommand
);

// 结果：
// - 创建了 3 个节点
// - 所有 actions 在一个 HistoryItem 中
// - 一次 undo 撤销所有 3 个节点
```

#### 示例 2: AI 复杂重组操作

```typescript
const batch = {
  description: "重组节点结构",
  operations: [
    { commandId: "node.addChild", params: ["parent-id", 0, "重要功能"] },
    { commandId: "node.move", params: ["node-a-id", "group-node-id", 0] },
    { commandId: "node.move", params: ["node-b-id", "group-node-id", 1] },
  ],
};

const compositeCommand = createCompositeCommand(
  batch.description,
  batch.operations
);

await root.commandManager!.executeCommand(
  {
    commandId: compositeCommand.id,
    params: [],
  },
  compositeCommand
);

// 结果：
// - 执行了 3 个子命令
// - 产生了约 10+ 个 EditorAction
// - 所有 actions 在一个 HistoryItem 中
// - 一次 undo 撤销整个重组操作
```

### 设计决策

#### 为什么返回 CommandDefinition 而不是独立执行函数？

**选择**：返回标准 CommandDefinition

**理由**：

1. **架构一致性**：完全利用现有的 commandManager 执行流程
2. **复用 HistoryManager**：自动记录到历史栈，无需特殊处理
3. **简化实现**：不需要实现独立的执行逻辑
4. **代码量更少**：约 50 行（vs 独立执行函数约 80 行）

#### 为什么不支持 undoable: false 的命令？

**选择**：只支持可撤销的命令

**理由**：

1. **简化设计**：降低复杂度，减少边界情况处理
2. **核心价值聚焦**：CompositeCommand 的核心价值是原子性和可撤销性
3. **实际需求**：AI 批量操作通常都需要 undo
4. **替代方案可用**：不可撤销的操作可以在批量操作完成后单独执行

### FAQ

**Q: 可以嵌套 CompositeCommand 吗？**

A: 不支持。子命令必须是具体的操作命令（如 node.addChild），不能是另一个 CompositeCommand。

**Q: 如果子命令执行失败会怎样？**

A: 采用严格的全或无策略，任何失败都会中止整个执行并抛出错误，不会执行任何 action。

**Q: 可以混合使用可撤销和不可撤销的命令吗？**

A: 不支持。所有子命令必须是可撤销的（undoable !== false）。如果需要混合，应该分开执行。

**Q: CompositeCommand 的性能如何？**

A: 性能与单独执行子命令相同。只是将多个 actions 合并到一个 HistoryItem 中，不会增加额外开销。

**Q: 何时使用 CompositeCommand？**

A:

- ✅ AI 返回的批量操作
- ✅ 需要保证原子性的多步操作
- ✅ 需要一次 undo 撤销的操作序列
- ❌ 单个命令（直接使用 CommandManager）
- ❌ 不需要 undo 的操作

### 文件位置

```
src/domain/commands/
├── composite/
│   ├── __tests__/
│   │   └── create-composite-command.test.ts  # 测试文件
│   ├── create-composite-command.ts            # 核心实现
│   └── index.ts                               # 导出
```

---

## 性能考虑

### 优化策略

1. **延迟执行**: when() 只在需要时调用
2. **缓存结果**: 对于频繁调用的工具函数（如 getChildNodes），可以缓存结果
3. **批量操作**: handler 可以返回多个 Action，共享一个事务
4. **异步 handler**: 对于耗时操作，使用 async handler

### 性能瓶颈

**已知问题**:

- 频繁的 when() 计算可能影响性能（每次按键都会检查）
- 大量节点时，遍历操作（如 getDescendantNodes）较慢

**改进方向**:

- 添加 when() 结果缓存
- 优化节点遍历算法
- 使用索引加速查询

## 设计原则总结

### DO（推荐做法）

1. ✅ **单一职责**: 每个命令只做一件事
2. ✅ **纯函数**: when() 应该是无副作用的纯函数
3. ✅ **返回 Action**: handler 应该返回 Action 数组，不要直接修改状态
4. ✅ **条件检查**: 使用 when() 做前置条件检查
5. ✅ **描述清晰**: description 应该清楚地说明命令的作用
6. ✅ **分类清晰**: 按照职责将命令分类到不同的目录

### DON'T（避免做法）

1. ❌ **不要在 handler 中直接修改状态**
2. ❌ **不要在 when() 中包含副作用**
3. ❌ **不要忘记处理空值和边界情况**
4. ❌ **不要在命令中包含 UI 逻辑**（UI 逻辑属于组件）
5. ❌ **不要创建过于复杂的命令**（应该拆分为多个命令）
6. ❌ **不要硬编码业务规则**（应该通过参数传递）

## 未来扩展方向

### 1. 命令组合

当前限制：每个命令独立执行

改进方向：

- 支持命令序列（Macro Command）
- 支持命令组合和嵌套
- 实现命令管道（Pipeline）

### 2. 命令参数验证

当前限制：没有参数类型和范围验证

改进方向：

- 添加参数 Schema 定义
- 运行时参数验证
- 提供更好的错误提示

### 3. 命令优先级

当前限制：所有命令平等对待

改进方向：

- 添加优先级字段
- 支持命令队列排序
- 实现命令调度器

### 4. 条件表达式语言

当前限制：when() 是 JavaScript 函数

改进方向：

- 设计 DSL（Domain Specific Language）
- 支持字符串表达式（如 "currentNode && !isRoot"）
- 提供可视化条件编辑器

## 相关代码位置

- **CommandDefinition 类**: `src/domain/command-manager.ts:7-55`
- **CommandManager 类**: `src/domain/command-manager.ts:57-110`
- **命令目录**: `src/domain/commands/`
  - Node Commands: `src/domain/commands/node/`
  - Navigation Commands: `src/domain/commands/navigation/`
  - Global Commands: `src/domain/commands/global/`
- **快捷键定义**: `src/domain/shortcuts/index.ts`
- **Hook 接口**: `src/domain/mindmap-store.ts`

## 相关文档

- **命令参考手册**: [command-reference.md](./command-reference.md) - 包含所有命令的详细说明和使用示例
- **添加新命令的最佳实践**: 参见 [command-reference.md](./command-reference.md) 的"扩展指南"部分

---

**文档维护**: 当添加新的命令分类或修改命令执行流程时，请更新本文档。
