-- ======================================
-- 测试用户种子数据
-- ======================================
-- 用于开发和 E2E 测试的固定测试账号
-- 密码统一为: test123456
-- ======================================

-- 注意：Supabase 的 auth.users 表只能通过 API 创建
-- 此文件仅作为文档记录测试账号信息
-- 实际创建需要使用 scripts/seed-test-users.ts

-- 测试账号列表：
-- 1. test_user1@example.com (test_user1 / Test User 1)
-- 2. test_user2@example.com (test_user2 / Test User 2)
-- 3. test_user3@example.com (test_user3 / Test User 3)

-- 如果已经通过 API 创建了用户，可以在这里补充 profile 数据
-- 但通常 profile 会通过 trigger 自动创建

-- 清理旧的测试数据（可选，谨慎使用）
-- DELETE FROM auth.users WHERE email LIKE 'test_%@example.com';
-- DELETE FROM public.user_profiles WHERE username LIKE 'test_user%';

COMMENT ON TABLE public.user_profiles IS '用户扩展资料表 - 测试账号已通过 seed 脚本创建';
