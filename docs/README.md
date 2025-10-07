# Spider Mind v2 文档中心

欢迎来到 Spider Mind v2 项目文档中心。本文档体系为开发团队提供完整的技术指南、设计规范和开发标准。

## 📚 文档导航

### 🚀 快速开始

如果你是新加入的团队成员，建议按以下顺序阅读：

1. **[开发环境搭建](./setup/development-setup.md)** - 配置本地开发环境
2. **[项目结构说明](./standard/project-structure.md)** - 了解项目组织方式
3. **[编码规范](./standard/coding-standards.md)** - 掌握代码规范要求
4. **[测试指南](./standard/testing-guide.md)** - 了解测试策略和实践

### 📂 文档分类

#### [设计文档](./design/) (design/)
系统设计和架构文档，包含核心功能的设计决策和实现方案。

**核心设计**:
- [ID 设计规范](./design/id-design.md) - 系统 ID 生成和管理机制
- [思维导图编辑器 Store 设计](./design/mindmap-editor-store-design.md) - 编辑器状态管理
- [IndexedDB 持久化中间件设计](./design/indexeddb-persistence-middleware-design.md) - 本地数据持久化

**查看完整列表**: [设计文档索引](./design/INDEX.md)

#### [规范文档](./standard/) (standard/)
项目规范和标准，确保代码质量和一致性。

- [编码规范](./standard/coding-standards.md) - TypeScript 编码标准
- [项目结构](./standard/project-structure.md) - 目录结构和模块组织
- [测试指南](./standard/testing-guide.md) - 测试策略和最佳实践

#### [环境配置](./setup/) (setup/)
开发和部署环境的配置指南。

- [开发环境搭建](./setup/development-setup.md) - 本地开发环境配置
- [Supabase 本地配置](./setup/supabase-local-setup.md) - 数据库服务配置

**查看详情**: [配置指南索引](./setup/README.md)

#### [草稿文档](./draft/) (draft/)
正在编写或待审核的设计草稿。

- [思维导图持久化需求](./draft/mindmap-persistence-requirements.md) - 持久化功能需求分析

## 🔍 文档查找

### 按功能模块

| 模块 | 相关文档 |
|------|---------|
| **ID 机制** | [ID 设计规范](./design/id-design.md) |
| **状态管理** | [Store 设计](./design/mindmap-editor-store-design.md) |
| **数据持久化** | [IndexedDB 中间件](./design/indexeddb-persistence-middleware-design.md)、[持久化需求](./draft/mindmap-persistence-requirements.md) |
| **开发环境** | [环境搭建](./setup/development-setup.md)、[Supabase 配置](./setup/supabase-local-setup.md) |
| **代码质量** | [编码规范](./standard/coding-standards.md)、[测试指南](./standard/testing-guide.md) |

### 按使用场景

| 场景 | 推荐阅读 |
|------|---------|
| **新功能设计** | 1. 相关设计文档 → 2. 编码规范 → 3. 测试指南 |
| **Bug 修复** | 1. 相关设计文档 → 2. 测试指南 |
| **代码重构** | 1. 项目结构 → 2. 编码规范 → 3. 相关设计文档 |
| **性能优化** | 1. 相关设计文档 → 2. 测试指南（性能测试部分） |

## 📝 文档规范

### 文档命名

- 使用 kebab-case 命名（如 `id-design.md`）
- 名称应清晰描述文档内容
- 避免使用缩写和简写

### 文档结构

每个设计文档应包含：
- **元信息**: 版本、日期、作者
- **概述**: 简要说明文档目的
- **关键概念**: 定义新引入的概念
- **详细设计**: 核心内容
- **示例**: 使用示例（精简）
- **参考**: 相关文档链接

### 文档维护

- 定期更新文档以反映最新实现
- 使用版本历史记录重要变更
- 保持文档间引用的准确性

## 🔄 文档更新流程

1. **草稿阶段**: 新设计先放入 `draft/` 目录
2. **验证阶段**: 使用文档验证工具检查一致性
3. **确认阶段**: 审核通过后移至相应正式目录
4. **维护阶段**: 根据实现变化及时更新

## 🛠️ 文档工具

项目提供以下文档管理工具：

- `/doc-draft-verify` - 验证草稿与现有设计的一致性
- `/doc-verify` - 验证文档与代码实现的一致性
- `/doc-refactor` - 分析并优化文档结构
- `/doc-refactor-structure` - 分析整体文档体系结构

## 📊 文档统计

- **文档总数**: 8 个
- **设计文档**: 3 个
- **规范文档**: 3 个
- **配置文档**: 2 个
- **最近更新**: 2025-01-07

## 🤝 贡献指南

### 添加新文档

1. 确定文档类型和分类
2. 在相应目录创建文档
3. 遵循文档模板和规范
4. 更新相关索引文件
5. 添加到本 README 的导航中

### 更新现有文档

1. 更新文档内容
2. 更新版本历史
3. 检查并更新相关引用
4. 运行文档验证工具

## 📮 反馈与支持

如有文档相关问题或建议，请：
- 创建 Issue 讨论
- 提交 Pull Request 改进
- 联系文档维护者

---

**最后更新**: 2025-01-07
**维护者**: Claude Code