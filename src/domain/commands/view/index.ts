import { registerCommand } from "../../command-registry";
import { zoomIn } from "./zoom-in";
import { zoomOut } from "./zoom-out";
import { zoomReset } from "./zoom-reset";
import { fitView } from "./fit-view";
import { focusCurrentNode } from "./focus-current-node";
import { panLeft } from "./pan-left";
import { panRight } from "./pan-right";
import { panUp } from "./pan-up";
import { panDown } from "./pan-down";
import { setViewport } from "./set-viewport";

// 注册所有 view 命令
registerCommand(zoomIn);
registerCommand(zoomOut);
registerCommand(zoomReset);
registerCommand(fitView);
registerCommand(focusCurrentNode);
registerCommand(panLeft);
registerCommand(panRight);
registerCommand(panUp);
registerCommand(panDown);
registerCommand(setViewport);

export {
  zoomIn,
  zoomOut,
  zoomReset,
  fitView,
  focusCurrentNode,
  panLeft,
  panRight,
  panUp,
  panDown,
  setViewport,
};
