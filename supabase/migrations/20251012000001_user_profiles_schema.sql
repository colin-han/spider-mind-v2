-- ============================================================================
-- User Profiles Schema Migration
-- 创建用户扩展资料表及相关功能
-- ============================================================================
-- 合并自以下 migrations:
-- - 20250101000000_create_user_profiles.sql (初始创建)
-- - 20251001203339_update_user_profiles_constraints.sql (更新约束)
-- - 20251007000000_fix_user_profiles_trigger.sql (修复触发器)
-- - 20251007000001_fix_username_generation.sql (修复 username 生成)
-- ============================================================================

-- ============================================================================
-- 1. 创建 handle_updated_at 公共函数
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
-- 2. 创建 user_profiles 表
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
-- 3. 创建索引
-- ============================================================================

CREATE INDEX IF NOT EXISTS user_profiles_username_idx
  ON public.user_profiles(username);

-- ============================================================================
-- 4. 启用 RLS 并创建策略
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
-- 5. 创建 updated_at 自动更新触发器
-- ============================================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. 创建用户注册时自动创建 profile 的触发器
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
-- Migration 完成
-- ============================================================================
-- 功能清单:
-- 1. ✅ 创建 user_profiles 表
-- 2. ✅ username 约束: 3-20字符, 小写字母/数字/连字符, 不能以连字符开头或结尾
-- 3. ✅ 启用 RLS 并创建策略 (查看所有, 创建/更新自己的)
-- 4. ✅ 自动更新 updated_at 触发器
-- 5. ✅ 用户注册时自动创建 profile 触发器
-- 6. ✅ username 生成逻辑: 清理非法字符, 处理冲突
-- ============================================================================
