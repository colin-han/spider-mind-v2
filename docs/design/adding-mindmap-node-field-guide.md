# Mindmap Node 字段添加防疏漏检查清单

## 文档信息

- **创建时间**：2025-11-08
- **版本**：v1.0
- **用途**：为 `mindmap_nodes` 表添加新字段时的完整检查清单

---

## 完整实施检查清单

### ✅ 步骤 1：数据库迁移

- [ ] **创建迁移文件**：`supabase/migrations/YYYYMMDDHHMMSS_add_<field>_to_mindmap_nodes.sql`
  - ⚠️ 文件名必须以时间戳开头
  - ⚠️ 使用 `IF NOT EXISTS` 避免重复执行错误

- [ ] **字段定义**
  - ⚠️ 新字段必须允许 `NULL`（向后兼容）
  - ⚠️ 不要设置非 NULL 默认值（会影响现有数据）
  - ✅ 添加必要的约束（CHECK、长度限制等）
  - ✅ 添加字段注释（COMMENT ON COLUMN）

- [ ] **测试迁移**

  ```bash
  npx supabase db reset
  ```

  - ⚠️ 检查是否有错误输出
  - ⚠️ 验证约束是否生效

---

### ✅ 步骤 2：TypeScript 类型更新

- [ ] **重新生成 Supabase 类型**

  ```bash
  npx supabase gen types typescript --local > src/lib/types/supabase.ts
  ```

  - ⚠️ **不要手动编辑** `supabase.ts` 文件

- [ ] **验证类型定义**
  - ✅ 检查 `Row` 接口包含新字段
  - ✅ 检查 `Insert` 接口包含新字段（可选）
  - ✅ 检查 `Update` 接口包含新字段（可选）
  - ⚠️ `MindmapNode` 类型会自动继承，**无需手动修改**

---

### ✅ 步骤 3：修复创建节点的类型错误

**⚠️ 这是最容易遗漏的步骤！**

- [ ] **查找所有创建节点的位置**

  ```bash
  grep -r "new AddNodeAction" src/domain/commands/node/
  ```

- [ ] **必须修改的文件**（为新字段添加默认值）：
  - [ ] `src/domain/commands/node/add-child.ts`
  - [ ] `src/domain/commands/node/add-sibling-above.ts`
  - [ ] `src/domain/commands/node/add-sibling-below.ts`

- [ ] **添加字段默认值**

  ```typescript
  new AddNodeAction({
    // ... 其他字段
    <field_name>: null,  // ← 必须添加
    // ... 其他字段
  })
  ```

- [ ] **字段默认值规则**
  - 可空字符串字段：使用 `null`
  - 数字字段：使用 `null` 或 `0`（根据业务）
  - 布尔字段：使用 `false`
  - 数组字段：使用 `[]`

---

### ✅ 步骤 4：实现 Update 命令（如果需要用户编辑）

- [ ] **创建命令文件**：`src/domain/commands/node/update-<field>.ts`

- [ ] **实现命令定义**（参考 `update-title.ts` 或 `update-note.ts`）
  - ⚠️ 使用 `CommandDefinition` 接口，**不是类**
  - ⚠️ 类型参数格式：`[(string | undefined)?, ...]` 不是 `[string?, ...]`
  - ✅ 实现 `handler`、`when`、`getDescription` 三个方法

- [ ] **复用 UpdateNodeAction**
  - ⚠️ **不需要创建新的 Action 类**
  - ✅ 直接使用 `UpdateNodeAction`，它支持所有字段的更新

- [ ] **注册命令**
  - [ ] 在 `src/domain/commands/index.ts` 中添加：
    ```typescript
    import "./node/update-<field>";
    ```
  - ⚠️ **必须在文件中导入，否则命令不会注册**

---

### ✅ 步骤 5：验证构建和类型检查

- [ ] **TypeScript 类型检查**

  ```bash
  npx tsc --noEmit
  ```

  - ⚠️ 必须无错误输出

