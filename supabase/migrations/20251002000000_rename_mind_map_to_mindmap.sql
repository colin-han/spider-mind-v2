-- ============================================================================
-- Rename Migration: mind_map → mindmap
-- 重命名思维导图相关表，统一命名规范
-- ============================================================================

-- ============================================================================
-- 1. 重命名表
-- ============================================================================

-- 重命名 mind_maps → mindmaps
ALTER TABLE IF EXISTS public.mind_maps RENAME TO mindmaps;

-- 重命名 mind_map_nodes → mindmap_nodes
ALTER TABLE IF EXISTS public.mind_map_nodes RENAME TO mindmap_nodes;

-- ============================================================================
-- 2. 重命名列
-- ============================================================================

-- 重命名外键列: mind_map_id → mindmap_id
ALTER TABLE IF EXISTS public.mindmap_nodes
  RENAME COLUMN mind_map_id TO mindmap_id;

-- ============================================================================
-- 3. 更新表注释
-- ============================================================================

COMMENT ON TABLE public.mindmaps IS '思维导图文档表';
COMMENT ON TABLE public.mindmap_nodes IS '思维导图节点表';

COMMENT ON COLUMN public.mindmap_nodes.mindmap_id IS '所属思维导图ID';

-- ============================================================================
-- 4. 验证约束和索引（PostgreSQL 自动重命名）
-- ============================================================================
-- 注意: PostgreSQL 在重命名表时会自动重命名相关的约束和索引
-- 例如: mind_maps_pkey → mindmaps_pkey
--      idx_mind_maps_user_id → idx_mindmaps_user_id

-- ============================================================================
-- 5. 重新创建受影响的函数和触发器
-- ============================================================================

-- 先删除依赖触发器的函数
DROP TRIGGER IF EXISTS check_node_circular_reference_trigger ON public.mindmap_nodes;

-- 删除旧函数
DROP FUNCTION IF EXISTS public.get_node_descendants(uuid);
DROP FUNCTION IF EXISTS public.get_node_ancestors(uuid);
DROP FUNCTION IF EXISTS public.check_node_circular_reference();

-- 重新创建：获取某个节点的所有子孙节点
CREATE OR REPLACE FUNCTION public.get_node_descendants(root_node_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  short_id text,
  title text,
  node_type text,
  depth integer
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE node_tree AS (
    -- 起始节点
    SELECT
      n.id,
      n.parent_id,
      n.short_id,
      n.title,
      n.node_type,
      0 as depth
    FROM public.mindmap_nodes n
    WHERE n.id = root_node_id

    UNION ALL

    -- 递归查找子节点
    SELECT
      n.id,
      n.parent_id,
      n.short_id,
      n.title,
      n.node_type,
      nt.depth + 1
    FROM public.mindmap_nodes n
    INNER JOIN node_tree nt ON n.parent_id = nt.id
  )
  SELECT
    node_tree.id,
    node_tree.parent_id,
    node_tree.short_id,
    node_tree.title,
    node_tree.node_type,
    node_tree.depth
  FROM node_tree
  ORDER BY depth, order_index;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_node_descendants IS '获取某个节点的所有子孙节点 (递归查询)';

-- 重新创建：获取某个节点的所有祖先节点
CREATE OR REPLACE FUNCTION public.get_node_ancestors(leaf_node_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  short_id text,
  title text,
  node_type text,
  depth integer
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE node_path AS (
    -- 起始节点
    SELECT
      n.id,
      n.parent_id,
      n.short_id,
      n.title,
      n.node_type,
      0 as depth
    FROM public.mindmap_nodes n
    WHERE n.id = leaf_node_id

    UNION ALL

    -- 递归查找父节点
    SELECT
      n.id,
      n.parent_id,
      n.short_id,
      n.title,
      n.node_type,
      np.depth + 1
    FROM public.mindmap_nodes n
    INNER JOIN node_path np ON n.id = np.parent_id
  )
  SELECT
    node_path.id,
    node_path.parent_id,
    node_path.short_id,
    node_path.title,
    node_path.node_type,
    node_path.depth
  FROM node_path
  ORDER BY depth DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_node_ancestors IS '获取某个节点的所有祖先节点 (递归查询)';

-- 重新创建：循环引用检查触发器函数
CREATE OR REPLACE FUNCTION public.check_node_circular_reference()
RETURNS TRIGGER AS $$
DECLARE
  current_parent_id uuid;
  depth integer := 0;
  max_depth integer := 100;
BEGIN
  -- 如果没有父节点, 直接返回
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 检查是否引用自己
  IF NEW.id = NEW.parent_id THEN
    RAISE EXCEPTION 'Node cannot reference itself as parent';
  END IF;

  -- 向上遍历父节点链, 检查是否形成循环
  current_parent_id := NEW.parent_id;

  WHILE current_parent_id IS NOT NULL AND depth < max_depth LOOP
    -- 如果找到自己, 说明形成循环
    IF current_parent_id = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in node hierarchy';
    END IF;

    -- 获取下一个父节点
    SELECT parent_id INTO current_parent_id
    FROM public.mindmap_nodes
    WHERE id = current_parent_id;

    depth := depth + 1;
  END LOOP;

  -- 如果深度超过限制, 可能存在循环
  IF depth >= max_depth THEN
    RAISE EXCEPTION 'Node hierarchy depth exceeds maximum allowed (100 levels)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 重新关联触发器
CREATE TRIGGER check_node_circular_reference_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON public.mindmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_node_circular_reference();

-- ============================================================================
-- Migration 完成
-- ============================================================================
-- 表名变更:
-- - mind_maps → mindmaps
-- - mind_map_nodes → mindmap_nodes
--
-- 列名变更:
-- - mind_map_nodes.mind_map_id → mindmap_nodes.mindmap_id
--
-- 函数已更新为使用新表名
-- ============================================================================
