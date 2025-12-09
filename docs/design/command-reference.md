# 命令参考手册

## 元信息

- 作者：Claude Code
- 创建日期：2025-10-19
- 最后更新：2025-12-02
- 相关文档：
  - [领域层架构设计](./domain-layer-architecture.md)
  - [Command 层架构设计](./command-layer-design.md)
  - [Action 层架构设计](./action-layer-design.md)
  - [MindmapStore 架构设计](./mindmap-store-design.md)
  - [FocusedAreaRegistry 设计](./focused-area-registry-design.md)
  - [视口管理设计](./viewport-management-design.md)

## 概述

本文档提供思维导图编辑器所有命令的快速参考。命令按类别组织，每个命令包含 ID、名称、快捷键和简要说明。

详细的设计和实现说明请参考 [Command 层架构设计](./command-layer-design.md)。

## 命令总览

| 分类     | 命令数量 | actionBased | 实现状态          |
| -------- | -------- | ----------- | ----------------- |
| 节点操作 | 9        | ✅ true     | ✅ 已实现 (9/9)   |
| 导航操作 | 9        | ✅ true     | ✅ 已实现 (9/9)   |
| 视图操作 | 10       | ✅ true     | ✅ 已实现 (10/10) |
| 全局操作 | 5        | ❌ false    | ✅ 已实现 (5/5)   |
| AI 操作  | 1        | ❌ false    | ⏳ 待实现 (0/1)   |
| **总计** | **33**   | -           | **32 已实现**     |

**actionBased 说明**：

- **true** - 命令返回 EditorAction[]，支持 undo/redo（适用于数据修改和 UI 状态变化）
- **false** - 命令直接执行，不返回 actions（适用于系统级操作如 undo/redo/save）

详细的 CommandDefinition 类型说明请参考 [Command 层架构设计](./command-layer-design.md#核心概念)。

## 1. 节点操作命令

| 命令 ID                | 名称         | 快捷键                 | 说明                                           | 状态      |
| ---------------------- | ------------ | ---------------------- | ---------------------------------------------- | --------- |
| `node.addChild`        | 添加子节点   | `Tab`                  | 在当前节点下添加子节点                         | ✅ 已实现 |
| `node.addChildTrees`   | 批量添加子树 | -                      | 批量创建单级或多级子节点树（支持 AI 批量生成） | ✅ 已实现 |
| `node.addSiblingAbove` | 添加上兄弟   | `Shift+Enter`          | 在当前节点上方添加兄弟节点                     | ✅ 已实现 |
| `node.addSiblingBelow` | 添加下兄弟   | `Enter`                | 在当前节点下方添加兄弟节点                     | ✅ 已实现 |
| `node.delete`          | 删除节点     | `Delete` / `Backspace` | 删除当前节点及其子节点                         | ✅ 已实现 |
| `node.move`            | 移动节点     | -                      | 移动节点到新的父节点下                         | ✅ 已实现 |
| `node.moveDown`        | 下移节点     | `Cmd+Shift+↓`          | 在兄弟节点中向下移动                           | ✅ 已实现 |
| `node.moveUp`          | 上移节点     | `Cmd+Shift+↑`          | 在兄弟节点中向上移动                           | ✅ 已实现 |
| `node.updateTitle`     | 更新标题     | -                      | 更新节点标题                                   | ✅ 已实现 |
| `node.updateNote`      | 更新笔记     | -                      | 更新节点详细说明                               | ✅ 已实现 |

**注意**：`node.addChild` 命令会自动展开父节点。如果父节点处于折叠状态，执行添加子节点命令时会先自动展开父节点，确保新添加的子节点立即可见。

## 2. 导航操作命令

| 命令 ID                               | 名称             | 快捷键  | 说明                                     | 状态      |
| ------------------------------------- | ---------------- | ------- | ---------------------------------------- | --------- |
| `navigation.collapseNode`             | 折叠节点         | `Cmd+[` | 折叠当前节点的子节点                     | ✅ 已实现 |
| `navigation.collapseSubtreeRecursive` | 递归折叠子树     | `Cmd+\` | 递归折叠当前节点及其所有子孙节点         | ✅ 已实现 |
| `navigation.expandNode`               | 展开节点         | `Cmd+]` | 展开当前节点的子节点                     | ✅ 已实现 |
| `navigation.selectFirstChild`         | 选择第一个子节点 | `→`     | 跳转到第一个子节点                       | ✅ 已实现 |
| `navigation.selectNextSibling`        | 选择下一个节点   | `↓`     | 跳转到下一个同深度的节点（DFS 遍历顺序） | ✅ 已实现 |
| `navigation.selectParent`             | 选择父节点       | `←`     | 跳转到父节点                             | ✅ 已实现 |
| `navigation.selectPreviousSibling`    | 选择上一个节点   | `↑`     | 跳转到上一个同深度的节点（DFS 遍历顺序） | ✅ 已实现 |
| `navigation.setCurrentNode`           | 设置当前节点     | -       | 设置当前选中的节点                       | ✅ 已实现 |
| `navigation.toggleCollapse`           | 切换折叠状态     | -       | 切换节点的展开/折叠状态                  | ✅ 已实现 |

**注意**: `selectNextSibling` 和 `selectPreviousSibling` 使用基于深度的导航：

- 只在相同深度的节点之间导航
- 按深度优先遍历（DFS）顺序进行
- 自动跳过所有不同深度的节点
- 可以跨越多个分支和层级

**示例**：

```
1
├── 1.1
│   └── 1.1.1 ← 当前（深度3）
└── 1.2
2
└── 2.2
    └── 2.2.1 ← 按↓跳到这里（深度3）
