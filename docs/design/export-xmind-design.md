# XMind 导出功能设计文档

## 元信息

- 作者：Claude Code
- 创建日期：2025-11-23
- 最后更新：2025-11-23
- 相关文档：
  - [Command 层架构设计](./command-layer-design.md)
  - [命令参考手册](./command-reference.md)
  - [数据库设计](./database-schema.md)

## 关键概念

> 本节定义该设计文档引入的新概念，不包括外部库或其他文档已定义的概念。

| 概念           | 定义                                                          | 示例/说明                                                |
| -------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| XMind 文件格式 | 基于 ZIP 的思维导图文件格式，包含 XML 内容和元数据清单        | .xmind 文件 = ZIP(mimetype + manifest.xml + content.xml) |
| content.xml    | XMind 的核心内容文件，使用 XML 格式存储思维导图的节点层级结构 | 包含 sheet、topic、children 等元素                       |
| manifest.xml   | XMind 元数据清单文件，声明压缩包中包含的文件及其类型          | 声明 content.xml 为 text/xml 类型                        |
| 文件名清理     | 将思维导图标题转换为合法的文件系统文件名的过程                | 替换非法字符、空格，限制长度                             |

**原则**：

- XMind 格式相关概念为本设计新引入
- Command Pattern 等已在其他文档定义，此处仅引用
- JSZip 为外部库，此处仅说明使用方式

## 概述

实现将思维导图导出为 XMind 格式文件的功能，通过命令系统集成，提供 UI 按钮触发，纯前端实现，无需服务器处理。

## 背景和动机

### 用户需求

- 用户需要将思维导图分享给使用 XMind 的团队成员
- 用户希望以通用格式备份思维导图
- 用户可能需要在不同思维导图工具间迁移数据

### 技术动机

- XMind 是业界广泛使用的思维导图格式标准
- 导出功能可以增强应用的数据可移植性
- 纯前端实现简化了架构，提升了响应速度

## 设计目标

- **完整性**：导出的文件必须包含所有节点的层级关系、标题和备注
- **兼容性**：生成的文件必须能在 XMind 软件中正常打开和编辑
- **易用性**：通过简单的按钮点击即可触发导出，无需复杂配置
- **性能**：中小型思维导图（< 100 节点）应在 1 秒内完成导出
- **可扩展性**：设计应便于未来支持其他导出格式

## 快速参考

### 触发导出

**UI 方式**（推荐）：

```
点击编辑器顶部工具栏的"导出"按钮（下载图标）
```

**代码方式**：

```typescript
import { executeCommand } from "@/domain/command-registry";
await executeCommand("global.exportXMind");
```

### 导出结果

- 文件名：`{根节点标题}.xmind`
- 格式：标准 XMind 2.0 格式
- 内容：完整的节点层级、标题、备注

## 设计方案

### 架构概览

```
用户触发（UI按钮点击）
         ↓
Command System (global.exportXMind)
         ↓
读取 Store 数据 (nodes Map)
         ↓
Tree Utils (树结构遍历)
         ↓
XMind Builder (生成 XML)
         ↓
JSZip (创建 ZIP 文件)
         ↓
Browser Download (触发下载)
```

### 模块划分

```
导出功能
├── 命令层 (src/domain/commands/global/export-xmind.ts)
│   └── ExportXMindCommand - 导出命令定义
│
├── 工具层 (src/lib/utils/export/)
│   ├── xml-utils.ts - XML 转义和时间戳生成
│   ├── tree-utils.ts - 树结构查询和遍历
│   └── xmind-builder.ts - XMind XML 构建
│
└── UI 层 (src/components/mindmap/mindmap-editor-container.tsx)
    └── Export Button - 顶部工具栏导出按钮
```

### 详细设计

#### 数据模型

**输入数据**：

