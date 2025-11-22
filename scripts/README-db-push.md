# 数据库推送脚本使用指南

## 快速开始

### 方法一：一键推送（推荐）

配置 `.env.ops.local` 后，只需一条命令：

```bash
yarn db:push
```

脚本会自动：

- ✅ 读取配置文件
- ✅ 使用 Access Token 登录
- ✅ 链接到指定项目
- ✅ 使用配置的数据库密码
- ✅ 推送迁移（可选跳过确认）
- ✅ 自动生成类型（可配置）

### 方法二：交互式模式

如果没有配置文件，仍可使用交互式模式：

```bash
yarn db:push
```

## 配置自动推送

### 第一步：创建配置文件

```bash
# 复制模板文件
cp .env.ops.local.example .env.ops.local
```

### 第二步：填写配置信息

编辑 `.env.ops.local` 文件：

```bash
# 项目 ID（必需）
SUPABASE_PROJECT_REF=your-project-ref-here

# 数据库密码（必需）
SUPABASE_DB_PASSWORD=your-database-password-here

# Access Token（可选，如果已通过 yarn supabase login 登录）
SUPABASE_ACCESS_TOKEN=

# 自动生成类型（可选）
AUTO_GENERATE_TYPES=false

# 跳过确认（可选，生产环境不建议）
SKIP_CONFIRMATION=false
```

### 第三步：获取配置信息

#### 1. 获取 Project Ref

