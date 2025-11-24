import { FocusedAreaId, FocusedAreaHandler } from "./focused-area.types";

const handlers = new Map<FocusedAreaId, FocusedAreaHandler>();

/**
 * 注册一个 focusedArea handler
 * @returns 取消注册函数
 */
export function registerFocusedAreaHandler(
  handler: FocusedAreaHandler
): () => void {
  if (handlers.has(handler.id)) {
    console.warn(
      `[FocusedAreaRegistry] Handler for "${handler.id}" already registered, overwriting`
    );
  }

  handlers.set(handler.id, handler);

  // 返回取消注册函数
  return () => {
    handlers.delete(handler.id);
  };
}

/**
 * 在切换焦点区域之前调用，执行旧区域的 onLeave
 * 由 SetFocusedAreaAction 调用
 */
export function beforeSetFocusedArea(
  oldArea: FocusedAreaId,
  newArea: FocusedAreaId,
  reason?: "escape" | "normal"
): void {
  if (oldArea === newArea) {
    return;
  }

  const oldHandler = handlers.get(oldArea);
  if (oldHandler?.onLeave) {
    try {
      // fire and forget，不等待 Promise
      Promise.resolve(oldHandler.onLeave(newArea, reason)).catch((error) => {
        console.error(
          `[FocusedAreaRegistry] Error in onLeave for "${oldArea}":`,
          error
        );
      });
    } catch (error) {
      console.error(
        `[FocusedAreaRegistry] Error in onLeave for "${oldArea}":`,
        error
      );
    }
  }
}

/**
 * 在切换焦点区域之后调用，执行新区域的 onEnter
 * 由 SetFocusedAreaAction 调用
 */
export function afterSetFocusedArea(
  oldArea: FocusedAreaId,
  newArea: FocusedAreaId
): void {
  if (oldArea === newArea) {
    return;
  }

  const newHandler = handlers.get(newArea);
  if (newHandler?.onEnter) {
    try {
      // fire and forget，不等待 Promise
      Promise.resolve(newHandler.onEnter(oldArea)).catch((error) => {
        console.error(
          `[FocusedAreaRegistry] Error in onEnter for "${newArea}":`,
          error
        );
      });
    } catch (error) {
      console.error(
        `[FocusedAreaRegistry] Error in onEnter for "${newArea}":`,
        error
      );
    }
  }
}

/**
 * 清空所有 handlers（用于测试或重置）
 */
export function clearFocusedAreaHandlers(): void {
  handlers.clear();
}
