import { CommandDefinition, registerCommand } from "../../command-registry";
import { EditorAction, MindmapStore } from "../../mindmap-store.types";
import { SetFocusedAreaAction } from "../../actions/set-focused-area";
import { FocusedAreaId } from "../../focused-area.types";

export const setFocusedArea: CommandDefinition = {
  id: "global.setFocusedArea",
  name: "设置焦点区域",
  description: "设置当前焦点区域",
  category: "global",
  actionBased: true,
  undoable: false,
  handler: async (root: MindmapStore, params?: unknown[]) => {
    const [area] = params as [FocusedAreaId];
    if (!area) {
      throw new Error("Invalid area");
    }
    if (!root.currentEditor) {
      throw new Error("No editor is currently open");
    }

    // 命令只负责创建 Action，生命周期方法由 Action 调用
    return [
      new SetFocusedAreaAction({
        oldArea: root.currentEditor.focusedArea,
        newArea: area,
      }),
    ] as EditorAction[];
  },
};

registerCommand(setFocusedArea);
