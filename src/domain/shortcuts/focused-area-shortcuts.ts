import {
  registerShortcut,
  registerShortcutForArea,
} from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

registerShortcut("f1", "global.setFocusedArea", { area: "outline" }, true);
registerShortcut("f2", "global.setFocusedArea", { area: "title-editor" }, true);
registerShortcut("f3", "global.setFocusedArea", { area: "note-editor" }, true);
registerShortcut("f4", "global.setFocusedArea", { area: "ai-chat" }, true);
registerShortcut(
  `${mod}+i`,
  "global.setFocusedArea",
  { area: "ai-chat" },
  true
);
registerShortcut(
  `${mod}+enter`,
  "global.setFocusedArea",
  { area: "graph" },
  true
);

registerShortcutForArea(
  "title-editor",
  "enter",
  "global.setFocusedArea",
  { area: "graph" },
  true
);

registerShortcutForArea(
  "title-editor",
  "escape",
  "global.setFocusedArea",
  { area: "graph", reason: "escape" },
  true
);

registerShortcutForArea(
  "note-editor",
  "escape",
  "global.setFocusedArea",
  { area: "graph", reason: "escape" },
  true
);

registerShortcutForArea(
  "outline",
  "escape",
  "global.setFocusedArea",
  { area: "graph", reason: "escape" },
  true
);
