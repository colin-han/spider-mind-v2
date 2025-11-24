# 项目结构说明

这个文档详细说明了 Spider Mind v2 项目的目录结构和文件组织方式，帮助开发者快速理解项目架构。

## 📂 整体结构

```
spider-mind-v2/
├── src/                        # 产品代码目录 ⭐
│   ├── app/                    # Next.js 15 App Router 应用目录
│   ├── components/             # React 组件（按功能分组）
│   ├── lib/                    # 核心业务逻辑和工具
│   └── middleware.ts           # Next.js 中间件
├── docs/                       # 项目文档
├── scripts/                    # 开发和部署脚本
├── supabase/                   # 数据库迁移和配置
├── tests/                      # E2E 测试文件
├── __mocks__/                  # Jest 模拟文件
├── .claude/                    # Claude AI 相关配置和规范
├── .husky/                     # Git hooks 配置
├── .next/                      # Next.js 构建输出（自动生成）
├── .vscode/                    # VS Code 编辑器配置
├── node_modules/              # 依赖包（自动生成）
├── playwright-report/          # Playwright 测试报告（自动生成）
├── test-results/              # 测试运行结果（自动生成）
├── package.json                # 项目依赖和脚本
├── tsconfig.json               # TypeScript 配置
├── next.config.js              # Next.js 配置
├── tailwind.config.ts          # Tailwind CSS 配置
├── playwright.config.ts        # Playwright 配置
├── jest.config.js              # Jest 配置
└── 其他配置文件...             # ESLint、Prettier 等
```

## 📁 核心目录详解

### `/src/app` - Next.js App Router

```
src/app/
├── (auth)/                     # 路由组: 认证相关页面
│   ├── login/                  # 登录页面
│   └── signup/                 # 注册页面
├── dashboard/                  # 仪表板页面
├── mindmaps/                   # 思维导图相关页面
│   └── [shortId]/             # 动态路由: 通过短ID访问思维导图
├── globals.css                 # 全局样式
├── layout.tsx                  # 根布局组件
└── page.tsx                   # 首页
```

**职责:**

- 定义应用的路由结构
- 包含页面组件和布局
- 使用 Next.js 15 App Router 的文件系统路由

**规范:**

- 页面文件必须命名为 `page.tsx`
- 布局文件必须命名为 `layout.tsx`
- 使用路由组 `()` 来组织相关页面

**注意:**

- 本项目使用 **Server Actions** (`src/lib/actions/`) 而非传统的 API Routes
- 这是 Next.js 15 推荐的数据变更方式，提供更好的类型安全和性能

### `/src/components` - React 组件

```
src/components/
├── auth/                       # 认证相关组件
│   ├── login-form.tsx
│   └── signup-form.tsx
├── common/                     # 通用组件
│   └── ...
├── dashboard/                  # 仪表板组件
│   ├── MindmapCard.tsx
│   ├── QuickActions.tsx
│   └── RecentMindmaps.tsx
├── layout/                     # 布局组件
│   └── ...
├── mindmap/                    # 思维导图组件
│   ├── mindmap-editor-container.tsx  # 编辑器容器组件
│   ├── mindmap-editor-layout.tsx     # 编辑器布局组件
│   ├── mindmap-graph-viewer.tsx      # 图形视图组件
│   ├── mindmap-outline-arborist.tsx  # 大纲视图组件
│   ├── node-panel.tsx         # 节点属性面板
│   ├── node-toolbar.tsx       # 节点工具栏
│   ├── resizable-panel.tsx    # 可调整大小的面板
│   ├── save-button.tsx        # 保存按钮
│   └── ...
└── ui/                        # 通用 UI 组件 (shadcn/ui)
    ├── button.tsx
    ├── input.tsx
    ├── dialog.tsx
    └── ...
```

**职责:**

- 放在 src/ 目录下
- 按功能模块组织组件
- 提供可复用的 UI 组件
- `ui/` 目录使用 shadcn/ui 组件库

**规范:**

- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名（如 `mindmap-node.tsx`）
- 每个组件目录可包含组件文件和相关样式
- ui/ 组件严格遵循 kebab-case 命名

### `/src/lib` - 核心业务逻辑和工具

