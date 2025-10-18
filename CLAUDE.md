- 没有我的明确指令，不要自动提交代码

# 项目结构

## 文档组织

- `docs/design/draft/` - 设计文档草稿，讨论中的设计方案
- `docs/design/` - 已确认的设计文档
- `.claude_summary/` - Claude 工作过程中的临时总结文档

## 核心模块

### 思维导图编辑器

- `lib/store/mindmap-editor.store.ts` - Zustand 状态管理
- `components/mindmap/` - 思维导图 UI 组件
- `lib/hooks/use-mindmap-data.ts` - 数据初始化 Hook

### 持久化系统 (设计中)

- `lib/db/schema.ts` - IndexedDB 数据库模式
- `lib/store/middleware/persistence.middleware.ts` - 持久化中间件
- `lib/sync/sync-manager.ts` - 云端同步管理器

# 常用命令

## 开发

- `yarn dev` - 启动开发服务器
- `yarn build` - 构建生产版本
- `yarn lint` - 代码检查

## 测试

- `yarn test` - 运行所有测试
- `yarn test:e2e` - 运行 E2E 测试
- `npx playwright test` - 运行 Playwright 测试

## 数据库

- `yarn db:status` - 查看数据库迁移状态
- 数据库相关操作需要配置 Supabase 环境变量

# 测试规范

## E2E 测试

- **统一使用 `data-testid` 查找 DOM 节点**，不要使用 `getByLabel`、`getByRole` 等其他选择器
- 所有被测试的元素必须添加 `data-testid` 属性
- test-id 命名规范：
  - 表单元素：`{form-name}-{field-name}-input`，如 `login-email-input`
  - 按钮：`{action}-button`，如 `login-submit-button`、`signout-button`
  - 页面容器：`{page-name}-{element-type}`，如 `dashboard-content`、`login-page`
  - 导航元素：`navbar-{element-name}`，如 `navbar-logo`
  - 卡片/组件：`{component-name}-{identifier}`，如 `dashboard-card-quickstart`
