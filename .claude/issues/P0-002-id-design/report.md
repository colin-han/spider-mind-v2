# 问题报告: URL 路由架构不一致

## 基本信息

- **优先级**: P0 (Critical - 架构决策冲突)
- **报告日期**: 2025-10-11
- **相关文档**: `docs/design/id-design.md`
- **问题类型**: 偏差项 (架构不一致)

## 问题描述

ID 设计文档中描述的 URL 路由规则与实际代码实现存在根本性差异：

**文档定义** (id-design.md):

```
### URL 使用规则

思维导图访问路径:
- 格式: /@{username}/{map-short-id}
- 示例: /@alice/abc123
```

**实际实现** (代码):

```
路由文件: app/mindmaps/[shortId]/page.tsx
实际 URL: /mindmaps/{shortId}
示例: /mindmaps/abc123
```

**核心差异**:

1. **路由模式不同**:
   - 文档: 用户名前缀模式 (`/@username/...`)
   - 代码: 资源路径模式 (`/mindmaps/...`)

2. **路由参数不同**:
   - 文档: 需要 username + shortId 两个参数
   - 代码: 只需要 shortId 一个参数

3. **查询方式不同**:
   - 文档方案: 需要先查询 user 再查询 mindmap
   - 代码方案: 直接通过 shortId 查询 mindmap

## 影响文件

### 文档文件

- `docs/design/id-design.md` - "URL 使用规则"章节

### 代码文件

- `app/mindmaps/[shortId]/page.tsx` - 思维导图详情页路由
- `app/mindmaps/[shortId]/layout.tsx` - 布局文件 (如果存在)
- 相关的导航和链接组件 (使用 `/mindmaps/...` 路径的所有组件)

## 可能影响

### 用户体验

**文档方案 (`/@username/shortId`)** :

- ✅ URL 更友好,可读性更强
- ✅ 符合社交平台习惯 (如 GitHub, Twitter)
- ✅ 用户名可见,便于分享和识别
- ❌ URL 更长
- ❌ 需要确保用户名不变或提供重定向

**代码方案 (`/mindmaps/shortId`)** :

- ✅ URL 更简洁
- ✅ 实现更简单 (单参数查询)
- ✅ 不依赖用户名稳定性
- ❌ URL 可读性较差
- ❌ 无法从 URL 直接看出所有者

### 技术实现

**文档方案复杂度**:

```typescript
// 需要两步查询
1. 根据 username 查询 user_id
2. 根据 user_id + short_id 查询 mindmap

// 路由文件结构
app/@[username]/[shortId]/page.tsx
```

**代码方案复杂度**:

```typescript
// 一步查询
直接根据 short_id 查询 mindmap (如果 short_id 全局唯一)
// 或
根据 short_id 查询,然后验证权限

// 路由文件结构
app/mindmaps/[shortId]/page.tsx  ← 当前实现
```

### SEO 和分享

- 文档方案: 更好的 SEO (URL 包含语义信息)
- 代码方案: SEO 一般 (URL 仅包含 ID)

### 数据模型一致性

**关键问题**: short_id 的唯一性范围

从 `docs/design/database-schema.md`:

```sql
-- mindmaps 表唯一约束
UNIQUE(user_id, short_id)  -- short_id 在用户范围内唯一
```

**影响**:

- ❌ 如果 short_id 仅在用户范围唯一,代码方案 `/mindmaps/{shortId}` 可能冲突
- ⚠️ 需要确认是否有全局唯一性保证

## 修复建议

### 方案一: 更新文档采用代码实现 (推荐)

**优点**:

- ✅ 无需修改代码,零风险
- ✅ 保持当前简洁的实现
- ✅ 快速修复文档不一致

**缺点**:

- ❌ URL 可读性较差
- ❌ 失去用户名前缀的社交属性

**实施步骤**:

1. 更新 `docs/design/id-design.md` "URL 使用规则"章节:

```markdown
### URL 使用规则

思维导图访问路径:

- 格式: `/mindmaps/{short_id}`
- 示例: `/mindmaps/abc123`

**说明**:

- 用户无需在 URL 中指定 username
- 系统通过 short_id 直接定位思维导图
- short_id 虽然在用户范围内唯一,但通过 mindmap 表的 user_id 关联可以正确查询
- 简化了 URL 结构,提升了系统实现的简洁性
```