```
src/lib/
├── actions/                    # Server Actions (数据变更操作)
│   ├── auth.ts                # 认证相关
│   ├── mindmap.ts             # 思维导图操作
│   └── ...
├── constants/                  # 常量定义
│   └── reserved-words.ts      # 保留词定义
├── db/                        # IndexedDB 客户端和Schema
│   └── ...
├── domain/                    # 领域层 (核心架构) ⭐
│   ├── commands/              # 命令模式实现
│   │   ├── ai/               # AI 相关命令
│   │   ├── global/           # 全局命令
│   │   ├── navigation/       # 导航命令
│   │   ├── node/             # 节点操作命令
│   │   └── index.ts
│   ├── actions/              # 可撤销的原子操作
│   ├── shortcuts/            # 快捷键定义
│   ├── command-manager.ts    # 命令管理器
│   ├── command-registry.ts   # 命令注册表
│   ├── history-manager.ts    # 撤销/重做管理器
│   ├── mindmap-store.ts      # Zustand Store 主入口
│   ├── mindmap-store.types.ts # Store 类型定义
│   ├── editor-utils.ts       # 编辑器工具函数
│   ├── shortcut-manager.ts   # 快捷键管理器
│   └── shortcut-register.ts  # 快捷键注册
├── hooks/                     # 自定义 React Hooks
├── providers/                 # React Context Providers
├── supabase/                  # Supabase 客户端配置
├── sync/                      # 同步相关
├── types/                     # TypeScript 类型定义
└── utils/                     # 工具函数
    ├── auth-helpers.ts        # 认证相关工具函数
    ├── cn.ts                  # className合并工具（tailwind-merge + clsx）
    ├── date-format.ts         # 日期格式化工具
    └── short-id.ts            # 短ID生成和验证工具
```

**职责:**

- **`domain/`**: 核心架构层，实现 Command/Action 模式
  - 所有状态变更通过命令执行
  - 支持完整的撤销/重做功能
  - 命令验证和批量操作
- **`actions/`**: Server Actions（Next.js 15 服务端数据操作）
- **`store/`**: Zustand 状态管理配置
- **`db/`**: 本地 IndexedDB 持久化
- **`hooks/`**: 自定义 React Hooks
- **`utils/`**: 工具函数库

**规范:**

- 所有导出使用命名导出，避免默认导出
- hooks 使用 camelCase 并以 `use` 开头
- 工具函数使用 camelCase 命名
- Server Actions 放在 `src/lib/actions/` 目录
- 命令定义使用 camelCase 并以 `Command` 结尾
- Action 类使用 PascalCase 并以 `Action` 结尾

### `/tests` 和 `/__tests__` - 测试文件

```
tests/
└── e2e/                        # End-to-End 测试 (Playwright)
    └── auth.spec.ts           # 认证流程 E2E 测试

__tests__/                     # 单元测试 (与源码同级)
└── (分散在各模块旁边)
```

**职责:**

- `tests/e2e/`: Playwright E2E 测试
- `__tests__/`: Jest 单元测试（通常放在被测试文件旁边）

**规范:**

- E2E 测试使用 `.spec.ts` 后缀
- 单元测试使用 `.test.ts` 后缀
- 所有测试元素使用 `data-testid` 属性定位

**测试选择器规范:**

```typescript
// ✅ 推荐：使用 data-testid
<button data-testid="login-submit-button">登录</button>
await page.getByTestId("login-submit-button").click();

// ❌ 避免：使用 getByRole, getByLabel 等其他选择器
```

**命名规范:**

- 表单元素：`{form-name}-{field-name}-input`
- 按钮：`{action}-button`
- 页面容器：`{page-name}-{element-type}`

详见：[测试规范文档](../standard/testing-guide.md)

**注意:** 测试基础设施（页面对象模式、fixtures）待完善，当前仅有基础的 E2E 测试覆盖。

### `/supabase` - 数据库和后端功能

```
supabase/
├── .branches/                  # 分支配置
├── .temp/                      # 临时文件
├── migrations/                 # 数据库迁移文件
│   ├── 20241012000001_user_profiles_schema.sql
│   ├── 20241012000002_mindmap_schema.sql
│   ├── 20251106025942_remove_mindmap_node_content.sql
│   └── ...
├── config.toml                 # Supabase 配置
└── seed.sql                   # 数据库种子数据
```

**职责:**

- 管理数据库 schema 和迁移
- 配置 Supabase 项目设置
- 提供数据库初始化脚本

**规范:**

- 迁移文件按时间戳命名（格式：`YYYYMMDDHHMMSS_description.sql`）
- 每次 schema 变更都创建新的迁移文件
- 遵循 Supabase 最佳实践
- 迁移文件包含完整的 DDL 语句（CREATE、ALTER、DROP）

