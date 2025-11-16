/**
 * MarkdownEditor - Markdown 编辑器组件
 *
 * 基于 @uiw/react-md-editor，支持：
 * - 初始状态：预览模式
 * - 点击预览：进入编辑模式
 * - 编辑模式：完整的 Markdown 编辑器
 * - 暗色模式支持
 */

"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import "@/app/markdown-editor.css";

// 动态导入 MDEditor，避免 SSR 问题
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
      <div className="text-gray-500 dark:text-gray-400">加载编辑器...</div>
    </div>
  ),
});

// 动态导入 Markdown 预览组件
const MDPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">加载预览...</div>
      </div>
    ),
  }
);

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  testId?: string;
}

/**
 * MarkdownEditor 的命令式句柄
 */
export interface MarkdownEditorHandle {
  focus: () => void;
}

/**
 * MarkdownEditor 组件
 */
export const MarkdownEditor = forwardRef<
  MarkdownEditorHandle,
  MarkdownEditorProps
>(function MarkdownEditor(
  {
    value,
    onChange,
    onBlur,
    placeholder = "输入 Markdown 内容...",
    maxLength = 10000,
    className = "",
    testId = "markdown-editor",
  },
  ref
) {
  const [mounted, setMounted] = useState(false);
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  const [isEditing, setIsEditing] = useState(false);

  // 暴露命令式 API
  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsEditing(true);
    },
  }));

  // 确保组件只在客户端渲染，并检测暗色模式
  useEffect(() => {
    setMounted(true);

    // 检测暗色模式的函数
    const updateColorMode = () => {
      // 优先使用应用设置的 dark class
      const hasAppDarkClass =
        document.documentElement.classList.contains("dark");

      // 如果应用没有明确设置，则回退到系统偏好
      if (hasAppDarkClass) {
        setColorMode("dark");
      } else {
        // 检查系统暗色模式偏好
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        setColorMode(prefersDark ? "dark" : "light");
      }
    };

    // 初始检测
    updateColorMode();

    // 1. 监听应用层面的暗色模式切换（dark class）
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateColorMode();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // 2. 监听系统暗色模式变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      updateColorMode();
    };

    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
        <div className="text-gray-500 dark:text-gray-400">加载编辑器...</div>
      </div>
    );
  }

  const handleChange = (val: string | undefined) => {
    // 限制最大长度
    if (val && val.length > maxLength) {
      onChange(val.slice(0, maxLength));
    } else {
      onChange(val);
    }
  };

  const handleBlur = () => {
    // 延迟检查焦点是否真的离开了编辑器
    // 如果点击的是工具栏按钮，焦点会短暂离开 textarea 但仍在编辑器容器内
    setTimeout(() => {
      const activeElement = document.activeElement;
      const editorContainer = document.querySelector(
        ".markdown-editor-wrapper"
      );

      // 检查当前焦点是否在编辑器容器内
      const isStillInEditor = editorContainer?.contains(activeElement);

      // 只有焦点真正离开编辑器容器时才退出编辑模式
      if (!isStillInEditor) {
        setIsEditing(false);
      }

      // 无论是否退出编辑模式，都调用 onBlur 保存数据
      if (onBlur) {
        onBlur();
      }
    }, 0);
  };

  // 预览模式：显示渲染后的 Markdown
  if (!isEditing) {
    return (
      <div
        className={`markdown-preview-wrapper flex-1 cursor-pointer ${className}`}
        data-testid={`${testId}-preview`}
        onClick={() => setIsEditing(true)}
      >
        <div
          className="h-full overflow-auto px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          data-color-mode={colorMode}
        >
          {value ? (
            <MDPreview source={value} />
          ) : (
            <div className="text-gray-400 dark:text-gray-500 italic">
              {placeholder}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 编辑模式：完整的 Markdown 编辑器
  return (
    <div
      className={`markdown-editor-wrapper flex-1 ${className}`}
      data-testid={testId}
    >
      <MDEditor
        value={value || ""}
        onChange={handleChange}
        onBlur={handleBlur}
        preview="edit"
        hideToolbar={false}
        height="100%"
        textareaProps={{
          placeholder,
          maxLength,
        }}
        data-color-mode={colorMode}
        className="markdown-editor"
        autoFocus
      />
    </div>
  );
});
