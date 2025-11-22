import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/types/supabase";

/**
 * 创建服务端 Supabase 客户端
 * 用于服务器端操作，具有完整的管理员权限
 * 注意：这个客户端绕过了 RLS (Row Level Security) 策略
 */
export const createServerClient = () => {
  const config = getSupabaseConfig();
  const supabaseUrl = config.url;
  const { serviceRoleKey: supabaseServiceRoleKey } = config;

  // 验证服务端密钥是否可用
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side operations"
    );
  }

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
 * 使用 @supabase/ssr 来正确处理 cookies
 */
export const createServerComponentClient = async () => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const config = getSupabaseConfig();
  const supabaseUrl = config.url;
  const supabaseAnonKey = config.anonKey;

  return createSSRClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (_error) {
          // Server Component 中调用 setAll 会被忽略
        }
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

  const config = getSupabaseConfig();
  const supabaseUrl = config.url;
  const supabaseAnonKey = config.anonKey;

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
