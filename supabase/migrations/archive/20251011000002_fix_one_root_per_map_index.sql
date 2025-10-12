-- ============================================================================
-- 修复 idx_one_root_per_map 索引
-- ============================================================================
-- 问题: 原索引使用 WHERE node_type = 'root', 但 node_type 字段已在
--       20251011000001_remove_node_type.sql 中删除
-- 影响: "每个 mindmap 只能有一个 root 节点" 的约束失效
-- 解决: 使用 WHERE parent_id IS NULL 替代 (根节点的 parent_id 为 NULL)
-- ============================================================================

-- 删除旧索引 (引用已删除的 node_type 字段)
DROP INDEX IF EXISTS public.idx_one_root_per_map;

-- 创建新索引: 使用 parent_id IS NULL 判断根节点
CREATE UNIQUE INDEX idx_one_root_per_map
  ON public.mindmap_nodes(mindmap_id)
  WHERE parent_id IS NULL;

-- 添加注释说明
COMMENT ON INDEX public.idx_one_root_per_map IS '部分唯一索引: 确保每个 mindmap 只能有一个根节点 (parent_id IS NULL)';

-- ============================================================================
-- Migration 完成
-- ============================================================================
-- 变更说明:
-- 1. 删除了引用 node_type 字段的旧索引
-- 2. 创建了基于 parent_id IS NULL 的新索引
-- 3. 继续保证 "每个 mindmap 只能有一个根节点" 的约束
-- ============================================================================
