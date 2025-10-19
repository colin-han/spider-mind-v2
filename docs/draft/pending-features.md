# 待实现功能清单

> 文档状态: 草稿 | Draft
> 创建日期: 2025-10-19
> 最后更新: 2025-10-19

本文档列出了命令系统和快捷键系统中规划但尚未实现的功能，按优先级排序。

## 功能概览

| 优先级   | 功能类别      | 功能数量 | 实现进度  |
| -------- | ------------- | -------- | --------- |
| 高       | 撤销/重做系统 | 2        | ⏳ 未开始 |
| 高       | AI 助手       | 1        | ⏳ 未开始 |
| 中       | 搜索功能      | 1        | ⏳ 未开始 |
| 中       | 快捷键帮助    | 1        | ⏳ 未开始 |
| 低       | 树形视图操作  | 2        | ⏳ 未开始 |
| 低       | 全局操作      | 2        | ⏳ 未开始 |
| 低       | 快速导航      | 2        | ⏳ 未开始 |
| **总计** |               | **11**   |           |

## 一、高优先级功能

### 1.1 撤销/重做系统

**命令 ID**: `global.undo`, `global.redo`

**功能描述**:

- 撤销上一次操作
- 重做已撤销的操作
- 支持多级撤销/重做

**当前状态**: ⏳ 命令已定义但被禁用 (`when: () => false`)

**快捷键**: `Cmd+Z` / `Cmd+Shift+Z` (已保留，未绑定)

**技术要求**:

1. **命令历史栈**: 实现基于数组的历史记录

   ```typescript
   interface HistoryEntry {
     action: string;
     before: any; // 操作前的状态
     after: any; // 操作后的状态
     timestamp: number;
   }

   class HistoryManager {
     private history: HistoryEntry[] = [];
     private currentIndex: number = -1;
     private maxSize: number = 50;
   }
   ```

2. **可逆命令模式**: 为每个命令添加 `undo()` 方法

   ```typescript
   interface ReversibleCommand extends Command {
     undo?: (ctx: CommandContext) => void;
   }
   ```

3. **状态快照**: 实现增量快照存储
   - 仅记录变化的部分，不复制整个状态
   - 使用 Immer 的补丁(patches)机制

4. **与持久化集成**:
   - 撤销/重做应同步到 IndexedDB
   - 避免重复保存导致的性能问题

**实现难点**:

- 如何高效存储大型思维导图的状态变更
- 如何处理批量操作的撤销（如粘贴子树）
- 如何与自动保存机制协调

**预估工作量**: 中等（3-5天）

---

### 1.2 AI 助手功能

**命令 ID**: `ai.assist`

**功能描述**:

- 基于当前节点内容提供 AI 辅助
- 自动扩展节点内容
- 生成子节点建议
- 内容总结和重构

**当前状态**: ⏳ 命令已定义，handler 显示提示信息

**触发方式**: 工具栏按钮 (Sparkles 图标)

**技术方案**:

1. **AI 对话界面**:
   - 侧边栏或弹窗形式的对话框
   - 支持多轮对话
   - 显示 AI 生成的建议

2. **节点上下文传递**:

   ```typescript
   interface AIContext {
     currentNode: MindmapNode;
     parentChain: MindmapNode[]; // 祖先节点
     siblings: MindmapNode[]; // 兄弟节点
     children: MindmapNode[]; // 子节点
   }
   ```

3. **AI API 集成**:
   - 调用后端 AI 服务
   - 处理流式响应
   - 错误处理和重试机制

4. **功能模块**:
   - **内容扩展**: "帮我扩展这个节点的内容"
   - **子节点生成**: "为这个主题生成子主题"
   - **内容总结**: "总结这个分支的内容"
   - **结构优化**: "优化这个分支的结构"

**实现难点**:

- AI 响应的质量控制
- 如何优雅地将 AI 建议应用到思维导图
- 用户反馈和迭代机制

**预估工作量**: 大（1-2周）

## 二、中优先级功能