```

## 3. 视图操作命令

| 命令 ID                 | 名称         | 快捷键  | 说明                                     | 状态      |
| ----------------------- | ------------ | ------- | ---------------------------------------- | --------- |
| `view.zoomIn`           | 放大视图     | `Cmd+=` | 放大画布视图 20%，保持中心点不变         | ✅ 已实现 |
| `view.zoomOut`          | 缩小视图     | `Cmd+-` | 缩小画布视图约 17%，保持中心点不变       | ✅ 已实现 |
| `view.zoomReset`        | 重置缩放     | `Cmd+0` | 重置缩放比例为 100%                      | ✅ 已实现 |
| `view.fitView`          | 适应视图     | `Cmd+1` | 调整视图以显示全部内容                   | ✅ 已实现 |
| `view.focusCurrentNode` | 聚焦当前节点 | `Cmd+L` | 将当前节点居中显示（保留 15% 边距）      | ✅ 已实现 |
| `view.panLeft`          | 向左平移     | `Alt+←` | 向左平移视图 100 个节点坐标系单位        | ✅ 已实现 |
| `view.panRight`         | 向右平移     | `Alt+→` | 向右平移视图 100 个节点坐标系单位        | ✅ 已实现 |
| `view.panUp`            | 向上平移     | `Alt+↑` | 向上平移视图 100 个节点坐标系单位        | ✅ 已实现 |
| `view.panDown`          | 向下平移     | `Alt+↓` | 向下平移视图 100 个节点坐标系单位        | ✅ 已实现 |
| `view.setViewport`      | 设置视口     | -       | 设置视口状态（内部命令，用于同步用户交互 | ✅ 已实现 |

**视口管理说明**：

- **坐标系统**: 所有视口坐标使用节点坐标系（pre-zoom），与节点的 x, y, width, height 在同一坐标系中
- **双向同步**: EditorState 和 React Flow 之间通过值比较实现双向同步，防止循环更新
- **自动聚焦**: 所有导航命令（选择节点）执行时会自动调用 `ensureNodeVisible`，确保目标节点在可视区域内
- **视口固定**: 停止了 React Flow 的自动 `fitView()` 行为，用户可以完全控制视图位置和缩放

详细设计请参考 [视口管理设计](./viewport-management-design.md)。

## 4. 全局操作命令

| 命令 ID                 | 名称            | 快捷键                                                                            | 说明                                           | 状态      |
| ----------------------- | --------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- | --------- |
| `global.copyAsMarkdown` | 复制为 Markdown | `Cmd+Shift+C`                                                                     | 将当前选中的节点及其子节点复制为 Markdown 格式 | ✅ 已实现 |
| `global.redo`           | 重做            | `Cmd+Shift+Z`                                                                     | 重做已撤销的操作                               | ✅ 已实现 |
| `global.save`           | 保存            | `Cmd+S`                                                                           | 保存思维导图到云端                             | ✅ 已实现 |
| `global.setFocusedArea` | 设置焦点区域    | `F1`(outline), `F2`(title), `F3`(note), `F4`(ai), `Cmd+I`(ai), `Cmd+Enter`(graph) | 切换焦点区域（大纲/标题/笔记/AI/图形）         | ✅ 已实现 |
| `global.undo`           | 撤销            | `Cmd+Z`                                                                           | 撤销上一次操作                                 | ✅ 已实现 |

## 4. AI 操作命令

| 命令 ID     | 名称    | 触发方式   | 说明                     | 状态      |
| ----------- | ------- | ---------- | ------------------------ | --------- |
| `ai.assist` | AI 助手 | 工具栏按钮 | 基于当前节点提供 AI 辅助 | ⏳ 待实现 |

## 快捷键快速查询

### 按键位分类

**字母和符号键**:

- `Tab` - 添加子节点
- `Enter` - 在下方添加兄弟节点
- `Delete` / `Backspace` - 删除节点
- `Space` - 聚焦标题编辑器

**功能键（焦点区域切换）**:

- `F1` - 聚焦大纲视图
- `F2` - 聚焦标题编辑器
- `F3` - 聚焦笔记编辑器
- `F4` - 聚焦 AI 助手

**方向键**:

- `↑` - 选择上一个同深度的节点
- `↓` - 选择下一个同深度的节点
- `←` - 选择父节点
- `→` - 选择第一个子节点

**Alt/Option 组合键**:

- `Alt+←` - 向左平移视图
- `Alt+→` - 向右平移视图
- `Alt+↑` - 向上平移视图
- `Alt+↓` - 向下平移视图

**Cmd 组合键** (Mac) / **Ctrl 组合键** (Windows/Linux):

- `Cmd+S` - 保存
- `Cmd+Z` - 撤销
- `Cmd+Shift+Z` - 重做
- `Cmd+Shift+C` - 复制为 Markdown
- `Cmd+I` - 聚焦 AI 助手
- `Cmd+Enter` - 聚焦图形视图
- `Cmd+C` - 复制
- `Cmd+X` - 剪切
- `Cmd+V` - 粘贴
- `Cmd+D` - 复制节点
- `Cmd+Shift+↑` - 上移节点
- `Cmd+Shift+↓` - 下移节点
- `Cmd+[` - 折叠节点
- `Cmd+]` - 展开节点
- `Cmd+\` - 递归折叠子树
- `Cmd+=` - 放大视图
- `Cmd+-` - 缩小视图
- `Cmd+0` - 重置缩放
- `Cmd+1` - 适应视图
- `Cmd+L` - 聚焦当前节点

**上下文快捷键**:

- `Enter`（在标题编辑器中）- 聚焦图形视图

## 命令使用示例

### 在代码中执行命令

```typescript
import { useMindmapStore } from "@/domain/mindmap-store";

