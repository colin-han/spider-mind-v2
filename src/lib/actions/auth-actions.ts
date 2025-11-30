"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, getEnvConfig } from "@/lib/env";
import type { Database } from "@/lib/types/supabase";

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * 创建带 cookies 的 Supabase 客户端（用于 Server Actions）
 */
async function createServerActionClient() {
  const cookieStore = await cookies();
  const config = getSupabaseConfig();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              // 确保 cookie 设置正确
              httpOnly: options?.httpOnly ?? false,
              secure: options?.secure ?? false,
              sameSite: options?.sameSite ?? "lax",
            });
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          console.error("Failed to set cookies:", error);
        }
      },
    },
  });
}

/**
 * 用户注册
 */
export async function signUp(
  email: string,
  password: string,
  username: string,
  displayName?: string
): Promise<AuthResult> {
  try {
    const supabase = await createServerActionClient();
    const { NEXT_PUBLIC_SITE_URL } = getEnvConfig();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
        emailRedirectTo: `${NEXT_PUBLIC_SITE_URL}/dashboard`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "注册失败",
    };
  }
}

/**
 * 用户登录
 */
export async function signIn(
  email: string,
  password: string,
  redirectTo?: string
): Promise<AuthResult> {
  try {
    const supabase = await createServerActionClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");

    // 根据 redirectTo 参数决定跳转目标
    // 避免循环：如果 redirectTo 指向登录页，跳转到 dashboard
    const destination =
      redirectTo && !redirectTo.startsWith("/login")
        ? redirectTo
        : "/dashboard";

    // 在 Server Action 中直接重定向，确保 cookies 已经设置
    redirect(destination);
  } catch (error) {
    // 如果是重定向错误，让它正常抛出
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "登录失败",
    };
  }
}

/**
 * 用户登出
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = await createServerActionClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/login");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "登出失败",
    };
  }
}
