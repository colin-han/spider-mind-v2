"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { signIn } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn(formData.email, formData.password);

      // 如果返回结果，说明登录失败（成功会直接 redirect）
      if (result && !result.success) {
        toast.error(result.error || "登录失败");
        setLoading(false);
      }
    } catch (error) {
      // NEXT_REDIRECT 是正常的重定向，不是错误
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        // 登录成功，重定向正在执行，不显示错误
        return;
      }

      // 真正的登录失败错误处理
      if (error instanceof Error) {
        toast.error(error.message || "登录失败");
      } else {
        toast.error("登录失败，请重试");
      }
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 w-full max-w-sm"
      data-testid="login-form"
    >
      <Input
        label="邮箱"
        type="email"
        placeholder="your@email.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        autoComplete="email"
        data-testid="login-email-input"
      />

      <Input
        label="密码"
        type="password"
        placeholder="••••••••"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        autoComplete="current-password"
        data-testid="login-password-input"
      />

      <Button
        type="submit"
        loading={loading}
        className="w-full"
        data-testid="login-submit-button"
      >
        登录
      </Button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        还没有账号？{" "}
        <Link
          href="/signup"
          className="text-black dark:text-white font-medium hover:underline"
          data-testid="signup-link"
        >
          立即注册
        </Link>
      </p>
    </form>
  );
}
