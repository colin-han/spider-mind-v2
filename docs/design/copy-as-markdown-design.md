# 复制为 Markdown 功能设计

## 元信息

- 作者：Claude Code
- 创建日期：2025-12-02
- 最后更新：2025-12-02 (v1.1.0)
- 相关文档：
  - [Command 层架构设计](./command-layer-design.md)
  - [命令参考手册](./command-reference.md)
  - [XMind 导出功能设计](./export-xmind-design.md)

## 关键概念

> 本节定义该设计文档引入的新概念。

| 概念                   | 定义                                                                         | 示例/说明                                          |
| ---------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Markdown 标题转义      | 将节点标题中的 Markdown 特殊字符进行反斜杠转义，防止被误解析为 Markdown 语法 | `项目*规划` → `# 项目\*规划`                       |
| 笔记代码块包裹         | 当笔记内容包含 `#` 时，使用 markdown 代码块包裹以避免干扰文档层级结构        | 包含 `# 标题` 的笔记 → 使用 \`\`\`markdown 包裹    |
| 自适应代码块标记       | 根据笔记内容自动选择合适的代码块标记，避免与笔记中的反引号冲突               | 笔记中有 \`\`\` → 使用 \`\`\`\` 包裹               |
| 层级对应 Markdown 标题 | 使用 `#` 的数量表示节点层级，支持超过 6 级                                   | 第 1 级 → `#`，第 2 级 → `##`，第 7 级 → `#######` |

## 概述

实现一个"复制为 Markdown"命令，允许用户通过快捷键将当前选中的节点及其所有子节点导出为 Markdown 格式的文本，并自动复制到系统剪贴板。该功能保持了思维导图的层级结构，正确处理特殊字符，支持笔记内容导出。

## 背景和动机

用户经常需要将思维导图的内容分享到其他支持 Markdown 的应用中（如笔记软件、文档编辑器、协作平台等）。手动复制粘贴会丢失层级结构，而导出为文件又过于繁琐。因此需要一个快捷的方式，将思维导图的局部内容转换为 Markdown 格式并复制到剪贴板。

### 核心需求

1. 快速导出：通过快捷键一键完成
2. 保持结构：层级关系通过 Markdown 标题体现
3. 内容完整：包含节点标题和笔记
4. 格式正确：正确处理 Markdown 特殊字符
5. 即时可用：自动复制到剪贴板

## 设计目标

- ✅ 提供快捷的 Markdown 导出方式
- ✅ 保持思维导图的层级结构
- ✅ 正确处理 Markdown 特殊字符
- ✅ 智能处理笔记内容中的 `#` 符号
- ✅ 支持无限层级深度
- ✅ 遵循 Command 层架构设计

## 快速参考

### 使用方法

1. 在思维导图中选中一个节点
2. 按下快捷键：
   - Mac: `Cmd+Shift+C`
   - Windows/Linux: `Ctrl+Shift+C`
3. Markdown 文本自动复制到剪贴板

### 导出格式示例

````markdown
# 项目规划

## 第一阶段

### 需求分析

收集用户需求，编写需求文档

### 技术选型

```markdown
评估技术方案，确定技术栈

# 框架

- React 18
```
````

```

### 核心函数

- `buildMarkdownFromNode(node, allNodes, level)` - 生成 Markdown 文本
- `escapeMarkdownTitle(title)` - 转义标题特殊字符
- `formatNoteContent(note)` - 格式化笔记内容
- `findCodeFenceMarker(note)` - 查找合适的代码块标记

## 设计方案

### 架构概览

```

用户按快捷键
↓
ShortcutManager 触发
↓
CommandManager 执行 "global.copyAsMarkdown"
↓
CopyAsMarkdownCommand.handler()
↓
├─ 1. 获取当前选中节点
├─ 2. buildMarkdownFromNode() 遍历节点树
│ ├─ escapeMarkdownTitle() 转义标题
│ ├─ formatNoteContent() 处理笔记
│ └─ 递归处理子节点
├─ 3. navigator.clipboard.writeText() 复制到剪贴板
└─ 4. 显示成功日志

```

### 详细设计

#### 模块组织

```

src/
├─ domain/
│ └─ commands/
│ └─ global/
│ └─ copy-as-markdown.ts # 命令定义
└─ lib/
└─ utils/
└─ export/
└─ markdown-builder.ts # Markdown 生成逻辑

````

#### 命令定义

命令遵循 [Command 层架构设计](./command-layer-design.md)，使用 `ImperativeCommandDefinition`（不需要 undo/redo）：

