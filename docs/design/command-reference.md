# 命令参考手册

## 元信息

- 作者：Claude Code
- 创建日期：2025-10-19
- 最后更新：2025-11-06
- 相关文档：
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [Action 层架构设计](./action-layer-design.md)
  - [MindmapStore 架构设计](./mindmap-store-design.md)

## 概述

本文档提供思维导图编辑器所有命令的快速参考。命令按类别组织，每个命令包含 ID、名称、快捷键和简要说明。

详细的设计和实现说明请参考 [Command 层架构设计](./command-layer-design.md)。

## 命令总览

| 分类     | 命令数量 | 实现状态        |
| -------- | -------- | --------------- |
| 节点操作 | 8        | ✅ 已实现 (8/8) |
| 导航操作 | 8        | ✅ 已实现 (8/8) |
| 全局操作 | 4        | ✅ 已实现 (4/4) |
| AI 操作  | 1        | ⏳ 待实现 (0/1) |
| **总计** | **21**   | **20 已实现**   |

## 1. 节点操作命令

| 命令 ID                | 名称       | 快捷键                 | 说明                       | 状态      |
| ---------------------- | ---------- | ---------------------- | -------------------------- | --------- |
| `node.addChild`        | 添加子节点 | `Tab`                  | 在当前节点下添加子节点     | ✅ 已实现 |
| `node.addSiblingAbove` | 添加上兄弟 | -                      | 在当前节点上方添加兄弟节点 | ✅ 已实现 |
| `node.addSiblingBelow` | 添加下兄弟 | `Enter`                | 在当前节点下方添加兄弟节点 | ✅ 已实现 |
| `node.delete`          | 删除节点   | `Delete` / `Backspace` | 删除当前节点及其子节点     | ✅ 已实现 |
| `node.move`            | 移动节点   | -                      | 移动节点到新的父节点下     | ✅ 已实现 |
| `node.moveDown`        | 下移节点   | `Cmd+Shift+↓`          | 在兄弟节点中向下移动       | ✅ 已实现 |
| `node.moveUp`          | 上移节点   | `Cmd+Shift+↑`          | 在兄弟节点中向上移动       | ✅ 已实现 |
| `node.updateTitle`     | 更新标题   | -                      | 更新节点标题               | ✅ 已实现 |

## 2. 导航操作命令

| 命令 ID                            | 名称               | 快捷键  | 说明                    | 状态      |
| ---------------------------------- | ------------------ | ------- | ----------------------- | --------- |
| `navigation.collapseNode`          | 折叠节点           | `-`     | 折叠当前节点的子节点    | ✅ 已实现 |
| `navigation.expandNode`            | 展开节点           | `=`     | 展开当前节点的子节点    | ✅ 已实现 |
| `navigation.selectFirstChild`      | 选择第一个子节点   | `→`     | 跳转到第一个子节点      | ✅ 已实现 |
| `navigation.selectNextSibling`     | 选择下一个兄弟节点 | `↓`     | 跳转到下一个兄弟节点    | ✅ 已实现 |
| `navigation.selectParent`          | 选择父节点         | `←`     | 跳转到父节点            | ✅ 已实现 |
| `navigation.selectPreviousSibling` | 选择上一个兄弟节点 | `↑`     | 跳转到上一个兄弟节点    | ✅ 已实现 |
| `navigation.setCurrentNode`        | 设置当前节点       | -       | 设置当前选中的节点      | ✅ 已实现 |
| `navigation.toggleCollapse`        | 切换折叠状态       | `Space` | 切换节点的展开/折叠状态 | ✅ 已实现 |

## 3. 全局操作命令

| 命令 ID                 | 名称         | 快捷键        | 说明                      | 状态      |
| ----------------------- | ------------ | ------------- | ------------------------- | --------- |
| `global.redo`           | 重做         | `Cmd+Shift+Z` | 重做已撤销的操作          | ✅ 已实现 |
| `global.save`           | 保存         | `Cmd+S`       | 保存思维导图到云端        | ✅ 已实现 |
| `global.setFocusedArea` | 设置焦点区域 | -             | 设置焦点区域（画布/大纲） | ✅ 已实现 |
| `global.undo`           | 撤销         | `Cmd+Z`       | 撤销上一次操作            | ✅ 已实现 |

## 4. AI 操作命令

| 命令 ID     | 名称    | 触发方式   | 说明                     | 状态      |
| ----------- | ------- | ---------- | ------------------------ | --------- |
| `ai.assist` | AI 助手 | 工具栏按钮 | 基于当前节点提供 AI 辅助 | ⏳ 待实现 |

## 快捷键快速查询

### 按键位分类

**���母和符号键**:

- `Tab` - 添加子节点
- `Enter` - 在下方添加兄弟节点
- `Delete` / `Backspace` - 删除节点
- `F2` - 编辑节点
- `Esc` - 完成编辑 (仅在 Panel 中)
- `Space` - 切换折叠状态
- `-` - 折叠节点
- `=` - 展开节点

**方向键**:

