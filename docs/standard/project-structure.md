# 项目结构说明

这个文档详细说明了 Spider Mind v2 项目的目录结构和文件组织方式，帮助开发者快速理解项目架构。

## 📂 整体结构

```
spider-mind-v2/
├── .claude/                    # Claude AI 相关配置和规范
├── .husky/                     # Git hooks 配置
├── __mocks__/                  # Jest 模拟文件
├── __tests__/                  # 单元测试全局测试文件
├── app/                        # Next.js 13+ App Router 应用目录
├── components/                 # React 组件（按功能分组）
├── coverage/                   # 测试覆盖率报告
├── docs/                       # 项目文档
├── lib/                        # 核心业务逻辑和工具
├── public/                     # 静态资源
├── playwright-report/          # Playwright 测试报告
├── scripts/                    # 开发和部署脚本
├── supabase/                   # 数据库迁移和函数
├── test-results/              # 测试运行结果
├── tests/                      # 测试文件集合
└── 配置文件...                 # 各种配置文件
```

## 📁 核心目录详解

### `/app` - Next.js App Router

```
app/
├── (auth)/                     # 路由组: 认证相关页面
│   ├── login/                  # 登录页面
│   └── signup/                 # 注册页面
├── dashboard/                  # 仪表板页面
├── mindmaps/                   # 思维导图相关页面
│   └── [shortId]/             # 动态路由
├── api/                        # API 路由
│   ├── auth/                   # 认证 API
│   └── nodes/                  # 节点管理 API
├── globals.css                 # 全局样式
├── layout.tsx                  # 根布局组件
├── loading.tsx                 # 全局加载组件
├── not-found.tsx              # 404 页面
└── page.tsx                   # 首页
```

**职责:**

- 定义应用的路由结构
- 包含页面组件和 API 路由
- 使用 Next.js 13+ 的文件系统路由

**规范:**

- 页面文件必须命名为 `page.tsx`
- 布局文件必须命名为 `layout.tsx`
- 使用路由组 `()` 来组织相关页面
- API 路由使用 Route Handlers

### `/components` - React 组件

```
components/
├── auth/                       # 认证相关组件
├── dashboard/                  # 仪表板组件
├── mindmap/                    # 思维导图组件
└── ui/                        # 通用 UI 组件
```

**职责:**

- 放在项目根目录（不在 lib/ 下）
- 按功能模块组织组件
- 提供可复用的 UI 组件

**规范:**

- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名（如 `mindmap-node.tsx`）
- 每个组件目录可包含组件文件和相关样式

### `/lib` - 核心业务逻辑和工具

```
lib/
├── actions/                    # Server Actions（Next.js 服务端操作）
├── hooks/                      # 自定义 React Hooks
├── providers/                  # React Context Providers
├── store/                      # Zustand 状态管理
├── supabase/                   # Supabase 客户端配置
├── types/                      # TypeScript 类型定义
└── utils/                      # 工具函数
```

**职责:**

- 管理应用的核心业务逻辑
- 提供数据访问层和状态管理
- 定义应用的类型系统
- 提供工具函数和自定义 hooks

**规范:**

- 所有导出使用命名导出，避免默认导出
- hooks 使用 camelCase 并以 `use` 开头
- 工具函数使用 camelCase 命名
- Server Actions 放在 `actions/` 目录

### `/tests` - 测试文件

```
tests/
├── e2e/                        # End-to-End 测试
│   ├── pages/                  # 页面对象模型
│   │   ├── BasePage.ts         # 页面对象基类
│   │   └── HomePage.ts         # 首页页面对象
│   ├── fixtures.ts             # 测试固件和工具
│   ├── config.ts               # E2E 测试配置
│   ├── global-setup.ts         # 全局测试设置
│   ├── global-teardown.ts      # 全局测试清理
│   └── *.spec.ts              # 测试文件
├── integration/               # 集成测试
├── setup/                     # 测试设置文件
└── unit/                      # 单元测试 (如果需要独立目录)
```

**职责:**

- 包含所有类型的测试文件
- 提供测试工具和配置
- 使用页面对象模式组织 E2E 测试

**规范:**

- E2E 测试使用 `.spec.ts` 后缀
- 单元测试使用 `.test.ts` 后缀
- 页面对象使用 PascalCase 命名并继承 `BasePage`

### `/supabase` - 数据库和后端功能

```
supabase/
├── migrations/                 # 数据库迁移文件
├── functions/                  # Edge Functions（Serverless 函数）
└── seed.sql                   # 数据库种子数据（如有）
```

**职责:**

- 管理数据库 schema 和迁移
- 定义 Edge Functions
- 提供数据库初始化脚本

**规范:**

- 迁移文件按时间戳命名
- Functions 使用 TypeScript 编写
- 遵循 Supabase 最佳实践

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
├── project-structure.md       # 项目结构说明 (本文档)
├── development-guide.md       # 开发环境指南
├── coding-standards.md        # 代码规范文档
└── api/                       # API 文档
```

**职责:**

- 提供项目开发指南
- 维护技术文档和规范
- 记录架构决策和最佳实践

## 🔧 配置文件说明

### 核心配置文件

| 文件                 | 用途                |
| -------------------- | ------------------- |
| `package.json`       | 项目依赖和脚本定义  |
| `tsconfig.json`      | TypeScript 编译配置 |
| `next.config.js`     | Next.js 框架配置    |
| `tailwind.config.ts` | Tailwind CSS 配置   |
| `postcss.config.mjs` | PostCSS 配置        |
| `middleware.ts`      | Next.js 中间件      |
| `.env.local`         | 本地环境变量配置    |
| `.env.example`       | 环境变量示例文件    |

### 代码质量配置

| 文件                   | 用途                    |
| ---------------------- | ----------------------- |
| `.eslintrc.json`       | ESLint 代码检查规则     |
| `.prettierrc`          | Prettier 代码格式化规则 |
| `jest.config.js`       | Jest 单元测试配置       |
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

1. 在 `app/` 目录下创建新的路由目录
2. 添加 `page.tsx` 文件
3. 如需要，添加对应的 `layout.tsx`
4. 在 `tests/e2e/pages/` 下创建页面对象
5. 编写对应的 E2E 测试

### 2. 添加新组件

1. 在 `components/` 相应分类下创建组件文件（使用 kebab-case 命名）
2. 编写组件的 TypeScript 类型定义
3. 添加单元测试文件
4. 更新相关的页面或父组件

### 3. 添加新的 API 路由

1. 在 `app/api/` 下创建路由目录
2. 添加 `route.ts` 文件实现 Route Handler
3. 在 `lib/services/` 中创建客户端调用服务
4. 添加 API 集成测试

### 4. 添加新的工具函数

1. 在 `lib/utils/` 中创建工具文件
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

## 📞 获取帮助

如果对项目结构有疑问，可以：

1. 查阅相关文档文件
2. 运行 `yarn dev:check` 检查环境配置
3. 查看现有代码的实现方式
4. 参考测试文件了解组件使用方法

---

_本文档会随着项目演进持续更新，请定期查看最新版本。_
