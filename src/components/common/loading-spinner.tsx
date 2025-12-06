/**
 * LoadingSpinner - 加载动画组件
 *
 * 提供专业的加载动画效果，支持不同尺寸和主题
 */

import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps {
  /**
   * 显示的消息文本
   * @default "加载中..."
   */
  message?: string;

  /**
   * 加载动画的尺寸
   * @default "medium"
   */
  size?: "small" | "medium" | "large";

  /**
   * 是否全屏显示
   * @default true
   */
  fullScreen?: boolean;
}

/**
 * LoadingSpinner 组件
 *
 * 显示旋转的加载图标和提示文字
 * 自动适配亮色/暗色主题
 */
export function LoadingSpinner({
  message = "加载中...",
  size = "medium",
  fullScreen = true,
}: LoadingSpinnerProps) {
  // 根据尺寸设置图标大小
  const iconSize = {
    small: "w-6 h-6",
    medium: "w-10 h-10",
    large: "w-16 h-16",
  }[size];

  // 根据尺寸设置文字大小
  const textSize = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  }[size];

  // 根据尺寸设置间距
  const gap = {
    small: "gap-2",
    medium: "gap-3",
    large: "gap-4",
  }[size];

  const content = (
    <div className={`flex flex-col items-center justify-center ${gap}`}>
      <Loader2
        className={`${iconSize} animate-spin text-blue-600 dark:text-blue-400`}
      />
      <div className={`${textSize} text-gray-600 dark:text-gray-400`}>
        {message}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
