/**
 * 命令注册入口
 *
 * 导入所有命令文件以触发命令注册
 */

// 节点操作命令
import "./node/add-child";
import "./node/add-sibling-above";
import "./node/add-sibling-below";
import "./node/delete";
import "./node/move-up";
import "./node/move-down";
import "./node/move";
import "./node/update-title";
import "./node/update-note";

// 导航操作命令
import "./navigation/select-parent";
import "./navigation/select-first-child";
import "./navigation/select-previous-sibling";
import "./navigation/select-next-sibling";
import "./navigation/collapse-node";
import "./navigation/expand-node";
import "./navigation/toggle-collapse";
import "./navigation/set-current-node";

// 全局操作命令
import "./global/save";
import "./global/undo";
import "./global/redo";
import "./global/set-focused-area";

// AI 操作命令
import "./ai/ai-assist";
