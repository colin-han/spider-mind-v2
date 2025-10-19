# CSS 使用规范

本文档定义了项目中 CSS 和样式管理的标准实践，确保样式代码的一致性、可维护性和性能。

## 📋 目录

- [技术栈](#技术栈)
- [Tailwind CSS 使用规范](#tailwind-css-使用规范)
- [类名管理](#类名管理)
- [样式组织](#样式组织)
- [响应式设计](#响应式设计)
- [主题和深色模式](#主题和深色模式)
- [性能优化](#性能优化)
- [常见模式](#常见模式)
- [最佳实践](#最佳实践)

---

## 技术栈

项目使用以下工具进行样式管理：

- **Tailwind CSS** - 原子化 CSS 框架
- **PostCSS** - CSS 处理器
- **clsx** - 条件类名工具
- **tailwind-merge** - Tailwind 类名合并工具

## Tailwind CSS 使用规范

### 基本原则

1. **优先使用 Tailwind 工具类** - 避免编写自定义 CSS
2. **使用语义化的工具类组合** - 而非单一的自定义类名
3. **遵循移动优先原则** - 基础样式适用于移动端，使用断点添加桌面端样式

### 工具类使用

```tsx
// ✅ 推荐：使用 Tailwind 工具类
<div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white">
  内容
</div>

// ❌ 避免：自定义 CSS 类
<div className="custom-button">
  内容
</div>
```

### 自定义配置

在 `tailwind.config.ts` 中扩展 Tailwind 配置：

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // 项目自定义颜色
        primary: "#000000",
        secondary: "#6B7280",
      },
      spacing: {
        // 自定义间距
        "72": "18rem",
        "84": "21rem",
      },
      borderRadius: {
        // 自定义圆角
        xl: "1rem",
      },
    },
  },
};
```

## 类名管理

### 使用 cn 工具函数

项目提供 `cn` 工具函数（位于 `lib/utils/cn.ts`）用于智能合并类名：

```tsx
import { cn } from "@/lib/utils/cn";

// ✅ 推荐：使用 cn 函数
<button
  className={cn(
    "px-4 py-2 rounded-lg font-medium transition-colors",
    "hover:bg-gray-100",
    {
      "bg-blue-500 text-white": isPrimary,
      "bg-gray-200 text-gray-900": !isPrimary,
    },
    className // 支持外部传入的类名
  )}
>
  按钮
</button>

// ❌ 避免：字符串拼接
<button
  className={`px-4 py-2 ${isPrimary ? 'bg-blue-500' : 'bg-gray-200'} ${className}`}
>
  按钮
</button>
```

### 条件类名

```tsx
// ✅ 推荐：使用对象语法
className={cn({
  "bg-blue-500": isActive,
  "bg-gray-200": !isActive,
  "opacity-50": isDisabled,
})}

// ✅ 推荐：使用三元运算符（简单条件）
className={cn(
  "px-4 py-2",
  isActive ? "bg-blue-500" : "bg-gray-200"
)}

// ❌ 避免：复杂的字符串拼接
className={`px-4 py-2 ${isActive ? 'bg-blue-500' : 'bg-gray-200'} ${isDisabled ? 'opacity-50' : ''}`}
```

### 类名覆盖

`cn` 函数会自动处理冲突的类名，后面的类名会覆盖前面的：

```tsx
// 后面的 px-6 会覆盖前面的 px-4
cn("px-4 py-2", "px-6") // 结果: "py-2 px-6"

// 这使得组件可以接受外部类名覆盖
<Button className="px-6"> {/* 覆盖默认的 px-4 */}
  自定义按钮
</Button>
```

## 样式组织

### 组件样式模式

```tsx
// ✅ 推荐：将样式逻辑提取为常量
const buttonVariants = {
  primary: "bg-black text-white hover:bg-gray-800",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  ghost: "text-gray-700 hover:bg-gray-100",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "rounded-lg font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}
```

### 全局样式

仅在 `app/globals.css` 中定义以下内容：

1. **Tailwind 指令**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. **CSS 变量**（用于主题）

```css
:root {
  --color-primary: 0 0 0;
  --color-secondary: 107 114 128;
}

.dark {
  --color-primary: 255 255 255;
  --color-secondary: 156 163 175;
}
```

3. **基础样式重置**

```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

4. **自定义工具类**（仅当 Tailwind 不提供时）

```css
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### 避免的做法

```tsx
// ❌ 避免：组件级 CSS 文件
// Button.module.css

// ❌ 避免：内联样式（除非必要）
<div style={{ padding: '16px', color: 'blue' }}>

// ❌ 避免：@apply 指令过度使用
// globals.css
.btn {
  @apply px-4 py-2 rounded-lg; // 应该使用组件而非全局类
}
```

## 响应式设计

### 断点使用

Tailwind 默认断点（移动优先）：

```tsx
<div
  className={cn(
    "text-sm", // 默认（移动端）
    "md:text-base", // ≥768px
    "lg:text-lg", // ≥1024px
    "xl:text-xl" // ≥1280px
  )}
>
  响应式文本
</div>
```

### 响应式布局

```tsx
// ✅ 推荐：使用响应式工具类
<div
  className={cn(
    "grid grid-cols-1", // 移动端：单列
    "md:grid-cols-2", // 平板：两列
    "lg:grid-cols-3", // 桌面：三列
    "gap-4" // 统一间距
  )}
>
  {items.map((item) => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### 容器宽度

```tsx
// ✅ 推荐：使用 max-w 和 mx-auto
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">内容</div>
```

## 主题和深色模式

### 深色模式配置策略

项目使用 `media` 策略，深色模式自动跟随系统偏好设置：

```typescript
// tailwind.config.ts
export default {
  darkMode: "media", // 跟随系统设置
  // ...
};
```

**两种策略对比**:

| 策略    | 触发方式         | 优点                          | 缺点                              | 适用场景                          |
| ------- | ---------------- | ----------------------------- | --------------------------------- | --------------------------------- |
| `media` | 自动跟随系统     | 无需额外代码<br/>用户体验一致 | 无法手动切换                      | 工具类应用<br/>系统级应用         |
| `class` | 手动添加 `.dark` | 可手动切换<br/>更灵活         | 需要实现切换逻辑<br/>存储用户偏好 | 内容型网站<br/>需要独立切换的应用 |

**当前项目行为**:

- ✅ 深色模式自动跟随用户的系统偏好设置
- ✅ 无需手动切换，减少用户操作
- ❌ 无法在应用内独立切换深色模式

### 深色模式类名使用

使用 `dark:` 前缀定义深色模式下的样式：

```tsx
// ✅ 推荐：使用 dark: 前缀
<div
  className={cn(
    "bg-white text-gray-900", // 浅色模式
    "dark:bg-gray-900 dark:text-white" // 深色模式（自动生效）
  )}
>
  内容
</div>
```

**工作原理**:

- 当系统切换到深色模式时，`dark:` 前缀的样式自动生效
- 不需要任何 JavaScript 代码
- 响应速度快，无闪烁

### 主题颜色变量

使用语义化的颜色名称：

```tsx
// ✅ 推荐：语义化颜色
<button className="bg-primary text-primary-foreground">
  主要按钮
</button>

// ❌ 避免：硬编码颜色
<button className="bg-black text-white dark:bg-white dark:text-black">
  主要按钮
</button>
```

### 切换到手动控制（可选）

如果产品需求需要应用内切换深色模式，可以按以下步骤修改：

#### 1. 更新 Tailwind 配置

```typescript
// tailwind.config.ts
export default {
  darkMode: "class", // 改为 class 策略
  // ...
};
```

#### 2. 创建深色模式切换组件

```tsx
// components/ui/theme-toggle.tsx
"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // 初始化时从 localStorage 读取
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const shouldBeDark = stored === "dark" || (!stored && prefersDark);

    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    // 更新 DOM 和存储
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
      aria-label="切换深色模式"
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
```

#### 3. 防止主题闪烁（FOUC）

在页面加载前设置主题：

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**注意事项**:

- 使用 `class` 策略后，`dark:` 前缀只在 `<html class="dark">` 时生效
- 需要处理首次加载时的主题闪烁问题（FOUC）
- 需要在 localStorage 中存储用户偏好

## 性能优化

### 1. 避免不必要的类名

```tsx
// ✅ 推荐：简洁的类名
<div className="flex gap-4">

// ❌ 避免：冗余的类名
<div className="flex flex-row gap-4"> {/* flex-row 是默认值 */}
```

### 2. 使用 Tailwind 的 JIT 模式

确保 `tailwind.config.ts` 已启用 JIT（默认启用）：

```typescript
// tailwind.config.ts
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // JIT 模式默认启用
};
```

### 3. 生产构建优化

```bash
# 生产构建会自动清除未使用的样式
npm run build
```

## 常见模式

### 卡片组件

```tsx
<div
  className={cn(
    "rounded-lg border border-gray-200",
    "bg-white dark:bg-gray-800",
    "p-6 shadow-sm",
    "hover:shadow-md transition-shadow"
  )}
>
  {children}
</div>
```

### 输入框

```tsx
<input
  className={cn(
    "w-full px-3 py-2 rounded-md",
    "border border-gray-300 dark:border-gray-600",
    "bg-white dark:bg-gray-800",
    "text-gray-900 dark:text-white",
    "focus:outline-none focus:ring-2 focus:ring-blue-500",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  )}
/>
```

### 按钮状态

```tsx
<button
  className={cn(
    "px-4 py-2 rounded-lg font-medium",
    "transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    {
      "bg-blue-500 text-white hover:bg-blue-600": !disabled,
      "bg-gray-300 text-gray-500 cursor-not-allowed": disabled,
    }
  )}
>
  {loading && <Spinner />}
  {children}
</button>
```

### 布局容器

```tsx
// 页面容器
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  {children}
</div>

// 内容容器
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {children}
</div>

// 栅格布局
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Item key={item.id} {...item} />)}
</div>
```

## 最佳实践

### 1. 类名顺序

建议按以下顺序组织类名（cn 函数会自动处理）：

1. 布局（display, position, float）
2. 盒模型（width, height, padding, margin）
3. 边框和圆角
4. 背景和颜色
5. 文字样式
6. 其他效果（shadow, opacity, transition）
7. 状态类（hover, focus, active）
8. 响应式类

```tsx
className={cn(
  // 布局
  "flex items-center justify-between",
  // 盒模型
  "w-full px-4 py-2",
  // 边框和圆角
  "border border-gray-200 rounded-lg",
  // 背景和颜色
  "bg-white text-gray-900",
  // 效果
  "shadow-sm transition-all",
  // 状态
  "hover:shadow-md",
  // 响应式
  "md:px-6",
)}
```

### 2. 组件复用

```tsx
// ✅ 推荐：提取可复用的样式组合
const cardStyles = cn(
  "rounded-lg border",
  "bg-white dark:bg-gray-800",
  "p-6 shadow-sm",
);

// 在多个组件中使用
<div className={cardStyles}>...</div>
<article className={cardStyles}>...</article>
```

### 3. 避免魔法数字

```tsx
// ✅ 推荐：使用 Tailwind 的标准间距
<div className="gap-4 p-6">

// ❌ 避免：任意值（除非必要）
<div className="gap-[17px] p-[23px]">
```

### 4. 保持一致性

```tsx
// ✅ 推荐：统一的按钮样式
const baseButtonStyles = "px-4 py-2 rounded-lg font-medium transition-colors";

// 在所有按钮组件中使用相同的基础样式
```

### 5. 文档化自定义工具类

如果必须添加自定义工具类，请在此文档中记录：

#### 隐藏滚动条

用于完全隐藏滚动条的自定义滚动容器：

```css
/* globals.css */
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

**使用方法：**

```tsx
<div className="overflow-auto scrollbar-hide">
  {/* 内容会滚动，但滚动条不可见 */}
</div>
```

#### 自定义滚动条样式

用于提供适配 dark mode 的自定义滚动条样式：

```css
/* globals.css */
/* Custom scrollbar styles - reusable for any component */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f3f4f6; /* gray-100 */
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db; /* gray-300 */
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af; /* gray-400 */
}

/* Dark mode scrollbar */
@media (prefers-color-scheme: dark) {
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1f2937; /* gray-800 */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4b5563; /* gray-600 */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6b7280; /* gray-500 */
  }
}

/* Firefox scrollbar */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #f3f4f6; /* thumb track */
}

@media (prefers-color-scheme: dark) {
  .custom-scrollbar {
    scrollbar-color: #4b5563 #1f2937; /* thumb track */
  }
}
```

**使用方法：**

```tsx
// 直接应用到容器
<div className="overflow-auto custom-scrollbar">
  {/* 显示自定义样式的滚动条，自动适配 light/dark 模式 */}
</div>

// 应用到容器及其所有子元素（适用于包含第三方组件的情况）
<div className="overflow-auto custom-scrollbar [&_*]:custom-scrollbar">
  {/* react-arborist 等第三方组件也会应用自定义滚动条样式 */}
  <Tree ... />
</div>
```

**特性：**

- ✅ 支持 WebKit 浏览器（Chrome, Safari, Edge）
- ✅ 支持 Firefox 浏览器
- ✅ 自动适配 light 和 dark 模式
- ✅ 8px 细窄设计，现代UI风格
- ✅ 圆角滚动条，视觉更柔和
- ✅ Hover 状态反馈

**使用场景：**

- 大纲视图、侧边栏等需要滚动的面板
- 代码编辑器、文本编辑区域
- 任何需要自定义滚动条样式的组件

## 检查清单

在提交代码前，确保：

- [ ] 优先使用 Tailwind 工具类而非自定义 CSS
- [ ] 使用 `cn` 函数管理条件类名
- [ ] 遵循移动优先的响应式设计
- [ ] 支持深色模式（使用 `dark:` 前缀）
- [ ] 类名按推荐顺序组织
- [ ] 提取重复的样式组合为常量
- [ ] 避免内联样式和组件级 CSS 文件
- [ ] 保持与现有组件的样式一致性

## 相关文档

- [编码规范](./coding-standards.md) - TypeScript 和 React 编码规范
- [项目结构](./project-structure.md) - 文件组织和命名规范
- [Tailwind CSS 官方文档](https://tailwindcss.com/docs)

---

_本文档会随着项目演进持续更新，请定期查看最新版本。_
