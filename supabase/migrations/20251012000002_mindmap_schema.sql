-- ============================================================================
-- Mind Map Schema Migration
-- 创建思维导图相关表: mindmaps 和 mindmap_nodes
-- ============================================================================
-- 合并自以下 migrations:
-- - 20251001203015_create_mindmap_schema.sql (初始创建)
-- - 20251003000000_add_parent_short_id.sql (添加 parent_short_id)
-- - 20251011000001_remove_node_type.sql (删除 node_type)
-- - 20251011000002_fix_one_root_per_map_index.sql (修复 root 索引)
-- - 20251011000003_add_explicit_unique_indexes.sql (添加显式唯一索引)
-- - 20251011000004_cleanup_legacy_indexes.sql (清理遗留索引)
-- ============================================================================

-- ============================================================================
-- 1. 创建 mindmaps 表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mindmaps (
  -- 主键
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外键: 关联用户
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Short ID (用户可见, 在用户范围内唯一)
  short_id text NOT NULL,

  -- 基本信息
  title text NOT NULL,

  -- 时间戳
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  -- 约束
  CONSTRAINT short_id_length CHECK (char_length(short_id) = 6),
  CONSTRAINT short_id_format CHECK (short_id ~ '^[a-z0-9]{6}$'),
  CONSTRAINT short_id_lowercase CHECK (short_id = lower(short_id)),
  CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0),

  -- 唯一约束: short_id 在用户范围内唯一
  CONSTRAINT unique_user_short_id UNIQUE (user_id, short_id)
);

-- 表注释
COMMENT ON TABLE public.mindmaps IS '思维导图文档表';
COMMENT ON COLUMN public.mindmaps.id IS '主键 UUID, 数据库内部使用';
COMMENT ON COLUMN public.mindmaps.user_id IS '所属用户ID, 关联 user_profiles';
COMMENT ON COLUMN public.mindmaps.short_id IS '短ID, 6位base36(a-z,0-9), 在用户范围内唯一, 用于URL';
COMMENT ON COLUMN public.mindmaps.title IS '文档标题, 不能为空或仅空格';
COMMENT ON COLUMN public.mindmaps.created_at IS '创建时间';
COMMENT ON COLUMN public.mindmaps.updated_at IS '最后更新时间';
COMMENT ON COLUMN public.mindmaps.deleted_at IS '软删除时间戳, 非NULL表示已删除';

-- ============================================================================
-- 2. 创建 mindmap_nodes 表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mindmap_nodes (
  -- 主键
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外键: 关联思维导图
  mindmap_id uuid NOT NULL REFERENCES public.mindmaps(id) ON DELETE CASCADE,

  -- 外键: 父节点 (自引用) - NULL 表示根节点
  parent_id uuid REFERENCES public.mindmap_nodes(id) ON DELETE CASCADE,

  -- 父节点的 short_id (冗余字段，自动维护)
  parent_short_id text,

  -- Short ID (用户可见, 在 mindmap 范围内唯一)
  short_id text NOT NULL,

  -- 内容
  title text NOT NULL,
  content text,

  -- 排序
  order_index integer NOT NULL DEFAULT 0,

  -- 时间戳
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- 约束
  CONSTRAINT short_id_length CHECK (char_length(short_id) = 6),
  CONSTRAINT short_id_format CHECK (short_id ~ '^[a-z0-9]{6}$'),
  CONSTRAINT short_id_lowercase CHECK (short_id = lower(short_id)),
  CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT no_self_reference CHECK (id != parent_id),

  -- parent_short_id 约束
  CONSTRAINT parent_short_id_length CHECK (
    parent_short_id IS NULL OR char_length(parent_short_id) = 6
  ),
  CONSTRAINT parent_short_id_format CHECK (
    parent_short_id IS NULL OR parent_short_id ~ '^[a-z0-9]{6}$'
  ),

  -- 唯一约束: short_id 在 mindmap 范围内唯一
  CONSTRAINT unique_map_short_id UNIQUE (mindmap_id, short_id)
);

-- 表注释
COMMENT ON TABLE public.mindmap_nodes IS '思维导图节点表';
COMMENT ON COLUMN public.mindmap_nodes.id IS '主键 UUID, 用于内部引用(如 parent_id)';
COMMENT ON COLUMN public.mindmap_nodes.mindmap_id IS '所属思维导图ID';
COMMENT ON COLUMN public.mindmap_nodes.parent_id IS '父节点UUID。NULL表示根节点,非NULL表示普通节点';
COMMENT ON COLUMN public.mindmap_nodes.parent_short_id IS '父节点的 short_id, 根节点为 NULL';
COMMENT ON COLUMN public.mindmap_nodes.short_id IS '短ID, 6位base36, 在mindmap范围内唯一, 用于内容引用';
COMMENT ON COLUMN public.mindmap_nodes.title IS '节点标题';
COMMENT ON COLUMN public.mindmap_nodes.content IS '节点内容, 支持Markdown格式';
COMMENT ON COLUMN public.mindmap_nodes.order_index IS '同级节点排序索引';

-- ============================================================================
-- 3. 创建索引
-- ============================================================================

-- mindmaps 表索引

-- 唯一索引 (显式命名)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mindmaps_user_short_id
  ON public.mindmaps(user_id, short_id);

COMMENT ON INDEX public.idx_mindmaps_user_short_id IS
  '复合唯一索引: 确保 short_id 在用户范围内唯一';