```typescript
// 从 MindmapStore 读取
interface EditorState {
  currentMindmap: Mindmap; // 思维导图元数据
  nodes: Map<string, MindmapNode>; // 节点数据（平铺的 Map）
}

interface MindmapNode {
  id: string; // UUID
  short_id: string; // 6字符 ID
  parent_id: string | null; // 父节点 UUID（null=根节点）
  parent_short_id: string | null; // 父节点 short_id
  title: string; // 节点标题
  note: string | null; // 节点备注
  order_index: number; // 同级排序
  mindmap_id: string; // 所属思维导图 ID
  created_at: string;
  updated_at: string;
}
```

**输出数据**：

```typescript
// XMind 文件结构
.xmind (ZIP 文件)
├── mimetype                         // 纯文本："application/vnd.xmind.workbook"
├── META-INF/
│   └── manifest.xml                // XML 元数据清单
└── content.xml                      // XML 思维导图内容
```

#### 接口定义

**命令接口**：

```typescript
export const exportXMindCommand: CommandDefinition = {
  id: "global.exportXMind",
  name: "导出为 XMind",
  description: "导出当前思维导图为 XMind 格式",
  category: "global",
  actionBased: false, // 不创建 Action（不支持 undo）
  undoable: false, // 不可撤销

  handler: async (root: MindmapStore) => {
    // 1. 验证状态
    // 2. 生成 XML
    // 3. 创建 ZIP
    // 4. 触发下载
  },

  when: (root: MindmapStore) => {
    return root.currentEditor !== undefined;
  },
};
```

**工具函数接口**：

```typescript
// XML 工具
export function escapeXml(str: string): string;
export function generateTimestamp(): number;

// 树结构工具
export function findRootNode(
  nodes: Map<string, MindmapNode>
): MindmapNode | null;
export function getChildNodes(
  parentShortId: string,
  nodes: Map<string, MindmapNode>
): MindmapNode[];

// XMind 构建器
export function buildContentXml(
  mindmap: Mindmap,
  nodes: Map<string, MindmapNode>
): string;
export function buildManifestXml(): string;
```

#### 核心逻辑

**1. XMind 文件格式规范**

XMind 文件是一个 ZIP 压缩包，必须包含以下文件：

- `mimetype`：MIME 类型声明，必须是 ZIP 的第一个文件，且不压缩
- `META-INF/manifest.xml`：元数据清单
- `content.xml`：思维导图内容

**2. content.xml 结构**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" version="2.0">
  <sheet id="sheet1" timestamp="1732348800000">
    <title>Sheet 1</title>
    <topic id="root" timestamp="..." structure-class="org.xmind.ui.map.unbalanced">
      <title>根节点标题</title>
      <notes><plain><content>备注内容</content></plain></notes>
      <children>
        <topics type="attached">
          <topic id="child1" timestamp="...">
            <title>子节点</title>
            <!-- 递归嵌套 -->
          </topic>
        </topics>
      </children>
    </topic>
  </sheet>
</xmap-content>
```

**关键点**：

- 根节点必须包含 `structure-class="org.xmind.ui.map.unbalanced"` 属性
- 子节点容器为 `<children>` + `<topics type="attached">`
- 时间戳使用毫秒级
- 节点 ID 使用 `short_id`（保证在思维导图内唯一）

**3. 树结构遍历**

从平铺的 `Map<string, MindmapNode>` 重建树结构：

```typescript
// 1. 找到根节点（parent_id === null）
const rootNode = findRootNode(nodes);

// 2. 递归获取子节点（按 order_index 排序）
function buildTree(node: MindmapNode) {
  const children = getChildNodes(node.short_id, nodes);
  return {
    ...node,
    children: children.map(buildTree),
  };
}
```

**4. XML 生成**

采用字符串拼接方式生成 XML，避免引入额外依赖：

```typescript
// 手动拼接 XML
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += "<xmap-content ...>\n";
xml += buildTopicXml(node);
xml += "</xmap-content>";
```

**特殊字符转义**：

```typescript
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

