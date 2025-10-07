# 数据库架构 设计文档

## 元信息

- 作者：Claude
- 创建日期：2025-10-07
- 最后更新：2025-10-07
- 相关文档：
  - [ID 设计文档](./id-design.md)
  - [思维导图编辑器状态管理设计](./mindmap-editor-store-design.md)
  - [IndexedDB 持久化中间件设计](./indexeddb-persistence-middleware-design.md)

## 关键概念

> 本节定义该设计文档引入的新概念，不包括外部库或其他文档已定义的概念。

| 概念          | 定义                                   | 示例/说明                              |
| ------------- | -------------------------------------- | -------------------------------------- |
| user_profiles | 用户扩展资料表，存储用户基本信息       | 包含用户名、显示名称、头像等           |
| mindmaps      | 思维导图文档表，存储思维导图元数据     | 一个用户可以创建多个思维导图           |
| mindmap_nodes | 思维导图节点表，存储节点内容和层级关系 | 支持root、floating、normal三种节点类型 |
| 软删除        | 通过deleted_at时间戳实现的逻辑删除     | 保留数据用于恢复或审计                 |
| 循环引用检查  | 防止节点形成循环父子关系的机制         | 通过触发器在数据库层面保证数据完整性   |

**原则**：

- 仅包含本文档新设计/引入的概念
- Supabase、PostgreSQL 等外部概念不在此列
- short_id 概念参见 [ID 设计文档](./id-design.md)

## 概述

定义 Spider Mark 应用的数据库架构，包括用户管理、思维导图存储、节点层级关系等核心数据结构。

## 背景和动机

Spider Mark 是一个思维导图应用，需要：

- 持久化存储用户创建的思维导图
- 支持复杂的节点层级关系
- 保证数据完整性和一致性
- 支持未来的协同编辑功能扩展

## 设计目标

- **数据完整性**：通过约束和触发器保证数据一致性
- **性能优化**：合理的索引设计支持高效查询
- **扩展性**：架构设计支持未来功能扩展
- **安全性**：通过 RLS 策略控制数据访问权限

## 快速参考

### 常用查询

```sql
-- 获取用户的所有思维导图
SELECT * FROM mindmaps
WHERE user_id = $1 AND deleted_at IS NULL
ORDER BY updated_at DESC;

-- 获取思维导图的所有节点
SELECT * FROM mindmap_nodes
WHERE mindmap_id = $1
ORDER BY parent_id, order_index;

-- 获取节点的子孙节点
SELECT * FROM get_node_descendants($node_id);
```

## 设计方案

### 架构概览

```
┌──────────────────┐
│   auth.users     │  (Supabase Auth)
└────────┬─────────┘
         │ 1:1
         ▼
┌──────────────────┐
│  user_profiles   │  用户扩展信息
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐
│    mindmaps      │  思维导图文档
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐
│  mindmap_nodes   │  思维导图节点
└──────────────────┘
         │
         │ 自引用 (parent_id)
         ▼
```

### 详细设计

#### 数据模型

##### user_profiles 表

存储用户扩展信息，与 Supabase Auth 的 users 表一对一关联。

| 字段         | 类型        | 约束                               | 说明               |
| ------------ | ----------- | ---------------------------------- | ------------------ |
| id           | UUID        | PRIMARY KEY, REFERENCES auth.users | 用户ID             |
| username     | TEXT        | UNIQUE, NOT NULL                   | 用户名（3-20字符） |
| display_name | TEXT        |                                    | 显示名称           |
| avatar_url   | TEXT        |                                    | 头像URL            |
| bio          | TEXT        |                                    | 个人简介           |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 创建时间           |
| updated_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 更新时间           |

##### mindmaps 表

存储思维导图文档的元数据。

| 字段        | 类型        | 约束                               | 说明              |
| ----------- | ----------- | ---------------------------------- | ----------------- |
| id          | UUID        | PRIMARY KEY                        | 主键              |
| user_id     | UUID        | NOT NULL, REFERENCES user_profiles | 所属用户          |
| short_id    | TEXT        | NOT NULL                           | 短ID（6位base36） |
| title       | TEXT        | NOT NULL                           | 标题              |
| description | TEXT        |                                    | 描述              |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 创建时间          |
| updated_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 更新时间          |
| deleted_at  | TIMESTAMPTZ |                                    | 软删除时间戳      |

唯一约束：`(user_id, short_id)` - 确保短ID在用户范围内唯一

##### mindmap_nodes 表

