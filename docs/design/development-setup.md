# 开发环境搭建指南

本指南将帮助你快速搭建 Spider Mind v2 的本地开发环境。

## 📋 系统要求

### 必需软件

- **Node.js**: >= 18.0.0 (推荐使用最新 LTS 版本)
- **Yarn**: >= 1.22.0 (包管理器)
- **Git**: >= 2.20.0 (版本控制)

### 推荐软件

- **VS Code**: 推荐的代码编辑器
- **Chrome/Edge**: 用于调试和 E2E 测试
- **Docker**: 用于数据库和服务容器 (可选)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <项目地址>
cd spider-mind-v2
```

### 2. 自动环境设置

运行自动设置脚本（推荐）:

```bash
# 运行开发环境设置脚本
yarn dev:setup
```

这个脚本会自动：

- 检查系统依赖
- 安装项目依赖
- 配置环境变量
- 设置 Git hooks
- 安装 Playwright 浏览器
- 验证环境配置

### 3. 启动开发服务器

```bash
# 启动开发服务器
yarn dev

# 或使用 Turbo 模式 (更快的开发体验)
yarn dev:turbo
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🔧 手动环境设置

如果自动设置遇到问题，可以按以下步骤手动设置：

### 1. 安装 Node.js

#### macOS

```bash
# 使用 Homebrew
brew install node

# 或下载安装包
# https://nodejs.org/
```

#### Windows

```bash
# 使用 Chocolatey
choco install nodejs

# 或使用 Winget
winget install OpenJS.NodeJS

# 或下载安装包
# https://nodejs.org/
```

#### Linux (Ubuntu/Debian)

```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用 snap
sudo snap install node --classic
```

### 2. 安装 Yarn

```bash
# 通过 npm 全局安装
npm install -g yarn

# 验证安装
yarn --version
```

### 3. 安装项目依赖

```bash
# 安装 Node.js 依赖
yarn install

# 安装 Playwright 浏览器
yarn test:e2e:install
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.local.example .env.local

# 编辑环境变量文件
# 填写必要的配置项
```

#### 环境变量说明

在 `.env.local` 文件中配置以下变量：

```bash
# Supabase 配置 (如果使用)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 其他配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 5. 设置 Git Hooks

```bash
# 安装 Husky Git hooks
yarn prepare
```

## 🛠️ 开发工具配置

### VS Code 设置

#### 推荐插件

在项目根目录创建 `.vscode/extensions.json` 文件:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

#### VS Code 设置

创建 `.vscode/settings.json` 文件:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

### 浏览器开发工具

#### Chrome 扩展推荐

- **React Developer Tools**: 用于调试 React 组件
- **Redux DevTools**: 用于状态管理调试 (如果使用 Redux)

#### Firefox 扩展推荐

- **React Developer Tools**
- **Web Developer**

## 🧪 验证环境设置

### 运行检查命令

```bash
# 检查开发环境
yarn dev:check

# 运行类型检查
yarn type-check

# 运行代码检查
yarn lint

# 运行单元测试
yarn test

# 运行 E2E 测试
yarn test:e2e
```

### 验证清单

确保以下各项都能正常工作：

- [ ] `yarn dev` 启动开发服务器
- [ ] `yarn build` 成功构建项目
- [ ] `yarn lint` 无错误
- [ ] `yarn type-check` 无类型错误
- [ ] `yarn test` 测试通过
- [ ] `yarn test:e2e` E2E 测试通过
- [ ] Git 提交时自动运行代码检查

## 🎯 常用开发命令

### 开发和构建

```bash
yarn dev              # 启动开发服务器
yarn dev:turbo        # 使用 Turbo 模式启动
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
```

### 测试

```bash
yarn test             # 运行所有测试
yarn test:watch       # 监听模式运行测试
yarn test:coverage    # 生成测试覆盖率报告
yarn test:unit        # 仅运行单元测试
yarn test:e2e         # 运行 E2E 测试
yarn test:e2e:ui      # E2E 测试 UI 模式
yarn test:e2e:debug   # 调试 E2E 测试
```

### 工具和维护

```bash
yarn clean            # 清理构建产物
yarn clean:deps       # 重新安装依赖
yarn validate         # 运行完整代码验证
yarn validate:full    # 包含 E2E 测试的完整验证
```

## 🐛 常见问题解决

### Node.js 版本问题

**问题**: `node: --openssl-legacy-provider is not allowed in NODE_OPTIONS`

**解决方案**:

```bash
# 更新到 Node.js 18+ 版本
nvm install 18
nvm use 18

