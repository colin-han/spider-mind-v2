# ID 设计文档

## 概述

本文档描述了 Spider Mark V2 项目中思维导图(mindmap)和节点(mindmap-node)的双 ID 机制设计。

## 设计目标

1. **内部使用:** UUID 作为数据库主键,保证全局唯一性和性能
2. **用户可见:** 短 ID 用于 URL 和内容引用,提升用户体验
3. **范围唯一:** 短 ID 仅在特定范围内唯一,允许使用更短的标识符
4. **URL 友好:** 支持简洁优雅的 URL 结构

## 双 ID 机制

### Mindmap ID

#### UUID (主键)

- **类型:** `uuid`
- **生成:** `gen_random_uuid()`
- **用途:** 数据库内部主键,外键关联
- **示例:** `550e8400-e29b-41d4-a716-446655440000`

#### Short ID (用户可见)

- **类型:** `text`
- **长度:** 6 字符
- **字符集:** base36 (小写字母 a-z + 数字 0-9)
- **唯一性范围:** 在同一用户(user_id)范围内唯一
- **格式:** 无前缀,纯随机字符
- **示例:** `abc123`, `x7k9m2`

**命名空间分析:**

- 总空间: 36^6 = 2,176,782,336 (21亿+组合)
- 100 个 mindmaps: 冲突概率 0.0002%
- 1000 个 mindmaps: 冲突概率 0.023%

**数据库约束:**

```sql
mindmaps:
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id uuid NOT NULL REFERENCES auth.users(id)
  short_id text NOT NULL CHECK (short_id = lower(short_id))

  CONSTRAINT unique_user_short_id UNIQUE (user_id, short_id)
```

### Mindmap Node ID

#### UUID (主键)

- **类型:** `uuid`
- **生成:** `gen_random_uuid()`
- **用途:** 数据库内部主键,外键关联(如 parent_id)
- **示例:** `6ba7b810-9dad-11d1-80b4-00c04fd430c8`

#### Short ID (用户可见)

- **类型:** `text`
- **长度:** 6 字符
- **字符集:** base36 (小写字母 a-z + 数字 0-9)
- **唯一性范围:** 在同一 mindmap (mindmap_id) 范围内唯一
- **格式:** 无前缀,纯随机字符
- **示例:** `xyz789`, `a1b2c3`

**命名空间分析:**

- 总空间: 36^6 = 2,176,782,336 (21亿+组合)
- 100 个 nodes/map: 冲突概率 0.0002%
- 1000 个 nodes/map: 冲突概率 0.023%

**数据库约束:**

```sql
mindmap_nodes:
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  mindmap_id uuid NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE
  short_id text NOT NULL CHECK (short_id = lower(short_id))

  CONSTRAINT unique_map_short_id UNIQUE (mindmap_id, short_id)
```

## URL 设计

### URL 结构

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

## Short ID 生成策略

### 生成位置

**应用层生成** (推荐)

使用 nanoid 库在应用层生成,提供更好的控制和错误处理。

### 生成算法

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
  // ... 其他保留词
];

function isReservedShortId(shortId: string): boolean {
  return RESERVED_SHORT_IDS.includes(shortId);
}
```

### 冲突处理

- 使用数据库唯一约束保证唯一性
- 应用层生成时检查冲突,最多重试 3 次
- 如果 3 次都失败,向上抛出错误

## Markdown 引用语法

在节点的 content 字段中,可以使用以下语法引用其他节点:

### 同文档引用

```markdown
# 方式 1: 双方括号

参考 [[xyz789]] 的内容

# 方式 2: @ 符号

参考 @xyz789 的分析

# 方式 3: 带标题(可选)

参考 [[xyz789|节点标题]] 的内容
```

### 跨文档引用(未来扩展)

```markdown
# 引用其他思维导图的节点

参考 [[abc123/xyz789]] 的内容
```

## 数据库索引

### Mindmaps

```sql
-- 复合唯一索引(保证范围内唯一)
CREATE UNIQUE INDEX idx_mindmaps_user_short_id
  ON mindmaps(user_id, short_id);

-- 用户查询优化
CREATE INDEX idx_mindmaps_user_id
  ON mindmaps(user_id);

-- 活跃文档查询优化
CREATE INDEX idx_mindmaps_user_id_active
  ON mindmaps(user_id) WHERE deleted_at IS NULL;
```

### Mindmap Nodes

```sql
-- 复合唯一索引(保证范围内唯一)
CREATE UNIQUE INDEX idx_nodes_map_short_id
  ON mindmap_nodes(mindmap_id, short_id);

-- 文档查询优化
CREATE INDEX idx_nodes_map_id
  ON mindmap_nodes(mindmap_id);

-- 树形结构查询优化
CREATE INDEX idx_nodes_parent_id
  ON mindmap_nodes(parent_id);
```

## 软删除处理

### 策略

当 mindmap 被软删除(设置 deleted_at)时:

- **不复用 short_id** (推荐)
- 保持唯一约束,避免用户混淆
- 旧链接虽然无法访问,但不会被新内容占用

### 实现

```sql
-- 唯一约束不排除已删除的记录
CREATE UNIQUE INDEX idx_mindmaps_user_short_id
  ON mindmaps(user_id, short_id);
  -- 注意: 没有 WHERE deleted_at IS NULL 条件
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

- **长度:** 3-20 字符
- **字符集:** 小写字母、数字、连字符
- **限制:** 不能以连字符开头或结尾
- **正则:** `^[a-z0-9]([a-z0-9-]{1,18}[a-z0-9])?$`
- **示例:** `colin`, `user-123`, `john-doe`

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
  // ... 其他保留词
];
```

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
- 仅拥有者可以访问自己的 mindmaps 和 nodes

### 4. 防止遍历

- Short ID 使用随机生成,无法预测
- 不使用自增 ID,避免暴露数据量

## 性能考虑

### 1. 索引优化

- 为常用查询添加索引
- 使用复合索引支持范围查询

### 2. 查询模式

```sql
-- 通过 short_id 查找 mindmap (需要 user_id)
SELECT * FROM mindmaps
WHERE user_id = ? AND short_id = ?;

-- 通过 short_id 查找 node (需要 mindmap_id)
SELECT * FROM mindmap_nodes
WHERE mindmap_id = ? AND short_id = ?;
```

### 3. 批量操作

- 获取思维导图时,可以批量加载所有节点
- 使用 `mindmap_id` 的索引快速过滤

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

## 总结

双 ID 机制的核心优势:

1. **UUID:** 稳定的内部标识符,不受业务逻辑影响
2. **Short ID:** 用户友好,支持简洁 URL 和内容引用
3. **范围唯一:** 允许使用更短的标识符,减少冲突
4. **灵活性:** 未来可以轻松扩展功能

该设计平衡了技术实现的稳定性和用户体验的友好性。
