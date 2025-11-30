import { LoginForm } from "@/components/auth/login-form";
import { getAuthUser } from "@/lib/utils/auth-helpers";
import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getAuthUser();

  // 如果已登录且有 redirect 参数，跳转到指定页面
  if (user && params.redirect) {
    // 避免循环：如果 redirect 指向登录页，跳转到 dashboard
    const redirectPath = params.redirect.startsWith("/login")
      ? "/dashboard"
      : params.redirect;
    redirect(redirectPath);
  }

  // 如果已登录但没有 redirect 参数，跳转到 dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8"
      data-testid="login-page"
    >
      <h2
        className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white"
        data-testid="login-heading"
      >
        登录
      </h2>
      <LoginForm {...(params.redirect ? { redirect: params.redirect } : {})} />
    </div>
  );
}