- `↑` - 选择上一个兄弟节点
- `↓` - 选择下一个兄弟节点
- `←` - 选择父节点
- `→` - 选择第一个子节点

**Cmd 组合键** (Mac) / **Ctrl 组合键** (Windows/Linux):

- `Cmd+S` - 保存
- `Cmd+C` - 复制
- `Cmd+X` - 剪切
- `Cmd+V` - 粘贴
- `Cmd+D` - 复制节点
- `Cmd+Shift+↑` - 上移节点
- `Cmd+Shift+↓` - 下移节点

**待实现快捷键**:

- `Cmd+Z` - 撤销
- `Cmd+Shift+Z` - 重做

## 命令使用示例

### 在代码中执行命令

```typescript
import { commandRegistry } from "@/lib/commands/registry";
import { createCommandContext } from "@/lib/commands/context";
import { useMindmapEditorStore } from "@/lib/store/mindmap-editor.store";

// 获取 store
const store = useMindmapEditorStore();

// 创建命令上下文
const context = createCommandContext(store);

// 执行命令
await commandRegistry.execute("node.addChild", context);
```

### 在 UI 组件中使用

```typescript
import { CommandButton } from '@/components/command-button';

// 使用命令按钮组件
<CommandButton commandId="node.addChild" />
```

### 绑定快捷键

快捷键绑定在 `src/lib/shortcuts/bindings/` 目录下定义：

```typescript
import type { ShortcutBinding } from "../types";

export const nodeBindings: ShortcutBinding[] = [
  {
    keys: "tab",
    commandId: "node.addChild",
    scope: "editor",
    preventDefault: true,
  },
];
```

## 命令上下文条件

部分命令包含 `when` 条件，只在特定上下文中可执行：

- **编辑器作用域命令**: 仅在 `focusedArea !== 'panel'` 时生效
- **需要选中节点**: 大部分命令需要 `selectedNode !== null`
- **需要父节点**: 删除、剪切等命令需要 `selectedNode.parent_id !== null`
- **需要子节点**: 导航到子节点命令需要 `hasChildren === true`

## 扩展命令系统

### 添加新命令的完整流程

#### 第1步：确定命令分类

首先确定你的命令属于哪个分类：

```
命令是否修改节点数据？
├─ 是 → Node Command
│   └─ undoable = true
│   └─ 返回持久化 Action (AddNodeAction, UpdateNodeAction, RemoveNodeAction)
│
└─ 否 → 是否改变 UI 状态？
    ├─ 是 → Navigation Command
    │   └─ undoable = false
    │   └─ 返回非持久化 Action (SetCurrentNodeAction, CollapseNodeAction 等)
    │
    └─ 否 → Global Command
        └─ 根据具体情况决定
```

#### 第2步：创建命令文件

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

  // 静态描述
  description: "执行我的操作",
  // 或动态描述
  // description: () => {
  //   const state = useMindmapStore.getState().editorState;
  //   return `操作 ${state.currentNode}`;
  // },

  // 是否可撤销（修改数据 = true，仅 UI = false）
  undoable: true,

  // 可选：执行条件
  when: () => {
    const state = useMindmapStore.getState().editorState;
    return state.currentNode !== null; // 示例条件
  },

  // 命令处理器
  handler: (...args) => {
    const state = useMindmapStore.getState().editorState!;

    // 1. 获取必要的数据
    const currentNode = state.nodes.get(state.currentNode!);
    if (!currentNode) return; // 提前返回避免错误

    // 2. 执行业务逻辑
    const newData = {
      /* ... */
    };

    // 3. 返回 Action 数组
    return [
      new MyAction(param1, param2),
      // 可以返回多个 Action
    ];
  },
});
```

#### 第3步：注册命令

在对应的 `index.ts` 中导出命令：

```typescript
// src/domain/commands/{category}/index.ts
import { myCommandDefinition } from "./my-command";

export const categoryCommands = [
  // ... 其他命令
  myCommandDefinition,
];
```

命令会在 MindmapStore 初始化时自动注册，无需手动注册。

#### 第4步：绑定快捷键（可选）

在 `src/domain/shortcuts/index.ts` 中添加快捷键绑定：

```typescript
export const shortcutDefinitions: ShortcutDefinition[] = [
  // ... 其他快捷键
  {
    key: "k", // 按键
    modifiers: ["cmd"], // 修饰键 (cmd, ctrl, shift, alt)
    commandId: "category.myCommand", // 命令 ID
    when: () => {
      // 可选：额外的条件检查
      return true;
    },
    preventDefault: true, // 阻止默认行为
  },
];
```

**跨平台支持**: 使用 "cmd" 会自动在 Windows/Linux 上转为 "ctrl"。

#### 第5步：在 UI 中使用

```typescript
import { useCommand } from "@/domain/mindmap-store";