// 获取 MindmapStore 实例
const root = useMindmapStore.getState();

// 执行命令 - 基本用法（使用默认参数）
root.executeCommand("node.addChild", {});

// 执行命令 - 传入命名参数
root.executeCommand("node.addChild", {
  parentId: "node-123",
  position: 0,
  title: "新节点",
});

// 执行命令 - 部分参数（其他使用默认值）
root.executeCommand("node.addSiblingBelow", {
  title: "兄弟节点",
});

// 执行批量创建子树命令
root.executeCommand("node.addChildTrees", {
  parentId: "parent-123",
  children: [
    { title: "节点1" },
    { title: "节点2", note: "笔记内容" },
    {
      title: "节点3",
      children: [{ title: "子节点3.1" }, { title: "子节点3.2" }],
    },
  ],
});
```

### 在 UI 组件中使用

```typescript
import { useMindmapStore } from "@/domain/mindmap-store";

function MyComponent() {
  const executeCommand = useMindmapStore((state) => state.executeCommand);

  const handleAddChild = () => {
    executeCommand("node.addChild", {
      title: "新子节点"
    });
  };

  const handleAddSibling = () => {
    executeCommand("node.addSiblingBelow", {
      nodeId: "specific-node-id",
      title: "新兄弟节点"
    });
  };

  return (
    <>
      <button onClick={handleAddChild}>添加子节点</button>
      <button onClick={handleAddSibling}>添加兄弟节点</button>
    </>
  );
}
```

### 绑定快捷键

快捷键绑定在 `src/domain/shortcuts/` 目录下定义：

```typescript
import {
  registerShortcut,
  registerShortcutForArea,
} from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

// 基本快捷键 - 无参数
registerShortcut("tab", "node.addChild", {}, true);

