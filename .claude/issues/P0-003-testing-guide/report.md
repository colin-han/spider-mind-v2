# 问题报告: 测试规范严重不符

## 基本信息

- **优先级**: P0 (Critical - 必须立即修复)
- **报告日期**: 2025-11-06
- **相关文档**: docs/standard/testing-guide.md
- **问题类型**: 缺失项 + 偏差项
- **当前规范遵守度**: 35%

## 问题描述

测试规范文档与实际代码实现存在严重不一致。虽然测试框架配置完善（Playwright、Jest、Mock），但实际测试代码严重缺失，测试覆盖率未启用，违反了文档中定义的多项规范。

## 详细问题清单

### 1. 测试覆盖率未启用 (P0)

**文档要求**:

- 全局覆盖率阈值: 70-85%
- 关键模块覆盖率阈值: 95%

**当前状态**:

- `jest.config.js` 中 `collectCoverage: false`
- 无覆盖率阈值设置
- 无法追踪测试覆盖率

**影响文件**:

- `jest.config.js` (第 31 行)

**修复建议**:

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true, // 改为 true
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    "./lib/utils/id.ts": {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
```

**预计工时**: 1小时（配置 + 验证）

---

### 2. data-testid 命名不规范 (P0)

**文档要求**:

- 表单元素: `{form-name}-{field-name}-input`
- 按钮: `{action}-button`
- 页面容器: `{page-name}-{element-type}`
- 导航元素: `navbar-{element-name}`

**当前状态**:

- 8处不合规命名需要修复:
  1. `conflict-dialog` → `mindmap-conflict-dialog`
  2. `drop-indicator` → `mindmap-drop-indicator`
  3. `outline-panel` → `mindmap-outline-panel`
  4. `node-panel` → `mindmap-node-panel`
  5. `resizable-panel` → `mindmap-resizable-panel`
  6. `mindmap-canvas` → `mindmap-editor-canvas`
  7. `save-status` → `mindmap-save-status`
  8. `outline-tree` → `mindmap-outline-tree`

**影响文件**:

- `components/mindmap/conflict-dialog.tsx`
- `components/mindmap/drop-indicator.tsx`
- `components/mindmap/outline-panel.tsx`
- `components/mindmap/node-panel.tsx`
- `components/mindmap/resizable-panel.tsx`
- `components/mindmap/mindmap-editor-container.tsx`
- `components/mindmap/save-status-indicator.tsx`
- `components/mindmap/mindmap-outline-arborist.tsx`

**修复建议**:
统一使用 `mindmap-` 前缀，明确表示所属模块。

**预计工时**: 4小时（重命名 + 更新测试 + 验证）

---

### 3. 关键模块无单元测试 (P0)

**文档要求**:

- `lib/utils/id.ts` 应有完整的单元测试
- 覆盖率目标: 95%+

**当前状态**:

- `lib/utils/id.test.ts` 不存在
- 覆盖率: 0%

**影响文件**:

- `lib/utils/id.ts` (需要测试)

**修复建议**:
创建 `lib/utils/id.test.ts`，测试以下功能：

- `generateShortId()` - 生成6字符 base36 ID
- `isValidShortId()` - 验证 ID 格式
- ID 冲突重试机制
- 边界情况测试

**预计工时**: 4小时

---

### 4. Store 单元测试缺失 (P1)

**文档要求**:

- Store 应有完整的单元测试

**当前状态**:

- `lib/store/mindmap-editor.store.ts` 无对应的测试文件

**影响文件**:

- `lib/store/mindmap-editor.store.ts` (需要测试)

**修复建议**:
创建 `lib/store/mindmap-editor.store.test.ts`，测试：

- 状态初始化
- Action 执行
- 中间件逻辑
- 选择器函数

**预计工时**: 8小时

---

### 5. React 组件单元测试缺失 (P1)

**文档要求**:

- 所有 React 组件应有对应的 `.test.tsx` 文件

**当前状态**:

- 28个组件，0个测试文件

**影响文件**:

- `components/**/*.tsx` (所有组件)

**修复建议**:
优先为核心组件添加测试：

1. `Button.tsx`
2. `Input.tsx`
3. `MindmapOutlineArborist.tsx`
4. `NodePanel.tsx`
5. `SaveStatusIndicator.tsx`

**预计工时**: 8小时（5个核心组件）

---

### 6. E2E 测试覆盖不足 (P1)

**文档要求**:

- E2E 测试应覆盖主要用户流程

**当前状态**:

- 仅 `auth.spec.ts` 存在
- 缺少思维导图编辑、协作、导出等核心流程测试

**影响文件**:

- `tests/e2e/` (需要新增测试)

**修复建议**:
新增 E2E 测试：

1. `mindmap-crud.spec.ts` - 创建、编辑、删除思维导图
2. `mindmap-nodes.spec.ts` - 节点操作（添加、删除、移动）
3. `mindmap-outline.spec.ts` - 大纲视图交互
4. `mindmap-collaboration.spec.ts` - 多人协作场景

**预计工时**: 12小时

---

### 7. 集成测试完全缺失 (P2)

**文档要求**:

- 应有 API、数据库、中间件的集成测试

**当前状态**:

- 无任何集成测试文件

**影响文件**:

- 无（需要创建）

**修复建议**:
创建集成测试：

1. `lib/actions/__tests__/` - Server Actions 测试
2. `lib/db/__tests__/` - 数据库操作测试
3. `middleware/__tests__/` - 中间件测试

**预计工时**: 16小时

---

### 8. 测试数据工厂不存在 (P2)

**文档要求**:

- 应有 `__fixtures__/factories.ts` 提供测试数据生成

**当前状态**:

- 文件不存在

**影响文件**:

- 无（需要创建）

**修复建议**:
创建 `__fixtures__/factories.ts`：

```typescript
export const userFactory = (overrides = {}) => ({
  id: crypto.randomUUID(),
  email: "test@example.com",
  username: "testuser",
  ...overrides,
});

export const mindmapFactory = (overrides = {}) => ({
  id: crypto.randomUUID(),
  short_id: "abc123",
  title: "Test Mindmap",
  user_id: crypto.randomUUID(),
  ...overrides,
});

export const nodeFactory = (overrides = {}) => ({
  id: crypto.randomUUID(),
  short_id: "xyz789",
  mindmap_id: crypto.randomUUID(),
  title: "Test Node",
  ...overrides,
});
```

**预计工时**: 4小时

---

### 9. CI/CD 测试未配置 (P2)

**文档要求**:

- GitHub Actions 应自动运行测试

**当前状态**:

- `.github/workflows/test.yml` 不存在

**影响文件**:

- 无（需要创建）

**修复建议**:
创建 `.github/workflows/test.yml`：

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test
      - run: yarn test:e2e
```

**预计工时**: 4小时

---

## 可能影响

### 功能影响

- 代码质量无法保证，可能引入 bug
- 重构风险高，缺少测试保护网
- 关键模块（如 ID 生成）出现问题时难以发现

### 性能影响

- 无法及时发现性能回归
- 缺少性能基准测试

### 兼容性影响

- 浏览器兼容性问题无法及早发现
- 跨平台问题无法自动检测

### 开发效率影响

- 手动测试耗时，开发效率低
- 缺少回归测试，修复一个问题可能引入新问题
- 代码审查缺少测试覆盖率参考

## 修复建议

### 方案一：分阶段修复（推荐）

**第一阶段 (本周) - P0 问题**:

1. 启用 Jest 覆盖率检查 (1小时)
2. 修复 data-testid 命名不规范 (4小时)
3. 为 `lib/utils/id.ts` 添加单元测试 (4小时)

**预计工时**: 9小时

**第二阶段 (下周) - P1 问题**:

1. 添加 Store 单元测试 (8小时)
2. 为核心组件添加单元测试 (8小时)
3. 扩展 E2E 测试覆盖 (12小时)

**预计工时**: 28小时

**第三阶段 (本月) - P2 问题**:

1. 添加集成测试 (16小时)
2. 创建测试数据工厂 (4小时)
3. 配置 CI/CD (4小时)

**预计工时**: 24小时

**总工时**: 约61小时 (~2周)

### 方案二：最小修复

仅修复 P0 问题，确保核心功能有测试覆盖：

1. 启用覆盖率检查
2. 修复 data-testid 命名
3. 添加关键模块测试

**预计工时**: 9小时

## 风险评估

- **不修复的风险**: 🔴 高
  - 代码质量无法保证
  - 重构困难
  - 容易引入 bug

- **修复的风险**: 🟢 低
  - 需要投入时间
  - 可能发现现有代码的问题（但这是好事）

## 建议优先级

1. 🔴 **立即修复** (P0): 启用覆盖率、修复命名、添加关键模块测试
2. 🟡 **本周修复** (P1): Store 测试、组件测试、E2E 测试
3. 🟢 **本月修复** (P2): 集成测试、数据工厂、CI/CD

## 相关文档

- 详细验证报告: `.claude/logs/testing-specification-verification.md`
- 快速总结: `.claude/logs/TESTING-VERIFICATION-SUMMARY.md`
- 测试规范文档: `docs/standard/testing-guide.md`
