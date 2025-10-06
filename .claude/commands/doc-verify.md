# doc-verify

验证已确认的设计文档与当前代码实现的一致性。

## 用法

```
/doc-verify [文档路径...]
```

### 不带参数 - 验证所有文档
```
/doc-verify
```
验证 `docs/design/` 和 `/docs/standard/` 目录下所有已确认的文档（排除 `draft/`）

### 单个文档
```
/doc-verify docs/design/id-design.md
```

### 多个文档
```
/doc-verify docs/design/id-design.md docs/standard/coding-standards.md
```

### 使用通配符
```
/doc-verify docs/design/*.md
/doc-verify "docs/design/**/*.md"
```

## 功能说明

检查已经正式确认的设计文档是否与实际代码实现保持一致，发现：
- 文档中描述的功能是否已实现
- 实现是否符合文档描述的设计
- 代码中是否有文档未提及的变更
- 是否需要更新文档

## 适用场景

### 单文档验证
- 更新某个文档后验证
- 针对性检查某个模块
- 修复代码后确认文档是否需要更新

### 全量验证（不带参数）
- 定期全面检查（如每周/每月）
- 重大重构后的验证
- 发布前的文档质量检查

## 执行步骤

### 步骤 1: 解析设计文档
- 提取设计文档中描述的关键实现点
- 识别涉及的模块、组件、API
- 提取数据模型、接口定义、配置要求

### 步骤 2: 定位相关代码

**基于文档内容关键词智能搜索**：

根据文档中提到的内容，自动搜索代码库中的相关文件：

**示例 - 验证 `id-design.md`**:
```
文档提到 "mindmap_nodes 表" →
  搜索: supabase/migrations/*mindmap*.sql
  搜索: lib/types/*mindmap*.ts

文档提到 "short_id 6字符 base36" →
  搜索: 代码中的 short_id 相关函数
  搜索: lib/utils/*id*.ts

文档提到 "UUID 主键" →
  验证: 数据库表定义
  验证: TypeScript 类型定义
```

**搜索策略**：
1. 提取文档中的关键实体名（表名、类型名、组件名）
2. 在对应目录搜索相关文件：
   - 数据库相关 → `supabase/migrations/`, `supabase/functions/`
   - 类型定义 → `lib/types/`
   - 工具函数 → `lib/utils/`
   - 组件 → `components/`, `app/`
   - 配置 → 根目录配置文件、`.env` 等
3. 使用 Grep 搜索关键词的使用位置

### 步骤 3: 深度对比验证

**验证粒度：深度验证**

对每个检查维度执行详细的对比：

### 步骤 4: 生成报告
- ✅ 一致项：文档与实现匹配
- ❌ 缺失项：文档描述但未实现
- ⚠️ 偏差项：实现与文档描述不一致
- 🆕 未文档化项：代码实现但文档未提及

### 步骤 5: 保存报告

**单文档验证**:
- 报告保存到 `.claude/logs/validation-reports/YYYY-MM-DD-<文档名>-verification.md`

**多文档/全量验证**:
- 生成汇总报告: `.claude/logs/validation-reports/YYYY-MM-DD-batch-verification.md`
- 每个文档的详细报告单独保存

## 检查维度

### A. 功能实现检查
- ✅ 文档描述的功能是否已实现
- ✅ 实现的功能是否在文档中有描述
- 检查每个功能点的完成度

### B. 接口/API 一致性
- ✅ API 端点是否与文档一致（路径、HTTP 方法、参数）
- ✅ 函数签名是否匹配（参数类型、返回值）
- ✅ React 组件 props 是否与文档定义一致
- ✅ 错误处理是否符合设计

### C. 数据模型一致性
- ✅ 数据库 Schema 完整性（表、字段、类型）
- ✅ 所有约束（主键、外键、唯一约束、NOT NULL）
- ✅ 索引、触发器、默认值
- ✅ TypeScript 接口/类型定义与文档的对应关系
- ✅ 类型定义的每个字段是否匹配

### D. 配置和常量
- ✅ 配置项是否与文档描述一致
- ✅ 环境变量定义
- ✅ 常量值、枚举定义是否匹配
- ✅ 默认配置是否符合文档

### E. 实现细节
- ✅ 核心算法/逻辑是否符合设计描述
- ✅ 状态管理方式是否与设计一致（Store、中间件）
- ✅ 数据流是否符合架构图
- ✅ 错误处理和边界情况处理
- ✅ 关键业务逻辑的实现步骤

