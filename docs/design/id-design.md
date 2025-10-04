# ID 设计文档

## 元信息

- **作者**: Colin Han
- **创建日期**: 2024
- **最后更新**: 2025-10-04
- **相关文档**:
  - coding-standards.md
  - database-schema.md

## 概述

本文档定义了 Spider Mark V2 项目中思维导图(mindmap)和节点(mindmap_node)的双 ID 机制设计。

采用 UUID 作为内部主键,short_id 作为用户可见标识符,平衡了性能和用户体验。

## 快速参考

### ID 规格速查

| 实体 | UUID 主键 | Short ID | 唯一性范围 |
|------|-----------|----------|-----------|
| mindmap | id: uuid | short_id: 6字符 base36 | user_id 范围内 |
| mindmap_node | id: uuid | short_id: 6字符 base36 | mindmap_id 范围内 |

### 常用 SQL

```sql
-- 通过 short_id 查询 mindmap
SELECT * FROM mindmaps
WHERE user_id = $1 AND short_id = $2;

-- 通过 short_id 查询 mindmap_node
SELECT * FROM mindmap_nodes
WHERE mindmap_id = $1 AND short_id = $2;
```

### TypeScript 类型定义

```typescript
// lib/types/mindmap.ts
interface Mindmap {
  id: string;        // UUID
  short_id: string;  // 6字符 base36
  user_id: string;
  // ...
}

interface MindmapNode {
  id: string;        // UUID
  short_id: string;  // 6字符 base36
  mindmap_id: string;
  parent_id: string | null;
  // ...
}
```

## 背景和动机

### 为什么需要双 ID 机制？

**用户体验需求**:
- URL 需要简短、易读、易分享
- 用户希望看到友好的 ID,而不是长串的 UUID
- 内容引用需要简洁的标识符

**系统性能需求**:
- 数据库需要高效的主键(UUID 性能好)
- 需要快速的索引和 join 操作
- 分布式系统需要全局唯一的标识符

### 为什么不使用单一 ID？

**仅使用 UUID**:
- ❌ URL 过长: `/@colin/550e8400-e29b-41d4-a716-446655440000`
- ❌ 用户体验差,难以记忆和分享
- ❌ 在 Markdown 中引用不方便

**仅使用 Short ID**:
- ❌ 全局唯一需要更长的 ID(冲突风险高)
- ❌ 数据库性能可能不如 UUID
- ❌ 分布式系统下管理复杂

**双 ID 方案**:
- ✅ 内部使用 UUID(性能、唯一性)
- ✅ 对外使用 short_id(用户体验)
- ✅ 范围唯一允许使用更短的 ID

## 设计目标

1. **内部使用**: UUID 作为数据库主键,保证全局唯一性和性能
2. **用户可见**: short_id 用于 URL 和内容引用,提升用户体验
3. **范围唯一**: short_id 仅在特定范围内唯一,允许使用更短的标识符
4. **URL 友好**: 支持简洁优雅的 URL 结构

## 双 ID 机制

### Mindmap ID

#### UUID (主键)

- **类型**: `uuid`
- **生成**: `gen_random_uuid()`
- **用途**: 数据库内部主键,外键关联
- **示例**: `550e8400-e29b-41d4-a716-446655440000`

#### Short ID (用户可见)

- **类型**: `text`
- **长度**: 6 字符
- **字符集**: base36 (小写字母 a-z + 数字 0-9)
- **唯一性范围**: 在同一用户(user_id)范围内唯一
- **格式**: 无前缀,纯随机字符
- **示例**: `abc123`, `x7k9m2`

### Mindmap Node ID

#### UUID (主键)

