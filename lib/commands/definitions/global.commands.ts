/**
 * 全局命令定义
 *
 * 基于文档: docs/draft/command-definitions.md
 */

import type { Command } from "../types";

/**
 * 全局命令集合（3个命令）
 */
export const globalCommands: Command[] = [
  // ========== 1. 保存 ==========
  {
    id: "global.save",
    name: "保存",
    description: "保存当前思维导图",
    category: "global",

    when: (ctx) => {
      // 只有有未保存的修改时才可以保存
      return ctx.store.isDirty;
    },

    handler: async (ctx) => {
      // 触发同步到云端的逻辑
      // 这里暂时只是清除脏标记
      // 实际的云端同步逻辑应该在持久化中间件或独立的同步服务中处理
      ctx.store.clearSyncStatus();

      // 注意: 实际的保存逻辑应该触发云端同步
      // 这需要集成云端同步管理器
    },
  },

  // ========== 2. 撤销（未来功能） ==========
  {
    id: "global.undo",
    name: "撤销",
    description: "撤销上一次操作（未来功能）",
    category: "global",

    when: () => {
      // 暂时禁用此命令
      return false;
    },

    handler: () => {
      console.warn("Undo command not implemented yet");
      // TODO: 实现撤销功能
      // 需要实现命令历史记录系统
      // 参考设计文档中的 CommandHistory 类
    },
  },

  // ========== 3. 重做（未来功能） ==========
  {
    id: "global.redo",
    name: "重做",
    description: "重做上一次撤销的操作（未来功能）",
    category: "global",

    when: () => {
      // 暂时禁用此命令
      return false;
    },

    handler: () => {
      console.warn("Redo command not implemented yet");
      // TODO: 实现重做功能
      // 需要实现命令历史记录系统
      // 参考设计文档中的 CommandHistory 类
    },
  },
];