// 带参数的快捷键
registerShortcut(`${mod}+shift+c`, "global.copyAsMarkdown", {}, true);

// 区域特定快捷键
registerShortcutForArea(
  "title-editor",
  "enter",
  "global.setFocusedArea",
  { area: "graph" },
  true
);
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
- 命令对象名: camelCase + "Command"（如 `addChildNodeCommand`）
- 命令 ID: `{category}.{commandName}`（如 `node.addChild`）

**基本模板**:

```typescript
import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { MindmapStore } from "../../mindmap-store.types";
import { EditorAction } from "../../mindmap-store.types";
import { MyAction } from "../../actions/persistent/my-action";

// 1. 定义参数 Schema
export const MyCommandParamsSchema = z.object({
  nodeId: z.string().optional().describe("节点 ID，默认为当前选中节点"),
  value: z.string().describe("必需的参数值"),
  count: z.number().optional().describe("可选的数字参数"),
});

export type MyCommandParams = z.infer<typeof MyCommandParamsSchema>;

// 2. 定义命令
export const myCommand: CommandDefinition<typeof MyCommandParamsSchema> = {
  id: "category.myCommand",
  name: "我的命令",
  description: "执行我的操作",
  category: "node", // 或 "navigation", "view", "global", "ai"
  actionBased: true, // 是否返回 Action（true: 返回 Action，false: 直接执行）
  undoable: true, // 是否可撤销（仅当 actionBased = true 时有效）
  paramsSchema: MyCommandParamsSchema,

  // 可选：执行条件
  when: (root: MindmapStore, params: MyCommandParams) => {
    const nodeId = params.nodeId || root.currentEditor?.currentNode;
    return root.currentEditor?.nodes.has(nodeId || "") || false;
  },

  // 命令处理器
  handler: (
    root: MindmapStore,
    params: MyCommandParams
  ): EditorAction[] | void => {
    const { nodeId, value, count = 1 } = params;

    // 获取当前编辑器状态
    if (!root.currentEditor) return;

    // 解析目标节点
    const targetNodeId = nodeId || root.currentEditor.currentNode;
    const node = root.currentEditor.nodes.get(targetNodeId);

    // 提前返回避免错误
    if (!node) return;

    // 执行业务逻辑并返回 Action 数组
    return [
      new MyAction({
        nodeId: node.short_id,
        value,
        count,
      }),
      // 可以返回多个 Action
    ];
  },

  // 可选：动态描述
  getDescription: (root: MindmapStore, params: MyCommandParams) => {
    const nodeId = params.nodeId || root.currentEditor?.currentNode;
    const node = root.currentEditor?.nodes.get(nodeId || "");
    return node ? `操作节点：${node.title}` : "执行我的操作";
  },
};

// 3. 注册命令
registerCommand(myCommand);
```

**参数定义要点**：

- 使用 Zod 定义类型安全的参数 Schema
- 使用 `.optional()` 标记可选参数
- 使用 `.describe()` 添加参数说明（用于文档和 AI 提示）
- 使用 `z.infer<>` 自动推导 TypeScript 类型
- Handler 函数签名必须是 `(root: MindmapStore, params: YourParams) => ...`

#### 第3步：注册命令

命令定义完成后，使用 `registerCommand()` 函数注册即可：

```typescript
// 在命令文件末尾
registerCommand(myCommand);
```

命令注册后会自动添加到全局 `commandRegistry` 中，可以通过 `executeCommand()` 调用。

**注意**：命令文件需要被导入才能执行注册代码。确保在 `src/domain/commands/index.ts` 中导入：

```typescript
// src/domain/commands/index.ts
import "./node/add-child";
import "./node/add-sibling-below";
import "./category/my-command"; // 添加你的命令
// ... 其他命令导入
```

#### 第4步：绑定快捷键（可选）

在 `src/domain/shortcuts/` 目录下添加快捷键绑定：

```typescript
import { registerShortcut } from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

// 无参数快捷键
registerShortcut("k", "category.myCommand", {}, true);

// 带参数的快捷键
registerShortcut(
  `${mod}+k`,
  "category.myCommand",
  {
    value: "specific-value",
    count: 5,
  },
  true
);
```

**跨平台支持**: 使用 `getModifierKey()` 获取平台对应的修饰键（Mac: Cmd, Windows/Linux: Ctrl）。

