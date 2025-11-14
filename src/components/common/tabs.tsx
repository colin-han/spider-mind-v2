/**
 * Tabs - 标签页组件
 *
 * 简单的标签页切换组件，用于在多个内容页之间切换
 */

"use client";

import { useState, ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  // 受控模式：通过 activeTab 和 onChange 外部控制
  activeTab?: string;
  onChange?: (tabId: string) => void;
  // 非受控模式：通过 defaultTab 内部管理
  defaultTab?: string;
  className?: string;
  testId?: string;
}

export function Tabs({
  items,
  activeTab: controlledActiveTab,
  onChange,
  defaultTab,
  className = "",
  testId = "tabs",
}: TabsProps) {
  // 内部状态（仅用于非受控模式）
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab || items[0]?.id || ""
  );

  // 受控模式：使用外部传入的 activeTab；非受控模式：使用内部状态
  const activeTab = controlledActiveTab ?? internalActiveTab;

  // 处理 tab 切换
  const handleTabChange = (tabId: string) => {
    // 受控模式：调用外部的 onChange
    if (onChange) {
      onChange(tabId);
    } else {
      // 非受控模式：更新内部状态
      setInternalActiveTab(tabId);
    }
  };

  const activeItem = items.find((item) => item.id === activeTab);

  return (
    <div className={`flex flex-col h-full ${className}`} data-testid={testId}>
      {/* Tab Headers */}
      <div
        className="flex border-b border-gray-200 dark:border-gray-700"
        role="tablist"
        data-testid={`${testId}-headers`}
      >
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`${testId}-panel-${item.id}`}
            id={`${testId}-tab-${item.id}`}
            data-testid={`${testId}-tab-${item.id}`}
            onClick={() => handleTabChange(item.id)}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium
              transition-colors relative
              ${
                activeTab === item.id
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }
            `}
          >
            {item.icon}
            {item.label}
            {/* Active indicator */}
            {activeTab === item.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="flex-1 min-h-0"
        role="tabpanel"
        id={`${testId}-panel-${activeTab}`}
        aria-labelledby={`${testId}-tab-${activeTab}`}
        data-testid={`${testId}-panel-${activeTab}`}
      >
        {activeItem?.content}
      </div>
    </div>
  );
}
