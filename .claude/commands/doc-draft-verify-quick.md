# doc-draft-verify-quick

快速检查设计文档中的常见不一致点。

## 用法

### 不带参数 - 检查所有草稿

```bash
/doc-draft-verify-quick
```

快速检查 `docs/draft/` 下所有草稿的常见问题

### 指定文档 - 检查单个草稿

```bash
/doc-draft-verify-quick docs/draft/your-design.md
```

快速检查指定草稿的常见问题

## 功能说明

执行一系列预定义的快速检查，识别常见的设计不一致问题。

**与 `/doc-draft-verify` 的区别**：

- ⚡ 更快速（约 30 秒 vs 2-5 分钟）
- 🎯 表面检查常见问题，不做深度分析
- 📝 简洁的输出格式

**适用场景**：

- 初步快速扫描
- 编写设计时的实时检查
- 识别明显的问题
- 修复后快速验证

## 检查项目

### 1. TypeScript 类型使用检查

- 搜索 `any` 类型的使用
- 缺少类型注解的函数参数
- 类型断言 `as` 的使用

### 2. ID 字段命名和类型检查

- ID 字段是否使用 `uuid` 类型
- short_id 是否定义为 6 字符 base36
- ID 唯一性约束是否正确

### 3. 命名约定一致性检查

- 数据库字段使用 snake_case
- TypeScript 代码使用 camelCase
- React 组件使用 PascalCase
- Hooks 以 `use` 开头
- 避免将`mindmap`当做两个单词使用。例如：❌ `mind-map` 或 `mind_map`等

### 4. 术语统一性检查

统计术语使用：mindmap vs mind-map, node vs mindmap_node 等

### 5. 时间戳字段检查

- 数据库使用 snake_case (created_at)
- TypeScript 使用 camelCase (createdAt)

### 6. 数据库约束检查

- 主键、外键、唯一约束
- 级联删除规则

### 7. interface vs type 使用检查

- interface 用于对象结构
- type 用于联合类型

### 8. 状态管理模式检查

- Zustand store
- 中间件模式
- 不可变更新

## 与 /doc-draft-verify 的区别

| 特性     | /doc-draft-verify-quick | /doc-draft-verify |
| -------- | ----------------------- | ----------------- |
| 速度     | 快速 (~30秒)            | 详细 (~2-5分钟)   |
| 深度     | 表面检查                | 深度分析          |
| 适用场景 | 初步扫描                | 正式评审          |

## 使用建议

工作流程：

```
编写设计草稿
  ↓
/doc-draft-verify-quick (快速发现问题)
  ↓
修复明显问题
  ↓
/doc-draft-verify (完整校验)
```

## 输出格式

报告保存到 `.claude/logs/validation-reports/YYYY-MM-DD-quick-check.md`

**输出示例**:

```markdown
# 快速检查报告

生成时间: 2025-10-04 15:45:00
检查草稿: docs/draft/new-feature.md (或 "所有草稿")

## 检查摘要

- ✅ 通过: 5 项
- ⚠️ 警告: 3 项
- ❌ 错误: 2 项

## 详细结果

### ❌ 错误 (必须修复)

1. 第 45 行: 使用了 any 类型
2. 第 102 行: 缺少 ON DELETE CASCADE

### ⚠️ 警告 (建议修复)

1. 第 78 行: 字段命名不符合约定 (userID → userId)
2. 第 156 行: 术语不统一 (mind-map → mindmap)
3. 第 203 行: 未明确 short_id 生成位置

### ✅ 通过

- ID 类型定义正确
- 命名约定基本符合
- 数据库约束完整
- 状态管理模式正确
- interface/type 使用恰当
```

## 与完整校验的关系

**推荐工作流程**:

```
1. 编写设计草稿
   ↓
2. /doc-draft-verify-quick (快速发现明显问题)
   ↓
3. 修复明显问题
   ↓
4. /doc-draft-verify-quick (确认问题已解决)
   ↓
5. /doc-draft-verify (完整深度校验)
   ↓
6. 根据详细报告优化设计
   ↓
7. 迭代直到通过
```

**注意**: `/doc-draft-verify` 完整校验会覆盖快速检查的所有项目，因此快速检查通过后仍需要运行完整校验。
