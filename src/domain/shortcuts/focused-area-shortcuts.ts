import {
  registerShortcut,
  registerShortcutForArea,
} from "../shortcut-register";
import { getModifierKey } from "./platform-utils";

const mod = getModifierKey();

registerShortcut("f1", "global.setFocusedArea", ["outline"], true);
registerShortcut("f2", "global.setFocusedArea", ["title-editor"], true);
registerShortcut("f3", "global.setFocusedArea", ["note-editor"], true);
registerShortcut("f4", "global.setFocusedArea", ["ai-chat"], true);
registerShortcut(`${mod}+i`, "global.setFocusedArea", ["ai-chat"], true);
registerShortcut(`${mod}+enter`, "global.setFocusedArea", ["graph"], true);

registerShortcutForArea(
  "title-editor",
  "enter",
  "global.setFocusedArea",
  ["graph"],
  true
);

registerShortcutForArea(
  "title-editor",
  "escape",
  "global.setFocusedArea",
  ["graph", "escape"],
  true
);

registerShortcutForArea(
  "note-editor",
  "escape",
  "global.setFocusedArea",
  ["graph", "escape"],
  true
);

registerShortcutForArea(
  "outline",
  "escape",
  "global.setFocusedArea",
  ["graph", "escape"],
  true
);