访问 [Supabase Dashboard](https://supabase.com/dashboard)：

1. 选择你的项目
2. 查看 URL：`https://supabase.com/dashboard/project/<project-ref>`
3. 复制 `project-ref` 部分（例如：`abcdefghijklmnop`）

#### 2. 获取数据库密码

在 Supabase Dashboard 中：

1. 进入 Settings → Database
2. 找到 "Database Password" 部分
3. 如果忘记密码，点击 "Reset database password"

**注意**：这是 **Database Password**，不是 API Key！

#### 3. 获取 Access Token（可选）

两种方式：

**方式一**（推荐）：使用已登录状态

```bash
# 先手动登录一次
yarn supabase login

# 之后可以留空 SUPABASE_ACCESS_TOKEN
```

**方式二**：生成 Access Token

1. 访问 https://supabase.com/dashboard/account/tokens
2. 生成新的 Access Token
3. 复制到 `.env.ops.local` 中

### 第四步：运行推送

```bash
yarn db:push
```

脚本会自动完成所有步骤！

## 配置说明

### SUPABASE_PROJECT_REF（必需）

项目的唯一标识符。

- **获取位置**：项目 URL 中的 ID
- **示例**：`abcdefghijklmnop`

### SUPABASE_DB_PASSWORD（必需）

数据库直连密码。

- **获取位置**：Settings → Database → Database Password
- **注意**：不是 API Key
- **安全性**：不会被提交到 git（已在 .gitignore 中）

### SUPABASE_ACCESS_TOKEN（可选）

API 访问令牌。

- **何时需要**：如果未通过 `yarn supabase login` 登录
- **获取位置**：Account → Tokens
- **推荐做法**：使用 `yarn supabase login` 登录后留空此项

### AUTO_GENERATE_TYPES（可选）

是否自动生成 TypeScript 类型定义。

- **默认值**：`false`（推送后会询问）
- **设置为 `true`**：推送成功后自动生成类型
- **推荐**：开发环境设为 `true`，生产环境设为 `false`

### SKIP_CONFIRMATION（可选）

是否跳过推送前的确认步骤。

- **默认值**：`false`（推送前需要输入 `yes` 确认）
- **设置为 `true`**：直接推送，不需要确认
- **⚠️ 警告**：生产环境强烈建议保持 `false`

## 使用场景

### 场景一：开发环境（推荐配置）

```bash
SUPABASE_PROJECT_REF=dev-project-ref
SUPABASE_DB_PASSWORD=dev-db-password
SUPABASE_ACCESS_TOKEN=
AUTO_GENERATE_TYPES=true
SKIP_CONFIRMATION=false
```

快速推送并自动生成类型，但仍需确认。

### 场景二：CI/CD 自动化

```bash
SUPABASE_PROJECT_REF=prod-project-ref
SUPABASE_DB_PASSWORD=prod-db-password
SUPABASE_ACCESS_TOKEN=ci-access-token
AUTO_GENERATE_TYPES=true
SKIP_CONFIRMATION=true
```

完全自动化，适合 CI/CD 流程。

### 场景三：生产环境（最安全）

```bash
SUPABASE_PROJECT_REF=prod-project-ref
SUPABASE_DB_PASSWORD=prod-db-password
SUPABASE_ACCESS_TOKEN=
AUTO_GENERATE_TYPES=false
SKIP_CONFIRMATION=false
```

需要人工确认，避免误操作。

## 安全最佳实践

### ✅ 推荐做法

1. **使用配置文件**
   - 将敏感信息存储在 `.env.ops.local`
   - 不要在命令行中直接输入密码

2. **分离环境**
   - 开发环境：使用单独的配置文件
   - 生产环境：使用更严格的确认流程

3. **定期更换密码**
   - 定期重置数据库密码
   - 定期重新生成 Access Token

4. **最小权限原则**
   - CI/CD 使用专门的 Access Token
   - 不同环境使用不同的凭证

### ❌ 避免做法

1. **不要提交配置文件**
   - `.env.ops.local` 已在 `.gitignore` 中
   - 永远不要提交包含密码的文件

2. **不要共享凭证**
   - 每个团队成员使用自己的 Access Token
   - 不要在聊天工具中发送密码

3. **不要在生产环境跳过确认**
   - `SKIP_CONFIRMATION=true` 仅用于 CI/CD
   - 手动操作时务必保持确认步骤

## 故障排除

### 错误：无法读取配置文件

**现象**：

```
⚠ 未找到配置文件 .env.ops.local，使用交互式模式
```

**解决**：

```bash
# 检查文件是否存在
ls -la .env.ops.local

# 如果不存在，从模板创建
cp .env.ops.local.example .env.ops.local
```

### 错误：Supabase CLI 未安装

**现象**：

```
✗ Supabase CLI 未安装或未正确配置
```

**解决**：

```bash
# 检查是否已安装
yarn supabase --version

# 如果未安装
yarn add -D supabase
```

### 错误：Access Token 无效

**现象**：

```
⚠ 未登录到 Supabase
```

**解决**：

```bash
# 方式1：手动登录
yarn supabase login

# 方式2：重新生成 Access Token
# 访问 https://supabase.com/dashboard/account/tokens
# 更新 .env.ops.local 中的 SUPABASE_ACCESS_TOKEN
```

### 错误：数据库密码错误

**现象**：

```
✗ 迁移推送失败
常见问题：
  1. 检查数据库密码是否正确
```

**解决**：

```bash
# 在 Supabase Dashboard 中重置密码
# Settings → Database → Reset database password

# 更新 .env.ops.local 中的 SUPABASE_DB_PASSWORD
```

### 错误：项目链接失败

**现象**：

```
✗ 项目链接失败
```

**解决**：

```bash
# 检查 project-ref 是否正确
# 在 Supabase Dashboard 中确认项目 ID

# 更新 .env.ops.local 中的 SUPABASE_PROJECT_REF
```

## 手动操作（不使用配置文件）

如果你不想使用配置文件，仍可使用交互式模式：

### 第一次推送

```bash
# 1. 登录
yarn supabase login

# 2. 运行推送脚本
yarn db:push

# 3. 按提示操作
#    - 输入 project-ref
#    - 输入数据库密码
#    - 确认推送（输入 yes）
#    - 选择是否生成类型（y/n）
```

### 后续推送

```bash
# 如果已经链接过项目，直接运行
yarn db:push
```

## 相关命令

```bash
# 数据库操作
yarn db:push      # 推送迁移到远程
yarn db:status    # 查看数据库状态
yarn db:start     # 启动本地数据库
yarn db:stop      # 停止本地数据库
yarn db:reset     # 重置本地数据库
yarn db:types     # 生成 TypeScript 类型

# Supabase CLI
yarn supabase login              # 登录
yarn supabase projects list      # 列出项目
yarn supabase link --project-ref <ref>  # 链接项目
yarn supabase migration list     # 查看迁移列表
yarn supabase migration list --remote  # 查看远程迁移
```

## 迁移文件

当前项目迁移：

```
supabase/migrations/
├── 20250110000000_initial_schema.sql      # 初始结构
└── 20251116000000_add_ai_messages.sql     # AI 消息表
```

创建新迁移：

```bash
yarn supabase migration new <migration_name>
```

## 生产环境推荐流程

### 第一次部署

```bash
# 1. 创建生产环境配置
cp .env.ops.local.example .env.ops.prod

# 2. 编辑配置（填写生产环境信息）
vim .env.ops.prod

# 3. 使用生产配置
cp .env.ops.prod .env.ops.local

# 4. 在本地测试迁移
yarn db:reset
yarn dev

# 5. 备份生产数据库（在 Dashboard 中）
# Settings → Database → Database Backups → Create Backup

# 6. 推送到生产
yarn db:push

# 7. 验证
yarn supabase migration list --remote
```

### 日常更新

```bash
# 1. 本地测试
yarn db:reset
yarn dev

# 2. 备份（重要！）
# 在 Supabase Dashboard 中创建备份

# 3. 推送
yarn db:push

# 4. 验证
yarn supabase migration list --remote
```

## 密码类型对比

| 密码类型          | 用途       | 获取位置            | 使用场景       |
| ----------------- | ---------- | ------------------- | -------------- |
| Database Password | 数据库直连 | Settings → Database | `db:push` 命令 |
| Anon Key          | 客户端 API | Settings → API      | 前端应用       |
| Service Role Key  | 服务端 API | Settings → API      | 后端服务       |
| Access Token      | CLI 认证   | Account → Tokens    | 脚本自动化     |

## 常见问题

### Q: 忘记数据库密码怎么办？

**A**: 在 Supabase Dashboard 中重置

1. Settings → Database
2. Database Password 部分
3. Reset database password
4. 更新 `.env.ops.local` 中的密码

### Q: Access Token 和数据库密码有什么区别？

**A**:

- **Access Token**：用于 Supabase CLI 认证（登录、列出项目等）
- **Database Password**：用于直接连接数据库（推送迁移、执行 SQL 等）

两者都需要，但如果已通过 `yarn supabase login` 登录，Access Token 可以留空。

### Q: 为什么推荐保持 SKIP_CONFIRMATION=false？

**A**: 推送迁移会直接修改生产数据库结构，人工确认可以：

- 避免误操作
- 再次检查迁移内容
- 确保备份已完成

仅在完全自动化的 CI/CD 流程中使用 `SKIP_CONFIRMATION=true`。

### Q: 如何在多个项目间切换？

**A**: 使用不同的配置文件

```bash
# 开发环境
cp .env.ops.dev .env.ops.local
yarn db:push

# 测试环境
cp .env.ops.staging .env.ops.local
yarn db:push

# 生产环境
cp .env.ops.prod .env.ops.local
yarn db:push
```

### Q: 脚本支持哪些操作系统？

**A**:

- ✅ macOS
- ✅ Linux
- ⚠️ Windows（需要 Git Bash 或 WSL）

### Q: 如何验证配置是否正确？

**A**:

```bash
# 1. 检查配置文件
cat .env.ops.local

# 2. 测试登录
yarn supabase projects list

# 3. 测试链接
yarn supabase link --project-ref <your-ref>

# 4. 查看迁移
yarn supabase migration list
```

## 技术支持

- [Supabase 文档](https://supabase.com/docs)
- [Supabase CLI 文档](https://supabase.com/docs/guides/cli)
- [迁移指南](https://supabase.com/docs/guides/cli/managing-environments)