```typescript
export const copyAsMarkdownCommand: CommandDefinition = {
  id: "global.copyAsMarkdown",
  name: "复制为 Markdown",
  description: "将当前选中的节点及其子节点复制为 Markdown 格式",
  category: "global",
  actionBased: false,
  undoable: false,

  handler: async (root: MindmapStore) => {
    // 1. 检查前置条件
    // 2. 获取选中节点
    // 3. 生成 Markdown
    // 4. 复制到剪贴板
  },

  when: (root: MindmapStore) => {
    return root.currentEditor !== undefined &&
           root.currentEditor.currentNode !== undefined;
  },
};
````

#### Markdown 生成逻辑

**核心算法**：深度优先遍历（DFS）

```typescript
function buildMarkdownFromNode(node, allNodes, level) {
  // 1. 处理当前节点标题
  const heading = `${"#".repeat(level)} ${escapeMarkdownTitle(node.title)}`;

  // 2. 处理笔记内容（如有）
  const note = node.note ? formatNoteContent(node.note) : "";

  // 3. 递归处理子节点
  const children = getChildNodes(node.short_id, allNodes);
  const childrenMarkdown = children.map((child) =>
    buildMarkdownFromNode(child, allNodes, level + 1)
  );

  // 4. 组装结果
  return [heading, note, ...childrenMarkdown].filter(Boolean).join("\n\n");
}
```

#### 特殊字符转义

需要转义的 Markdown 特殊字符：

```typescript
const specialChars = [
  "\\", // 反斜杠（必须首先处理）
  "`",
  "*",
  "_",
  "[",
  "]",
  "{",
  "}",
  "(",
  ")",
  "#",
  "+",
  "-",
  ".",
  "!",
  "|",
];
```

**关键点**：反斜杠必须首先处理，避免双重转义。

#### 笔记内容处理

**决策树**：

`````
笔记内容包含 # ?
├─ 否 → 直接输出
└─ 是 → 使用 markdown 代码块包裹
        ↓
        笔记中包含 ``` ?
        ├─ 否 → 使用 ```markdown 包裹
        └─ 是 → 使用 ````markdown 包裹（递增查找）
`````

**算法**：

```typescript
function findCodeFenceMarker(note: string): string {
  let backtickCount = 3;
  while (backtickCount <= 20) {
    const marker = "`".repeat(backtickCount);
    if (!note.includes(marker)) {
      return marker;
    }
    backtickCount++;
  }
  throw new Error("无法找到合适的代码块标记");
}
```

#### 剪贴板集成

使用现代 Clipboard API：

```typescript
await navigator.clipboard.writeText(markdown);
```

**浏览器兼容性**：

- Chrome 63+
- Firefox 53+
- Safari 13.1+
- Edge 79+

**权限处理**：

- HTTPS 环境自动授权
- 用户交互触发（快捷键）无需额外授权
- 捕获权限被拒绝错误并友好提示

## 实现要点

### 1. 特殊字符转义顺序

反斜杠必须首先处理：

```typescript
// ❌ 错误：会导致双重转义
escaped = title.replaceAll("*", "\\*");
escaped = escaped.replaceAll("\\", "\\\\"); // \\* 变成 \\\\*

// ✅ 正确：先处理反斜杠
escaped = title.replaceAll("\\", "\\\\");
escaped = escaped.replaceAll("*", "\\*");
```

### 2. 笔记中的 `#` 处理

只有笔记内容包含 `#` 时才使用 markdown 代码块包裹，避免不必要的代码块标记。

### 3. 子节点排序

使用 `order_index` 字段排序，确保导出顺序与思维导图中的显示顺序一致：

```typescript
children.sort((a, b) => a.order_index - b.order_index);
```

### 4. 层级深度支持

支持无限层级深度，即使超过 Markdown 标准的 6 级标题：

```typescript
const headingPrefix = "#".repeat(level); // 不限制层级数量
```

### 5. 错误处理

处理剪贴板权限被拒绝的情况：

```typescript
catch (error) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    throw new Error("剪贴板权限被拒绝，请允许访问剪贴板");
  }
  throw error;
}
```

## 使用示例

### 示例1：基本导出

**输入**（思维导图结构）：

```
项目规划
├─ 第一阶段
│  └─ 需求分析
└─ 第二阶段
```

**输出**（Markdown）：

```markdown
# 项目规划

## 第一阶段

### 需求分析

## 第二阶段
```

### 示例2：包含特殊字符

**输入**：

```
产品特性*
└─ [重要] 用户认证
```

**输出**：

```markdown
# 产品特性\*

## \[重要\] 用户认证
```

### 示例3：笔记包含 `#`

**输入**：

```
技术方案
└─ 前端架构
   Note: # 框架
         - React 18
```

**输出**：

````markdown
# 技术方案

## 前端架构

```
# 框架
- React 18
```
````

## 设计决策

### 决策1：为什么笔记中的 `#` 需要特殊处理？

