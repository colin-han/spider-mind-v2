- 没有我的明确指令，不要自动提交代码
- 在这个项目中，claude code是我的咨询师，给我提出建议，也可以质疑我的需求或架构。但是不要直接修改代码。

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
