#!/bin/bash

# 版本发布脚本
# 自动化版本发布流程，包括版本号更新、代码提交、标签创建和分支合并

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

# ============================================================================
# 检查函数
# ============================================================================

# 检查当前分支
check_current_branch() {
    local current_branch=$(git branch --show-current)

    log_info "检查当前分支..."

    if [[ "$current_branch" != "develop" ]]; then
        log_error "当前不在 develop 分支"
        log_info "当前分支: $current_branch"
        echo ""
        echo "发布脚本必须在 develop 分支上执行"
        exit 1
    fi

    log_success "当前分支: develop"
}

# 检查工作区状态
check_working_directory() {
    log_info "检查工作区状态..."

    if [[ -n $(git status --porcelain) ]]; then
        log_error "工作区不干净，存在未提交的修改"
        echo ""
        git status --short
        echo ""
        log_info "请先提交或暂存当前修改"
        exit 1
    fi

    log_success "工作区干净"
}

# ============================================================================
# 版本号处理
# ============================================================================

# 获取当前版本号
get_current_version() {
    # 从 package.json 读取版本号
    if [[ -f "package.json" ]]; then
        grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
    else
        echo "0.0.0"
    fi
}

# 版本号加1
increment_version() {
    local version="$1"
    local type="${2:-patch}"  # major, minor, patch

    # 分解版本号
    local major minor patch
    IFS='.' read -r major minor patch <<< "$version"

    case "$type" in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
    esac

    echo "${major}.${minor}.${patch}"
}

# 验证版本号格式
validate_version() {
    local version="$1"

    if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_error "版本号格式错误"
        log_info "版本号必须是 major.minor.patch 格式，例如: 1.0.0"
        return 1
    fi

    return 0
}

# 获取用户输入的版本号
get_new_version() {
    local current_version=$(get_current_version)
    local default_version=$(increment_version "$current_version" "patch")

    echo "" >&2
    log_info "当前版本号: $current_version" >&2
    log_info "建议版本号: $default_version" >&2
    echo "" >&2

    local new_version
    read -p "请输入新版本号 [${default_version}]: " new_version

    # 如果直接回车，使用默认值
    if [[ -z "$new_version" ]]; then
        new_version="$default_version"
    fi

    # 验证版本号格式
    if ! validate_version "$new_version"; then
        exit 1
    fi

    # 检查版本号是否大于当前版本
    if [[ "$new_version" == "$current_version" ]]; then
        log_error "新版本号不能与当前版本相同"
        exit 1
    fi

    echo "$new_version"
}

# 更新 package.json 中的版本号
update_package_version() {
    local new_version="$1"

    log_info "更新 package.json 版本号为 $new_version"

    # 使用 sed 更新版本号
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/"version": "[^"]*"/"version": "'"$new_version"'"/' package.json
    else
        # Linux
        sed -i 's/"version": "[^"]*"/"version": "'"$new_version"'"/' package.json
    fi

    log_success "版本号已更新"
}

# ============================================================================
# Git 操作
# ============================================================================

# 提交代码并创建标签
commit_and_tag() {
    local version="$1"
    local tag_name="release-${version}"

    log_info "提交版本更新..."
    git add package.json
    git commit -m "chore: 更新版本号${version}"

    log_success "代码已提交"

    log_info "创建标签: $tag_name"
    git tag -a "$tag_name" -m "Release version ${version}"

    log_success "标签已创建"
}

# 推送 develop 和标签
push_develop_and_tag() {
    local version="$1"
    local tag_name="release-${version}"

    log_info "推送 develop 分支..."
    git push origin develop

    log_success "develop 分支已推送"

    log_info "推送标签: $tag_name"
    git push origin "$tag_name"

    log_success "标签已推送"
}

# 合并到 main 并推送
merge_to_main_and_push() {
    local current_branch=$(git branch --show-current)

    log_info "切换到 main 分支..."
    git checkout main

    log_info "拉取 main 分支最新代码..."
    git pull origin main

    log_info "合并 develop 到 main..."
    git merge develop --no-edit

    log_success "已合并 develop 到 main"

    log_info "推送 main 分支..."
    git push origin main

    log_success "main 分支已推送"

    log_info "切换回 develop 分支..."
    git checkout develop
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    clear
    echo ""
    echo "🚀 版本发布脚本"
    echo "==============="
    echo ""

    # 1. 检查当前分支
    check_current_branch

    # 2. 检查工作区状态
    check_working_directory

    # 3. 获取新版本号
    local new_version=$(get_new_version)

    echo ""
    log_info "准备发布版本: $new_version"
    echo ""

    # 确认
    read -p "确认发布？[Y/n]: " response
    response=${response:-y}
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi

    echo ""

    # 4. 更新版本号
    update_package_version "$new_version"

    # 5. 提交代码并创建标签
    commit_and_tag "$new_version"

    # 6. 推送 develop 和标签
    push_develop_and_tag "$new_version"

    # 7. 合并到 main 并推送
    merge_to_main_and_push

    echo ""
    log_success "🎉 版本 $new_version 发布成功！"
    echo ""
}

# 执行主流程
main "$@"
