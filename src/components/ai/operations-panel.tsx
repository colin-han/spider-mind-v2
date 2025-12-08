// src/components/ai/operations-panel.tsx

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { OperationWithId } from "@/lib/ai/tools";
import { executeSelectedOperations } from "@/lib/ai/tools";

interface OperationsPanelProps {
  operations: OperationWithId[];
  loading: boolean; // 是否正在加载操作
  onAccept: (selectedIds: string[]) => void; // 执行选中的操作
  onReject: () => void; // 拒绝所有操作
}

export function OperationsPanel({
  operations,
  loading,
  onAccept,
  onReject,
}: OperationsPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // 当操作列表变化时，默认全选
  useEffect(() => {
    if (operations.length > 0) {
      setSelectedIds(operations.map((op) => op.id));
    }
  }, [operations]);

  const toggleOperation = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === operations.length ? [] : operations.map((op) => op.id)
    );
  };

  const handleAccept = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setIsExecuting(true);

    try {
      // 筛选出选中的操作
      const selectedOps = operations.filter((op) =>
        selectedIds.includes(op.id)
      );

      // 使用新的执行函数（自动处理 UUID -> short_id 转换）
      await executeSelectedOperations(selectedOps, "执行 AI 建议的操作");

      // 执行成功
      toast.success(`成功执行 ${selectedOps.length} 个操作`);
      onAccept(selectedIds);
    } catch (error) {
      console.error("Failed to execute operations:", error);
      toast.error("执行操作失败");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="border border-gray-200 bg-white rounded-lg p-4 mt-2 shadow-sm">
      {loading ? (
        // Loading 状态
        <div className="flex items-center gap-2 text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">正在生成操作...</span>
        </div>
      ) : (
        // 操作列表
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 text-sm">
              建议的操作 ({operations.length})
            </h4>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              disabled={isExecuting}
            >
              {selectedIds.length === operations.length ? "取消全选" : "全选"}
            </button>
          </div>

          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {operations.map((op) => (
              <label
                key={op.id}
                className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                  isExecuting
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(op.id)}
                  onChange={() => toggleOperation(op.id)}
                  disabled={isExecuting}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {(op as unknown as { description: string }).description ||
                      "操作"}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2 justify-end border-t pt-3">
            <button
              onClick={onReject}
              disabled={isExecuting}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedIds.length === 0 || isExecuting}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  执行中...
                </>
              ) : (
                `应用 (${selectedIds.length})`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