- **类型**: `uuid`
- **生成**: `gen_random_uuid()`
- **用途**: 数据库内部主键,外键关联(如 parent_id)
- **示例**: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`

#### Short ID (用户可见)

- **类型**: `text`
- **长度**: 6 字符
- **字符集**: base36 (小写字母 a-z + 数字 0-9)
- **唯一性范围**: 在同一 mindmap (mindmap_id) 范围内唯一
- **格式**: 无前缀,纯随机字符
- **示例**: `xyz789`, `a1b2c3`

## URL 结构

### URL 模式

```
/@{username}                                  -> 用户主页
/@{username}/{map-short-id}                   -> 思维导图页面
/@{username}/{map-short-id}#{node-short-id}   -> 定位到特定节点
```

### 示例

```
/@colin                    -> colin 的用户主页
/@colin/abc123             -> colin 的思维导图 abc123
/@colin/abc123#xyz789      -> 定位到节点 xyz789
```

### 路由参数

- `username`: 用户名(3-20字符,小写字母数字和连字符)
- `map-short-id`: 思维导图的 short_id (6字符)
- `node-short-id`: 节点的 short_id (6字符,在 URL hash 中)

## 数据库设计

### Mindmaps 表结构

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | uuid | 主键 | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | 用户ID | NOT NULL, REFERENCES auth.users(id) |
| short_id | text | 用户可见ID | NOT NULL, CHECK(short_id = lower(short_id)) |
| title | text | 标题 | NOT NULL |
| created_at | timestamptz | 创建时间 | DEFAULT now() |
| updated_at | timestamptz | 更新时间 | DEFAULT now() |
| deleted_at | timestamptz | 删除时间 | NULL |

**约束**:
```sql
CONSTRAINT unique_user_short_id UNIQUE (user_id, short_id)
```

### Mindmap Nodes 表结构

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | uuid | 主键 | PRIMARY KEY, DEFAULT gen_random_uuid() |
| mindmap_id | uuid | 所属导图 | NOT NULL, REFERENCES mindmaps(id) ON DELETE CASCADE |
| parent_id | uuid | 父节点 | NULL, REFERENCES mindmap_nodes(id) |
| short_id | text | 用户可见ID | NOT NULL, CHECK(short_id = lower(short_id)) |
| content | text | 内容 | NOT NULL |
| created_at | timestamptz | 创建时间 | DEFAULT now() |
| updated_at | timestamptz | 更新时间 | DEFAULT now() |

**约束**:
```sql
CONSTRAINT unique_map_short_id UNIQUE (mindmap_id, short_id)
```

### 索引设计

```sql
-- Mindmaps 索引
CREATE UNIQUE INDEX idx_mindmaps_user_short_id
  ON mindmaps(user_id, short_id);

CREATE INDEX idx_mindmaps_user_id
  ON mindmaps(user_id);

CREATE INDEX idx_mindmaps_user_id_active
  ON mindmaps(user_id) WHERE deleted_at IS NULL;

-- Mindmap Nodes 索引
CREATE UNIQUE INDEX idx_nodes_map_short_id
  ON mindmap_nodes(mindmap_id, short_id);

CREATE INDEX idx_nodes_map_id
  ON mindmap_nodes(mindmap_id);

CREATE INDEX idx_nodes_parent_id
  ON mindmap_nodes(parent_id);
```

## TypeScript 类型定义

```typescript
// lib/types/mindmap.ts
interface Mindmap {
  id: string;
  user_id: string;
  short_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface MindmapNode {
  id: string;
  mindmap_id: string;
  parent_id: string | null;
  short_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
```

## 使用示例

### Short ID 生成

```typescript
import { customAlphabet } from "nanoid";

// 定义字符集和长度
const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const generateShortId = customAlphabet(alphabet, 6);

// 为 mindmap 生成唯一 short_id
async function generateUniqueMindmapShortId(userId: string): Promise<string> {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    const shortId = generateShortId();

    // 检查保留词
    if (isReservedShortId(shortId)) {
      continue;
    }

    // 检查是否在该用户范围内已存在
    const { data } = await supabase
      .from("mindmaps")
      .select("id")
      .eq("user_id", userId)
      .eq("short_id", shortId)
      .single();

    if (!data) return shortId;
  }

  throw new Error("Failed to generate unique short_id after retries");
}

// 为 node 生成唯一 short_id
async function generateUniqueNodeShortId(mindmapId: string): Promise<string> {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    const shortId = generateShortId();

    // 检查保留词
    if (isReservedShortId(shortId)) {
      continue;
    }

    // 检查是否在该 mindmap 范围内已存在
    const { data } = await supabase
      .from("mindmap_nodes")
      .select("id")
      .eq("mindmap_id", mindmapId)
      .eq("short_id", shortId)
      .single();

    if (!data) return shortId;
  }

  throw new Error("Failed to generate unique short_id after retries");
}
```

### 保留词处理

```typescript
const RESERVED_SHORT_IDS = [
  "new",
  "create",
  "edit",
  "delete",
  "api",
  "admin",
  "settings",
];

function isReservedShortId(shortId: string): boolean {
  return RESERVED_SHORT_IDS.includes(shortId);
}
```

### 数据库查询

```sql
-- 通过 username 和 short_id 查询 mindmap
SELECT m.*
FROM mindmaps m
JOIN profiles p ON m.user_id = p.id
WHERE p.username = 'colin' AND m.short_id = 'abc123';

