import { requireAuth } from "@/lib/utils/auth-helpers";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await createServerComponentClient();

  // 获取用户资料
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div data-testid="dashboard-content" className="space-y-8">
      {/* 欢迎区域 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1
          className="text-3xl font-bold mb-4 text-gray-900 dark:text-white"
          data-testid="dashboard-welcome-heading"
        >
          欢迎回来！
        </h1>
        <div className="space-y-2">
          <p
            className="text-gray-600 dark:text-gray-300"
            data-testid="dashboard-user-email"
          >
            <span className="font-medium">邮箱：</span>
            {user.email}
          </p>
          {profile && (
            <>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">用户名：</span>
                {profile.username}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">用户 ID：</span>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {user.id}
                </code>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">注册时间：</span>
                {new Date(profile.created_at).toLocaleString("zh-CN")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* 会话信息 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-3 text-blue-900 dark:text-blue-100">
          🔐 会话信息
        </h2>
        <div className="space-y-2 text-sm">
          <p className="text-blue-800 dark:text-blue-200">
            <span className="font-medium">认证状态：</span>
            <span className="text-green-600 dark:text-green-400 font-semibold">
              ✓ 已登录
            </span>
          </p>
          <p className="text-blue-800 dark:text-blue-200">
            <span className="font-medium">会话 ID：</span>
            <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">
              {user.id.slice(0, 8)}...
            </code>
          </p>
          <p className="text-blue-800 dark:text-blue-200">
            <span className="font-medium">认证提供商：</span>
            {user.app_metadata?.provider || "email"}
          </p>
        </div>
      </div>

      {/* 功能卡片 */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        data-testid="dashboard-cards"
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          data-testid="dashboard-card-quickstart"
        >
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            快速开始
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            开始构建你的知识网络
          </p>
          <button className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
            开始使用 →
          </button>
        </div>

        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          data-testid="dashboard-card-recent"
        >
          <div className="text-4xl mb-3">📄</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            最近文档
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            查看最近编辑的文档
          </p>
          <button className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
            查看文档 →
          </button>
        </div>

        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          data-testid="dashboard-card-graph"
        >
          <div className="text-4xl mb-3">🕸️</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            知识图谱
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            探索知识之间的关联
          </p>
          <button className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
            探索图谱 →
          </button>
        </div>
      </div>

      {/* 开发调试信息 */}
      <details className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
          🔧 开发调试信息（点击展开）
        </summary>
        <div className="mt-4 space-y-2">
          <div className="bg-white dark:bg-gray-700 p-4 rounded border border-gray-200 dark:border-gray-600">
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">
              User Object:
            </h3>
            <pre className="text-xs overflow-x-auto bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded">
              {JSON.stringify(
                {
                  id: user.id,
                  email: user.email,
                  created_at: user.created_at,
                  app_metadata: user.app_metadata,
                  user_metadata: user.user_metadata,
                },
                null,
                2
              )}
            </pre>
          </div>
          {profile && (
            <div className="bg-white dark:bg-gray-700 p-4 rounded border border-gray-200 dark:border-gray-600">
              <h3 className="font-medium mb-2 text-gray-900 dark:text-white">
                Profile Object:
              </h3>
              <pre className="text-xs overflow-x-auto bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