- [ ] **检查代码修改**

  ```bash
  git status
  git diff
  ```

  - ⚠️ 确保没有遗留调试代码

---

### ✅ 步骤 6：更新文档

- [ ] **必须更新的文档**
  - [ ] `docs/design/database-schema.md`
    - 在 `mindmap_nodes` 表字段列表中添加新字段行

  - [ ] `docs/design/action-layer-design.md`
    - 在 `UpdateNodeAction` 使用场景中添加新字段

  - [ ] `docs/design/command-reference.md`（如果实现了命令）
    - 在节点操作命令表中添加新命令

---

## 易错点和注意事项

### ⚠️ 关键易错点

1. **忘记在创建节点命令中添加字段**
   - 症状：`Property '<field>' is missing` 类型错误
   - 影响文件：`add-child.ts`、`add-sibling-above.ts`、`add-sibling-below.ts`
   - 解决：为新字段添加默认值（通常是 `null`）

2. **类型参数语法错误**
   - ❌ 错误：`[string?, string | null?]`
   - ✅ 正确：`[(string | undefined)?, (string | null | undefined)?]`

3. **忘记注册命令**
   - 症状：命令无法调用，`getCommand()` 返回 undefined
   - 解决：在 `src/domain/commands/index.ts` 中添加 import

4. **手动编辑 supabase.ts**
   - ⚠️ 永远不要手动编辑 `src/lib/types/supabase.ts`
   - ✅ 总是使用命令重新生成

5. **新字段设为 NOT NULL**
   - ❌ 这会导致现有数据迁移失败
   - ✅ 新字段必须允许 NULL

### 💡 IndexedDB 相关

- ✅ **无需手动修改 IndexedDB schema**
  - 新字段会自动同步到 IndexedDB
  - `UpdateNodeAction` 已支持所有字段的更新

### 💡 Action 系统相关

- ✅ **不需要创建新的 Action 类**
  - `UpdateNodeAction` 接受 `Partial<MindmapNode>`
  - 可以更新任意字段，包括新添加的字段

---

## 快速命令参考

```bash
# 数据库迁移
npx supabase db reset

# 类型生成
npx supabase gen types typescript --local > src/lib/types/supabase.ts

# 类型检查
npx tsc --noEmit

# 类型检查
volta run yarn type-check

# 查找创建节点的位置
grep -r "new AddNodeAction" src/domain/commands/node/
```

---

## 验收标准

### 数据库层

- [ ] 字段已添加到表中
- [ ] 约束正常工作（如果有）
- [ ] 迁移可以成功执行

### 类型系统层

- [ ] Supabase 类型已重新生成
- [ ] `Row`/`Insert`/`Update` 接口包含新字段
- [ ] `tsc --noEmit` 无错误

### 代码层

- [ ] 所有创建节点的命令已更新
- [ ] Update 命令已实现并注册（如果需要）
- [ ] `yarn build` 成功

### 文档层

- [ ] 数据库设计文档已更新
- [ ] Action 层设计文档已更新
- [ ] 命令参考文档已更新（如果有命令）

---

## 案例参考：note 字段

### 修改文件清单

**新增**：

- `supabase/migrations/20251108100000_add_note_to_mindmap_nodes.sql`
- `src/domain/commands/node/update-note.ts`

**修改**：

- `src/lib/types/supabase.ts`（重新生成）
- `src/domain/commands/index.ts`（添加 import）
- `src/domain/commands/node/add-child.ts`（添加 `note: null`）
- `src/domain/commands/node/add-sibling-above.ts`（添加 `note: null`）
- `src/domain/commands/node/add-sibling-below.ts`（添加 `note: null`）
- `docs/design/database-schema.md`
- `docs/design/action-layer-design.md`

### 遇到的问题

1. **类型参数语法错误**
   - 修改前：`type UpdateNoteParams = [string?, string | null?];`
   - 修改后：`type UpdateNoteParams = [(string | undefined)?, (string | null | undefined)?];`

2. **创建节点缺少字段**
   - 在 3 个文件中添加 `note: null`

---

**检查清单结束**