2. 更新示例查询:

```typescript
// 错误示例 (文档当前描述)
const { data } = await supabase
  .from("mindmaps")
  .select("*")
  .eq("username", "alice") // ❌ mindmaps 表没有 username 字段
  .eq("short_id", "abc123")
  .single();

// 正确示例 (实际实现)
const { data } = await supabase
  .from("mindmaps")
  .select("*, user_profiles!inner(username)")
  .eq("short_id", shortId)
  .single();
```

3. 添加 URL 设计决策说明:

```markdown
## 设计决策

### 为什么使用 /mindmaps/{shortId} 而不是 /@username/{shortId}?

1. **简化查询**: 单参数查询,无需先查用户
2. **避免依赖**: 不依赖用户名稳定性 (用户可能修改用户名)
3. **实现简洁**: 路由结构更简单
4. **性能优化**: 减少一次数据库查询

**权衡**:

- 接受 URL 可读性略差,换取实现简洁和查询性能
```

**预计工时**: 1 小时

---

### 方案二: 重构代码采用文档设计 (不推荐)

**优点**:

- ✅ URL 更友好,符合社交平台习惯
- ✅ 用户名可见,便于识别和分享

**缺点**:

- ❌ 需要重构路由文件
- ❌ 需要修改所有链接生成逻辑
- ❌ 增加查询复杂度
- ❌ 测试工作量大

**实施步骤**:

1. 重构路由结构:

```
app/mindmaps/[shortId]/page.tsx  →  app/@[username]/[shortId]/page.tsx
```

2. 修改查询逻辑:

```typescript
// 先查用户
const { data: user } = await supabase
  .from("user_profiles")
  .select("id")
  .eq("username", username)
  .single();

// 再查思维导图
const { data: mindmap } = await supabase
  .from("mindmaps")
  .select("*")
  .eq("user_id", user.id)
  .eq("short_id", shortId)
  .single();
```

3. 更新所有链接生成:

```typescript
// 所有生成链接的地方都需要包含 username
`/@${username}/${shortId}`;
```

4. 处理用户名变更:

```typescript
// 需要添加 username 变更时的 URL 重定向逻辑
```

5. 全面测试:
   - 所有页面的导航链接
   - 分享功能
   - SEO 相关配置

**预计工时**: 8-12 小时

---

### 方案三: 混合方案 - 支持两种路由 (折中)

同时支持两种 URL 格式,旧 URL 重定向到新 URL:

```
/mindmaps/{shortId}           →  保留,作为简洁格式
/@{username}/{shortId}        →  新增,作为友好格式 (内部重定向)
```

**优点**:

- ✅ 向后兼容
- ✅ 提供友好 URL 选项

**缺点**:

- ❌ 维护两套路由逻辑
- ❌ 增加系统复杂度

**预计工时**: 4-6 小时

---

## 推荐方案

**方案一 (更新文档)** - 理由:

1. ✅ 快速修复,1 小时内完成
2. ✅ 零代码风险,不影响现有功能
3. ✅ 当前实现已经稳定运行
4. ✅ `/mindmaps/{shortId}` 模式简洁实用

**仅在以下情况考虑方案二或方案三**:

- 产品定位明确需要社交属性强的 URL
- 有充足时间进行重构和测试
- URL 可读性是核心产品要求

## 相关问题

此问题与以下问题相关:

- **C-ID-3**: 数据库复合唯一索引缺失 - 需要明确 short_id 的唯一性范围
- **C-ID-4**: 数据库查询示例错误 - 示例中使用了不存在的 username 字段查询

## 验证步骤

修复完成后,验证:

1. ✅ 文档中的 URL 格式与实际路由文件一致
2. ✅ 文档中的查询示例可以正确执行
3. ✅ 不引用 mindmaps 表中不存在的 username 字段
4. ✅ URL 生成逻辑在文档中有清晰说明

---

**生成时间**: 2025-10-11
**来源**: `/doc-verify` - 问题 C-ID-1
**关联文档**:

- `docs/design/id-design.md`
- `docs/design/database-schema.md`
