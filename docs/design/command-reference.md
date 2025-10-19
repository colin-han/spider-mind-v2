# 命令参考手册

## 元信息

- 作者：Claude Code
- 创建日期：2025-10-19
- 最后更新：2025-10-19
- 相关文档：
  - [命令系统设计](./command-system-design.md)
  - [快捷键系统设计](./shortcut-system-design.md)
  - [思维导图编辑器 Store 设计](./mindmap-editor-store-design.md)

## 概述

本文档提供思维导图编辑器所有命令的快速参考。命令按类别组织，每个命令包含 ID、名称、快捷键和简要说明。

详细的设计和实现说明请参考 [命令系统设计](./command-system-design.md)。

## 命令总览

| 分类     | 命令数量 | 实现状态       |
| -------- | -------- | -------------- |
| 节点操作 | 10       | ✅ 已实现      |
| 导航操作 | 7        | ✅ 已实现      |
| 编辑操作 | 4        | ✅ 已实现      |
| 全局操作 | 3        | 部分实现 (1/3) |
| AI 操作  | 1        | ⏳ 待实现      |
| **总计** | **25**   | **22 已实现**  |

## 1. 节点操作命令

| 命令 ID                | 名称               | 快捷键                 | 说明                         |
| ---------------------- | ------------------ | ---------------------- | ---------------------------- |
| `node.addChild`        | 添加子节点         | `Tab`                  | 在当前节点下添加子节点       |
| `node.addSiblingAbove` | 在上方添加兄弟节点 | -                      | 在当前节点上方添加兄弟节点   |
| `node.addSiblingBelow` | 在下方添加兄弟节点 | `Enter`                | 在当前节点下方添加兄弟节点   |
| `node.delete`          | 删除节点           | `Delete` / `Backspace` | 删除当前节点及其子节点       |
| `node.edit`            | 编辑节点           | `F2`                   | 进入节点编辑模式             |
| `node.finishEdit`      | 完成编辑           | `Esc` (Panel)          | 退出节点编辑模式             |
| `node.indent`          | 增加缩进           | `Cmd+]`                | 将节点变为上一个兄弟的子节点 |
| `node.outdent`         | 减少缩进           | `Cmd+[`                | 将节点提升为父节点的兄弟     |
| `node.moveUp`          | 上移节点           | `Cmd+Shift+↑`          | 在兄弟节点中向上移动         |
| `node.moveDown`        | 下移节点           | `Cmd+Shift+↓`          | 在兄弟节点中向下移动         |

## 2. 导航操作命令

| 命令 ID                            | 名称               | 快捷键  | 说明                    |
| ---------------------------------- | ------------------ | ------- | ----------------------- |
| `navigation.selectParent`          | 选择父节点         | `←`     | 跳转到父节点            |
| `navigation.selectFirstChild`      | 选择第一个子节点   | `→`     | 跳转到第一个子节点      |
| `navigation.selectPreviousSibling` | 选择上一个兄弟节点 | `↑`     | 跳转到上一个兄弟节点    |
| `navigation.selectNextSibling`     | 选择下一个兄弟节点 | `↓`     | 跳转到下一个兄弟节点    |
| `navigation.collapseNode`          | 折叠节点           | `-`     | 折叠当前节点的子节点    |
| `navigation.expandNode`            | 展开节点           | `=`     | 展开当前节点的子节点    |
| `navigation.toggleCollapse`        | 切换折叠状态       | `Space` | 切换节点的展开/折叠状态 |

## 3. 编辑操作命令

| 命令 ID          | 名称     | 快捷键  | 说明                   |
| ---------------- | -------- | ------- | ---------------------- |
| `edit.copy`      | 复制节点 | `Cmd+C` | 复制当前节点到剪贴板   |
| `edit.cut`       | 剪切节点 | `Cmd+X` | 剪切当前节点到剪贴板   |
| `edit.paste`     | 粘贴节点 | `Cmd+V` | 粘贴剪贴板内容为子节点 |
| `edit.duplicate` | 复制节点 | `Cmd+D` | 复制节点作为兄弟节点   |

> **注意**: 当前使用内存剪贴板实现，跨文档复制粘贴功能待实现。

## 4. 全局操作命令

| 命令 ID       | 名称 | 快捷键        | 说明               | 状态      |
| ------------- | ---- | ------------- | ------------------ | --------- |
| `global.save` | 保存 | `Cmd+S`       | 保存思维导图到云端 | ✅ 已实现 |
| `global.undo` | 撤销 | `Cmd+Z`       | 撤销上一次操作     | ⏳ 待实现 |
| `global.redo` | 重做 | `Cmd+Shift+Z` | 重做已撤销的操作   | ⏳ 待实现 |

## 5. AI 操作命令

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
- `Cmd+]` - 增加缩进
- `Cmd+[` - 减少缩进
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

快捷键绑定在 `lib/shortcuts/bindings/` 目录下定义：

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

### 添加新命令

1. 在 `lib/commands/definitions/` 目录下定义命令
2. 注册到 `lib/commands/registry.ts`
3. (可选) 在 `lib/shortcuts/bindings/` 添加快捷键绑定
4. 更新本参考文档

示例：

```typescript
// lib/commands/definitions/custom.commands.ts
export const myCommand: Command = {
  id: "custom.myCommand",
  name: "我的命令",
  description: "执行自定义操作",
  category: "node",

  handler: (ctx) => {
    // 实现逻辑
  },

  when: (ctx) => ctx.selectedNode !== null,
};
```

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

- [命令系统设计](./command-system-design.md) - 详细的设计和架构说明
- [快捷键系统设计](./shortcut-system-design.md) - 快捷键系统的设计和实现
- [思维导图编辑器 Store 设计](./mindmap-editor-store-design.md) - 状态管理设计
- [react-hotkeys-hook](https://react-hotkeys-hook.vercel.app/) - 快捷键库文档
- [VSCode Keybindings](https://code.visualstudio.com/docs/getstarted/keybindings) - VSCode 快捷键最佳实践

## 修订历史

| 日期       | 版本 | 修改内容                       | 作者        |
| ---------- | ---- | ------------------------------ | ----------- |
| 2025-10-19 | 1.0  | 初始版本，基于命令定义文档创建 | Claude Code |
