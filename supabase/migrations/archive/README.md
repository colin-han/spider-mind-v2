# Migration Archive

此目录包含已被合并的旧 migration 文件，仅用于历史参考。

## 合并说明

**合并日期**: 2025-10-11

所有 migration 文件已按领域合并为两个主 migration：

1. **`20251012000001_user_profiles_schema.sql`** - User 相关
2. **`20251012000002_mindmap_schema.sql`** - Mindmap 相关

## 已归档的文件

### User 相关 (合并至 20251012000001_user_profiles_schema.sql)

1. `20250101000000_create_user_profiles.sql` - 初始创建 user_profiles 表
2. `20251001203339_update_user_profiles_constraints.sql` - 更新 username 约束
3. `20251007000000_fix_user_profiles_trigger.sql` - 修复 RLS 触发器
4. `20251007000001_fix_username_generation.sql` - 修复 username 生成逻辑

### Mindmap 相关 (合并至 20251012000002_mindmap_schema.sql)

1. `20251001203015_create_mindmap_schema.sql` - 初始创建 mindmaps 和 mindmap_nodes 表
2. `20251003000000_add_parent_short_id.sql` - 添加 parent_short_id 字段
3. `20251011000001_remove_node_type.sql` - 删除 node_type 字段
4. `20251011000002_fix_one_root_per_map_index.sql` - 修复 root 节点索引
5. `20251011000003_add_explicit_unique_indexes.sql` - 添加显式唯一索引
6. `20251011000004_cleanup_legacy_indexes.sql` - 清理遗留索引

## 注意事项

⚠️ **这些文件已不再使用，仅供参考**

- 新部署应使用合并后的 migration 文件
- 这些文件保留用于：
  - 理解历史演进过程
  - 追溯特定功能的实现细节
  - 调试历史问题

## 合并收益

### 简化维护

- **合并前**: 10 个 migration 文件
- **合并后**: 2 个 migration 文件
- **减少**: 80% 的文件数量

### 按领域组织

- **User 领域**: user_profiles 表及相关功能（认证、RLS、触发器）
- **Mindmap 领域**: mindmaps 和 mindmap_nodes 表及相关功能（索引、触发器、辅助函数）

### 完整性保证

- 每个合并后的 migration 包含该领域的完整功能
- 包含所有约束、索引、触发器、函数
- 无需按顺序执行多个文件

## 合并方法

合并过程遵循以下原则：

1. **保持语义一致**: 合并后的功能与原 migration 序列完全一致
2. **消除重复**: 删除被覆盖或替换的代码（如旧约束、旧触发器）
3. **完整包含**: 包含所有最终状态的特性（字段、约束、索引、触发器）
4. **保留注释**: 整合所有重要的注释和说明

## 验证

合并后的 migration 文件已通过以下验证：

- ✅ 语法检查 (PostgreSQL)
- ✅ 功能完整性检查
- ✅ 索引策略对比
- ✅ 约束验证
- ✅ 触发器逻辑验证

---

**参考文档**:

- `.claude/logs/2025-10-11-migration-merge-summary.md` - 详细的合并总结