-- 获取 mindmap 的所有节点
SELECT * FROM mindmap_nodes
WHERE mindmap_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at;
```

### Markdown 引用语法

在节点的 content 字段中,可以使用以下语法引用其他节点:

```markdown
# 方式 1: 双方括号
参考 [[xyz789]] 的内容

# 方式 2: @ 符号
参考 @xyz789 的分析

# 方式 3: 带标题(可选)
参考 [[xyz789|节点标题]] 的内容
```

## 设计决策

### 决策 1: Short ID 长度为什么是 6 字符？

**考虑因素**:
- 4字符: 36^4 = 1,679,616 (冲突风险较高)
- 6字符: 36^6 = 2,176,782,336 (冲突风险 < 0.023% for 1000 items)
- 8字符: 36^8 = 2.8万亿 (过于冗长)

**决策**: 选择 6 字符
- 平衡了简洁性和唯一性
- 单个用户 1000 个 mindmap 时冲突概率仍然很低 (0.023%)
- URL 简短: `/@colin/abc123` vs `/@colin/abc12345`

**命名空间分析**:
- 总空间: 36^6 = 2,176,782,336 (21亿+组合)
- 100 个项目: 冲突概率 0.0002%
- 1000 个项目: 冲突概率 0.023%

### 决策 2: 为什么使用 base36 而不是 base62？

**base62**: 包含大小写字母 + 数字 (A-Za-z0-9)
**base36**: 仅包含小写字母 + 数字 (a-z0-9)

**选择 base36 的原因**:
- ✅ URL 友好(避免大小写混淆)
- ✅ 易于阅读和口述
- ✅ 避免 O/0, l/1/I 等容易混淆的字符组合
- ✅ 符合 URL 规范(不区分大小写)
- ⚠️ 缺点: 相同长度下,命名空间比 base62 小

### 决策 3: 范围唯一 vs 全局唯一

**选择**: 范围唯一
- mindmap.short_id 在 user_id 范围内唯一
- mindmap_node.short_id 在 mindmap_id 范围内唯一

**理由**:
- 允许使用更短的 ID
- 符合数据隔离原则(不同用户的 ID 可以重复)
- 降低冲突风险
- URL 结构已经包含范围信息(`/@username/short-id`)

### 决策 4: 应用层生成 vs 数据库生成

**选择**: 应用层生成(使用 nanoid)

**理由**:
- ✅ 更好的控制和错误处理
- ✅ 可以实现保留词过滤
- ✅ 可以实现重试机制
- ✅ 支持自定义字符集和长度
- ⚠️ 需要应用层检查冲突

### 决策 5: 软删除时不复用 short_id

**选择**: 删除的 mindmap 的 short_id 不复用

**理由**:
- ✅ 避免用户混淆(旧链接不会指向新内容)
- ✅ 保持链接的稳定性
- ✅ 简化实现(唯一约束不需要排除已删除记录)
- ⚠️ 可能会缓慢消耗命名空间(但 21亿组合足够使用)

## 命名空间分析

### Mindmap Short ID

- **总空间**: 36^6 = 2,176,782,336
- **范围**: 单个用户内
- **预期使用量**: 100-1000 个/用户
- **冲突概率**:
  - 100 个: 0.0002%
  - 1000 个: 0.023%

### Mindmap Node Short ID

- **总空间**: 36^6 = 2,176,782,336
- **范围**: 单个 mindmap 内
- **预期使用量**: 100-1000 个节点/导图
- **冲突概率**:
  - 100 个: 0.0002%
  - 1000 个: 0.023%

## FAQ

### Q1: Short ID 冲突了怎么办？

A:
1. 数据库的 UNIQUE 约束会拒绝插入
2. 应用层实现重试机制(生成新的 short_id)
3. 建议最多重试 3 次,仍失败则返回错误给用户

### Q2: Short ID 可以手动指定吗？

A:
- 当前版本不支持手动指定
- 未来可以考虑添加自定义 short_id 功能(参考"未来扩展"章节)
- 如果确实需要,必须验证:
  - 长度为 6 字符
  - 仅包含 a-z0-9
  - 在范围内唯一
  - 不是保留词

### Q3: UUID 和 Short ID 的映射关系如何维护？

A:
- 存储在同一条数据库记录中
- UUID 用于内部关联(外键,如 parent_id, mindmap_id)
- Short ID 用于 URL 和用户可见场景
- 查询时通常需要同时提供范围标识符(user_id 或 mindmap_id)

### Q4: 为什么不使用自增 ID？

A:
- ❌ 自增 ID 容易被猜测(安全问题)
- ❌ 分布式系统下自增 ID 管理复杂
- ❌ 暴露数据规模(如 id=5 说明只有 5 个)
- ❌ 多数据中心同步困难
- ✅ UUID 更适合分布式系统
- ✅ Short ID 提供了用户友好性

### Q5: 软删除的 mindmap 的 short_id 会被复用吗？

A:
- 不会复用
- 唯一约束不排除已删除的记录
- 这样可以避免旧链接指向新内容,造成用户混淆
- 命名空间足够大(21亿),不担心耗尽

## 安全考虑

### 1. 强制小写

```sql
short_id text CHECK (short_id = lower(short_id))
username text CHECK (username = lower(username))
```

### 2. 唯一性约束

- 数据库层面保证唯一性
- 使用复合唯一索引

### 3. 访问控制

- 通过 RLS (Row Level Security) 策略控制访问
- 仅拥有者可以修改自己的 mindmaps 和 nodes
- 公开分享需要额外的权限控制

### 4. 防止遍历

- Short ID 使用随机生成,无法预测
- 不使用自增 ID,避免暴露数据量
- 可以通过 rate limiting 防止暴力枚举

## 性能考虑

### 1. 索引策略

- 复合唯一索引: `(user_id, short_id)` 和 `(mindmap_id, short_id)`
- 单字段索引: `user_id`, `mindmap_id`, `parent_id`
- 部分索引: `WHERE deleted_at IS NULL` 用于活跃记录查询

### 2. 查询优化

```sql
-- 高效: 使用复合索引
SELECT * FROM mindmaps
WHERE user_id = ? AND short_id = ?;

