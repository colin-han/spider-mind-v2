import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/types/supabase";

// 获取验证后的 Supabase 配置
const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig();

// 创建客户端 Supabase 实例
// 这个客户端实例用于浏览器端的数据操作和认证
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 自动刷新令牌
    autoRefreshToken: true,
    // 持久化会话到本地存储
    persistSession: true,
    // 检测 URL 中的会话信息（用于邮件链接认证等）
    detectSessionInUrl: true,
  },
  db: {
    // 使用公共模式
    schema: "public",
  },
  // 实时订阅配置
  realtime: {
    // 启用实时功能
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 导出客户端类型，方便其他文件使用
export type SupabaseClient = typeof supabase;
