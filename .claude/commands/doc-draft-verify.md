# doc-draft-verify

验证设计草稿文档与已有设计规范的一致性。

## 用法

### 用法 1: 不带参数 - 校验 draft 目录下所有草稿
```bash
/doc-draft-verify
```
- 自动扫描 `docs/draft/` 下的所有 .md 文件
- 对每个草稿使用智能匹配模式识别相关设计文档
- 生成汇总报告

**适用场景**: 日常批量检查所有草稿的一致性

### 用法 2: 指定单个草稿 - 智能匹配
```bash
/doc-draft-verify docs/draft/mindmap-persistence-requirements.md
```
- 自动识别该草稿相关的已有设计文档
- 生成该草稿的详细验证报告

**适用场景**: 快速验证单个草稿，聚焦相关设计

### 用法 3: 指定单个草稿 + `--all` - 全量对比
```bash
/doc-draft-verify --all docs/draft/mindmap-persistence-requirements.md
```
- 将该草稿与 `docs/design/`和`docs/standard/` 下**所有**已确认文档对比
- 生成全面的对比报告

**适用场景**: 重大功能或架构性变更，需要全面验证

### 用法 4: 不带参数 + `--all` - 全量批量校验
```bash
/doc-draft-verify --all
```
- 扫描所有草稿
- 每个草稿都与所有已确认文档对比
- 最全面但最耗时

**适用场景**: 正式设计评审前的全面检查

---

## 用法对比表

| 命令 | 草稿范围 | 对比范围 | 适用场景 |
|------|---------|---------|---------|
| `/doc-draft-verify` | 所有草稿 | 智能匹配 | 日常批量检查 |
| `/doc-draft-verify <file>` | 单个草稿 | 智能匹配 | 快速验证单个草稿 |
| `/doc-draft-verify --all` | 所有草稿 | 全量对比 | 正式评审前全面检查 |
| `/doc-draft-verify --all <file>` | 单个草稿 | 全量对比 | 重大功能的全面验证 |

---

## 功能说明

这个命令会执行完整的设计一致性校验，包括：

1. **读取草稿文档**: 分析新功能设计的内容和意图
2. **识别相关规范**: 自动识别需要对比的已有设计文档
3. **多维度校验**: 执行技术决策、架构模式、命名术语、数据模型、依赖兼容性检查
4. **生成详细报告**: 输出结构化的校验报告
5. **保存报告**: 自动保存到 `.claude/logs/validation-reports/`

## 执行步骤

### 步骤 1: 读取和分析草稿文档
- 从 `docs/draft/` 目录读取草稿文档
- 解析草稿文档的结构和内容
- 识别涉及的技术领域（ID设计、数据模型、API等）
- 提取关键技术决策点

### 步骤 2: 构建文档索引并识别相关文档

#### 2.1 确定必须对比的文档

**规则 1: `docs/standard/` 下的文档必须全部对比**
- 所有草稿都**必须**与 `docs/standard/` 下的所有文档进行一致性校验
- 这些是项目规范文档，不论是否匹配都要检查
- 不需要为 `docs/standard/` 文档构建术语索引

**规则 2: `docs/design/` 下的文档通过术语索引智能匹配**
- 仅扫描 `docs/design/` 下的文档，提取"关键概念"章节
- 构建 `概念 → 文档路径` 的映射索引
- 基于草稿内容智能匹配相关的设计文档

**索引结构示例**（仅包含 `docs/design/` 文档）：
```json
{
  "UUID": ["docs/design/id-design.md"],
  "short_id": ["docs/design/id-design.md"],
  "base36": ["docs/design/id-design.md"],
  "Zustand": ["docs/design/mindmap-editor-store-design.md"],
  "IndexedDB": ["docs/design/indexeddb-persistence-middleware-design.md"]
}
```

**索引构建规则**：
- **仅扫描** `docs/design/` 目录
- 提取"关键概念"表格中的所有概念
- 一个概念可能对应多个文档（取并集）
- 如果文档没有"关键概念"章节，跳过该文档
- 概念匹配不区分大小写

**回退机制**（如果 `docs/design/` 下所有文档都没有"关键概念"）：
使用硬编码的关键词规则：
- ID 设计相关 → `docs/design/id-design.md`
- 数据持久化相关 → `docs/design/indexeddb-persistence-middleware-design.md`
- 状态管理相关 → `docs/design/mindmap-editor-store-design.md`

#### 2.2 组装最终对比文档列表

**默认模式（智能匹配）**：

1. **必须对比的文档**（`docs/standard/` 全部）：
   - `docs/standard/coding-standards.md`
   - `docs/standard/project-structure.md`
   - ... （所有 `docs/standard/` 下的文档）

2. **分析草稿内容**：
   - 提取草稿中出现的所有关键概念
   - 统计概念出现频率

3. **智能匹配 `docs/design/` 文档**：
   - 将草稿概念与索引中的概念进行匹配
   - 计算每个 `docs/design/` 文档的相关度
   - 选择相关度 > 0 的设计文档进行对比