#### 第5步：在 UI 中使用

```typescript
import { useMindmapStore } from "@/domain/mindmap-store";

function MyComponent() {
  const executeCommand = useMindmapStore((state) => state.executeCommand);

  const handleClick = () => {
    // 使用默认参数
    executeCommand("category.myCommand", {
      value: "required-value"
    });
  };

  const handleClickWithOptions = () => {
    // 使用完整参数
    executeCommand("category.myCommand", {
      nodeId: "specific-node-id",
      value: "custom-value",
      count: 10
    });
  };

  return (
    <>
      <button onClick={handleClick}>执行命令</button>
      <button onClick={handleClickWithOptions}>执行命令（带选项）</button>
    </>
  );
}
```

#### 第6步：编写测试

**测试文件**: `src/domain/commands/{category}/__tests__/{command-name}.test.ts`

**测试要点**:

- ✅ 测试参数验证（Zod schema validation）
- ✅ 测试 when() 条件是否正确判断
- ✅ 测试 handler 返回的 Action 类型和参数
- ✅ 测试边界情况（节点不存在、根节点等）
- ✅ 测试可选参数的默认值行为

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MyCommandParamsSchema, myCommand } from "../my-command";
import { createTestStore } from "../../../test-utils";

describe("category.myCommand", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe("参数验证", () => {
    it("应该接受有效的参数", () => {
      const result = MyCommandParamsSchema.safeParse({
        value: "test",
        count: 5,
      });
      expect(result.success).toBe(true);
    });

    it("应该拒绝无效的参数", () => {
      const result = MyCommandParamsSchema.safeParse({
        value: 123, // 应该是 string
      });
      expect(result.success).toBe(false);
    });

    it("应该允许省略可选参数", () => {
      const result = MyCommandParamsSchema.safeParse({
        value: "test",
        // count 是可选的
      });
      expect(result.success).toBe(true);
    });
  });

  describe("when() 条件", () => {
    it("当节点存在时应该返回 true", () => {
      // 设置测试数据
      const canExecute = myCommand.when?.(store, { value: "test" });
      expect(canExecute).toBe(true);
    });

    it("当节点不存在时应该返回 false", () => {
      const canExecute = myCommand.when?.(store, {
        nodeId: "non-existent",
        value: "test",
      });
      expect(canExecute).toBe(false);
    });
  });

  describe("handler()", () => {
    it("应该返回正确的 Action", () => {
      const actions = myCommand.handler(store, {
        value: "test-value",
        count: 3,
      });

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(MyAction);
    });

    it("当节点不存在时应该返回 undefined", () => {
      const actions = myCommand.handler(store, {
        nodeId: "non-existent",
        value: "test",
      });

      expect(actions).toBeUndefined();
    });
  });
});
```

#### 第7步：更新文档

在本文档的对应分类中添加命令条目，并更新修订历史。

### 最佳实践和常见陷阱

#### ✅ DO（推荐做法）

1. **使用 Zod Schema 定义参数**: 提供类型安全和运行时验证
2. **单一职责**: 每个命令只做一件事
3. **纯函数 when()**: when() 应该是无副作用的纯函数
4. **返回 Action**: handler 应该返回 Action 数组，不要直接修改状态
5. **条件检查**: 使用 when() 做前置条件检查
6. **处理空值**: 始终检查节点是否存在
7. **描述清晰**: description 应该清楚地说明命令的作用
8. **使用命名参数**: 参数以对象形式传递，提高可读性

```typescript
// ✅ 好的示例
export const MyCommandParamsSchema = z.object({
  nodeId: z.string().optional().describe("节点 ID"),
  title: z.string().optional().describe("标题"),
});

export const myCommand: CommandDefinition<typeof MyCommandParamsSchema> = {
  id: "node.myCommand",
  name: "我的命令",
  description: "执行操作",
  category: "node",
  actionBased: true,
  paramsSchema: MyCommandParamsSchema,

  when: (root, params) => {
    const nodeId = params.nodeId || root.currentEditor?.currentNode;
    return root.currentEditor?.nodes.has(nodeId || "") || false;
  },

  handler: (root, params) => {
    const { nodeId, title = "默认标题" } = params;
    if (!root.currentEditor) return;

    const targetNodeId = nodeId || root.currentEditor.currentNode;
    const node = root.currentEditor.nodes.get(targetNodeId);

    if (!node) return; // 处理空值

    return [
      new UpdateNodeAction({
        id: node.id,
        short_id: node.short_id,
        oldNode: { title: node.title },
        newNode: { title },
      }),
    ];
  },
};
```

#### ❌ DON'T（避免做法）

1. **不要使用位置参数（旧方式）**

```typescript
// ❌ 错误示例（旧方式）
handler: (root, ...args: unknown[]) => {
  const nodeId = args[0] as string;
  const title = args[1] as string;
  // 难以维护，容易出错
};

