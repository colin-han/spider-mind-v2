# Spider Mind v2 🕷️🧠

智能知识管理和思维导图应用，基于现代 Web 技术栈构建。

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

> 一个现代化的知识管理工具，帮助用户构建和可视化知识网络，提高学习和思考效率。

## ✨ 特性

- 🎯 **智能知识管理** - 高效组织和检索知识内容
- 🗺️ **交互式思维导图** - 直观的可视化知识结构
- 🔗 **知识网络** - 智能关联和连接相关内容
- 📱 **响应式设计** - 支持桌面端和移动端
- 🎨 **现代化界面** - 基于 Tailwind CSS 的优雅设计
- ⚡ **高性能** - Next.js 13+ App Router，快速加载
- 🔒 **类型安全** - 完整的 TypeScript 支持
- 🧪 **全面测试** - 单元测试和 E2E 测试覆盖

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- Yarn >= 1.22.0
- Git >= 2.20.0

### 安装和运行

1. **克隆项目**

   ```bash
   git clone <项目地址>
   cd spider-mind-v2
   ```

2. **一键设置开发环境**

   ```bash
   yarn dev:setup
   ```

   这个命令会自动：
   - 检查系统依赖
   - 安装项目依赖
   - 配置环境变量
   - 设置开发工具
   - 运行环境验证

3. **启动开发服务器**

   ```bash
   yarn dev
   ```

   访问 [http://localhost:3000](http://localhost:3000) 查看应用

## 🛠️ 技术栈

### 前端框架

- **[Next.js 15](https://nextjs.org/)** - React 全栈框架
- **[React 18](https://react.dev/)** - 用户界面库
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript

### 样式和 UI

- **[Tailwind CSS](https://tailwindcss.com/)** - 原子化 CSS 框架
- **[CSS Modules](https://github.com/css-modules/css-modules)** - 模块化样式支持

### 开发工具

- **[ESLint](https://eslint.org/)** - 代码质量检查
- **[Prettier](https://prettier.io/)** - 代码格式化
- **[Husky](https://typicode.github.io/husky/)** - Git hooks 管理
- **[lint-staged](https://github.com/okonet/lint-staged)** - 预提交代码检查

### 测试

- **[Jest](https://jestjs.io/)** - 单元测试框架
- **[Testing Library](https://testing-library.com/)** - React 组件测试
- **[Playwright](https://playwright.dev/)** - E2E 测试框架

### 包管理

- **[Yarn](https://yarnpkg.com/)** - 依赖包管理器

## 📚 项目文档

- [📁 项目结构说明](./docs/project-structure.md)
- [⚙️ 开发环境搭建](./docs/development-setup.md)
- [📋 代码规范和最佳实践](./docs/coding-standards.md)

## 🔧 常用命令

### 开发和构建

```bash
yarn dev              # 启动开发服务器
yarn dev:turbo        # 使用 Turbo 模式启动 (更快)
yarn build            # 构建生产版本
yarn start            # 启动生产服务器
yarn build:analyze    # 构建并分析包大小
```

### 代码质量

```bash
yarn lint             # 运行 ESLint 检查
yarn lint:fix         # 自动修复 ESLint 问题
yarn format           # 格式化代码
yarn format:check     # 检查代码格式
yarn type-check       # TypeScript 类型检查
yarn validate         # 运行完整代码验证
```

### 测试

```bash
yarn test             # 运行单元测试
yarn test:watch       # 监听模式运行测试
yarn test:coverage    # 生成测试覆盖率报告
yarn test:e2e         # 运行 E2E 测试
yarn test:e2e:ui      # E2E 测试 UI 模式
yarn test:e2e:debug   # 调试 E2E 测试
```

### 工具和维护

```bash
yarn dev:setup       # 开发环境一键设置
yarn dev:check       # 检查开发环境
yarn clean           # 清理构建产物
yarn clean:deps      # 重新安装依赖
```

## 📂 项目结构

```
spider-mind-v2/
├── src/                    # 产品代码目录 ⭐
│   ├── app/                # Next.js App Router 应用目录
│   ├── components/         # React 组件（按功能分组）
│   ├── lib/                # 核心业务逻辑和工具
│   │   ├── actions/        # Server Actions
│   │   ├── domain/         # 领域层（命令/状态管理）
│   │   ├── hooks/          # 自定义 React Hooks
│   │   ├── types/          # TypeScript 类型定义
│   │   └── utils/          # 工具函数
│   └── middleware.ts       # Next.js 中间件
├── tests/                  # E2E 测试文件
│   └── e2e/                # Playwright E2E 测试
├── docs/                   # 项目文档
├── scripts/                # 开发脚本
├── supabase/               # 数据库迁移
└── 配置文件...             # 各种配置文件
```

详细结构说明请查看 [项目结构文档](./docs/standard/project-structure.md)。

## 🧪 测试策略

项目采用多层次的测试策略：

### 单元测试

- 使用 Jest + Testing Library
- 覆盖组件、工具函数和业务逻辑
- 目标覆盖率 > 80%

### E2E 测试

- 使用 Playwright
- 页面对象模式组织测试代码
- 多浏览器支持 (Chrome, Firefox, Safari)

### 代码质量

- ESLint 静态代码分析
- Prettier 代码格式化
- TypeScript 类型检查
- Husky + lint-staged 预提交检查

## 🚀 部署

### 构建优化

- 自动代码分割
- 图片优化 (Next.js Image)
- 静态资源压缩
- 树摇优化 (Tree Shaking)

### 环境配置

- 开发环境: `yarn dev`
- 生产构建: `yarn build && yarn start`
- 静态导出: `yarn export`

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 贡献前检查

- [ ] 代码通过所有测试 (`yarn test:all`)
- [ ] 遵循代码规范 (`yarn validate`)
- [ ] 更新相关文档
- [ ] 添加必要的测试用例

## 📄 开源协议

本项目基于 [MIT 协议](LICENSE) 开源。

## 🙋 获取帮助

如果遇到问题或有疑问：

1. 查看 [文档目录](./docs/) 中的相关指南
2. 运行 `yarn dev:check` 检查环境配置
3. 查看 [Issues](../../issues) 寻找相似问题
4. 创建新的 Issue 描述你的问题

## 📊 项目状态

- ✅ 基础架构搭建完成
- ✅ 开发环境配置完成
- ✅ 测试框架配置完成
- ✅ 代码规范制定完成
- 🚧 核心功能开发中
- ⏳ 用户界面设计中

## 🎯 路线图

- [ ] 用户认证系统
- [ ] 知识节点管理
- [ ] 思维导图编辑器
- [ ] 智能搜索功能
- [ ] 数据导入导出
- [ ] 移动端适配
- [ ] 协作功能

---

**作者**: Colin <biz@colinhan.info>

**许可证**: MIT

**版本**: v0.1.0

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