存储思维导图节点内容和层级关系。

| 字段        | 类型        | 约束                          | 说明                           |
| ----------- | ----------- | ----------------------------- | ------------------------------ |
| id          | UUID        | PRIMARY KEY                   | 主键                           |
| mindmap_id  | UUID        | NOT NULL, REFERENCES mindmaps | 所属思维导图                   |
| parent_id   | UUID        | REFERENCES mindmap_nodes      | 父节点ID（自引用）             |
| short_id    | TEXT        | NOT NULL                      | 短ID（6位base36）              |
| node_type   | TEXT        | NOT NULL                      | 节点类型：root/floating/normal |
| title       | TEXT        | NOT NULL                      | 节点标题                       |
| content     | TEXT        |                               | 节点内容（Markdown）           |
| order_index | INTEGER     | NOT NULL, DEFAULT 0           | 排序索引                       |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 创建时间                       |
| updated_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | 更新时间                       |

唯一约束：

- `(mindmap_id, short_id)` - 确保短ID在思维导图范围内唯一
- 每个mindmap只能有一个root节点（通过部分唯一索引实现）

#### 索引策略

##### mindmaps 表索引

- `idx_mindmaps_user_id` - 支持按用户查询
- `idx_mindmaps_user_active` - 支持查询用户的活跃文档（未删除）
- `idx_mindmaps_created_at` - 支持按创建时间排序
- `idx_mindmaps_updated_at` - 支持按更新时间排序

##### mindmap_nodes 表索引

- `idx_nodes_map_id` - 支持获取思维导图的所有节点
- `idx_nodes_parent_id` - 支持获取子节点
- `idx_nodes_map_parent` - 复合索引优化层级查询
- `idx_nodes_parent_order` - 支持有序获取同级节点

#### 数据完整性保障

##### 触发器

1. **自动更新 updated_at**
   - `set_mindmaps_updated_at`
   - `set_mindmap_nodes_updated_at`

2. **循环引用检查**
   - `check_node_circular_reference_trigger`
   - 防止节点成为自己的祖先

##### 约束检查

1. **short_id 格式**
   - 长度必须为6
   - 只能包含小写字母和数字
   - 格式：`^[a-z0-9]{6}$`

2. **节点类型约束**
   - root和floating节点的parent_id必须为NULL
   - normal节点必须有parent_id
   - 每个mindmap只能有一个root节点

## 实现要点

### 辅助函数

```sql
-- 获取节点的所有子孙节点（递归）
get_node_descendants(root_node_id uuid)

-- 获取节点的所有祖先节点（递归）
get_node_ancestors(leaf_node_id uuid)
```

### RLS 策略

- user_profiles 表启用了行级安全策略
- 所有人可查看profiles，但只能创建/更新自己的profile
- mindmaps 和 mindmap_nodes 表的RLS策略预留给未来协同功能

## 使用示例

### 创建思维导图

```typescript
// 1. 创建思维导图文档
const mindmap = await supabase
  .from("mindmaps")
  .insert({
    user_id: userId,
    short_id: generateShortId(),
    title: "新思维导图",
  })
  .select()
  .single();

// 2. 创建根节点
const rootNode = await supabase
  .from("mindmap_nodes")
  .insert({
    mindmap_id: mindmap.id,
    short_id: generateShortId(),
    node_type: "root",
    title: "中心主题",
  })
  .select()
  .single();
```

## 设计决策

1. **为什么使用软删除？**
   - 支持数据恢复
   - 保留审计历史
   - 避免级联删除的复杂性

2. **为什么在数据库层面检查循环引用？**
   - 保证数据完整性
   - 防止应用层bug导致数据损坏
   - 提供最后一道安全防线

3. **为什么使用触发器更新 updated_at？**
   - 确保时间戳的一致性
   - 减少应用层的重复代码
   - 自动化维护

## 替代方案

### 考虑过的方案

1. **使用 JSONB 存储整个思维导图**
   - 优点：简单、原子性操作
   - 缺点：查询效率低、不支持细粒度权限控制
   - 结论：不采用，选择关系型结构

2. **使用邻接列表模型存储层级关系**
   - 优点：查询直接子节点快
   - 缺点：查询整个子树需要递归
   - 结论：采用，配合递归CTE和辅助函数

## 修订历史

| 日期       | 版本  | 修改内容 | 作者   |
| ---------- | ----- | -------- | ------ |
| 2025-10-07 | 1.0.0 | 初始版本 | Claude |