### `/scripts` - 开发脚本

```
scripts/
├── dev-setup.sh               # 开发环境设置脚本
├── check-env.js               # 环境检查脚本
└── build-scripts/             # 构建相关脚本
```

**职责:**

- 自动化开发环境设置
- 提供开发和部署工具
- 环境检查和验证

### `/docs` - 项目文档

```
docs/
├── design/                    # 已确认的设计文档
│   ├── command-reference.md  # 命令系统参考手册
│   ├── database-schema.md    # 数据库设计文档
│   ├── id-design.md          # ID设计规范（UUID + short_id）
│   ├── editor-ui-layout-design.md       # 编辑器 UI 布局设计
│   ├── node-layout-engine-design.md     # 节点布局引擎设计
│   └── INDEX.md              # 设计文档索引
├── draft/                    # 设计文档草稿，讨论中的设计方案
│   ├── mindmap-viewer-implementation-plan.md
│   └── pending-features.md
├── obsolete❌/                # 已废弃的设计文档（保留以供参考）
│   ├── command-system-design.md        # 已被 command-reference.md 替代
│   ├── mindmap-editor-store-design.md  # 已整合到 editor-ui-layout-design.md
│   ├── mindmap-persistence-design.md   # 已废弃
│   └── shortcut-system-design.md       # 已整合到 command-reference.md
└── standard/                  # 标准规范
    ├── project-structure.md  # 项目结构（本文档）
    ├── coding-standards.md   # 代码规范
    ├── css-standards.md      # CSS规范
    └── testing-guide.md      # 测试指南
```

**职责:**

- **`design/`**: 已确认的设计文档
- **`draft/`**: 设计文档草稿，讨论中的设计方案
- **`obsolete❌/`**: 已废弃的设计文档（保留以供参考）
- **`standard/`**: 开发规范和最佳实践

**规范:**

- 设计文档包含：背景、目标、方案、决策理由
- 标准规范文档持续更新
- 每份文档包含元信息（作者、版本、更新日期）

## 🔧 配置文件说明

### 核心配置文件

| 文件                 | 用途                |
| -------------------- | ------------------- |
| `package.json`       | 项目依赖和脚本定义  |
| `tsconfig.json`      | TypeScript 编译配置 |
| `next.config.js`     | Next.js 框架配置    |
| `tailwind.config.ts` | Tailwind CSS 配置   |
| `postcss.config.mjs` | PostCSS 配置        |
| `src/middleware.ts`  | Next.js 中间件      |
| `.env.local`         | 本地环境变量配置    |
| `.env.local.example` | 环境变量示例文件    |

### 代码质量配置

| 文件             | 用途                    |
| ---------------- | ----------------------- |
| `.eslintrc.json` | ESLint 代码检查规则     |
| `.prettierrc`    | Prettier 代码格式化规则 |

### 测试配置

| 文件                   | 用途                    |
| ---------------------- | ----------------------- |
| `jest.config.js`       | Jest 单元测试配置       |
| `jest.setup.js`        | Jest 测试环境设置       |
| `playwright.config.ts` | Playwright E2E 测试配置 |

### Git 和 CI/CD

| 文件          | 用途               |
| ------------- | ------------------ |
| `.gitignore`  | Git 忽略文件配置   |
| `.husky/`     | Git hooks 配置目录 |
| `lint-staged` | 预提交代码检查配置 |

## 📋 文件命名规范

### 组件文件

- **React 组件文件**: kebab-case (`user-profile.tsx`, `mindmap-node.tsx`)
- **React 组件导出**: PascalCase (`export function UserProfile()`)
- **页面组件**: `page.tsx` (Next.js App Router 约定)
- **布局组件**: `layout.tsx` (Next.js App Router 约定)

### 工具和配置文件

- **工具函数文件**: kebab-case (`format-date.ts`, `cn.ts`)
- **工具函数导出**: camelCase (`export function formatDate()`)
- **常量文件**: kebab-case (`api-constants.ts`)
- **配置文件**: kebab-case (`api-config.ts`)

### 测试文件

- **单元测试**: `*.test.ts` 或 `*.test.tsx`
- **E2E 测试**: `*.spec.ts`
- **页面对象**: PascalCase (`LoginPage.ts`)

## 🚀 添加新功能指南

### 1. 添加新页面

1. 在 `src/app/` 目录下创建新的路由目录
2. 添加 `page.tsx` 文件
3. 如需要，添加对应的 `layout.tsx`
4. 在 `tests/e2e/pages/` 下创建页面对象
5. 编写对应的 E2E 测试

