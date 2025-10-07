# 测试指南

**版本**: v1.0
**创建日期**: 2025-01-07
**最后更新**: 2025-01-07

---

## 1. 概述

本指南定义 Spider Mind v2 项目的测试策略、标准和最佳实践，确保代码质量和系统可靠性。

## 2. 测试原则

### 2.1 核心原则

- **测试优先**: 编写代码前先考虑如何测试
- **全面覆盖**: 单元测试、集成测试、E2E测试相结合
- **快速反馈**: 测试应快速执行，提供即时反馈
- **可维护性**: 测试代码应易于理解和维护
- **独立性**: 每个测试应独立运行，不依赖其他测试

### 2.2 测试金字塔

```
       /\
      /E2E\      少量关键用户流程测试
     /------\
    /集成测试\    API和组件集成测试
   /----------\
  /  单元测试   \  大量底层逻辑测试
 /--------------\
```

## 3. 测试类型

### 3.1 单元测试 (Unit Tests)

**目标**: 测试单个函数、类或组件的独立功能

**覆盖范围**:
- 工具函数和纯函数
- React 组件的渲染和交互
- Store actions 和 reducers
- 自定义 Hooks

**工具栈**:
- Jest - 测试框架
- React Testing Library - 组件测试
- MSW - Mock API 请求

**示例**:

```typescript
// src/utils/id.test.ts
import { generateShortId, validateShortId } from './id';

describe('ID 工具函数', () => {
  describe('generateShortId', () => {
    it('应生成10个字符的短ID', () => {
      const id = generateShortId();
      expect(id).toHaveLength(10);
    });

    it('应只包含小写字母和数字', () => {
      const id = generateShortId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('validateShortId', () => {
    it('应接受有效的短ID', () => {
      expect(validateShortId('abc123def0')).toBe(true);
    });

    it('应拒绝无效的短ID', () => {
      expect(validateShortId('ABC123')).toBe(false); // 大写字母
      expect(validateShortId('abc')).toBe(false);    // 太短
    });
  });
});
```

### 3.2 集成测试 (Integration Tests)

**目标**: 测试多个模块之间的交互

**覆盖范围**:
- API 端点测试
- 数据库操作测试
- 组件与状态管理的集成
- 中间件功能

**示例**:

```typescript
// src/api/mindmap.integration.test.ts
describe('Mindmap API 集成测试', () => {
  it('应成功创建并获取思维导图', async () => {
    // 创建思维导图
    const createResponse = await request(app)
      .post('/api/mindmaps')
      .send({ title: '测试导图' });

    expect(createResponse.status).toBe(201);
    const { id } = createResponse.body;

    // 获取创建的导图
    const getResponse = await request(app)
      .get(`/api/mindmaps/${id}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.title).toBe('测试导图');
  });
});
```

### 3.3 E2E 测试 (End-to-End Tests)

**目标**: 从用户角度测试完整的功能流程

**覆盖范围**:
- 关键用户路径 (登录、注册、核心功能)
- 跨页面的工作流
- 真实浏览器环境下的交互

**工具**: Playwright

**命名规范**:
- 统一使用 `data-testid` 定位元素
- testid 命名格式:
  - 表单: `{form-name}-{field-name}-input`
  - 按钮: `{action}-button`
  - 页面元素: `{page-name}-{element}`

**示例**:

```typescript
// e2e/mindmap-editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('思维导图编辑器', () => {
  test('应能创建和编辑节点', async ({ page }) => {
    // 导航到编辑器
    await page.goto('/editor');

    // 创建新节点
    await page.getByTestId('add-node-button').click();
    await page.getByTestId('node-title-input').fill('新节点');
    await page.getByTestId('save-node-button').click();

    // 验证节点已创建
    const node = page.getByTestId('mindmap-node-0');
    await expect(node).toContainText('新节点');

    // 编辑节点
    await node.dblclick();
    await page.getByTestId('node-title-input').fill('修改后的节点');
    await page.getByTestId('save-node-button').click();

    // 验证修改
    await expect(node).toContainText('修改后的节点');
  });
});
```

## 4. 测试标准

### 4.1 测试覆盖率要求

| 类型 | 最低覆盖率 | 目标覆盖率 |
|------|-----------|-----------|
| 语句覆盖 | 70% | 85% |
| 分支覆盖 | 60% | 75% |
| 函数覆盖 | 70% | 85% |
| 行覆盖 | 70% | 85% |

**关键模块要求更高覆盖率**:
- ID 生成和验证: > 95%
- 数据持久化中间件: > 90%
- Store actions: > 85%

### 4.2 测试命名规范

使用描述性的测试名称，遵循 "应该...当..." 的格式:

```typescript
describe('组件/模块名', () => {
  describe('方法/功能名', () => {
    it('应该返回正确结果当输入有效时', () => {
      // 测试实现
    });

    it('应该抛出错误当输入无效时', () => {
      // 测试实现
    });
  });
});
```

### 4.3 测试组织结构

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx        # 单元测试与源码同目录
├── utils/
│   ├── id.ts
│   └── id.test.ts
└── __tests__/                  # 集成测试
    └── api/
        └── mindmap.test.ts

e2e/                            # E2E 测试独立目录
├── auth.spec.ts
└── mindmap-editor.spec.ts
```