4. **最终对比列表** = `docs/standard/` 全部 + 匹配的 `docs/design/` 文档

**示例**：
```
草稿中的概念: order_index, currentNode, selectedNodes, floating节点
↓
最终对比文档:
【必须对比】
- docs/standard/coding-standards.md (规范文档，必须检查)
- docs/standard/project-structure.md (规范文档，必须检查)

【智能匹配】
- docs/design/mindmap-editor-store-design.md (相关度: 4, 匹配概念: order_index, currentNode, selectedNodes, floating节点)
```

**`--all` 模式（全量对比）**：
与 `docs/design/` 和 `docs/standard/` 下**所有**已确认文档对比：
- `docs/standard/` 全部（必须）
- `docs/design/` 全部（不论是否匹配）

在报告中标注：
- ✅ 规范文档（来自 `docs/standard/`，必须检查）
- ✅ 相关设计文档（基于索引匹配，相关度 > 0）
- ℹ️ 不相关设计文档（未匹配到任何概念）
- ⚠️ 可能相关设计文档（无"关键概念"但内容可能相关）

### 步骤 3: 执行多维度一致性检查

#### 检查维度
1. **技术决策一致性**: ID机制、类型系统、状态管理、数据持久化
2. **架构模式一致性**: 数据流、组件职责、中间件模式、API层次
3. **命名和概念一致性**: 实体命名、字段命名、API端点命名、关键概念定义
4. **数据模型一致性**: 表结构、字段类型、外键约束、索引设计
5. **依赖兼容性**: 依赖冲突、接口契约、版本兼容

### 步骤 4: 生成结构化报告

报告包含：

1. **元信息**
   - 草稿文档路径
   - 验证时间
   - 验证模式（智能匹配 / 全量对比）

2. **文档索引信息**（智能匹配模式）
   - 构建的概念索引统计（仅 `docs/design/` 文档，概念总数、文档总数）
   - 草稿中提取的概念列表
   - 智能匹配的设计文档及相关度排序

3. **对比文档列表**
   - 📋 **规范文档**（`docs/standard/` 全部，必须对比）
   - ✅ **匹配的设计文档**（相关度、匹配的概念）
   - ℹ️ **未匹配的设计文档**（仅 `--all` 模式）
   - ⚠️ **可能相关的设计文档**（无"关键概念"，仅 `--all` 模式）

4. **执行摘要**
   - ✅ 一致项数量
   - ⚠️ 需澄清项数量
   - ❌ 冲突项数量
   - 🆕 新引入概念数量

5. **详细发现**（按严重程度分类）
   - 🔴 Critical - 必须修复
   - 🟡 Warning - 建议改进
   - 🟢 Info - 可选优化

6. **概念一致性对照表**
   - 草稿概念 vs 已有文档概念
   - 标注是否一致、是否在索引中

7. **后续行动清单**
   - 按优先级排序的待办事项

### 步骤 5: 保存报告

**单个草稿验证**:
- 报告保存到 `.claude/logs/validation-reports/YYYY-MM-DD-<文档名>-validation.md`

**批量验证（无参数或 `--all` 无参数）**:
- 汇总报告: `.claude/logs/validation-reports/YYYY-MM-DD-batch-validation.md`
- 每个草稿的详细报告单独保存

### 步骤 6: 归档历史文档
- 如果同一个文档在当前目录下存在历史版本的报告，自动将历史版本的报告移动到`.claude/logs/validation-reports/archive`目录下

## 校验原则

### 1. 客观详细
- 提供详细的报告，包含具体的引用和位置信息
- 既要指出问题，也要认可一致的部分

### 2. 严重程度分级
- 🔴 **必须修复（Critical）**: 与核心设计原则冲突，会导致架构不一致
- 🟡 **建议改进（Warning）**: 不完全符合规范，但不影响功能
- 🟢 **可选优化（Info）**: 改进建议，非必须

### 3. 对新概念的态度
- 保持**中立**的评估态度
- 客观分析新概念的合理性和必要性
- 列出引入新概念的利弊
- 不默认拒绝也不盲目接受

### 4. 报告风格
- 使用**详细报告**格式（参考 `.claude/templates/validation-report-template.md`）
- 每个发现都包含：草稿引用、已有设计引用、影响分析、建议方案
- 提供具体可执行的改进建议

### 5. 帮助设计者
- 报告应帮助设计者理解问题的根源
- 提供改进方向和参考文档
- 优先级明确，便于设计者排序处理

---

## 术语索引提取详解

### 关键概念章节的格式要求

为了正确提取概念索引，设计文档中的"关键概念"章节应遵循以下格式：

```markdown
## 关键概念

| 概念 | 定义 | 示例/说明 |
|------|------|----------|
| order_index | 节点排序索引，维护兄弟节点顺序 | 0, 1, 2... 连续递增 |
| floating节点 | 独立浮动节点，不属于主树结构 | parent_id=null |
```