-- 性能优化索引
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_id
  ON public.mindmaps(user_id);

CREATE INDEX IF NOT EXISTS idx_mindmaps_user_active
  ON public.mindmaps(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mindmaps_created_at
  ON public.mindmaps(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mindmaps_updated_at
  ON public.mindmaps(updated_at DESC);

-- mindmap_nodes 表索引

-- 唯一索引 (显式命名)
CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_map_short_id
  ON public.mindmap_nodes(mindmap_id, short_id);

COMMENT ON INDEX public.idx_nodes_map_short_id IS
  '复合唯一索引: 确保 short_id 在思维导图范围内唯一';

-- 部分唯一索引: 每个 mindmap 只能有一个根节点
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_root_per_map
  ON public.mindmap_nodes(mindmap_id)
  WHERE parent_id IS NULL;

COMMENT ON INDEX public.idx_one_root_per_map IS
  '部分唯一索引: 确保每个 mindmap 只能有一个根节点 (parent_id IS NULL)';

-- 性能优化索引
CREATE INDEX IF NOT EXISTS idx_nodes_map_id
  ON public.mindmap_nodes(mindmap_id);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_id
  ON public.mindmap_nodes(parent_id);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_short_id
  ON public.mindmap_nodes(parent_short_id);

CREATE INDEX IF NOT EXISTS idx_nodes_map_parent
  ON public.mindmap_nodes(mindmap_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_nodes_map_parent_short
  ON public.mindmap_nodes(mindmap_id, parent_short_id);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_order
  ON public.mindmap_nodes(parent_id, order_index);

-- ============================================================================
-- 4. 创建触发器 (自动更新 updated_at)
-- ============================================================================

-- mindmaps 表的 updated_at 触发器
CREATE TRIGGER set_mindmaps_updated_at
  BEFORE UPDATE ON public.mindmaps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- mindmap_nodes 表的 updated_at 触发器
CREATE TRIGGER set_mindmap_nodes_updated_at
  BEFORE UPDATE ON public.mindmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. 创建循环引用检查和 parent_short_id 自动维护触发器
-- ============================================================================

-- 创建触发器函数: 检查节点不能是自己的祖先, 并自动维护 parent_short_id
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

COMMENT ON FUNCTION public.check_node_circular_reference IS '检查节点循环引用并自动维护 parent_short_id';

-- 为 mindmap_nodes 添加循环引用检查触发器
CREATE TRIGGER check_node_circular_reference_trigger
  BEFORE INSERT OR UPDATE OF parent_id, parent_short_id ON public.mindmap_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_node_circular_reference();

-- ============================================================================
-- 6. 创建辅助函数
-- ============================================================================

-- 获取某个节点的所有子孙节点 (递归查询)
CREATE OR REPLACE FUNCTION public.get_node_descendants(root_node_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  short_id text,
  title text,
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
      0 as depth,
      n.order_index
    FROM public.mindmap_nodes n
    WHERE n.id = root_node_id

    UNION ALL

    -- 递归查找子节点
    SELECT
      n.id,
      n.parent_id,
      n.short_id,
      n.title,
      nt.depth + 1,
      n.order_index
    FROM public.mindmap_nodes n
    INNER JOIN node_tree nt ON n.parent_id = nt.id
  )
  SELECT
    node_tree.id,
    node_tree.parent_id,
    node_tree.short_id,
    node_tree.title,
    node_tree.depth
  FROM node_tree
  ORDER BY depth, order_index;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_node_descendants IS '获取某个节点的所有子孙节点 (递归查询)';

-- 获取某个节点的所有祖先节点 (递归查询)
CREATE OR REPLACE FUNCTION public.get_node_ancestors(leaf_node_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  short_id text,
  title text,
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
      np.depth + 1
    FROM public.mindmap_nodes n
    INNER JOIN node_path np ON n.id = np.parent_id
  )
  SELECT
    node_path.id,
    node_path.parent_id,
    node_path.short_id,
    node_path.title,
    node_path.depth
  FROM node_path
  ORDER BY depth DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_node_ancestors IS '获取某个节点的所有祖先节点 (递归查询)';

-- ============================================================================
-- Migration 完成
-- ============================================================================
-- 功能清单:
-- 1. ✅ 创建 mindmaps 表 (包含 soft delete 支持)
-- 2. ✅ 创建 mindmap_nodes 表 (支持树形结构)
-- 3. ✅ short_id 机制: 6位 base36, 在范围内唯一
-- 4. ✅ parent_short_id 字段: 优化查询性能, 自动维护
-- 5. ✅ 索引策略: 唯一索引 + 性能优化索引
-- 6. ✅ 循环引用检查: 防止节点成为自己的祖先
-- 7. ✅ 自动更新 updated_at 触发器
-- 8. ✅ 辅助函数: 获取子孙节点和祖先节点
-- 9. ✅ 每个 mindmap 只能有一个根节点 (部分唯一索引)
-- 10. ✅ 显式命名的唯一索引 (便于运维监控)
-- ============================================================================
-- 注意:
-- 1. 本 migration 不包含 RLS 策略, 权限控制在应用层实现
-- 2. 未来如需协同编辑, 需要单独添加 RLS 策略
-- 3. mindmaps.user_id 引用 user_profiles(id)
-- 4. 根节点判断: parent_id IS NULL
-- 5. parent_short_id 通过触发器自动维护, 确保与 parent_id 一致
-- ============================================================================