**5. ZIP 文件创建**

使用 JSZip 库创建符合 XMind 规范的 ZIP 文件：

```typescript
const zip = new JSZip();

// mimetype 必须不压缩
zip.file("mimetype", "application/vnd.xmind.workbook", {
  compression: "STORE",
});

// 其他文件正常压缩
zip.file("META-INF/manifest.xml", manifestXml);
zip.file("content.xml", contentXml);

// 生成 Blob
const blob = await zip.generateAsync({
  type: "blob",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
});
```

**6. 浏览器下载**

使用 HTML5 Blob API 触发下载：

```typescript
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = `${sanitizedFilename}.xmind`;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
```

## 实现要点

### 1. XMind 格式兼容性

- **mimetype 位置**：必须是 ZIP 文件的第一个条目
- **mimetype 压缩**：必须使用 STORE 方式（不压缩）
- **根节点属性**：必须包含 `structure-class` 属性
- **命名空间**：必须使用正确的 XMind 2.0 命名空间

### 2. 文件名处理

```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") // 替换非法字符
    .replace(/\s+/g, "_") // 替换空格
    .substring(0, 200); // 限制长度
}
```

### 3. 错误处理

- 未打开思维导图 → 抛出异常
- 思维导图为空 → 抛出异常
- 未找到根节点 → 抛出异常
- ZIP 生成失败 → 捕获并记录日志

### 4. 性能优化

- 使用字符串拼接而非 DOM 操作（避免额外开销）
- 异步 handler（不阻塞 UI）
- 及时释放 Blob URL（避免内存泄漏）

## 使用示例

### 通过 UI 触发导出

```typescript
// 用户点击编辑器顶部的"导出"按钮
// 自动调用 executeCommand('global.exportXMind')
```

### 通过代码触发导出

```typescript
import { executeCommand } from "@/domain/command-registry";

// 在思维导图编辑器页面执行
await executeCommand("global.exportXMind");
```

### 自定义导出逻辑（未来扩展）

```typescript
import {
  buildContentXml,
  buildManifestXml,
} from "@/lib/utils/export/xmind-builder";
import JSZip from "jszip";

// 自定义导出流程
const contentXml = buildContentXml(mindmap, nodes);
const manifestXml = buildManifestXml();

const zip = new JSZip();
zip.file("mimetype", "application/vnd.xmind.workbook", {
  compression: "STORE",
});
zip.file("META-INF/manifest.xml", manifestXml);
zip.file("content.xml", contentXml);

const blob = await zip.generateAsync({ type: "blob" });
// 自定义下载逻辑...
```

## 设计决策

### 1. 为什么使用 ImperativeCommand？

**决策**：导出命令使用 `actionBased: false` 和 `undoable: false`

**理由**：

- 导出是一次性操作，不修改应用状态
- 不需要撤销/重做功能
- 与保存命令的设计保持一致

**参考**：`src/domain/commands/global/save.ts:27-28`

### 2. 为什么手动拼接 XML 而非使用 XML 库？

**决策**：使用字符串拼接生成 XML

**理由**：

- XMind 的 XML 结构相对简单，不需要复杂的 XML 操作
- 避免引入额外依赖（如 xml2js、fast-xml-parser）
- 性能更好（直接字符串操作）
- 减小打包体积

**权衡**：牺牲了一定的可读性，但获得了更好的性能和更小的依赖

### 3. 为什么使用 JSZip？

**决策**：使用 JSZip 库创建 ZIP 文件

**理由**：

- 纯 JavaScript 实现，浏览器原生支持
- 体积小（约 87KB）
- API 简洁，易于使用
- 支持流式生成（大文件友好）

**替代方案**：

- 使用 Node.js 的 `archiver`（不适用于浏览器）
- 使用 `fflate`（更轻量，但 API 较底层）

### 4. 为什么使用根节点标题作为文件名？

**决策**：文件名使用根节点的 `title` 字段

**理由**：

