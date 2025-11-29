# 重点指令

- 没有我的明确指令，不要自动提交代码
- `docs/standard/` 目录下的文档，是项目开发规范，必须严格遵守
- `docs/design/` 目录下的文档，是项目设计文档，必须确保实现与其中的文档一致。增加新功能时，如果发现和这里的文档不一致的地方，需要提醒开发人员更新相关文档。
- `docs/design/INDEX.md`是设计文档的索引文件，做设计时，可以通过这个文件找到相关参考设计。
- 每次任务完成后都需要检查修改的代码，确保没有违反开发规范，没有违反设计文档。
- `docs/standard/design-doc-guide.md`是设计文档的编写规范，需要编写正式的的设计文档时（在`docs/design/`目录下），必须按照这个指导文件来书写。

# 开发流程

- 一般情况下，我给出需求后，你需要先分析需求，生成相应的需求描述文档（放在`.claude/logs/`目录下，文件名以`YYYY-MM-DD-Req-<功能名称>.md`命名），等待我确认后，再开始下一步。 细节要求参见[需求分析阶段要求](#需求分析阶段要求)。
- 如果需求描述文件得到我的确认后，你需要开始编写技术实现设计文档（放在`.claude/logs/`目录下，文件名以`YYYY-MM-DD-Design-<功能名称>.md`命名），该文档需要包含具体的实现计划（阶段划分、每个阶段的实现内容、每个阶段的预期效果等），等待我确认后，再开始下一步。细节要求参见[技术实现设计文档阶段要求](#技术实现设计文档阶段要求)。
- 如果设计文档得到我的确认后，你需要开始实现代码。
- 完成代码后，运行`volta run yarn lint && volta run yarn type-check`确保代码没有问题。然后进行必要的测试，确保代码的正确性。并等待我手工测试确认功能完整。
- 如果功能得到我的确认后，你需要先检查修改的代码，确保没有违反开发规范，没有违反设计文档。并移除所有未必要的代码。
- 然后你需要开始编写正式的设计文档（放在`docs/design/`目录下，文件名以`<功能名称>.md`命名），等待我确认后，再开始下一步。
- 如果设计文档得到我的确认后，你需要更新`docs/design/INDEX.md`文件，将新设计文档添加到索引文件中。
- 将过程中生成的临时文件（放在`.claude/logs/`目录下）移动到`.claude/logs/archived/<功能名称>`目录下。
- 运行`volta run yarn lint && volta run yarn type-check`确保代码没有问题。
- 再次扫描所有更改，确保没有遗留的无效代码。
- 注意：不要提交代码

## 需求分析阶段要求

- 所有需求分析应从用户视角描述，避免牵扯到技术实现细节。

## 技术实现设计文档阶段要求

- `docs/design/INDEX.md`是设计文档的索引文件，做设计时，可以通过这个文件找到相关参考设计。
- `docs/design/`目录下的文档，是已经确认和实现了的项目设计文档，必须确保新设计与其中的文档一致。如果确实需要对其进行修改的，在设计文档中需要包含明确的冲突声明，等待我进行确认。

# 项目结构

## 文档组织

- `docs/draft/` - 设计文档草稿，讨论中的设计方案
- `docs/design/` - 已确认的设计文档
- `docs/standard/` - 项目开发规范
- `docs/setup/` - 项目初始化设置
- `docs/obsolete❌/` - 已废弃的文档
- `.claude/logs/` - Claude 工作过程中的临时总结文档

## 核心模块

### 思维导图编辑器

- `src/domain/mindmap-store.ts` - Zustand 状态管理
- `src/components/mindmap/` - 思维导图 UI 组件
- `src/lib/hooks/` - React Hooks

### 持久化系统

- `src/lib/db/schema.ts` - IndexedDB 数据库模式
- `src/lib/sync/sync-manager.ts` - 云端同步管理器

# 常用命令

## 开发

- `yarn dev` - 启动开发服务器
- `yarn build` - 构建生产版本
- `yarn lint` - 代码检查
- `yarn type-check` - 类型检查

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
