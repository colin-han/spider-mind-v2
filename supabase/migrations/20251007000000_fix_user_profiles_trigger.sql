-- 修复 user_profiles 触发器，确保自动创建 profile 时绕过 RLS
-- 问题：触发器创建 profile 时，auth.uid() 可能为 null，导致 RLS INSERT 策略失败

-- 1. 删除旧的 INSERT RLS 策略
DROP POLICY IF EXISTS "用户只能创建自己的 profile" ON public.user_profiles;

-- 2. 创建新的 INSERT RLS 策略，允许触发器绕过检查
-- 使用 SECURITY DEFINER 的触发器函数会以 postgres 用户运行，所以需要允许 service role 插入
CREATE POLICY "允许创建 profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    -- 允许用户创建自己的 profile
    auth.uid() = id
    -- 或者允许 service role (触发器) 创建任何 profile
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- 3. 更新触发器函数，确保使用正确的权限
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 使用 SECURITY DEFINER 确保有足够权限
  -- 直接插入，不依赖 auth.uid()
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- 如果 profile 已存在，忽略错误
    RETURN NEW;
  WHEN OTHERS THEN
    -- 记录其他错误但不阻止用户创建
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION public.handle_new_user() IS '自动为新用户创建 profile，使用 SECURITY DEFINER 绕过 RLS';