-- 低效: 仅使用 short_id (需要全表扫描)
SELECT * FROM mindmaps
WHERE short_id = ?;
```

### 3. 批量操作

- 获取思维导图时,批量加载所有节点
- 使用 `mindmap_id` 的索引快速过滤
- 考虑使用 JOIN 减少查询次数

## 未来扩展

### 1. 公开分享

如需支持公开分享,可添加:

```sql
mindmaps:
  is_public boolean DEFAULT false
  share_token text UNIQUE  -- 用于私密分享
```

URL 结构:
```
/@{username}/{map-short-id}              -> 公开访问
/s/{share-token}                         -> 私密分享访问
```

### 2. 自定义 Short ID

允许用户自定义 short_id (类似 GitHub repo 名):

```sql
mindmaps:
  custom_short_id text
  is_custom_short_id boolean DEFAULT false
```

### 3. Short ID 历史

如果允许修改 short_id,需要保留旧链接:

```sql
short_id_aliases:
  id uuid PRIMARY KEY
  mindmap_id uuid REFERENCES mindmaps(id)
  old_short_id text
  created_at timestamptz
```

## Username 设计

由于 URL 使用 `/@{username}` 格式,需要定义 username 规则:

### Profiles 表

```sql
profiles:
  id uuid PRIMARY KEY REFERENCES auth.users(id)
  username text UNIQUE NOT NULL CHECK (username = lower(username))
```

### Username 规则

- **长度**: 3-20 字符
- **字符集**: 小写字母、数字、连字符
- **限制**: 不能以连字符开头或结尾
- **正则**: `^[a-z0-9]([a-z0-9-]{1,18}[a-z0-9])?$`
- **示例**: `colin`, `user-123`, `john-doe`

### 保留用户名

```typescript
const RESERVED_USERNAMES = [
  "admin",
  "api",
  "auth",
  "settings",
  "about",
  "help",
  "support",
  "terms",
  "privacy",
];
```

## 参考资料

- [nanoid](https://github.com/ai/nanoid) - 用于生成 short_id
- [UUID Best Practices](https://www.postgresql.org/docs/current/datatype-uuid.html)
- [URL Design Best Practices](https://restfulapi.net/resource-naming/)

## 修订历史

| 日期 | 版本 | 修改内容 | 作者 |
|------|------|---------|------|
| 2024 | 1.0 | 初始版本 | Colin Han |
| 2025-10-04 | 2.0 | 重构: 添加快速参考、背景和动机、设计决策、FAQ 章节;优化结构和格式 | Claude Code |