# 或清除 NODE_OPTIONS
unset NODE_OPTIONS
```

### 依赖安装问题

**问题**: `yarn install` 失败或依赖冲突

**解决方案**:

```bash
# 清理缓存
yarn cache clean

# 删除 node_modules 和 lockfile
rm -rf node_modules yarn.lock

# 重新安装
yarn install
```

### 端口占用问题

**问题**: 端口 3000 被占用

**解决方案**:

```bash
# 查找占用端口的进程
lsof -ti:3000

# 杀死进程 (替换 PID)
kill -9 <PID>

# 或使用不同端口
yarn dev -- -p 3001
```

### Playwright 问题

**问题**: Playwright 浏览器下载失败

**解决方案**:

```bash
# 手动安装浏览器
npx playwright install

# 或仅安装需要的浏览器
npx playwright install chromium
```

### 权限问题 (macOS/Linux)

**问题**: 脚本没有执行权限

**解决方案**:

```bash
# 给脚本添加执行权限
chmod +x scripts/*.sh

# 或直接运行
bash scripts/dev-setup.sh
```

### TypeScript 问题

**问题**: TypeScript 编译错误或类型定义缺失

**解决方案**:

```bash
# 重新生成 tsconfig.tsbuildinfo
rm tsconfig.tsbuildinfo

# 重启 TypeScript 服务 (VS Code)
# Cmd/Ctrl + Shift + P -> TypeScript: Restart TS Server

# 检查类型定义
yarn type-check
```

## 💡 开发技巧

### 快速重启

创建别名简化常用命令:

```bash
# 在 ~/.bashrc 或 ~/.zshrc 中添加
alias ydev="yarn dev"
alias ytest="yarn test:watch"
alias ylint="yarn lint:fix"
```

### 调试技巧

1. **使用 VS Code 调试器**:
   - 设置断点
   - F5 启动调试
   - 查看变量和调用栈

2. **浏览器调试**:
   - 使用 `debugger` 语句
   - Chrome DevTools
   - React Developer Tools

3. **测试调试**:

   ```bash
   # 调试单元测试
   yarn test --detectOpenHandles

   # 调试 E2E 测试
   yarn test:e2e:debug
   ```

### 性能优化

1. **构建分析**:

   ```bash
   yarn build:analyze
   ```

2. **依赖分析**:
   ```bash
   npx depcheck                  # 检查未使用的依赖
   npx bundle-analyzer          # 分析包大小
   ```

## 🤝 贡献代码

### 提交代码前

确保运行以下检查:

```bash
# 完整验证 (推荐)
yarn validate:full

# 快速验证 (不包含 E2E 测试)
yarn validate
```

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 提交代码 (会自动运行 lint-staged)
git add .
git commit -m "feat: your feature description"

# 推送到远程仓库
git push origin feature/your-feature-name
```

## 📚 进一步学习

### 文档资源

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Jest 文档](https://jestjs.io/docs/)
- [Playwright 文档](https://playwright.dev/docs/)

### 项目相关文档

- [项目结构说明](./project-structure.md)
- [代码规范文档](./coding-standards.md)

---

如果遇到本指南未涵盖的问题，请查看项目 issues 或创建新的 issue 寻求帮助。