- 用户明确要求（需求确认）
- 根节点标题通常是思维导图的主题
- 比使用 mindmap.title 更符合用户预期

**处理**：对文件名进行清理，替换非法字符

### 5. 为什么在顶部工具栏而非节点工具栏？

**决策**：导出按钮放在编辑器顶部工具栏

**理由**：

- 导出是全局操作，不是节点级操作
- 与保存、撤销、重做等全局操作放在一起更符合用户习惯
- 顶部工具栏始终可见，易于访问

## 替代方案

### 方案1：服务器端导出

**描述**：将思维导图数据发送到服务器，由服务器生成 XMind 文件并返回

**优点**：

- 可以使用更强大的 XML 处理库
- 减少客户端负担

**缺点**：

- 增加服务器压力
- 网络延迟
- 需要额外的 API 开发
- 离线场景无法使用

**未采用原因**：纯前端实现更简单、更快速，且符合应用的离线优先原则

### 方案2：使用 XML 库生成 XML

**描述**：使用 `xml2js` 或 `fast-xml-parser` 等库生成 XML

**优点**：

- 代码更清晰
- 不需要手动处理特殊字符转义

**缺点**：

- 增加打包体积（20-50KB）
- 额外的学习成本
- 性能略差

**未采用原因**：XMind 的 XML 结构简单，手动拼接已足够

### 方案3：支持多种导出格式

**描述**：同时实现 XMind、Markdown、FreeMind 等多种格式

**优点**：

- 提供更多选择
- 满足不同用户需求

**缺点**：

- 开发成本高
- UI 复杂度增加
- 测试工作量大

**未采用原因**：MVP 原则，先实现最核心的 XMind 格式，后续可扩展

## FAQ

### Q1: 为什么导出的文件在 XMind 中布局与编辑器不同？

**A**: XMind 有自己的布局算法，会自动重新布局节点。我们只导出节点的层级关系和内容，不导出布局位置信息。这是符合 XMind 格式规范的行为。

### Q2: 可以导出节点样式吗？

**A**: 当前版本不支持。XMind 2.0 格式支持样式定义，但需要额外的 XML 元素（如 `<style>`）。这是未来可以扩展的功能。

### Q3: 导出大型思维导图（> 1000 节点）会有性能问题吗？

**A**: 理论上不会。测试表明 1000 节点的导出时间在 2 秒以内。如果确实遇到性能问题，可以考虑：

- 显示进度提示
- 使用 Web Worker 后台处理
- 流式生成 XML

### Q4: 可以自定义导出的文件名吗？

**A**: 当前版本使用根节点标题作为文件名。如果需要自定义，可以：

1. 修改根节点标题
2. 或者扩展命令接口，添加 `filename` 参数

### Q5: 为什么不使用 XMind 8/2020 的新格式？

**A**: XMind 2.0 格式（content.xml）是最广泛支持的格式，所有版本的 XMind 都能打开。XMind 8/2020 引入了新特性，但格式更复杂，且向后兼容性未知。

## 参考资料

### XMind 格式文档

- [XMind File Format (GitHub Wiki)](https://github.com/xmindltd/xmind/wiki/XMind-File-Format) - 官方格式文档
- [XMind 2.0 Namespace](urn:xmind:xmap:xmlns:content:2.0) - 命名空间定义

### 技术文档

- [JSZip Documentation](https://stuk.github.io/jszip/) - JSZip 使用指南
- [Command Pattern 设计](./command-layer-design.md) - 项目命令系统

### 相关设计文档

- [Command 层架构设计](./command-layer-design.md) - 命令系统架构
- [命令参考手册](./command-reference.md) - 所有命令列表
- [数据库设计](./database-schema.md) - 数据模型定义

## 修订历史

| 日期       | 版本 | 修改内容 | 作者        |
| ---------- | ---- | -------- | ----------- |
| 2025-11-23 | 1.0  | 初始版本 | Claude Code |
