-- ============================================================================
-- Mind Map Schema Migration
-- 创建思维导图相关表: mind_maps 和 mind_map_nodes
-- ============================================================================

-- ============================================================================
-- 1. 创建 mind_maps 表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mind_maps (
  -- 主键
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外键: 关联用户
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Short ID (用户可见, 在用户范围内唯一)
  short_id text NOT NULL,

  -- 基本信息
  title text NOT NULL,
  description text,

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
COMMENT ON TABLE public.mind_maps IS '思维导图文档表';
COMMENT ON COLUMN public.mind_maps.id IS '主键 UUID, 数据库内部使用';
COMMENT ON COLUMN public.mind_maps.user_id IS '所属用户ID, 关联 user_profiles';
COMMENT ON COLUMN public.mind_maps.short_id IS '短ID, 6位base36(a-z,0-9), 在用户范围内唯一, 用于URL';
COMMENT ON COLUMN public.mind_maps.title IS '文档标题, 不能为空或仅空格';
COMMENT ON COLUMN public.mind_maps.description IS '文档描述';
COMMENT ON COLUMN public.mind_maps.created_at IS '创建时间';
COMMENT ON COLUMN public.mind_maps.updated_at IS '最后更新时间';
COMMENT ON COLUMN public.mind_maps.deleted_at IS '软删除时间戳, 非NULL表示已删除';

-- ============================================================================
-- 2. 创建 mind_map_nodes 表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mind_map_nodes (
  -- 主键
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外键: 关联思维导图
  mind_map_id uuid NOT NULL REFERENCES public.mind_maps(id) ON DELETE CASCADE,

  -- 外键: 父节点 (自引用)
  parent_id uuid REFERENCES public.mind_map_nodes(id) ON DELETE CASCADE,

  -- Short ID (用户可见, 在 mind_map 范围内唯一)
  short_id text NOT NULL,

  -- 节点类型
  node_type text NOT NULL,

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
  CONSTRAINT valid_node_type CHECK (node_type IN ('root', 'floating', 'normal')),
  CONSTRAINT no_self_reference CHECK (id != parent_id),

  -- root 和 floating 节点的 parent_id 必须为 NULL
  CONSTRAINT root_floating_no_parent CHECK (
    (node_type IN ('root', 'floating') AND parent_id IS NULL) OR
    (node_type = 'normal')
  ),

  -- normal 节点必须有 parent_id
  CONSTRAINT normal_must_have_parent CHECK (
    (node_type = 'normal' AND parent_id IS NOT NULL) OR
    (node_type IN ('root', 'floating'))
  ),

  -- 唯一约束: short_id 在 mind_map 范围内唯一
  CONSTRAINT unique_map_short_id UNIQUE (mind_map_id, short_id)
);

-- 唯一约束: 每个 mind_map 只能有一个 root 节点
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_root_per_map
  ON public.mind_map_nodes(mind_map_id)
  WHERE node_type = 'root';

-- 表注释
COMMENT ON TABLE public.mind_map_nodes IS '思维导图节点表';
COMMENT ON COLUMN public.mind_map_nodes.id IS '主键 UUID, 用于内部引用(如 parent_id)';
COMMENT ON COLUMN public.mind_map_nodes.mind_map_id IS '所属思维导图ID';
COMMENT ON COLUMN public.mind_map_nodes.parent_id IS '父节点ID, root和floating节点为NULL';
COMMENT ON COLUMN public.mind_map_nodes.short_id IS '短ID, 6位base36, 在mind_map范围内唯一, 用于内容引用';
COMMENT ON COLUMN public.mind_map_nodes.node_type IS '节点类型: root(根节点), floating(浮动节点), normal(普通节点)';
COMMENT ON COLUMN public.mind_map_nodes.title IS '节点标题';
COMMENT ON COLUMN public.mind_map_nodes.content IS '节点内容, 支持Markdown格式';
COMMENT ON COLUMN public.mind_map_nodes.order_index IS '同级节点排序索引';

-- ============================================================================
-- 3. 创建索引
-- ============================================================================

-- mind_maps 索引
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id
  ON public.mind_maps(user_id);

CREATE INDEX IF NOT EXISTS idx_mind_maps_user_active
  ON public.mind_maps(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mind_maps_created_at
  ON public.mind_maps(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mind_maps_updated_at
  ON public.mind_maps(updated_at DESC);

-- mind_map_nodes 索引
CREATE INDEX IF NOT EXISTS idx_nodes_map_id
  ON public.mind_map_nodes(mind_map_id);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_id
  ON public.mind_map_nodes(parent_id);

CREATE INDEX IF NOT EXISTS idx_nodes_map_parent
  ON public.mind_map_nodes(mind_map_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_nodes_map_type
  ON public.mind_map_nodes(mind_map_id, node_type);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_order
  ON public.mind_map_nodes(parent_id, order_index);

-- ============================================================================
-- 4. 创建触发器 (自动更新 updated_at)
-- ============================================================================

-- mind_maps 表的 updated_at 触发器
CREATE TRIGGER set_mind_maps_updated_at
  BEFORE UPDATE ON public.mind_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- mind_map_nodes 表的 updated_at 触发器
CREATE TRIGGER set_mind_map_nodes_updated_at
  BEFORE UPDATE ON public.mind_map_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. 创建循环引用检查触发器
-- ============================================================================

-- 创建触发器函数: 检查节点不能是自己的祖先
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
    FROM public.mind_map_nodes
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

-- 为 mind_map_nodes 添加循环引用检查触发器
CREATE TRIGGER check_node_circular_reference_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON public.mind_map_nodes
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
    FROM public.mind_map_nodes n
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
    FROM public.mind_map_nodes n
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

-- 获取某个节点的所有祖先节点 (递归查询)
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
    FROM public.mind_map_nodes n
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
    FROM public.mind_map_nodes n
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

-- ============================================================================
-- Migration 完成
-- ============================================================================
-- 注意:
-- 1. 本 migration 不包含 RLS 策略, 权限控制在应用层实现
-- 2. 未来如需协同编辑, 需要单独添加 RLS 策略
-- 3. mind_maps.user_id 引用 user_profiles(id)
-- 4. 每个 mind_map 只能有一个 root 节点 (通过部分唯一索引保证)
-- 5. 防止节点循环引用 (通过触发器检查)
-- ============================================================================
