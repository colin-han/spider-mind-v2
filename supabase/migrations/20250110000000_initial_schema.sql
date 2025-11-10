-- ============================================================================
-- Initial Schema Migration
-- 创建完整的数据库 schema
-- ============================================================================
-- 版本: v1.0.0
-- 日期: 2025-01-10
-- 描述: 合并所有历史 migrations，创建初始 schema
-- ============================================================================

-- ============================================================================
-- PART 1: User Profiles Schema
-- ============================================================================

-- ============================================================================
-- 1.1 创建 handle_updated_at 公共函数
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_updated_at() IS '触发器函数: 自动更新 updated_at 时间戳';

-- ============================================================================
-- 1.2 创建 user_profiles 表
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  -- 主键: 关联 auth.users
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,

  -- 用户标识
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,

  -- 扩展信息
  avatar_url TEXT,
  bio TEXT,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 约束: username 长度 (3-20 字符)
  CONSTRAINT username_length CHECK (
    char_length(username) >= 3 AND char_length(username) <= 20
  ),

  -- 约束: username 格式 (小写字母、数字、连字符，不能以连字符开头或结尾)
  CONSTRAINT username_format CHECK (
    username ~ '^[a-z0-9]([a-z0-9-]{1,18}[a-z0-9])?$'
  ),

  -- 约束: username 必须小写
  CONSTRAINT username_lowercase CHECK (
    username = lower(username)
  )
);

-- 表注释
COMMENT ON TABLE public.user_profiles IS '用户扩展资料表';
COMMENT ON COLUMN public.user_profiles.id IS '用户ID, 关联 auth.users';
COMMENT ON COLUMN public.user_profiles.username IS '用户名, 唯一标识, 3-20字符, 小写字母、数字、连字符, 不能以连字符开头或结尾, 用于URL: /@{username}';
COMMENT ON COLUMN public.user_profiles.display_name IS '显示名称';
COMMENT ON COLUMN public.user_profiles.avatar_url IS '头像 URL';
COMMENT ON COLUMN public.user_profiles.bio IS '个人简介';
COMMENT ON COLUMN public.user_profiles.created_at IS '创建时间';
COMMENT ON COLUMN public.user_profiles.updated_at IS '最后更新时间';

-- ============================================================================
-- 1.3 创建索引
-- ============================================================================

CREATE INDEX IF NOT EXISTS user_profiles_username_idx
  ON public.user_profiles(username);

-- ============================================================================
-- 1.4 启用 RLS 并创建策略
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 策略: 所有人可以查看 profiles
CREATE POLICY "用户可以查看所有 profiles"
  ON public.user_profiles
  FOR SELECT
  USING (true);

-- RLS 策略: 允许创建 profile (用户或触发器)
CREATE POLICY "允许创建 profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    -- 允许用户创建自己的 profile
    auth.uid() = id
    -- 或者允许 service role (触发器) 创建任何 profile
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- RLS 策略: 用户只能更新自己的 profile
CREATE POLICY "用户只能更新自己的 profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 1.5 创建 updated_at 自动更新触发器
-- ============================================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 1.6 创建用户注册时自动创建 profile 的触发器
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  -- 从 user_metadata 或 email 生成 username
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- 清理 username:
  -- 1. 转换为小写
  -- 2. 将下划线替换为连字符
  -- 3. 移除非法字符（只保留小写字母、数字、连字符）
  -- 4. 移除开头和结尾的连字符
  generated_username := lower(generated_username);
  generated_username := replace(generated_username, '_', '-');
  generated_username := regexp_replace(generated_username, '[^a-z0-9-]', '', 'g');
  generated_username := regexp_replace(generated_username, '^-+|-+$', '', 'g');

  -- 如果处理后的 username 太短，添加后缀
  IF length(generated_username) < 3 THEN
    generated_username := generated_username || '-user';
  END IF;

  -- 如果处理后的 username 太长，截断
  IF length(generated_username) > 20 THEN
    generated_username := substring(generated_username, 1, 20);
    -- 确保不以连字符结尾
    generated_username := regexp_replace(generated_username, '-+$', '', 'g');
  END IF;

  -- 插入 user profile
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    generated_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 如果 username 冲突，添加随机后缀重试
    BEGIN
      generated_username := substring(generated_username, 1, 14) || '-' || substring(md5(random()::text), 1, 5);
      INSERT INTO public.user_profiles (id, username, display_name)
      VALUES (
        NEW.id,
        generated_username,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
      );
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user profile with random suffix: %', SQLERRM;
        RETURN NEW;
    END;
  WHEN OTHERS THEN
    -- 记录其他错误但不阻止用户创建
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS '自动为新用户创建 profile，确保 username 符合约束（小写字母、数字、连字符），使用 SECURITY DEFINER 绕过 RLS';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 2: Mind Map Schema
-- ============================================================================

-- ============================================================================
-- 2.1 创建 mindmaps 表
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
-- 2.2 创建 mindmap_nodes 表
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
  note text,

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
  CONSTRAINT note_length_check CHECK (note IS NULL OR char_length(note) <= 10000),

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
COMMENT ON COLUMN public.mindmap_nodes.note IS '可选的详细描述字段，支持 Markdown 格式，最大长度 10000 字符';
COMMENT ON COLUMN public.mindmap_nodes.order_index IS '同级节点排序索引';

-- ============================================================================
-- 2.3 创建索引
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
-- 2.4 创建触发器 (自动更新 updated_at)
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
-- 2.5 创建循环引用检查和 parent_short_id 自动维护触发器
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
-- 2.6 创建辅助函数
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
--
-- User Profiles:
-- 1. ✅ 创建 user_profiles 表
-- 2. ✅ username 约束: 3-20字符, 小写字母/数字/连字符, 不能以连字符开头或结尾
-- 3. ✅ 启用 RLS 并创建策略 (查看所有, 创建/更新自己的)
-- 4. ✅ 自动更新 updated_at 触发器
-- 5. ✅ 用户注册时自动创建 profile 触发器
-- 6. ✅ username 生成逻辑: 清理非法字符, 处理冲突
--
-- Mind Maps:
-- 1. ✅ 创建 mindmaps 表 (包含 soft delete 支持)
-- 2. ✅ 创建 mindmap_nodes 表 (支持树形结构)
-- 3. ✅ short_id 机制: 6位 base36, 在范围内唯一
-- 4. ✅ parent_short_id 字段: 优化查询性能, 自动维护
-- 5. ✅ note 字段: 支持 Markdown 格式的详细描述 (最大 10000 字符)
-- 6. ✅ 索引策略: 唯一索引 + 性能优化索引
-- 7. ✅ 循环引用检查: 防止节点成为自己的祖先
-- 8. ✅ 自动更新 updated_at 触发器
-- 9. ✅ 辅助函数: 获取子孙节点和祖先节点
-- 10. ✅ 每个 mindmap 只能有一个根节点 (部分唯一索引)
-- 11. ✅ 显式命名的唯一索引 (便于运维监控)
-- ============================================================================