## 不一致分类

验证过程中发现的不一致会按以下类型分类：

### ❌ 缺失项（Missing）
文档描述了功能/字段/接口，但代码中未实现

**示例**：
- 文档：mindmap_nodes 表应有 parent_short_id 字段
- 代码：表中没有该字段

### ⚠️ 偏差项（Deviation）
文档和代码都有，但实现方式或细节不同

**示例**：
- 文档：short_id 应为 6 字符 base36
- 代码：实际实现为 8 字符

### 🆕 未文档化项（Undocumented）
代码实现了功能/字段，但文档未提及

**处理原则**：
- 报告所有发现的未文档化实现
- 标注其重要性（核心功能 vs 辅助工具）
- 建议是否应该补充到文档

**示例**：
- 代码：实现了 short_id 冲突重试机制
- 文档：未说明该机制

### ✅ 一致项（Consistent）
文档与代码完全匹配

### 🤔 无法验证（Unverifiable）
文档描述过于抽象，无法直接对应到代码验证

**示例**：
- "系统应该高性能"
- "用户体验应该流畅"

**处理方式**：在报告中标注，建议文档增加可验证的具体指标

## 验证示例

**以 `id-design.md` 为例**：

### 文档内容摘要
```markdown
# ID 设计
- mindmap.id: uuid 主键，使用 gen_random_uuid()
- mindmap.short_id: text, 6字符 base36（小写a-z + 数字0-9）
- mindmap 唯一约束: UNIQUE(user_id, short_id)
- mindmap_node.id: uuid 主键
- mindmap_node.short_id: text, 6字符 base36
- mindmap_node 唯一约束: UNIQUE(mindmap_id, short_id)
```

### 验证检查清单
1. ✅ 检查 `supabase/migrations/` 是否定义了 mindmaps 表
2. ✅ 检查 mindmaps.id 字段：类型 uuid, PRIMARY KEY, DEFAULT gen_random_uuid()
3. ✅ 检查 mindmaps.short_id 字段：类型 text, NOT NULL, CHECK (lower)
4. ✅ 检查唯一约束：UNIQUE(user_id, short_id)
5. ✅ 检查 mindmap_nodes 表定义
6. ✅ 检查 mindmap_nodes.short_id 唯一约束
7. ✅ 检查 `lib/types/` 中的 Mindmap 类型定义
8. ✅ 验证类型定义的字段是否与数据库一致
9. ✅ 检查代码中生成 short_id 的逻辑
10. ✅ 验证 short_id 生成是否符合 6字符 base36 规范
11. ✅ 检查是否有 short_id 验证函数
12. ✅ 查找 short_id 的所有使用位置，验证使用方式

## 输出报告格式

### 单文档验证报告

**报告按文档组织**，保存到 `.claude/logs/verification-reports/YYYY-MM-DD-<文档名>-verification.md`

