import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/types/supabase";

// 获取验证后的 Supabase 配置
const {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceRoleKey: supabaseServiceRoleKey,
} = getSupabaseConfig();

// 验证服务端密钥是否可用
if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required for server-side operations"
  );
}

/**
 * 创建服务端 Supabase 客户端
 * 用于服务器端操作，具有完整的管理员权限
 * 注意：这个客户端绕过了 RLS (Row Level Security) 策略
 */
export const createServerClient = () => {
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      // 服务端不需要自动刷新令牌
      autoRefreshToken: false,
      // 服务端不需要持久化会话
      persistSession: false,
      // 服务端不需要检测 URL 中的会话
      detectSessionInUrl: false,
    },
    db: {
      schema: "public",
    },
  });
};

/**
 * 创建用于 Server Components 的 Supabase 客户端
 * 使用 cookies 来维护用户会话状态
 */
export const createServerComponentClient = async () => {
  const cookieStore = await cookies();

  // 获取所有 cookies 作为字符串

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // 添加自定义 header 来处理 cookie
        cookie: cookieStore.toString(),
      },
    },
  });
};

/**
 * 创建用于 Route Handlers 的 Supabase 客户端
 * 用于 API 路由中处理用户会话
 */
export const createRouteHandlerClient = (request: Request) => {
  const cookieHeader = request.headers.get("cookie") ?? "";

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieHeader,
      },
    },
  });
};

// 导出服务端客户端类型
export type ServerSupabaseClient = ReturnType<typeof createServerClient>;
export type ServerComponentClient = Awaited<
  ReturnType<typeof createServerComponentClient>
>;
export type RouteHandlerClient = ReturnType<typeof createRouteHandlerClient>;
