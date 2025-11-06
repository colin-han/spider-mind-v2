import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/utils/auth-helpers";

export default async function HomePage() {
  const user = await getAuthUser();

  // 已登录用户重定向到 dashboard
  if (user) {
    redirect("/dashboard");
  }

  // 未登录用户重定向到登录页
  redirect("/login");
}