// ✅ 正确做法（新方式）
handler: (root, params) => {
  const { nodeId, title } = params;
  // 清晰、类型安全
};
```

2. **不要忘记定义 paramsSchema**

```typescript
// ❌ 错误示例
export const myCommand = {
  id: "node.myCommand",
  // 缺少 paramsSchema
  handler: (root, params) => { ... }
};

// ✅ 正确做法
export const MyCommandParamsSchema = z.object({
  nodeId: z.string().optional(),
});

export const myCommand: CommandDefinition<typeof MyCommandParamsSchema> = {
  id: "node.myCommand",
  paramsSchema: MyCommandParamsSchema, // 必需
  handler: (root, params) => { ... }
};
```

3. **不要在 handler 中直接修改状态**

```typescript
// ❌ 错误示例
handler: (root, params) => {
  if (!root.currentEditor) return;
  root.currentEditor.currentNode = params.nodeId; // 直接修改
};

// ✅ 正确做法
handler: (root, params) => {
  return [
    new SetCurrentNodeAction({
      newNodeId: params.nodeId,
      oldNodeId: root.currentEditor!.currentNode,
    }),
  ];
};
```

4. **不要在 when() 中包含副作用**

```typescript
// ❌ 错误示例
when: (root, params) => {
  console.log("checking..."); // 副作用
  return true;
};

// ✅ 正确做法
when: (root, params) => {
  const nodeId = params.nodeId || root.currentEditor?.currentNode;
  return root.currentEditor?.nodes.has(nodeId || "") || false; // 纯函数
};
```

5. **不要忘记处理边界情况**

```typescript
// ❌ 错误示例
handler: (root, params) => {
  if (!root.currentEditor) return;
  const node = root.currentEditor.nodes.get(params.nodeId!);
  return [new UpdateNodeAction({ ... })]; // node 可能为 undefined
};

// ✅ 正确做法
handler: (root, params) => {
  if (!root.currentEditor) return;

  const nodeId = params.nodeId || root.currentEditor.currentNode;
  const node = root.currentEditor.nodes.get(nodeId);

  if (!node) return; // 提前返回

  return [new UpdateNodeAction({ ... })];
};
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

| 日期       | 版本 | 修改内容                                                                                                     | 作者        |
| ---------- | ---- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| 2025-12-08 | 4.0  | 更新所有命令示例为对象参数形式；添加 Zod Schema 参数定义；更新命令定义模板；更新测试和最佳实践示例           | Claude Code |
| 2025-12-02 | 3.5  | 新增 navigation.collapseSubtreeRecursive 命令；修改快捷键（Cmd+[/]/\）；Space 改为聚焦标题；添加自动展开说明 | Claude Code |
| 2025-12-02 | 3.5  | 添加 global.copyAsMarkdown 命令及其快捷键（Cmd+Shift+C）                                                     | Claude Code |
| 2025-11-16 | 3.4  | 添加焦点区域切换快捷键（F1-F4, Cmd+I, Cmd+Enter），引用 FocusedAreaRegistry 设计                             | Claude Code |
| 2025-11-15 | 3.3  | 添加 node.addChildrenTree 命令，支持批量创建节点树                                                           | Claude Code |
| 2025-11-15 | 3.2  | 添加 actionBased 字段说明，更新命令总览表格                                                                  | Claude Code |
| 2025-11-09 | 3.1  | 改进导航命令支持堂兄弟节点导航，更新命令描述和快捷键说明                                                     | Claude Code |
| 2025-11-06 | 3.0  | 更新命令列表（20 个已实现），添加详细的扩展命令系统最佳实践                                                  | Claude Code |
| 2025-10-31 | 2.0  | 实现分类 1 和 2 的所有命令，更新分类 4 的命令 ID，添加状态列                                                 | Claude Code |
| 2025-10-19 | 1.0  | 初始版本，基于命令定义文档创建                                                                               | Claude Code |