### 2.1 全局搜索

**命令 ID**: `global.search`

**功能描述**:

- 搜索思维导图中的所有节点
- 支持标题和内容的模糊搜索
- 高亮搜索结果
- 快速跳转到匹配节点

**当前状态**: ⏳ 命令未定义

**快捷键**: `Cmd+F` (已保留，未绑定)

**UI 设计**:

- 顶部搜索栏或 Cmd+K 式命令面板
- 实时显示搜索结果列表
- 显示匹配文本的上下文

**技术实现**:

1. **搜索算法**:

   ```typescript
   interface SearchResult {
     node: MindmapNode;
     matchType: "title" | "content";
     matchText: string;
     highlightRange: [number, number];
   }

   function searchNodes(query: string, nodes: MindmapNode[]): SearchResult[] {
     // 模糊搜索实现
     // 支持拼音搜索（中文）
     // 支持正则表达式
   }
   ```

2. **高亮显示**:
   - 在图形视图中高亮匹配节点
   - 在搜索结果中高亮匹配文本

3. **键盘导航**:
   - `↑↓` 在搜索结果中导航
   - `Enter` 跳转到选中节点
   - `Esc` 关闭搜索

**预估工作量**: 中等（3-4天）

---

### 2.2 快捷键帮助面板

**命令 ID**: `global.showShortcutHelp`

**功能描述**:

- 显示所有可用快捷键
- 按分类组织
- 支持搜索快捷键

**当前状态**: ⏳ 命令未定义

**快捷键**: `?` (Shift+/) (已保留，未绑定)

**UI 设计**:

- 模态对话框或侧边栏
- 分类标签页：节点操作、导航、编辑、全局
- 每个快捷键显示：键位、命令名、描述

**技术实现**:

1. **从命令系统自动生成**:

   ```typescript
   function generateShortcutHelp(): ShortcutHelpItem[] {
     return allBindings.map((binding) => {
       const command = commandRegistry.get(binding.commandId);
       return {
         keys: binding.keys,
         name: command.name,
         description: command.description,
         category: command.category,
       };
     });
   }
   ```

2. **响应式设计**:
   - 桌面端：2-3列布局
   - 移动端：单列列表

3. **搜索功能**:
   - 按快捷键搜索
   - 按功能描述搜索

**预估工作量**: 小（1-2天）

## 三、低优先级功能

### 3.1 树形视图操作

**命令 ID**: `tree.expandAll`, `tree.collapseAll`

**功能描述**:

- 一键展开所有节点
- 一键折叠所有节点（除根节点）

**当前状态**: ⏳ 命令未定义

**快捷键**: `Cmd+Shift+E`, `Cmd+Shift+C` (已保留，未绑定)

**技术实现**:

```typescript
{
  id: 'tree.expandAll',
  name: '展开所有节点',
  description: '展开思维导图中的所有节点',
  category: 'global',

  handler: (ctx) => {
    ctx.store.collapsedNodes.clear();
  },
}

{
  id: 'tree.collapseAll',
  name: '折叠所有节点',
  description: '折叠思维导图中的所有节点（除根节点外）',
  category: 'global',

  handler: (ctx) => {
    const allNodes = ctx.store.getAllNodes(ctx.selectedNode.mindmap_id);
    allNodes.forEach(node => {
      if (node.parent_id !== null) {
        ctx.store.collapsedNodes.add(node.short_id);
      }
    });
  },
}
```

**性能优化**:

- 大型导图（>1000 节点）需要优化渲染
- 考虑分批展开/折叠，避免UI卡顿
- 添加动画效果增强用户体验

**预估工作量**: 小（0.5-1天）

---

### 3.2 ESC 键处理

**命令 ID**: `global.clearSelection`

**功能描述**:

- 在编辑面板中: 已通过 `node.finishEdit` 实现
- 在图形视图中: 取消选择或关闭对话框

**当前状态**: ⏳ Panel 中已实现，图形视图未实现

**快捷键**: `Esc`

**实现方案**:

1. Panel 中: 保持现有 `node.finishEdit` 行为
2. 图形视图中: 实现 `global.clearSelection`
   - 关闭打开的对话框（搜索、帮助）
   - 取消临时状态
   - 清除高亮

**预估工作量**: 小（0.5天）

---

### 3.3 快速导航

**命令 ID**: `navigation.firstNode`, `navigation.lastNode`

**功能描述**:

- `firstNode`: 跳转到根节点
- `lastNode`: 跳转到当前层级的最后一个节点

**当前状态**: ⏳ 命令未定义

**快捷键**: `Home`, `End` (已保留，未绑定)

**技术实现**:

```typescript
{
  id: 'navigation.firstNode',
  name: '跳转到根节点',
  description: '跳转到思维导图的根节点',
  category: 'navigation',

  handler: (ctx) => {
    const root = ctx.store.getRootNode(ctx.selectedNode.mindmap_id);
    if (root) {
      ctx.store.setCurrentNode(root.short_id);
    }
  },
}

{
  id: 'navigation.lastNode',
  name: '跳转到最后节点',
  description: '跳转到当前层级的最后一个节点',
  category: 'navigation',

  handler: (ctx) => {
    if (!ctx.selectedNode.parent_short_id) return;

    const siblings = ctx.store.getChildren(ctx.selectedNode.parent_short_id);
    if (siblings.length > 0) {
      ctx.store.setCurrentNode(siblings[siblings.length - 1].short_id);
    }
  },
}
```

**预估工作量**: 极小（0.5天）

## 四、实现路线图

### Phase 1: 基础功能完善（优先）

- ✅ 命令系统核心架构
- ✅ 快捷键系统核心架构
- ✅ 基本节点操作命令
- ✅ 基本导航命令
- ⏳ 快捷键帮助面板（用户学习成本低）
- ⏳ ESC 键处理（用户体验提升）

### Phase 2: 核心功能增强（重要）

- ⏳ 全局搜索（高频使用）
- ⏳ 快速导航命令（高频使用）
- ⏳ 树形视图操作（大型导图必需）

### Phase 3: 高级功能（增值）

- ⏳ 撤销/重做系统（用户期待但实现复杂）
- ⏳ AI 助手功能（差异化功能）

### 建议优先级调整

根据用户价值和实现成本，建议以下优先级：

1. **立即实现**（1-2周内）:
   - 快捷键帮助面板（1-2天）
   - ESC 键处理（0.5天）
   - 树形视图操作（0.5-1天）
   - 快速导航（0.5天）

2. **近期实现**（1个月内）:
   - 全局搜索（3-4天）

3. **中期规划**（2-3个月内）:
   - 撤销/重做系统（需要仔细设计）
   - AI 助手功能（需要后端支持）

## 五、依赖关系

```
快捷键帮助面板
  └─ 无依赖（可立即实现）

ESC 键处理
  └─ 无依赖（可立即实现）

树形视图操作
  └─ 无依赖（可立即实现）

快速导航
  └─ 无依赖（可立即实现）

全局搜索
  └─ 依赖：高亮显示机制

撤销/重做
  ├─ 依赖：命令历史系统设计
  └─ 依赖：持久化系统集成

AI 助手
  ├─ 依赖：后端 AI API
  ├─ 依赖：AI 对话 UI 组件
  └─ 依赖：流式响应处理
```

## 六、开发检查清单

每个功能实现时需要完成：

- [ ] 命令定义（`lib/commands/definitions/`）
- [ ] 快捷键绑定（`lib/shortcuts/bindings/`）
- [ ] UI 组件（如需要）
- [ ] 单元测试
- [ ] E2E 测试
- [ ] 文档更新
- [ ] 用户手册

---

**相关文档**:

- [命令系统架构](./command-system-architecture.md)
- [快捷键系统架构](./shortcut-system-architecture.md)
- [命令定义列表](./command-definitions.md)
- [快捷键绑定列表](./shortcut-key-bindings.md)
