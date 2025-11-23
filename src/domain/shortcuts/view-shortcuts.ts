/**
 * 视图操作快捷键
 */

import { registerNonEditShortcut } from "../shortcut-register";

// 缩放快捷键
registerNonEditShortcut("meta+=", "view.zoomIn", true);
registerNonEditShortcut("meta+-", "view.zoomOut", true);
registerNonEditShortcut("meta+0", "view.zoomReset", true);
registerNonEditShortcut("meta+1", "view.fitView", true);
registerNonEditShortcut("meta+l", "view.focusCurrentNode", true);

// 平移快捷键
registerNonEditShortcut("alt+arrowleft", "view.panLeft", true);
registerNonEditShortcut("alt+arrowright", "view.panRight", true);
registerNonEditShortcut("alt+arrowup", "view.panUp", true);
registerNonEditShortcut("alt+arrowdown", "view.panDown", true);
