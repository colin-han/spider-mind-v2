#!/bin/bash

# Feature 分支创建脚本
# 用于自动化创建新的 feature 分支，包括安全检查和旧分支清理

set -e

# ============================================================================
# 常量定义
# ============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 全局变量
AUTO_DELETE=false
FEATURE_NAME=""
OLD_BRANCH_NAME=""
OLD_BRANCH_IS_MERGED=false

# ============================================================================
# 工具函数
# ============================================================================

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 用户确认函数
# 参数：
#   $1 - 提示信息
#   $2 - 默认值 (可选，"y" 或 "n"，默认为空表示必须输入)
confirm_continue() {
    local prompt="$1"
    local default="${2:-}"
    local response
    local prompt_suffix

    # 根据默认值设置提示后缀
    if [[ "$default" == "y" ]]; then
        prompt_suffix="[Y/n]"
    elif [[ "$default" == "n" ]]; then
        prompt_suffix="[y/N]"
    else
        prompt_suffix="(y/n)"
    fi

    while true; do
        read -p "$prompt $prompt_suffix: " response

        # 如果直接回车且有默认值，使用默认值
        if [[ -z "$response" && -n "$default" ]]; then
            response="$default"
        fi

        case "$response" in
            [Yy]|[Yy][Ee][Ss])
                return 0
                ;;
            [Nn]|[Nn][Oo])
                return 1
                ;;
            *)
                echo "请输入 y 或 n"
                ;;
        esac
    done
}

# ============================================================================
# 参数处理
# ============================================================================

# 参数解析
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -y)
                AUTO_DELETE=true
                shift
                ;;
            *)
                if [[ -z "$FEATURE_NAME" ]]; then
                    FEATURE_NAME="$1"
                else
                    log_error "只能指定一个 feature 名称"
                    echo "用法: $0 [-y] <featureName>"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # 检查是否提供了 feature 名称
    if [[ -z "$FEATURE_NAME" ]]; then
        log_error "缺少 feature 名称参数"
        echo ""
        echo "用法: $0 [-y] <featureName>"
        echo ""
        echo "参数说明:"
        echo "  featureName    feature 名称（只支持英文字母、数字、下划线、连字符，首字母必须是英文）"
        echo "  -y            自动删除旧分支（可选）"
        echo ""
        echo "示例:"
        echo "  $0 my-new-feature"
        echo "  $0 -y my-new-feature"
        exit 1
    fi
}

# 参数验证
validate_feature_name() {
    local name="$1"

    # 检查首字母是否为英文字母
    if ! [[ "$name" =~ ^[a-zA-Z] ]]; then
        log_error "Feature 名称首字母必须是英文字母"
        exit 1
    fi

    # 检查是否只包含允许的字符
    if ! [[ "$name" =~ ^[a-zA-Z][a-zA-Z0-9_-]*$ ]]; then
        log_error "Feature 名称只能包含英文字母、数字、下划线(_)和连字符(-)"
        exit 1
    fi

    log_success "Feature 名称验证通过: $name"
}

# ============================================================================
# 核心功能函数
# ============================================================================

# 工作区检查
check_working_directory() {
    log_info "检查工作区状态..."

    if [[ -n $(git status --porcelain) ]]; then
        log_error "工作区不干净，存在未提交的修改"
        log_info "请先提交或暂存当前修改"
        echo ""
        git status --short
        exit 1
    fi

    log_success "工作区干净"
}

# 分支合并状态检查
check_merge_status() {
    # 获取当前分支名
    OLD_BRANCH_NAME=$(git branch --show-current)
    log_info "当前分支: $OLD_BRANCH_NAME"

    # 检查是否已合并到 develop
    if git branch --merged develop | grep -q "^[* ]*${OLD_BRANCH_NAME}$"; then
        OLD_BRANCH_IS_MERGED=true
        log_success "当前分支已合并到 develop"
    else
        OLD_BRANCH_IS_MERGED=false
        log_warning "当前分支尚未合并到 develop"
        echo ""

        # 询问用户是否继续
        if ! confirm_continue "是否继续创建新分支？"; then
            log_info "操作已取消"
            exit 0
        fi
    fi
}

# 新分支创建
create_new_branch() {
    local new_branch="feature/${FEATURE_NAME}"

    log_info "基于 develop 创建新分支: $new_branch"
    echo ""

    # 基于本地 develop 分支创建新分支
    log_info "创建并切换到新分支..."
    git checkout -b "$new_branch" develop

    echo ""
    log_success "已创建并切换到新分支: $new_branch"
}

# 日志归档
archive_logs() {
    local old_branch="$1"
    local logs_dir=".claude/logs"

    # 检查 logs 目录是否存在且有文件
    if [[ ! -d "$logs_dir" ]] || [[ -z $(find "$logs_dir" -maxdepth 1 -type f 2>/dev/null) ]]; then
        log_info "没有需要归档的日志文件"
        return 0
    fi

    # 生成归档目录名
    local date=$(date +%Y-%m-%d)
    # 去掉 feature/ 前缀
    local task_name="${old_branch#feature/}"
    local archive_dir="${logs_dir}/archived/${date}-${task_name}"

    log_info "归档日志到: $archive_dir"

    # 创建归档目录
    mkdir -p "$archive_dir"

    # 移动所有文件（除了 archived 目录）
    find "$logs_dir" -maxdepth 1 -type f -exec mv {} "$archive_dir/" \;

    log_success "日志归档完成"
}

# 旧分支删除
cleanup_old_branch() {
    # 检查是否需要删除旧分支
    if [[ "$OLD_BRANCH_IS_MERGED" != true ]]; then
        log_info "旧分支未合并，跳过删除"
        return 0
    fi

    if [[ ! "$OLD_BRANCH_NAME" =~ ^feature/ ]]; then
        log_info "旧分支不是 feature 分支，跳过删除"
        return 0
    fi

    echo ""

    # 确认删除
    local should_delete=false
    if [[ "$AUTO_DELETE" == true ]]; then
        should_delete=true
        log_info "自动删除模式，将删除旧分支"
    else
        if confirm_continue "是否删除旧分支 $OLD_BRANCH_NAME？" "y"; then
            should_delete=true
        fi
    fi

    if [[ "$should_delete" == true ]]; then
        echo ""
        # 归档日志
        archive_logs "$OLD_BRANCH_NAME"

        # 删除分支
        log_info "删除旧分支: $OLD_BRANCH_NAME"
        git branch -d "$OLD_BRANCH_NAME"
        log_success "旧分支已删除"
    else
        log_info "保留旧分支: $OLD_BRANCH_NAME"
    fi
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    echo ""
    echo "🚀 Feature 分支创建脚本"
    echo "======================="
    echo ""

    # 1. 参数解析
    parse_arguments "$@"

    # 2. 参数验证
    validate_feature_name "$FEATURE_NAME"

    # 3. 工作区检查
    check_working_directory

    # 4. 分支合并状态检查
    check_merge_status

    # 5. 创建新分支
    create_new_branch

    # 6. 清理旧分支
    cleanup_old_branch

    echo ""
    log_success "操作完成！"
    log_info "当前分支: feature/${FEATURE_NAME}"
    echo ""
}

# 执行主流程
main "$@"
