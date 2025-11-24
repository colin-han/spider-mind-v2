import { useEffect, useRef } from "react";
import { useMindmapEditorState } from "@/domain/mindmap-store";
import { registerFocusedAreaHandler } from "@/domain/focused-area-registry";
import { FocusedAreaHandler } from "@/domain/focused-area.types";

/**
 * 注册 focusedArea handler
 *
 * @example
 * ```tsx
 * useFocusedArea({
 *   id: "title-editor",
 *   onEnter: (from) => {
 *     titleInputRef.current?.focus();
 *     titleInputRef.current?.select();
 *   },
 *   onLeave: async (to) => {
 *     await updateTitle(node.short_id, editingTitle);
 *   }
 * });
 * ```
 */
export function useFocusedArea(handler: FocusedAreaHandler) {
  const editorState = useMindmapEditorState();
  const handlerRef = useRef(handler);
  const initializedRef = useRef(false);

  // 更新 ref，确保始终使用最新的回调
  useEffect(() => {
    handlerRef.current = handler;
  });

  // 只在 mount/unmount 时注册/取消注册
  useEffect(() => {
    const wrappedHandler: FocusedAreaHandler = {
      id: handler.id,
      onEnter: (from) => handlerRef.current.onEnter?.(from),
      onLeave: (to, reason) => handlerRef.current.onLeave?.(to, reason),
    };

    const unregister = registerFocusedAreaHandler(wrappedHandler);

    // 如果注册时焦点已经在该区域，立即调用 onEnter（仅首次）
    if (
      !initializedRef.current &&
      editorState?.focusedArea === handler.id &&
      wrappedHandler.onEnter
    ) {
      wrappedHandler.onEnter(handler.id);
      initializedRef.current = true;
    }

    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handler.id]); // 注意：不依赖 editorState，避免频繁重新注册
}
