-- 创建 user_profiles 表
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);

-- 启用 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有人可以查看 profiles
CREATE POLICY "用户可以查看所有 profiles"
  ON public.user_profiles
  FOR SELECT
  USING (true);

-- RLS 策略：用户只能插入自己的 profile
CREATE POLICY "用户只能创建自己的 profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS 策略：用户只能更新自己的 profile
CREATE POLICY "用户只能更新自己的 profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 触发器函数：自动更新 updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 触发器函数：用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 添加注释
COMMENT ON TABLE public.user_profiles IS '用户扩展资料表';
COMMENT ON COLUMN public.user_profiles.username IS '用户名，唯一标识，3-20字符，仅字母数字下划线';
COMMENT ON COLUMN public.user_profiles.display_name IS '显示名称';
COMMENT ON COLUMN public.user_profiles.avatar_url IS '头像 URL';
COMMENT ON COLUMN public.user_profiles.bio IS '个人简介';
