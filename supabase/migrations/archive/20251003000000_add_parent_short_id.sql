-- ============================================================================
-- Add parent_short_id Column Migration
-- 为 mindmap_nodes 表添加 parent_short_id 字段，以优化 Store 中的父子节点查询
-- ============================================================================

-- ============================================================================
-- 1. 添加 parent_short_id 字段
-- ============================================================================

ALTER TABLE public.mindmap_nodes
  ADD COLUMN parent_short_id text;

-- 添加注释
COMMENT ON COLUMN public.mindmap_nodes.parent_short_id IS '父节点的 short_id, root 和 floating 节点为 NULL';

-- ============================================================================
-- 2. 为现有数据填充 parent_short_id
-- ============================================================================

-- 从 parent_id 反查 short_id 填充 parent_short_id
UPDATE public.mindmap_nodes n
SET parent_short_id = p.short_id
FROM public.mindmap_nodes p
WHERE n.parent_id = p.id;

-- ============================================================================
-- 3. 添加约束
-- ============================================================================

-- parent_short_id 的长度约束
ALTER TABLE public.mindmap_nodes
  ADD CONSTRAINT parent_short_id_length CHECK (
    parent_short_id IS NULL OR char_length(parent_short_id) = 6
  );

-- parent_short_id 的格式约束
ALTER TABLE public.mindmap_nodes
  ADD CONSTRAINT parent_short_id_format CHECK (
    parent_short_id IS NULL OR parent_short_id ~ '^[a-z0-9]{6}$'
  );

-- ============================================================================
-- 4. 创建索引
-- ============================================================================

-- 通过 parent_short_id 查找子节点的索引
CREATE INDEX IF NOT EXISTS idx_nodes_parent_short_id
  ON public.mindmap_nodes(parent_short_id);

-- 组合索引: mindmap_id + parent_short_id (优化同一思维导图下的子节点查询)
CREATE INDEX IF NOT EXISTS idx_nodes_map_parent_short
  ON public.mindmap_nodes(mindmap_id, parent_short_id);

-- ============================================================================
-- 5. 更新循环引用检查触发器 (增加 parent_short_id 一致性检查)
-- ============================================================================

-- 删除旧触发器
DROP TRIGGER IF EXISTS check_node_circular_reference_trigger ON public.mindmap_nodes;

-- 删除旧函数
DROP FUNCTION IF EXISTS public.check_node_circular_reference();

-- 重新创建触发器函数 (增强版: 同时检查 parent_short_id)
CREATE OR REPLACE FUNCTION public.check_node_circular_reference()
RETURNS TRIGGER AS $$
DECLARE
  current_parent_id uuid;
  depth integer := 0;
  max_depth integer := 100;
  parent_short_id_value text;
BEGIN
  -- 如果没有父节点, parent_short_id 也必须为 NULL
  IF NEW.parent_id IS NULL THEN
    IF NEW.parent_short_id IS NOT NULL THEN
      RAISE EXCEPTION 'parent_short_id must be NULL when parent_id is NULL';
    END IF;
    RETURN NEW;
  END IF;

  -- 如果有 parent_id, 验证 parent_short_id 的一致性
  SELECT short_id INTO parent_short_id_value
  FROM public.mindmap_nodes
  WHERE id = NEW.parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent node does not exist';
  END IF;

  -- 自动设置或验证 parent_short_id
  IF NEW.parent_short_id IS NULL THEN
    NEW.parent_short_id := parent_short_id_value;
  ELSIF NEW.parent_short_id != parent_short_id_value THEN
    RAISE EXCEPTION 'parent_short_id does not match parent node short_id';
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
  BEFORE INSERT OR UPDATE OF parent_id, parent_short_id ON public.mindmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_node_circular_reference();

-- ============================================================================
-- Migration 完成
-- ============================================================================
-- 变更说明:
-- 1. 添加了 parent_short_id 字段，与 parent_id 保持一致
-- 2. 为现有数据自动填充了 parent_short_id
-- 3. 添加了相关约束和索引
-- 4. 更新了循环引用检查触发器，自动维护 parent_id 和 parent_short_id 的一致性
-- 5. Store 层可以直接通过 parent_short_id 查找父节点，无需 id 转换
-- ============================================================================
