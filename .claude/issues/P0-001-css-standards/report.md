# 问题报告: 全局样式文档示例与实际实现不一致

## 基本信息

- **优先级**: P0 (Critical - 必须立即修复)
- **报告日期**: 2025-10-07
- **相关文档**: `docs/standard/css-standards.md`
- **问题类型**: 缺失项/偏差项

## 问题描述

CSS 规范文档中描述的全局样式（`app/globals.css`）与实际代码实现存在重大差异：

**文档描述** (css-standards.md 第 195-220 行):

```css
:root {
  --color-primary: 0 0 0;
  --color-secondary: 107 114 128;
}

.dark {
  --color-primary: 255 255 255;
  --color-secondary: 156 163 175;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**实际实现** (app/globals.css):

```css
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
```

**核心差异**:

1. CSS 变量名称完全不同（`--color-primary` vs `--foreground-rgb`）
2. 深色模式实现方式不同（`.dark` class vs `@media` query）
3. 文档使用 `@layer base` 和 `@apply`，实际代码直接使用原生 CSS
4. body 样式完全不同（文档用 `@apply`，实际用渐变背景）

## 影响文件

### 文档文件

- `docs/standard/css-standards.md` - 第 195-220 行

### 代码文件

- `app/globals.css` - 第 5-27 行

## 可能影响

### 开发者困惑

- ❌ 新开发者按文档编写代码时会发现 CSS 变量不存在
- ❌ 无法使用文档中的 `--color-primary`、`bg-background` 等变量
- ❌ 误以为可以使用 `.dark` class 切换深色模式

### 代码一致性

- ❌ 文档失去指导作用
- ❌ 可能导致混合使用两种不同的样式系统
- ❌ 代码审查时产生混淆

### 功能风险

- ⚠️ 如果有组件依赖文档中的 CSS 变量，会导致样式失效
- ⚠️ 深色模式切换逻辑可能与预期不符

## 修复建议

### 方案一：更新文档（推荐，工作量小）

**优点**:

- 快速修复，无需改动代码
- 保持现有样式系统稳定
- 工作量小，风险低

**步骤**:

1. 更新 `docs/standard/css-standards.md` 第 195-220 行：

```markdown
### 全局样式

仅在 `app/globals.css` 中定义以下内容：

1. **Tailwind 指令**

\`\`\`css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

2. **CSS 变量**（用于主题）

\`\`\`css
:root {
--foreground-rgb: 0, 0, 0;
--background-start-rgb: 214, 219, 220;
--background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
:root {
--foreground-rgb: 255, 255, 255;
--background-start-rgb: 0, 0, 0;
--background-end-rgb: 0, 0, 0;
}
}
\`\`\`

**说明**:

- 使用 RGB 值格式，便于在 `rgb()` 函数中使用
- 深色模式通过 `@media (prefers-color-scheme: dark)` 自动切换
- 不需要手动切换 class

3. **基础样式**

\`\`\`css
body {
color: rgb(var(--foreground-rgb));
background: linear-gradient(
to bottom,
transparent,
rgb(var(--background-end-rgb))
)
rgb(var(--background-start-rgb));
}
\`\`\`

4. **自定义工具类**（仅当 Tailwind 不提供时）

\`\`\`css
@layer utilities {
.text-balance {
text-wrap: balance;
}
}
\`\`\`
```

2. 删除或修改文档中关于 `bg-background`、`text-foreground` 等不存在的工具类的引用

---

### 方案二：重构代码以使用语义化变量（工作量大）

**优点**:

- 变量名更语义化
- 更容易在 Tailwind 配置中使用
- 支持手动切换深色模式（如果需要）

**缺点**:

- 需要修改多个文件
- 需要测试所有页面和组件
- 可能影响现有样式

**步骤**:

1. 更新 `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 0%;
    --border: 0 0% 90%;
    --primary: 0 0% 0%;
    --secondary: 220 9% 46%;
  }

  .dark {
    --background: 0 0% 0%;
    --foreground: 0 0% 100%;
    --border: 0 0% 20%;
    --primary: 0 0% 100%;
    --secondary: 220 9% 70%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

2. 更新 `tailwind.config.ts`:

```typescript
export default {
  darkMode: "class", // 改为 class 策略
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--foreground))",
        },
      },
    },
  },
};
```

3. 检查所有组件，确保没有使用旧的 CSS 变量

4. 如需手动切换深色模式，添加切换逻辑：

```tsx
// 添加深色模式切换按钮
const toggleDarkMode = () => {
  document.documentElement.classList.toggle("dark");
};
```

---

## 推荐方案

**方案一（更新文档）** - 理由：

1. ✅ 快速修复，30分钟内完成
2. ✅ 零风险，不影响现有功能
3. ✅ 保持代码稳定性
4. ✅ 实际的 CSS 变量系统已经工作正常

**方案二仅在以下情况考虑**:

- 需要手动切换深色模式功能
- 希望使用更语义化的变量名
- 计划重构整个主题系统

## 预计工时

### 方案一（更新文档）

- 更新文档内容: 30 分钟
- 检查文档其他相关部分: 15 分钟
- **总计**: 0.75 小时

### 方案二（重构代码）

- 更新 globals.css: 30 分钟
- 更新 tailwind.config.ts: 30 分钟
- 检查和更新组件: 2 小时
- 测试所有页面: 1 小时
- 文档更新: 30 分钟
- **总计**: 4-5 小时

## 验证步骤

修复完成后，验证：

1. 文档中的 CSS 变量名与 `app/globals.css` 一致
2. 文档中的示例代码可以直接使用
3. 深色模式说明与实际配置一致
4. 没有引用不存在的工具类或变量

---

**生成时间**: 2025-10-07
**来源**: `/doc-verify css-standards.md`