**提取规则**：
- 章节标题必须包含"关键概念"
- 使用 Markdown 表格格式
- 表头的第一列应为"概念"或类似标识
- 仅提取本文档新设计的概念，排除外部库概念

### 索引构建示例

**假设以下文档结构**：

**docs/design/id-design.md**:
```markdown
## 关键概念
| 概念 | 定义 |
|------|------|
| short_id | 6字符短标识符，范围内唯一 |
| 范围唯一性 | ID在特定范围内保证唯一 |
```

**docs/design/mindmap-editor-store-design.md**:
```markdown
## 关键概念
| 概念 | 说明 |
|------|------|
| order_index | 节点排序索引 |
| currentNode | 当前焦点节点 |
| floating节点 | 独立浮动节点 |
```

**docs/standard/coding-standards.md**:
无"关键概念"章节（规范文档不需要）

**构建的索引**（仅包含 `docs/design/` 文档）：
```json
{
  "short_id": ["docs/design/id-design.md"],
  "范围唯一性": ["docs/design/id-design.md"],
  "order_index": ["docs/design/mindmap-editor-store-design.md"],
  "currentnode": ["docs/design/mindmap-editor-store-design.md"],
  "floating节点": ["docs/design/mindmap-editor-store-design.md"]
}
```
*注：*
- *仅从 `docs/design/` 目录提取概念*
- *`docs/standard/` 文档不纳入索引（始终必须对比）*
- *概念转换为小写以支持不区分大小写匹配*

### 匹配算法

**草稿分析**：
```markdown
# 草稿内容片段
节点使用 order_index 维护排序，currentNode 表示焦点节点。
支持创建 floating节点...
```

**提取的概念**：`order_index`, `currentNode`, `floating节点`

**匹配过程**：
1. 将提取的概念转为小写：`order_index`, `currentnode`, `floating节点`
2. 在索引中查找匹配（仅搜索 `docs/design/` 文档）：
   - `order_index` → 匹配到 `docs/design/mindmap-editor-store-design.md`
   - `currentnode` → 匹配到 `docs/design/mindmap-editor-store-design.md`
   - `floating节点` → 匹配到 `docs/design/mindmap-editor-store-design.md`

3. 计算设计文档相关度：
   - `docs/design/mindmap-editor-store-design.md`: 相关度 3（匹配3个概念）

4. 组装最终对比列表：
   - **规范文档**（必须）: `docs/standard/coding-standards.md`, `docs/standard/project-structure.md`
   - **设计文档**（智能匹配）: 相关度 > 0 的文档

**报告中显示**：
```markdown
## 对比文档列表

### 📋 规范文档（必须对比）
- docs/standard/coding-standards.md
- docs/standard/project-structure.md

## 文档索引信息

### 构建的概念索引（仅 docs/design/）
- 总概念数: 5
- 覆盖文档数: 2

### 草稿中提取的概念
- order_index (匹配 → mindmap-editor-store-design.md)
- currentNode (匹配 → mindmap-editor-store-design.md)
- floating节点 (匹配 → mindmap-editor-store-design.md)

### ✅ 匹配的设计文档（智能匹配）
1. docs/design/mindmap-editor-store-design.md
   - 相关度: 3
   - 匹配概念: order_index, currentNode, floating节点
```

### 优化建议

**为获得更好的匹配效果**：

1. **完善 `docs/design/` 文档的"关键概念"章节**
   - 每个设计文档都应包含"关键概念"
   - 仅包含本文档新设计的概念
   - 运行 `/doc-refactor` 可帮助提取和完善概念
   - **注意**: `docs/standard/` 文档不需要"关键概念"（始终必须对比）

2. **概念标准化**
   - 使用统一的概念表达（如 "mindmap" 而非 "mind-map"）
   - 在"关键概念"中明确定义新引入的概念

3. **定期更新索引**
   - 当添加新设计文档或更新术语时，重新运行验证以刷新索引
   - 索引在每次运行时动态构建，无需手动维护
   - `docs/standard/` 文档会自动纳入对比，无需索引

### 与 /doc-refactor 的协同

**工作流程**：
```
1. 运行 /doc-refactor <docs/design/文档>
   ↓ 提取关键概念和定义

2. 根据建议更新设计文档的"关键概念"章节
   ↓ 完善概念定义（仅针对 docs/design/）

3. 运行 /doc-draft-verify <草稿>
   ↓ 自动构建索引（仅 docs/design/）+ 强制包含所有 docs/standard/

4. 查看验证报告
   ↓ 规范文档全覆盖 + 设计文档精确匹配
```

这样形成了一个**分层验证的文档生态系统**：
- **规范层** (`docs/standard/`): 所有草稿必须遵守，无条件对比
- **设计层** (`docs/design/`): 通过概念索引智能匹配相关文档
- `/doc-refactor` 帮助完善设计文档的概念定义
- `/doc-draft-verify` 利用这些定义进行精确匹配，同时确保规范合规
