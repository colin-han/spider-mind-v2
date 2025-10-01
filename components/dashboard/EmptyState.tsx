"use client";

import { CreateButton } from "./CreateButton";

/**
 * Dashboard 空状态组件
 * 当用户没有任何思维导图时显示
 */
export function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4"
      data-testid="dashboard-empty-state"
    >
      <div className="text-6xl mb-6">🧠</div>

      <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
        还没有思维导图
      </h2>

      <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
        创建你的第一个知识网络，开始记录和整理你的想法
      </p>

      <CreateButton />
    </div>
  );
}
