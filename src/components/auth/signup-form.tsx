"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { signUp } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.username.length < 3 || formData.username.length > 20) {
      newErrors["username"] = "用户名长度必须在 3-20 个字符之间";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors["username"] = "用户名只能包含字母、数字和下划线";
    }
    if (formData.password.length < 6) {
      newErrors["password"] = "密码长度至少为 6 个字符";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors["confirmPassword"] = "两次输入的密码不一致";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("请检查表单输入");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(
        formData.email,
        formData.password,
        formData.username
      );

      if (result.success) {
        toast.success("注册成功！请登录");
        router.push("/login");
        router.refresh();
      } else {
        toast.error(result.error || "注册失败");
      }
    } catch (_error) {
      toast.error("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 w-full max-w-sm"
      data-testid="signup-form"
    >
      <Input
        label="邮箱"
        type="email"
        placeholder="your@email.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        autoComplete="email"
        data-testid="signup-email-input"
      />

      <Input
        label="用户名"
        type="text"
        placeholder="username"
        value={formData.username}
        onChange={(e) => {
          setFormData({ ...formData, username: e.target.value });
          setErrors({ ...errors, username: "" });
        }}
        error={errors["username"]}
        required
        autoComplete="username"
        data-testid="signup-username-input"
      />

      <Input
        label="密码"
        type="password"
        placeholder="至少 6 个字符"
        value={formData.password}
        onChange={(e) => {
          setFormData({ ...formData, password: e.target.value });
          setErrors({ ...errors, password: "" });
        }}
        error={errors["password"]}
        required
        autoComplete="new-password"
        data-testid="signup-password-input"
      />

      <Input
        label="确认密码"
        type="password"
        placeholder="再次输入密码"
        value={formData.confirmPassword}
        onChange={(e) => {
          setFormData({ ...formData, confirmPassword: e.target.value });
          setErrors({ ...errors, confirmPassword: "" });
        }}
        error={errors["confirmPassword"]}
        required
        autoComplete="new-password"
        data-testid="signup-confirm-password-input"
      />

      <Button
        type="submit"
        loading={loading}
        className="w-full"
        data-testid="signup-submit-button"
      >
        注册
      </Button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        已有账号？{" "}
        <Link
          href="/login"
          className="text-black dark:text-white font-medium hover:underline"
          data-testid="login-link"
        >
          立即登录
        </Link>
      </p>
    </form>
  );
}
