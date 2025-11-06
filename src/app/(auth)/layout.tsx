import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Spider Mind v2
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            智能知识管理平台
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
