#!/bin/bash

# 数据库推送脚本
# 用于将本地迁移推送到 Supabase 远程数据库
#
# 使用方法：
#   1. 交互式模式：直接运行 yarn db:push
#   2. 自动模式：配置 .env.ops.local 文件后运行 yarn db:push

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Supabase 命令包装器
supabase_cmd() {
    yarn supabase "$@"
}

# 加载配置文件
load_config() {
    local config_file=".env.ops.local"

    if [ -f "$config_file" ]; then
        info "加载配置文件：$config_file"

        # 读取配置（忽略注释和空行）
        while IFS='=' read -r key value; do
            # 跳过注释和空行
            [[ "$key" =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue

            # 移除值的引号和前后空格
            value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

            # 导出环境变量
            case "$key" in
                SUPABASE_PROJECT_REF)
                    export SUPABASE_PROJECT_REF="$value"
                    ;;
                SUPABASE_DB_PASSWORD)
                    export SUPABASE_DB_PASSWORD="$value"
                    ;;
                SUPABASE_ACCESS_TOKEN)
                    export SUPABASE_ACCESS_TOKEN="$value"
                    ;;
                AUTO_GENERATE_TYPES)
                    export AUTO_GENERATE_TYPES="$value"
                    ;;
                SKIP_CONFIRMATION)
                    export SKIP_CONFIRMATION="$value"
                    ;;
            esac
        done < "$config_file"

        success "配置文件加载成功"
        return 0
    else
        warning "未找到配置文件 $config_file，使用交互式模式"
        return 1
    fi
}

# 检查 Supabase CLI 是否可用
check_supabase_cli() {
    if ! yarn supabase --version &> /dev/null; then
        error "Supabase CLI 未安装或未正确配置"
        echo ""
        echo "请使用以下命令安装："
        echo "  yarn add -D supabase"
        echo "  # 或全局安装"
        echo "  volta install supabase"
        exit 1
    fi
    success "Supabase CLI 可用"
}

# 检查是否已登录
check_login() {
    info "检查登录状态..."

    # 如果有 access token，使用 token 登录
    if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
        info "使用 Access Token 登录..."
        export SUPABASE_ACCESS_TOKEN
        success "Access Token 已设置"
        return 0
    fi

    # 检查是否已登录
    if supabase_cmd projects list &> /dev/null; then
        success "已登录到 Supabase"
        return 0
    else
        warning "未登录到 Supabase"
        echo ""
        echo "请先登录："
        echo "  yarn supabase login"
        echo ""
        echo "或者在 .env.ops.local 中配置 SUPABASE_ACCESS_TOKEN"
        exit 1
    fi
}

# 检查是否已链接项目
check_link() {
    info "检查项目链接状态..."

    # 检查是否已链接
    if [ -f ".git/supabase/project-ref" ] || [ -f "supabase/.branches/_current_branch" ]; then
        success "项目已链接"
        return 0
    fi

    # 如果有配置的 project-ref，自动链接
    if [ -n "$SUPABASE_PROJECT_REF" ]; then
        info "使用配置的 Project Ref 链接项目..."

        # 如果有数据库密码，通过环境变量传递
        if [ -n "$SUPABASE_DB_PASSWORD" ]; then
            export PGPASSWORD="$SUPABASE_DB_PASSWORD"
            echo "$SUPABASE_DB_PASSWORD" | supabase_cmd link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
        else
            supabase_cmd link --project-ref "$SUPABASE_PROJECT_REF"
        fi

        if [ $? -eq 0 ]; then
            success "项目链接成功"
            return 0
        else
            error "项目链接失败"
            exit 1
        fi
    fi

    # 交互式模式
    warning "项目未链接到远程"
    echo ""
    read -p "请输入项目 ID (project-ref): " PROJECT_REF

    if [ -z "$PROJECT_REF" ]; then
        error "项目 ID 不能为空"
        exit 1
    fi

    info "正在链接项目..."
    supabase_cmd link --project-ref "$PROJECT_REF"

    if [ $? -eq 0 ]; then
        success "项目链接成功"
    else
        error "项目链接失败"
        exit 1
    fi
}

# 显示待推送的迁移
show_pending_migrations() {
    info "检查待推送的迁移..."
    echo ""

    # 列出本地迁移
    echo "本地迁移文件："
    if ls supabase/migrations/*.sql 1> /dev/null 2>&1; then
        ls -1 supabase/migrations/*.sql 2>/dev/null | while read file; do
            echo "  - $(basename $file)"
        done
    else
        warning "没有找到迁移文件"
    fi

    echo ""
}

# 确认推送
confirm_push() {
    # 如果配置了跳过确认，直接返回
    if [ "$SKIP_CONFIRMATION" = "true" ]; then
        warning "已配置跳过确认，直接推送"
        return 0
    fi

    warning "即将推送迁移到远程数据库"
    echo ""
    echo "这将修改生产环境的数据库结构！"
    echo ""
    read -p "确认推送? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        info "操作已取消"
        exit 0
    fi
}

# 推送迁移
push_migrations() {
    info "推送迁移到远程数据库..."
    echo ""

    # 如果有数据库密码，通过环境变量传递
    if [ -n "$SUPABASE_DB_PASSWORD" ]; then
        export PGPASSWORD="$SUPABASE_DB_PASSWORD"
        echo "$SUPABASE_DB_PASSWORD" | supabase_cmd db push --password "$SUPABASE_DB_PASSWORD"
    else
        supabase_cmd db push
    fi

    if [ $? -eq 0 ]; then
        success "迁移推送成功！"
    else
        error "迁移推送失败"
        echo ""
        echo "常见问题："
        echo "  1. 检查数据库密码是否正确"
        echo "  2. 检查网络连接"
        echo "  3. 检查迁移 SQL 是否有语法错误"
        echo "  4. 在本地测试：yarn db:reset"
        exit 1
    fi
}

# 验证迁移状态
verify_migrations() {
    info "验证远程迁移状态..."
    echo ""

    if supabase_cmd migration list --remote; then
        success "迁移状态验证成功"
    else
        warning "无法验证迁移状态"
    fi
}

# 可选：生成类型定义
generate_types() {
    # 如果配置了自动生成类型
    if [ "$AUTO_GENERATE_TYPES" = "true" ]; then
        info "自动生成 TypeScript 类型..."

        if yarn db:types; then
            success "类型定义已生成"
        else
            warning "类型定义生成失败（这不影响迁移）"
        fi
        return
    fi

    # 交互式询问
    echo ""
    read -p "是否生成 TypeScript 类型定义? (y/n): " GEN_TYPES

    if [ "$GEN_TYPES" = "y" ] || [ "$GEN_TYPES" = "Y" ]; then
        info "生成 TypeScript 类型..."

        if yarn db:types; then
            success "类型定义已生成"
        else
            warning "类型定义生成失败（这不影响迁移）"
        fi
    fi
}

# 主流程
main() {
    echo ""
    echo "========================================="
    echo "  Supabase 数据库迁移推送工具"
    echo "========================================="
    echo ""

    # 0. 加载配置文件（如果存在）
    load_config

    # 1. 检查环境
    check_supabase_cli
    check_login
    check_link

    # 2. 显示待推送内容
    show_pending_migrations

    # 3. 确认推送
    confirm_push

    # 4. 执行推送
    push_migrations

    # 5. 验证结果
    verify_migrations

    # 6. 可选：生成类型
    generate_types

    echo ""
    success "所有操作完成！"
    echo ""
}

# 运行主流程
main