## 5. Mock 策略

### 5.1 Mock 原则

- **最小化 Mock**: 只 Mock 必要的外部依赖
- **真实性**: Mock 应尽可能接近真实行为
- **可维护**: Mock 数据集中管理

### 5.2 Mock 实践

```typescript
// src/__mocks__/supabase.ts
export const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    update: jest.fn().mockResolvedValue({ data: {}, error: null }),
    delete: jest.fn().mockResolvedValue({ data: {}, error: null })
  }))
};

// 测试中使用
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}));
```

## 6. 测试数据管理

### 6.1 测试数据原则

- **独立性**: 每个测试创建自己的测试数据
- **清理**: 测试后清理创建的数据
- **工厂模式**: 使用工厂函数生成测试数据

### 6.2 测试数据工厂

```typescript
// src/__fixtures__/factories.ts
import { faker } from '@faker-js/faker';

export function createMindmap(overrides = {}) {
  return {
    id: faker.string.uuid(),
    short_id: faker.string.alphanumeric(10).toLowerCase(),
    title: faker.lorem.words(3),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
    ...overrides
  };
}

export function createNode(overrides = {}) {
  return {
    id: faker.string.uuid(),
    short_id: faker.string.alphanumeric(10).toLowerCase(),
    content: faker.lorem.sentence(),
    node_type: 'normal',
    order_index: 0,
    ...overrides
  };
}
```

## 7. 测试执行

### 7.1 本地测试命令

```bash
# 运行所有测试
yarn test

# 运行单元测试（监听模式）
yarn test:watch

# 运行测试覆盖率
yarn test:coverage

# 运行 E2E 测试
yarn test:e2e

# E2E 测试调试模式
yarn test:e2e:debug

# E2E 测试 UI 模式
yarn test:e2e:ui
```

### 7.2 CI/CD 集成

所有测试应在 CI 管道中自动执行:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn test:coverage
      - run: yarn test:e2e
```

## 8. 测试最佳实践

### 8.1 DO - 应该做的

✅ **编写可读的测试**
- 使用描述性的测试名称
- 遵循 Arrange-Act-Assert 模式
- 保持测试简洁明了

✅ **测试行为而非实现**
```typescript
// 好的做法 - 测试行为
it('应该在点击时切换展开状态', () => {
  const { getByRole } = render(<Accordion />);
  fireEvent.click(getByRole('button'));
  expect(getByRole('region')).toBeVisible();
});

// 不好的做法 - 测试实现细节
it('应该调用 setState', () => {
  // 测试内部实现
});
```

✅ **使用合适的断言**
```typescript
// 具体的断言
expect(result).toBe(42);
expect(array).toContain('item');

// 避免模糊断言
expect(result).toBeTruthy();
```

### 8.2 DON'T - 不应该做的

❌ **避免测试依赖**
- 测试不应依赖执行顺序
- 不共享测试状态

❌ **避免过度 Mock**
- 只 Mock 外部依赖
- 不 Mock 被测试的代码

❌ **避免睡眠等待**
```typescript
// 不好的做法
await new Promise(resolve => setTimeout(resolve, 1000));

// 好的做法
await waitFor(() => expect(element).toBeVisible());
```

## 9. 故障排查

### 9.1 常见问题

**问题**: 测试随机失败
**解决**: 检查异步操作、清理测试数据、隔离测试环境

**问题**: 测试运行缓慢
**解决**: 并行执行、减少 E2E 测试、优化 Mock

**问题**: 覆盖率不达标
**解决**: 识别未测试代码、添加边界案例、测试错误路径

### 9.2 调试技巧

```typescript
// 使用 debug 输出
import { debug } from '@testing-library/react';
debug(); // 输出当前 DOM

// Playwright 调试
await page.pause(); // 暂停执行

// Jest 调试
console.log(wrapper.debug()); // 输出组件树
```

## 10. 相关文档

- [编码规范](./coding-standards.md)
- [项目结构](./project-structure.md)
- [开发环境配置](../setup/development-setup.md)

---

**文档维护者**: Claude Code
**文档版本**: v1.0