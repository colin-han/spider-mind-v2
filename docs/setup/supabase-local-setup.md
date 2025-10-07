# Supabase 本地环境设置

## 已完成的配置

1. ✅ 初始化了 Supabase 项目（创建了 `supabase/` 目录）
2. ✅ 创建了 `.env.local` 环境变量文件

## 后续步骤

### 1. 启动 Docker

在启动 Supabase 之前，需要确保 Docker Desktop 正在运行：

```bash
# 打开 Docker Desktop 应用
# 或者使用命令行启动（如果已配置）
open -a Docker
```

等待 Docker Desktop 完全启动（状态栏图标变绿）。

### 2. 启动 Supabase 本地服务

```bash
volta run yarn db:start
```

这个命令会：

- 下载并启动所需的 Docker 容器（PostgreSQL、PostgREST、GoTrue 等）
- 首次运行需要几分钟下载镜像
- 启动完成后会显示服务信息

### 3. 获取本地凭据

启动成功后，运行：

```bash
volta run yarn db:status
```

你会看到类似这样的输出：

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
anon key: eyJhbGc...
service_role key: eyJhbGc...
```

### 4. 更新 .env.local 文件

将获取到的 `anon key` 和 `service_role key` 更新到 `.env.local` 文件中：

```bash
# 编辑 .env.local，替换以下两行：
NEXT_PUBLIC_SUPABASE_ANON_KEY=<从 db:status 获取的 anon key>
SUPABASE_SERVICE_ROLE_KEY=<从 db:status 获取的 service_role key>
```

### 5. 访问 Supabase Studio

打开浏览器访问：http://127.0.0.1:54323

这是本地的 Supabase 管理界面，可以：

- 查看和编辑数据库表
- 管理用户认证
- 设置存储桶
- 查看 API 文档
- 运行 SQL 查询

## 常用命令

```bash
# 启动 Supabase
volta run yarn db:start

# 停止 Supabase
volta run yarn db:stop

# 查看状态
volta run yarn db:status

# 重置数据库（清空所有数据）
volta run yarn db:reset

# 生成 TypeScript 类型定义
volta run yarn db:types
```

## 数据库迁移

创建数据库表和结构变更时，使用迁移文件：

```bash
# 创建新的迁移文件
npx supabase migration new <migration_name>

# 例如：创建用户表
npx supabase migration new create_users_table

# 编辑 supabase/migrations/<timestamp>_<migration_name>.sql
# 添加你的 SQL 语句

# 应用迁移
volta run yarn db:reset
```

## 注意事项

1. **Docker 必须运行**：每次使用 Supabase 本地环境前，确保 Docker Desktop 正在运行
2. **端口占用**：确保端口 54321-54324 没有被其他应用占用
3. **数据持久化**：本地数据存储在 Docker volumes 中，停止服务不会丢失数据
4. **类型生成**：每次修改数据库结构后，运行 `volta run yarn db:types` 更新 TypeScript 类型

## 目录结构

```
supabase/
├── config.toml          # Supabase 配置文件
├── seed.sql            # 数据库种子数据
└── migrations/         # 数据库迁移文件
    └── <timestamp>_*.sql
```

## 下一步

1. 启动 Docker Desktop
2. 运行 `volta run yarn db:start`
3. 运行 `volta run yarn db:status` 并更新 `.env.local`
4. 访问 http://127.0.0.1:54323 查看 Supabase Studio
5. 开始创建数据库表和迁移文件
