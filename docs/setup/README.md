# 环境配置指南

本目录包含所有开发、测试和生产环境的配置文档，帮助团队快速搭建和维护各种环境。

## 📋 配置文档列表

| 文档 | 描述 | 适用环境 | 优先级 |
|------|------|---------|--------|
| [开发环境搭建](./development-setup.md) | 本地开发环境完整配置指南 | 开发环境 | 🔴 必需 |
| [Supabase 本地配置](./supabase-local-setup.md) | Supabase 数据库服务本地配置 | 开发/测试 | 🟡 推荐 |

## 🚀 快速开始

### 新成员入门流程

```mermaid
graph LR
    A[1. 阅读开发环境搭建] --> B[2. 执行自动配置脚本]
    B --> C[3. 配置 Supabase<br/>可选]
    C --> D[4. 验证环境]
    D --> E[开始开发]
```

### 最简配置（5分钟）

如果你想快速开始，执行以下步骤：

```bash
# 1. 克隆项目
git clone <项目地址>
cd spider-mind-v2

# 2. 运行自动配置
yarn dev:setup

# 3. 启动开发服务器
yarn dev
```

详细说明请查看 [开发环境搭建](./development-setup.md)。

## 🔧 环境类型

### 开发环境 (Development)

**用途**: 日常开发和调试

**必需组件**:
- Node.js (>= 18.0.0)
- Yarn (>= 1.22.0)
- Git

**可选组件**:
- Docker (用于容器化服务)
- Supabase CLI (用于本地数据库)

**相关文档**:
- [开发环境搭建](./development-setup.md) - 完整配置指南
- [Supabase 本地配置](./supabase-local-setup.md) - 数据库配置

### 测试环境 (Testing)

**用途**: 自动化测试和 CI/CD

**必需组件**:
- 所有开发环境组件
- Playwright 浏览器
- 测试数据库

**配置要点**:
```bash
# 安装测试依赖
yarn test:e2e:install

# 配置测试环境变量
cp .env.test.example .env.test
```

### 生产环境 (Production)

**用途**: 线上服务部署

**部署平台**: (待定)
- Vercel / Netlify (前端)
- Supabase Cloud (数据库)

**配置文档**: *待创建*

## 📦 核心依赖版本

### 运行时环境

| 依赖 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| Node.js | 18.0.0 | 20.x LTS | JavaScript 运行时 |
| Yarn | 1.22.0 | 1.22.x | 包管理器 |
| Git | 2.20.0 | 最新版 | 版本控制 |

### 开发工具

| 工具 | 推荐版本 | 必需性 | 用途 |
|------|---------|--------|------|
| VS Code | 最新版 | 推荐 | 代码编辑器 |
| Chrome/Edge | 最新版 | 推荐 | 调试浏览器 |
| Docker | 最新版 | 可选 | 容器化服务 |
| Supabase CLI | 最新版 | 可选 | 本地数据库 |

## 🔍 环境变量说明

### 必需的环境变量

```bash
# .env.local
NODE_ENV=development                    # 环境类型
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 应用 URL
```

### Supabase 相关（使用 Supabase 时必需）

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # 仅服务端
```

### 其他可选配置

```bash
# 分析和监控
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id

# 功能开关
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## 🛠️ 配置脚本

项目提供了一系列自动化脚本简化配置：

| 脚本 | 命令 | 功能 |
|------|------|------|
| 自动设置 | `yarn dev:setup` | 一键配置开发环境 |
| 环境检查 | `yarn dev:check` | 验证环境配置 |
| 清理环境 | `yarn clean:deps` | 清理并重装依赖 |
| 数据库设置 | `yarn db:setup` | 配置本地数据库 |

## 🐛 常见配置问题

### 1. Node.js 版本问题

**症状**: `node: --openssl-legacy-provider is not allowed`

**解决方案**:
```bash
# 使用 nvm 切换版本
nvm install 18
nvm use 18

# 或使用 volta
volta install node@18
```

### 2. 依赖安装失败

**症状**: `yarn install` 报错

**解决方案**:
```bash
# 清理缓存
yarn cache clean

# 删除依赖
rm -rf node_modules yarn.lock

# 重新安装
yarn install
```

### 3. Supabase 连接失败

**症状**: 无法连接到 Supabase

**解决方案**:
- 检查环境变量配置
- 确认 Supabase 项目状态
- 查看 [Supabase 配置指南](./supabase-local-setup.md)

### 4. 端口占用

**症状**: 端口 3000 被占用

**解决方案**:
```bash
# 查找占用进程
lsof -ti:3000

# 使用其他端口
yarn dev -- -p 3001
```

## 📝 配置检查清单

### 开发环境就绪检查

- [ ] Node.js 版本 >= 18.0.0
- [ ] Yarn 已安装
- [ ] Git 已配置
- [ ] 项目依赖安装成功
- [ ] 环境变量配置完成
- [ ] 开发服务器能正常启动
- [ ] 测试命令能正常运行
- [ ] Git hooks 已激活

### Supabase 配置检查（可选）

- [ ] Supabase CLI 已安装
- [ ] 本地 Supabase 实例运行中
- [ ] 数据库迁移已执行
- [ ] 能成功连接数据库

## 🔄 环境维护

### 定期维护任务

1. **每周**: 更新项目依赖
   ```bash
   yarn upgrade-interactive
   ```

2. **每月**: 清理缓存和临时文件
   ```bash
   yarn clean
   ```

3. **每季度**: 检查并更新 Node.js 版本

### 依赖更新策略

- **补丁版本**: 自动更新
- **次版本**: 测试后更新
- **主版本**: 团队评估后更新

## 📚 相关文档

- [项目结构说明](../standard/project-structure.md)
- [编码规范](../standard/coding-standards.md)
- [测试指南](../standard/testing-guide.md)
- [设计文档索引](../design/INDEX.md)

## 🆘 获取帮助

遇到配置问题时：

1. 查看对应配置文档的故障排查部分
2. 搜索项目 Issues
3. 创建新 Issue 寻求帮助
4. 联系团队成员

---

**最后更新**: 2025-01-07
**维护者**: Claude Code