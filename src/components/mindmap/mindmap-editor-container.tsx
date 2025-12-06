/**
 * MindmapEditor - 思维导图编辑器容器组件
 *
 * 职责:
 * - 管理 MindmapEditorStore 的初始化
 * - 提供顶部工具栏 (返回、标题、保存、撤销/重做)
 * - 展示离线横幅
 * - 组合 MindmapEditorLayout (三栏布局)
 *
 * 不负责:
 * - 具体的编辑 UI (由子组件实现)
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Undo2, Redo2, Save, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useMindmapStore, useMindmapEditorState } from "@/domain/mindmap-store";
import { MindmapEditorLayout } from "./mindmap-editor-layout";
import { CommandButton } from "@/components/common/command-button";
import { getRootNodeTitle } from "@/lib/utils/mindmap-utils";
import { ErrorPage } from "@/components/error/error-page";
import { LoadingSpinner } from "@/components/common/loading-spinner";

/**
 * MindmapEditor Props
 */
export interface MindmapEditorProps {
  mindmapId: string;
}

/**
 * MindmapEditor 容器组件
 */
export function MindmapEditor({ mindmapId }: MindmapEditorProps) {
  const { openMindmap, shortcutManager, historyManager } = useMindmapStore();
  const editorState = useMindmapEditorState();
  const router = useRouter();

  // 错误状态管理
  const [errorType, setErrorType] = useState<"404" | "403" | null>(null);

  // 从根节点获取思维导图标题
  const rootTitle = useMemo(() => {
    if (!editorState) return "未命名思维导图";
    return getRootNodeTitle(editorState.nodes);
  }, [editorState]);

  const keyHandle = useCallback(
    (e: KeyboardEvent) => shortcutManager?.handleKeydown(e),
    [shortcutManager]
  );

  useEffect(() => {
    addEventListener("keydown", keyHandle, {
      capture: true,
    });
    return () => {
      removeEventListener("keydown", keyHandle, {
        capture: true,
      });
    };
  }, [keyHandle]);

  useEffect(() => {
    async function loadMindmap() {
      try {
        await openMindmap(mindmapId);
      } catch (error) {
        console.error("[MindmapEditor] Failed to load mindmap:", error);

        // Next.js server actions 无法正确序列化自定义错误类
        // 所以需要通过错误消息来识别错误类型
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // 根据错误消息识别错误类型
        if (errorMessage.includes("User not authenticated")) {
          // 未登录 -> 跳转登录页（带 redirect 参数）
          const redirectUrl = `/login?redirect=${encodeURIComponent(
            `/mindmaps/${mindmapId}`
          )}`;
          window.location.href = redirectUrl;
        } else if (errorMessage.includes("Mindmap not found")) {
          // 404 -> 显示 404 错误页面
          setErrorType("404");
        } else {
          // 其他错误 -> 显示错误提示
          console.error("[MindmapEditor] Unhandled error:", errorMessage);
          toast.error(`加载思维导图失败：${errorMessage}`);
          // 跳转回 dashboard
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      }
    }

    loadMindmap();
  }, [mindmapId, openMindmap, router]);

  // 动态设置页面标题
  useEffect(() => {
    if (editorState) {
      const envName = process.env["NEXT_PUBLIC_ENV_NAME"];
      const baseTitle = envName ? `Spider Mind (${envName})` : "Spider Mind";
      document.title = `${baseTitle} - ${rootTitle}`;
    }
  }, [editorState, rootTitle]);

  // 如果有错误，显示错误页面
  if (errorType) {
    return (
      <ErrorPage
        type={errorType}
        onGoHome={() => router.push("/dashboard")}
        onLogin={() => {
          const redirectUrl = `/login?redirect=${encodeURIComponent(
            `/mindmaps/${mindmapId}`
          )}`;
          router.push(redirectUrl);
        }}
      />
    );
  }

  // 加载中状态
  if (!editorState) {
    return <LoadingSpinner message="加载思维导图..." />;
  }

  return (
    <>
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
        data-testid="mindmap-editor"
      >
        {/* 工具栏 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="relative flex items-center justify-between px-4 py-3">
            {/* 左侧：网站图标 + 返回 */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              data-testid="mindmap-header-logo"
            >
              {/* Light mode logo */}
              <Image
                src="/images/light-logo.png"
                alt="Spider Mind Logo"
                width={40}
                height={40}
                style={{ transformOrigin: "center", transform: "scale(1.5)" }}
                className="object-contain dark:hidden"
              />
              {/* Dark mode logo */}
              <Image
                src="/images/dark-logo.png"
                alt="Spider Mind Logo"
                width={40}
                height={40}
                style={{ transformOrigin: "center", transform: "scale(1.5)" }}
                className="object-contain hidden dark:block"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Spider Mind
              </span>
            </Link>

            {/* 中间：思维导图标题 */}
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl font-semibold text-gray-900 dark:text-white">
              {rootTitle}
            </h1>

            {/* 右侧：工具栏 */}
            <div className="flex items-center gap-2">
              {/* Undo 按钮 */}
              <CommandButton
                commandId="global.undo"
                icon={Undo2}
                testId="undo-button"
                disabled={!historyManager?.canUndo()}
              />

              {/* Redo 按钮 */}
              <CommandButton
                commandId="global.redo"
                icon={Redo2}
                testId="redo-button"
                disabled={!historyManager?.canRedo()}
              />

              {/* 分隔线 */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

              {/* Save 按钮 */}
              <CommandButton
                commandId="global.save"
                icon={Save}
                testId="save-button"
                disabled={editorState.isSaved || editorState.isSaving}
              />

              {/* 分隔线 */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

              {/* Export 按钮 */}
              <CommandButton
                commandId="global.exportXMind"
                icon={Download}
                testId="export-xmind-button"
              />

              {/* 状态指示器 */}
              <div className="flex items-center justify-center text-sm ml-2 min-w-[100px]">
                {editorState.isSaving ? (
                  <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </span>
                ) : !editorState.isSaved ? (
                  <span className="text-orange-600 dark:text-orange-400">
                    ● 未保存
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ 已保存
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 三栏布局内容 */}
        <div className="h-[calc(100vh-129px)]">
          <MindmapEditorLayout />
        </div>
      </div>
    </>
  );
}
