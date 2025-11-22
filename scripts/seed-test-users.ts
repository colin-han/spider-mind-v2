#!/usr/bin/env tsx

/**
 * 创建测试用户
 *
 * 这个脚本会创建固定的测试账号，用于开发和 E2E 测试
 *
 * 使用方法:
 *   npx tsx scripts/seed-test-users.ts
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvironmentVariables } from "../src/lib/config/environment-loader";

// 加载环境变量 (从 YAML 文件和 process.env)
console.log("📋 加载环境配置...\n");
const env = loadEnvironmentVariables();

// 从环境变量获取 Supabase 配置
const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseServiceRoleKey = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ 错误: 缺少必要的环境变量");
  console.error("请确保设置了:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// 使用 service role key 创建客户端（绕过 RLS）
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 测试用户列表
const testUsers = [
  {
    email: "test_user1@example.com",
    password: "test123456",
    username: "test_user1",
    displayName: "Test User 1",
  },
  {
    email: "test_user2@example.com",
    password: "test123456",
    username: "test_user2",
    displayName: "Test User 2",
  },
  {
    email: "test_user3@example.com",
    password: "test123456",
    username: "test_user3",
    displayName: "Test User 3",
  },
];

async function seedTestUsers() {
  console.log("🌱 开始创建测试用户...\n");

  for (const user of testUsers) {
    console.log(`📧 创建用户: ${user.email}`);

    try {
      // 使用 admin API 创建用户
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // 自动确认邮箱
        user_metadata: {
          username: user.username,
          display_name: user.displayName,
        },
      });

      if (error) {
        // 如果用户已存在，不算错误
        if (error.message.includes("already registered")) {
          console.log(`  ⚠️  用户已存在: ${user.email}`);
        } else {
          console.error(`  ❌ 创建失败: ${error.message}`, error);
        }
      } else {
        console.log(`  ✅ 创建成功 (ID: ${data.user.id})`);
      }
    } catch (err) {
      console.error(`  ❌ 创建失败:`, err);
    }

    console.log("");
  }

  console.log("✨ 测试用户创建完成！\n");
  console.log("可用的测试账号:");
  testUsers.forEach((user) => {
    console.log(`  - ${user.email} / ${user.password}`);
  });
}

// 运行
seedTestUsers().catch(console.error);
