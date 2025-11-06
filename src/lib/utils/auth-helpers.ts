import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";

/**
 * 获取当前登录用户（Server Component）
 * 未登录则重定向到登录页
 */
export async function requireAuth() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * 获取当前用户（可选）
 * 未登录返回 null
 */
export async function getAuthUser() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * 检查用户是否已登录（Server Component）
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getAuthUser();
  return !!user;
}
