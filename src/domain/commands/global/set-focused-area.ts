import { z } from "zod";
import { CommandDefinition, registerCommand } from "../../command-registry";
import { EditorAction, MindmapStore } from "../../mindmap-store.types";
import {
  SetFocusedAreaAction,
  SetFocusedAreaParams,
} from "../../actions/ephemeral/set-focused-area";
import { FocusedAreaId } from "../../focused-area.types";

export const SetFocusedAreaParamsSchema = z.object({
  area: z.string().describe("焦点区域"),
  reason: z.enum(["escape", "normal"]).optional().describe("切换原因"),
});

export const setFocusedArea: CommandDefinition<
  typeof SetFocusedAreaParamsSchema
> = {
  id: "global.setFocusedArea",
  name: "设置焦点区域",
  description: "设置当前焦点区域",
  category: "global",
  actionBased: true,
  undoable: false,
  paramsSchema: SetFocusedAreaParamsSchema,
  handler: async (root: MindmapStore, params) => {
    const { area, reason } = params;
    if (!root.currentEditor) {
      throw new Error("No editor is currently open");
    }

    // 命令只负责创建 Action，生命周期方法由 Action 调用
    const actionParams: SetFocusedAreaParams = {
      oldArea: root.currentEditor.focusedArea,
      newArea: area as FocusedAreaId,
    };
    if (reason) {
      actionParams.reason = reason;
    }
    return [new SetFocusedAreaAction(actionParams)] as EditorAction[];
  },
};

registerCommand(setFocusedArea);
