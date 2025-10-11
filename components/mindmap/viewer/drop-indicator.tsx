/**
 * DropIndicator - 拖拽视觉反馈组件
 *
 * 职责:
 * - 在拖拽过程中显示视觉提示
 * - 支持四种提示类型:
 *   1. line-above: 插入到目标节点上方 (蓝色线)
 *   2. line-below: 插入到目标节点下方 (蓝色线)
 *   3. highlight: 成为目标节点的子节点 (绿色高亮边框)
 *   4. forbidden: 禁止拖放 (红色边框 + 禁止图标)
 */

export type DropIndicatorType =
  | "line-above"
  | "line-below"
  | "highlight"
  | "forbidden";

export interface DropIndicatorProps {
  /**
   * 指示器类型
   */
  type: DropIndicatorType;

  /**
   * 目标节点的位置和尺寸
   */
  targetRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * DropIndicator 组件
 */
export function DropIndicator({ type, targetRect }: DropIndicatorProps) {
  const { x, y, width, height } = targetRect;

  // 插入线 (上方或下方)
  if (type === "line-above" || type === "line-below") {
    const lineY = type === "line-above" ? y : y + height;

    return (
      <div
        data-testid={`drop-indicator-${type}`}
        className="drop-indicator-line"
        style={{
          position: "absolute",
          left: x,
          top: lineY - 2, // 居中对齐 (线高 4px)
          width,
          height: 4,
          backgroundColor: "#3b82f6", // 蓝色
          borderRadius: 2,
          pointerEvents: "none",
          zIndex: 1000,
          boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
        }}
      />
    );
  }

  // 高亮边框 (成为子节点)
  if (type === "highlight") {
    return (
      <div
        data-testid="drop-indicator-highlight"
        className="drop-indicator-highlight"
        style={{
          position: "absolute",
          left: x - 4,
          top: y - 4,
          width: width + 8,
          height: height + 8,
          border: "3px solid #10b981", // 绿色
          borderRadius: 10,
          pointerEvents: "none",
          zIndex: 1000,
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)",
        }}
      />
    );
  }

  // 禁止拖放
  if (type === "forbidden") {
    return (
      <div
        data-testid="drop-indicator-forbidden"
        className="drop-indicator-forbidden"
        style={{
          position: "absolute",
          left: x - 4,
          top: y - 4,
          width: width + 8,
          height: height + 8,
          border: "3px solid #ef4444", // 红色
          borderRadius: 10,
          pointerEvents: "none",
          zIndex: 1000,
          backgroundColor: "rgba(239, 68, 68, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 32,
            filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
          }}
          aria-label="禁止拖放"
        >
          🚫
        </span>
      </div>
    );
  }

  return null;
}
