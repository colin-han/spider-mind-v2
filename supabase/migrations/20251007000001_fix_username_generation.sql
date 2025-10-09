-- 修复触发器生成的 username，确保符合新的约束
-- 问题: 从 email 生成的 username 可能包含下划线或大写字母，不符合新的 username 约束

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

COMMENT ON FUNCTION public.handle_new_user() IS '自动为新用户创建 profile，确保 username 符合约束（小写字母、数字、连字符）';