```markdown
# 文档验证报告: id-design.md

**验证时间**: 2025-10-04 16:00:00
**代码库版本**: commit abc123

## 验证概览
- ✅ 一致项: 12
- ❌ 缺失项: 1
- ⚠️ 偏差项: 2
- 🆕 未文档化项: 3

## 详细发现

### ❌ 缺失项（必须修复）

#### 缺失 #1: mindmap_nodes.parent_short_id 字段

**文档描述**:
> mindmap_nodes 表应包含 parent_short_id 字段用于快速引用
> 位置: id-design.md 第 45 行

**代码实现**:
- 文件: supabase/migrations/20231001_create_mindmap_nodes.sql
- 状态: ❌ 未实现
- 当前表定义中没有 parent_short_id 字段

**影响**:
- 无法通过 short_id 直接引用父节点
- 需要 join parent_id 查询，影响性能

**建议**:
1. 在数据库 migration 中添加该字段
2. 更新相关的 TypeScript 类型定义
3. 或者：如果不需要该功能，从文档中移除

---

### ⚠️ 偏差项（建议修复）

#### 偏差 #1: short_id 长度不一致

**文档描述**:
> short_id 应为 6 字符 base36
> 位置: id-design.md 第 23 行

**代码实现**:
- 文件: lib/utils/id-generator.ts:15
- 实际实现: 8 字符 base36

```typescript
export function generateShortId(): string {
  return nanoid(8); // 文档要求 6 字符
}
```

**影响**:
- ID 空间更大，冲突概率更低
- 但与文档规范不符
- URL 会稍长

**建议**:
1. 修改代码为 6 字符，符合文档
2. 或者：更新文档说明为 8 字符，并说明原因

---

### 🆕 未文档化项（建议补充文档）

#### 未文档化 #1: short_id 冲突重试机制

**代码实现**:
- 文件: lib/utils/id-generator.ts:25-35
- 功能: 当生成的 short_id 冲突时，自动重试最多 3 次

```typescript
async function generateUniqueShortId(userId: string): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const shortId = generateShortId();
    const exists = await checkShortIdExists(userId, shortId);
    if (!exists) return shortId;
  }
  throw new Error('Failed to generate unique short_id');
}
```

**文档状态**: ❌ 未提及

**重要性**: 🔴 高 - 这是核心的冲突处理逻辑

**建议**: 在 id-design.md 中补充该机制的说明

---

### ✅ 一致项

1. ✅ **UUID 主键定义**: 数据库和类型定义完全一致
   - 文件: supabase/migrations/xxx.sql, lib/types/mindmap.ts

2. ✅ **UNIQUE 约束**: 正确实现 UNIQUE(user_id, short_id)
   - 文件: supabase/migrations/xxx.sql

3. ✅ **base36 字符集**: 生成逻辑使用正确的字符集
   - 文件: lib/utils/id-generator.ts

[... 更多一致项 ...]

## 代码文件清单

验证过程中检查的代码文件：

### 数据库 Schema
- ✅ supabase/migrations/20231001_create_mindmaps.sql
- ✅ supabase/migrations/20231001_create_mindmap_nodes.sql

### TypeScript 类型
- ✅ lib/types/mindmap.ts
- ⚠️ lib/types/mindmap-node.ts (字段定义有偏差)

### 工具函数
- ⚠️ lib/utils/id-generator.ts (长度不符)
- 🆕 lib/utils/id-validator.ts (文档未提及)

## 后续行动

### 🔴 必须修复
- [ ] 添加 mindmap_nodes.parent_short_id 字段或从文档移除

### ⚠️ 建议修复
- [ ] 统一 short_id 长度（代码改为6或文档改为8）

### 📝 建议补充文档
- [ ] 补充 short_id 冲突重试机制的说明
- [ ] 补充 id-validator 工具的说明
```

### 批量验证汇总报告

**全量验证时的汇总报告**，保存到 `.claude/logs/verification-reports/YYYY-MM-DD-batch-verification.md`

```markdown
# 全量文档验证报告

**生成时间**: 2025-10-04 16:00:00
**验证文档数**: 8

## 概览
- ✅ 完全一致: 5 (62.5%)
- ⚠️ 部分不一致: 2 (25%)
- ❌ 严重不一致: 1 (12.5%)

## 统计
- 总缺失项: 3
- 总偏差项: 5
- 总未文档化项: 12
- 总一致项: 67

## 需要关注的文档

### ❌ id-design.md - 严重不一致
**问题**:
- 缺失项: 1 - mindmap_nodes.parent_short_id
- 偏差项: 2 - short_id 长度, 约束定义
- 未文档化项: 3

**优先级**: 🔴 高
**详细报告**: [id-design-verification.md](./2025-10-04-id-design-verification.md)

---

### ⚠️ mindmap-editor-store-design.md - 部分不一致
**问题**:
- 偏差项: 1 - 中间件实现方式
- 未文档化项: 3 - 额外的辅助函数

**优先级**: 🟡 中
**详细报告**: [mindmap-editor-store-design-verification.md](./2025-10-04-mindmap-editor-store-design-verification.md)

---

## 完全一致的文档
- ✅ docs/standard/coding-standards.md - 代码规范完全遵守
- ✅ docs/standard/project-structure.md - 目录结构一致
- ✅ docs/design/development-setup.md - 配置正确
- ✅ docs/design/supabase-local-setup.md - 环境配置一致
- ✅ docs/design/indexeddb-persistence-middleware-design.md - 实现符合设计

## 总体建议
1. 优先处理 id-design.md 的缺失项
2. 统一 short_id 相关的实现
3. 补充未文档化功能的文档
4. 定期运行验证（建议每周）
```