### 2. 添加新组件

1. 在 `src/components/` 相应分类下创建组件文件（使用 kebab-case 命名）
2. 编写组件的 TypeScript 类型定义
3. 添加单元测试文件
4. 更新相关的页面或父组件

### 3. 添加新的 Server Action

**注意**: 本项目使用 Server Actions 而非传统 API Routes。

1. 在 `src/lib/actions/` 下创建 Action 文件
2. 使用 `"use server"` 指令标记服务端代码
3. 实现数据变更逻辑（创建、更新、删除）
4. 添加 Zod schema 进行输入验证
5. 在组件中调用 Server Action

**示例:**

```typescript
// src/lib/actions/mindmap-actions.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createMindmapSchema = z.object({
  title: z.string().min(1).max(100),
});

export async function createMindmap(formData: FormData) {
  const supabase = await createClient();

  // 验证输入
  const data = createMindmapSchema.parse({
    title: formData.get("title"),
  });

  // 执行数据库操作
  const { data: mindmap, error } = await supabase
    .from("mindmaps")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return mindmap;
}
```

**在组件中使用:**

```typescript
// src/app/dashboard/page.tsx
import { createMindmap } from "@/lib/actions/mindmap-actions";

export default function Dashboard() {
  return (
    <form action={createMindmap}>
      <input name="title" />
      <button type="submit">创建</button>
    </form>
  );
}
```

### 4. 添加新的工具函数

1. 在 `src/lib/utils/` 中创建工具文件
2. 编写完整的 TypeScript 类型定义
3. 添加单元测试
4. 更新导出索引文件

## 🎯 最佳实践

### 导入顺序

```typescript
// 1. React/Next.js 核心
import React from "react";
import { NextRequest } from "next/server";

// 2. 第三方库
import { z } from "zod";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 3. 内部组件和工具 (按层级从高到低)
import { Button } from "@/components/ui/button";
import { MindmapNode } from "@/components/mindmap/mindmap-node";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils/cn";

// 4. 类型导入 (使用 type 关键字)
import type { User } from "@/lib/types/auth";
```

### 文件组织

- 相关文件放在同一目录下
- 使用 `index.ts` 文件导出目录内容
- 避免深层嵌套，保持目录结构扁平化
- 按功能而非文件类型组织代码

### TypeScript 使用

- 为所有函数和组件提供明确的类型定义
- 使用 `interface` 定义对象结构
- 使用 `type` 定义联合类型和复杂类型
- 避免使用 `any` 类型

## 🔑 关键设计决策

### 为什么使用 Server Actions 而非 API Routes？

**决策**: 使用 Next.js 14 Server Actions 进行数据变更

**原因:**

1. **类型安全**: Server Actions 与客户端代码共享类型定义
2. **性能优化**: 自动优化请求，减少网络往返
3. **简化代码**: 无需单独的 API 层和客户端服务层
4. **渐进增强**: 支持无 JavaScript 的表单提交

**权衡:**

- ❌ 不适合需要 REST API 的场景（第三方集成）
- ✅ 适合内部数据变更操作

---

## 📞 获取帮助

如果对项目结构有疑问，可以：

1. 查阅相关文档文件（`docs/` 目录）
2. 阅读设计文档了解架构决策
3. 查看现有代码的实现方式
4. 参考测试文件了解组件使用方法

**重要文档:**

- [代码规范](./coding-standards.md)
- [测试指南](./testing-guide.md)
- [本地开发环境搭建](../setup/local-dev-setup.md)

---

## 📝 修订历史

| 日期       | 版本  | 修改内容                                                          | 作者   |
| ---------- | ----- | ----------------------------------------------------------------- | ------ |
| 2025-10-01 | 1.0.0 | 初始版本                                                          | Team   |
| 2025-11-06 | 2.0.0 | 添加 domain/ 架构说明，更新 Server Actions 说明，补充命令系统文档 | Claude |
| 2025-11-06 | 2.1.0 | 更新实际目录结构，补充详细的文件列表                              | Claude |
| 2025-11-06 | 3.0.0 | 重整目录结构：将产品代码移至 src/ 目录，更新所有路径引用          | Claude |
| 2025-11-06 | 3.1.0 | 将 domain 目录从 src/lib 移至 src，作为独立的顶级领域层目录       | Claude |

---

_本文档会随着项目演进持续更新，请定期查看最新版本。_
