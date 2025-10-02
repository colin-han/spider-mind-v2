"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useConfirm } from "@/lib/hooks/use-confirm";
import { deleteMindmap } from "@/lib/actions/mindmap-actions";
import { formatRelativeTime } from "@/lib/utils/date-format";
import type { MindmapListItem } from "@/lib/types";

type MindmapCardProps = MindmapListItem;

/**
 * 思维导图卡片组件
 * 显示单个思维导图的信息，支持点击打开和删除
 */
export function MindmapCard({
  id,
  short_id,
  title,
  description,
  created_at,
  updated_at,
}: MindmapCardProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation(); // 防止触发卡片点击

    if (isDeleting) return;

    const confirmed = await confirm({
      title: "删除思维导图",
      description: `确定要删除"${title}"吗？此操作无法撤销。`,
      confirmText: "删除",
      cancelText: "取消",
    });

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const result = await deleteMindmap(id);

      if (result.success) {
        toast.success("删除成功");
        router.refresh();
      } else {
        toast.error(result.error || "删除失败");
        setIsDeleting(false);
      }
    } catch (_error) {
      toast.error("删除失败，请重试");
      setIsDeleting(false);
    }
  }

  function handleCardClick() {
    router.push(`/mindmaps/${short_id}`);
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all cursor-pointer p-6 relative group"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`mindmap-card-${short_id}`}
    >
      {/* 标题 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-2xl mb-2">📝</div>
          <h3
            className="text-lg font-semibold text-gray-900 dark:text-white truncate"
            data-testid={`mindmap-card-title-${short_id}`}
          >
            {title}
          </h3>
        </div>

        {/* 删除按钮（悬停显示） */}
        {isHovered && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="ml-2 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            data-testid={`mindmap-card-delete-${short_id}`}
            aria-label="删除"
          >
            {isDeleting ? (
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* 描述（如果有） */}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {description}
        </p>
      )}

      {/* 时间信息 */}
      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
        <div className="flex items-center gap-1">
          <span>🕐</span>
          <span>创建于 {formatRelativeTime(created_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>✏️</span>
          <span>更新于 {formatRelativeTime(updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