**问题**：笔记内容可能包含 `#` 符号，如果直接输出会被误认为是 Markdown 标题，破坏文档的层级结构。

**方案对比**：

| 方案                     | 优点                       | 缺点             | 结论 |
| ------------------------ | -------------------------- | ---------------- | ---- |
| 转义 `#` 为 `\#`         | 简单直接                   | 影响笔记的可读性 | ❌   |
| 使用 markdown 代码块包裹 | 保持内容原样，支持语法高亮 | 增加少量标记     | ✅   |
| 使用引用块 `>`           | Markdown 原生支持          | 多行引用格式复杂 | ❌   |

**决定**：使用代码块包裹，既保持了笔记内容的原样，又避免了层级结构混乱。

### 决策2：为什么支持超过 6 级的标题？

**问题**：Markdown 标准只支持 6 级标题（`#` 到 `######`），但思维导图可能有更深的层级。

**方案对比**：

| 方案                   | 优点               | 缺点                        | 结论 |
| ---------------------- | ------------------ | --------------------------- | ---- |
| 限制最多 6 级          | 符合 Markdown 标准 | 丢失层级信息                | ❌   |
| 超过 6 级使用列表      | 兼容性好           | 格式不一致                  | ❌   |
| 继续使用对应数量的 `#` | 保持结构一致性     | 超过 6 级可能不被识别为标题 | ✅   |

**决定**：继续使用对应数量的 `#`，保持层级对应关系的一致性。虽然超过 6 级的标题可能不被某些渲染器识别，但不会破坏文档结构，且在支持扩展语法的编辑器中可能正确显示。

### 决策3：为什么使用深度优先遍历？

**问题**：节点树遍历有多种方式（深度优先、广度优先、层序遍历等）。

**决定**：使用深度优先遍历（DFS），因为：

1. 符合 Markdown 文档的自然阅读顺序
2. 递归实现简洁清晰
3. 节点数量通常不大，不会导致栈溢出
4. 如需优化，可改为迭代实现

### 决策4：为什么使用 Clipboard API 而非 document.execCommand？

**问题**：有多种方式实现复制到剪贴板。

**方案对比**：

| 方案                  | 优点                | 缺点         | 结论 |
| --------------------- | ------------------- | ------------ | ---- |
| Clipboard API（现代） | 异步、Promise、安全 | 需要 HTTPS   | ✅   |
| document.execCommand  | 兼容老浏览器        | 已废弃、同步 | ❌   |

**决定**：使用 Clipboard API，因为：

1. 现代浏览器标准 API
2. 异步操作，不阻塞 UI
3. 项目已要求 HTTPS 环境
4. 更好的错误处理机制

## 替代方案

### 方案1：导出为文件

**描述**：将 Markdown 导出为 `.md` 文件并下载。

**优点**：

- 可保存为永久文件
- 支持更复杂的导出选项

**缺点**：

- 操作步骤更多
- 不适合快速分享

**结论**：作为未来扩展功能，当前优先实现快速复制。

### 方案2：批量导出多个节点

**描述**：支持选中多个节点同时导出。

**优点**：

- 更灵活的导出方式
- 可导出不相邻的节点

**缺点**：

- 实现复杂度增加
- 需要设计多选 UI

**结论**：作为未来扩展功能。

## FAQ

### Q1：为什么不使用 HTML 格式？

A：Markdown 格式更简洁、更通用，几乎所有现代笔记和文档工具都支持 Markdown。HTML 格式虽然更丰富，但不利于快速编辑和阅读。

### Q2：能否自定义导出格式？

A：当前版本不支持自定义格式，未来可考虑添加配置选项，如使用列表而非标题、自定义标题前缀等。

### Q3：大量节点会不会有性能问题？

A：当前使用递归实现，理论上节点数量在 1000 以内不会有明显延迟。如果遇到性能问题，可以改用迭代算法。

### Q4：为什么快捷键是 Cmd+Shift+C？

A：

- `Cmd+C`：系统默认复制快捷键
- `Cmd+Shift+C`：增加 Shift 表示特殊复制功能
- 不与现有快捷键冲突

## 参考资料

- [Markdown 规范](https://commonmark.org/)
- [Clipboard API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [Command 层架构设计](./command-layer-design.md)
- [XMind 导出功能设计](./export-xmind-design.md)

## 修订历史

| 日期       | 版本  | 修改内容                                          | 作者        |
| ---------- | ----- | ------------------------------------------------- | ----------- |
| 2025-12-02 | 1.1.0 | 更新笔记代码块格式：从 \`\`\` 改为 \`\`\`markdown | Claude Code |
| 2025-12-02 | 1.0.0 | 初始版本                                          | Claude Code |
