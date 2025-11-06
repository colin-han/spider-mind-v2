import { LoginForm } from "@/components/auth/login-form";
import { getAuthUser } from "@/lib/utils/auth-helpers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getAuthUser();

  // 如果已登录，重定向到 dashboard
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
      <LoginForm />
    </div>
  );
}
