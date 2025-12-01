/**
 * 键盘事件处理工具函数的单元测试
 */

import { isPrintableCharacter } from "./keyboard";

describe("isPrintableCharacter", () => {
  // 辅助函数：创建模拟的 KeyboardEvent
  function createKeyboardEvent(options: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  }): KeyboardEvent {
    return {
      key: options.key,
      ctrlKey: options.ctrlKey ?? false,
      metaKey: options.metaKey ?? false,
      altKey: options.altKey ?? false,
      shiftKey: options.shiftKey ?? false,
    } as KeyboardEvent;
  }

  describe("可打印字符（应返回 true）", () => {
    it("字母字符", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "a" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Z" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "m" }))).toBe(
        true
      );
    });

    it("数字字符", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "0" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "5" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "9" }))).toBe(
        true
      );
    });

    it("符号字符", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "!" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "@" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "#" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "$" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "%" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "&" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "*" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "(" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: ")" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "-" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "=" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "[" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "]" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "/" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "," }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "." }))).toBe(
        true
      );
    });

    it("中文字符", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "你" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "好" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "世" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "界" }))).toBe(
        true
      );
    });

    it("日文字符", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "あ" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "ア" }))).toBe(
        true
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "会" }))).toBe(
        true
      );
    });

    it("Shift + 字母（大写）", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "A", shiftKey: true }))
      ).toBe(true);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "Z", shiftKey: true }))
      ).toBe(true);
    });

    it("Shift + 数字（符号）", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "!", shiftKey: true }))
      ).toBe(true);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "@", shiftKey: true }))
      ).toBe(true);
    });
  });

  describe("非打印字符（应返回 false）", () => {
    it("空格键（保留给 toggleCollapse）", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: " " }))).toBe(
        false
      );
    });

    it("功能键 - Enter/Escape/Tab", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Enter" }))).toBe(
        false
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Escape" }))).toBe(
        false
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Tab" }))).toBe(
        false
      );
    });

    it("功能键 - Backspace/Delete", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "Backspace" }))
      ).toBe(false);
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Delete" }))).toBe(
        false
      );
    });

    it("方向键", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "ArrowLeft" }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "ArrowRight" }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "ArrowUp" }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "ArrowDown" }))
      ).toBe(false);
    });

    it("导航键", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Home" }))).toBe(
        false
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "End" }))).toBe(
        false
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "PageUp" }))).toBe(
        false
      );
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "PageDown" }))
      ).toBe(false);
    });

    it("F键", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "F1" }))).toBe(
        false
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "F2" }))).toBe(
        false
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "F12" }))).toBe(
        false
      );
    });

    it("Lock 键", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "CapsLock" }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "NumLock" }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "ScrollLock" }))
      ).toBe(false);
    });

    it("纯修饰键", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Shift" }))).toBe(
        false
      );
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "Control" }))
      ).toBe(false);
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Alt" }))).toBe(
        false
      );
      expect(isPrintableCharacter(createKeyboardEvent({ key: "Meta" }))).toBe(
        false
      );
    });

    it("修饰键组合 - Ctrl+字母", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "c", ctrlKey: true }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "v", ctrlKey: true }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "s", ctrlKey: true }))
      ).toBe(false);
    });

    it("修饰键组合 - Meta+字母（macOS）", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "c", metaKey: true }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "v", metaKey: true }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "s", metaKey: true }))
      ).toBe(false);
    });

    it("修饰键组合 - Alt+字母", () => {
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "a", altKey: true }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "b", altKey: true }))
      ).toBe(false);
    });

    it("修饰键组合 - Ctrl+Shift+字母", () => {
      expect(
        isPrintableCharacter(
          createKeyboardEvent({ key: "A", ctrlKey: true, shiftKey: true })
        )
      ).toBe(false);
    });
  });

  describe("边界情况", () => {
    it("多字符 key（应为 false）", () => {
      // 某些特殊键可能返回多字符的 key 值
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "Process" }))
      ).toBe(false);
      expect(
        isPrintableCharacter(createKeyboardEvent({ key: "Unidentified" }))
      ).toBe(false);
    });

    it("空字符串 key（应为 false）", () => {
      expect(isPrintableCharacter(createKeyboardEvent({ key: "" }))).toBe(
        false
      );
    });
  });
});