function MyComponent() {
  // 获取命令执行函数
  const executeMyCommand = useCommand("category.myCommand");

  // 检查命令是否可执行（可选）
  const canExecute = useCommandManager()?.canExecute("category.myCommand");

  return (
    <button
      onClick={() => executeMyCommand(arg1, arg2)}
      disabled={!canExecute}
    >
      执行我的命令
    </button>
  );
}
```

#### 第6步：编写测试

**测试文件**: `src/domain/commands/{category}/__tests__/{command-name}.test.ts`

**测试要点**:

- ✅ 测试 when() 条件是否正确判断
- ✅ 测试 handler 返回的 Action 类型和参数
- ✅ 测试边界情况（节点不存在、根节点等）
- ✅ 测试异步 handler（如果有）

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { myCommandDefinition } from "../my-command";
import { useMindmapStore } from "../../../mindmap-store";

describe("myCommand", () => {
  beforeEach(() => {
    // 初始化测试状态
  });

  it("should execute when condition is met", () => {
    // 测试条件满足时的行为
  });

  it("should not execute when condition is not met", () => {
    // 测试条件不满足时的行为
  });

  it("should return correct actions", () => {
    // 测试返回的 Action
  });
});
```

#### 第7步：更新文档

在本文档的对应分类中添加命令条目，并更新修订历史。

### 最佳实践和常见陷阱

#### ✅ DO（推荐做法）

1. **单一职责**: 每个命令只做一件事
2. **纯函数 when()**: when() 应该是无副作用的纯函数
3. **返回 Action**: handler 应该返回 Action 数组，不要直接修改状态
4. **条件检查**: 使用 when() 做前置条件检查
5. **处理空值**: 始终检查节点是否存在
6. **描述清晰**: description 应该清楚地说明命令的作用

```typescript
// ✅ 好的示例
handler: () => {
  const state = useMindmapStore.getState().editorState!;
  const node = state.nodes.get(state.currentNode!);
  if (!node) return; // 处理空值

  return [new UpdateNodeAction(node.short_id, updates)];
};
```

#### ❌ DON'T（避免做法）

1. **不要在 handler 中直接修改状态**

```typescript
// ❌ 错误示例
handler: () => {
  const state = useMindmapStore.getState().editorState!;
  state.currentNode = "new-id"; // 直接修改
};

// ✅ 正确做法
handler: () => {
  return [new SetCurrentNodeAction("new-id")];
};
```

2. **不要在 when() 中包含副作用**

```typescript
// ❌ 错误示例
when: () => {
  console.log("checking..."); // 副作用
  return true;
};

// ✅ 正确做法
when: () => {
  const state = useMindmapStore.getState().editorState;
  return state.currentNode !== null; // 纯函数
};
```

3. **不要忘记处理边界情况**

```typescript
// ❌ 错误示例
handler: () => {
  const state = useMindmapStore.getState().editorState!;
  const node = state.nodes.get(state.currentNode!);
  return [new UpdateNodeAction(node.short_id, ...)];
  // node 可能为 undefined
}

// ✅ 正确做法
handler: () => {
  const state = useMindmapStore.getState().editorState!;
  const node = state.nodes.get(state.currentNode!);
  if (!node) return;  // 提前返回

  return [new UpdateNodeAction(node.short_id, ...)];
}
```

### 实用工具函数

在编写命令时，可以使用 `src/domain/editor-utils.ts` 中的工具函数：

- `getChildNodes(state, parentId)` - 获取子节点列表
- `getSiblingNodes(state, nodeId)` - 获取兄弟节点列表
- `getDescendantNodes(state, nodeId)` - 获取所有子孙节点
- `getNextSibling(state, nodeId)` - 获取下一个兄弟
- `getPreviousSibling(state, nodeId)` - 获取上一个兄弟

使用这些工具函数可以简化业务逻辑并保持一致性。

## 故障排查

### 快捷键不工作

1. 检查 `focusedArea` 状态 - 编辑器快捷键在 Panel 中不生效
2. 检查命令的 `when` 条件是否满足
3. 确认快捷键绑定的 `commandId` 正确
4. 检查浏览器控制台是否有错误

### 命令执行失败

1. 确认命令已在 registry 中注册
2. 检查 `CommandContext` 是否正确创建
3. 查看命令的 `when` 条件
4. 检查命令 handler 中的业务逻辑

## 参考资料

- [领域层架构设计](./domain-layer-architecture.md) - 完整的分层架构说明
- [Command 层架构设计](./command-layer-design.md) - 详细的命令层设计和架构
- [Action 层架构设计](./action-layer-design.md) - Action 层的详细设计
- [MindmapStore 架构设计](./mindmap-store-design.md) - 状态管理和 Store 设计

## 修订历史

| 日期       | 版本 | 修改内容                                                   | 作者        |
| ---------- | ---- | ---------------------------------------------------------- | ----------- |
| 2025-11-06 | 3.0  | 更新命令列表（20个已实现），添加详细的扩展命令系统最佳实践 | Claude Code |
| 2025-10-31 | 2.0  | 实现分类1和2的所有命令，更新分类4的命令ID，添加状态列      | Claude Code |
| 2025-10-19 | 1.0  | 初始版本，基于命令定义文档创建                             | Claude Code |
