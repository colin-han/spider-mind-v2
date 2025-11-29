#!/bin/bash

# Feature 分支管理脚本
# 提供交互式的分支查看、合并、删除功能

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

# 临时文件
ACTION_FILE="/tmp/fzf-feature-manager-action-$$"
SELECTED_FILE="/tmp/fzf-feature-manager-selected-$$"

# ============================================================================
# 清理函数
# ============================================================================

cleanup() {
    rm -f "$ACTION_FILE" "$SELECTED_FILE"
}

trap cleanup EXIT

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
# 依赖检查
# ============================================================================

check_fzf() {
    if ! command -v fzf >/dev/null 2>&1; then
        log_error "fzf 未安装"
        echo ""
        echo "请安装 fzf："
        echo "  macOS:   brew install fzf"
        echo "  Ubuntu:  sudo apt install fzf"
        echo "  或访问: https://github.com/junegunn/fzf"
        echo ""
        exit 1
    fi
}

# ============================================================================
# 环境检查
# ============================================================================

check_current_branch() {
    local current_branch=$(git branch --show-current)

    if [[ "$current_branch" != "develop" ]]; then
        log_error "当前不在 develop 分支"
        log_info "当前分支: $current_branch"
        echo ""
        echo "此脚本必须在 develop 分支的工作目录中执行"
        exit 1
    fi

    log_success "环境检查通过: develop 分支"
}

# ============================================================================
# Git 操作函数
# ============================================================================

# 获取所有 feature 分支，按最后提交时间倒序排列
get_sorted_feature_branches() {
    git for-each-ref \
        --sort=-committerdate \
        --format='%(refname:short)' \
        refs/heads/feature/ 2>/dev/null || true
}

# 检查分支是否已合并到 develop
is_branch_merged() {
    local branch="$1"
    if git branch --merged develop | grep -q "^[* ]*${branch}$"; then
        return 0  # 已合并
    else
        return 1  # 未合并
    fi
}

# 获取分支关联的 worktree
get_branch_worktree() {
    local branch="$1"

    # 获取所有 worktree 信息
    git worktree list --porcelain | awk -v branch="$branch" '
        /^worktree / { path = substr($0, 10) }
        /^branch / {
            current_branch = substr($0, 8)
            gsub(/^refs\/heads\//, "", current_branch)
            if (current_branch == branch && path != "") {
                print path
                exit
            }
        }
    '
}

# 格式化 worktree 路径
format_worktree_path() {
    local absolute_path="$1"

    # 获取主 .git 目录的父级目录（主仓库目录）
    local git_dir=$(git rev-parse --git-common-dir)
    local main_repo_dir=$(dirname "$git_dir")

    # 计算相对路径（从主仓库目录开始）
    # 优先使用 python3（兼容性最好）
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "import os.path; print(os.path.relpath('$absolute_path', '$main_repo_dir'))" 2>/dev/null && return
    fi

    # 尝试使用 realpath（GNU coreutils 版本支持 --relative-to）
    if command -v realpath >/dev/null 2>&1; then
        realpath --relative-to="$main_repo_dir" "$absolute_path" 2>/dev/null && return
    fi

    # 使用纯 Bash 实现
    # 移除共同的前缀路径
    local target="${absolute_path}"
    local base="${main_repo_dir}"

    # 确保路径以 / 结尾
    [[ "${base}" != */ ]] && base="${base}/"

    # 如果 target 以 base 开头，移除 base 部分
    if [[ "${target}" == "${base}"* ]]; then
        echo "${target#$base}"
    else
        # 如果不是子路径，返回绝对路径
        echo "$absolute_path"
    fi
}

# ============================================================================
# 分支列表生成
# ============================================================================

generate_branch_list() {
    local branches=$(get_sorted_feature_branches)

    if [[ -z "$branches" ]]; then
        return 0
    fi

    while IFS= read -r branch; do
        # 检查是否已合并
        local merged_mark="[ ]"
        if is_branch_merged "$branch"; then
            merged_mark="[✓]"
        fi

        # 获取 worktree 路径
        local worktree_path=$(get_branch_worktree "$branch")
        local worktree_info=""
        if [[ -n "$worktree_path" ]]; then
            local formatted_path=$(format_worktree_path "$worktree_path")
            worktree_info=" → $formatted_path"
        fi

        # 输出格式化的分支信息
        echo "${merged_mark} ${branch}${worktree_info}"
    done <<< "$branches"
}

# ============================================================================
# 分支操作
# ============================================================================

# 合并分支
merge_branch() {
    local branch_line="$1"
    # 从格式化的行中提取分支名
    local branch=$(echo "$branch_line" | sed -E 's/^\[[✓ ]\] ([^ ]+)( →.*)?$/\1/')

    echo ""
    log_info "合并分支: $branch 到 develop"
    echo ""

    # 确认
    read -p "确认合并？(y/n): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        return 1
    fi

    echo ""

    # 执行合并
    if git merge "$branch" --no-edit; then
        echo ""
        log_success "分支合并成功"
        return 0
    else
        echo ""
        log_error "分支合并失败"
        return 1
    fi
}

# 显示分支差异
show_branch_diff() {
    local branch_line="$1"
    # 从格式化的行中提取分支名
    local branch=$(echo "$branch_line" | sed -E 's/^\[[✓ ]\] ([^ ]+)( →.*)?$/\1/')

    clear
    echo ""
    log_info "显示分支差异: $branch vs develop"
    echo ""
    echo "========================================"
    echo ""

    # 显示差异
    git diff develop.."$branch"

    echo ""
    echo "========================================"
    echo ""
    read -p "按回车继续..."
}

# 删除分支
remove_branch() {
    local branch_line="$1"
    # 从格式化的行中提取信息
    local merged_mark=$(echo "$branch_line" | sed -E 's/^(\[[✓ ]\]).*$/\1/')
    local branch=$(echo "$branch_line" | sed -E 's/^\[[✓ ]\] ([^ ]+)( →.*)?$/\1/')
    local has_worktree=$(echo "$branch_line" | grep -q " → " && echo "yes" || echo "no")

    echo ""

    # 检查是否关联 worktree
    if [[ "$has_worktree" == "yes" ]]; then
        log_error "无法删除: 该分支关联了 worktree"
        log_info "请先删除 worktree 后再删除分支"
        echo ""
        read -p "按回车继续..."
        return 1
    fi

    # 检查是否已合并
    if [[ "$merged_mark" == "[ ]" ]]; then
        log_warning "警告: 该分支尚未合并到 develop"
        echo ""
        read -p "确认删除未合并的分支？(y/n): " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            return 1
        fi
        echo ""
        # 使用 -D 强制删除
        if git branch -D "$branch"; then
            log_success "分支已删除: $branch"
            return 0
        else
            log_error "删除失败"
            return 1
        fi
    else
        read -p "确认删除分支 $branch？(y/n): " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            return 1
        fi
        echo ""
        # 使用 -d 删除已合并的分支
        if git branch -d "$branch"; then
            log_success "分支已删除: $branch"
            return 0
        else
            log_error "删除失败"
            return 1
        fi
    fi
}

# 批量删除分支
batch_delete_branches() {
    # 获取所有符合条件的分支
    local branches_to_delete=()
    local branches=$(get_sorted_feature_branches)

    if [[ -z "$branches" ]]; then
        echo ""
        log_info "没有 feature 分支"
        echo ""
        read -p "按回车继续..."
        return 1
    fi

    while IFS= read -r branch; do
        # 检查是否已合并
        if ! is_branch_merged "$branch"; then
            continue
        fi

        # 检查是否有 worktree
        local worktree_path=$(get_branch_worktree "$branch")
        if [[ -n "$worktree_path" ]]; then
            continue
        fi

        branches_to_delete+=("$branch")
    done <<< "$branches"

    # 检查是否有可删除的分支
    if [[ ${#branches_to_delete[@]} -eq 0 ]]; then
        echo ""
        log_info "没有符合条件的分支可以删除"
        echo ""
        read -p "按回车继续..."
        return 1
    fi

    # 显示待删除的分支列表
    echo ""
    log_info "即将删除以下已合并的分支："
    echo ""
    for branch in "${branches_to_delete[@]}"; do
        echo "  - $branch"
    done
    echo ""
    echo "共 ${#branches_to_delete[@]} 个分支"
    echo ""

    # 确认
    read -p "确认批量删除？(y/n): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        return 1
    fi

    echo ""

    # 批量删除
    local deleted_count=0
    for branch in "${branches_to_delete[@]}"; do
        if git branch -d "$branch" 2>/dev/null; then
            ((deleted_count++))
            log_success "已删除: $branch"
        else
            log_error "删除失败: $branch"
        fi
    done

    echo ""
    log_success "批量删除完成: $deleted_count/${#branches_to_delete[@]}"
    echo ""
    read -p "按回车继续..."
    return 0
}

# ============================================================================
# 交互界面
# ============================================================================

run_interactive_mode() {
    # 获取脚本路径，用于 reload 命令
    local SCRIPT_PATH="${BASH_SOURCE[0]}"

    # 构建 reload 命令：在子 shell 中 source 脚本并生成分支列表
    local RELOAD_CMD="FZF_RELOAD_MODE=1 source '$SCRIPT_PATH' 2>/dev/null && generate_branch_list 2>/dev/null || echo ''"

    while true; do
        # 生成分支列表
        local branch_list=$(generate_branch_list)

        # 如果没有 feature 分支
        if [[ -z "$branch_list" ]]; then
            echo ""
            log_info "没有 feature 分支"
            exit 0
        fi

        # fzf 选择
        local selected=$(echo "$branch_list" | fzf \
            --height=100% \
            --header="Feature 分支管理 | F2:刷新 m:合并 d:差异 r:删除 ctrl-d:批量删除 q:退出" \
            --bind="f2:reload($RELOAD_CMD)" \
            --bind="m:execute-silent(echo merge > $ACTION_FILE; echo {..} > $SELECTED_FILE)+abort" \
            --bind="d:execute-silent(echo diff > $ACTION_FILE; echo {..} > $SELECTED_FILE)+abort" \
            --bind="r:execute-silent(echo remove > $ACTION_FILE; echo {..} > $SELECTED_FILE)+abort" \
            --bind="ctrl-d:execute-silent(echo batch-delete > $ACTION_FILE)+abort" \
            --bind="q:abort" \
            --prompt="选择分支: " \
            --pointer="▶" \
            --marker="✓" \
            --no-multi \
            --reverse \
            --border \
            --color="header:italic:underline" \
            2>/dev/null) || true

        # 检查是否有操作
        if [[ -f "$ACTION_FILE" ]]; then
            local action=$(cat "$ACTION_FILE")
            rm -f "$ACTION_FILE"

            case "$action" in
                merge)
                    if [[ -f "$SELECTED_FILE" ]]; then
                        local selected_branch=$(cat "$SELECTED_FILE")
                        rm -f "$SELECTED_FILE"
                        clear
                        merge_branch "$selected_branch"
                        echo ""
                        read -p "按回车继续..."
                    fi
                    ;;
                diff)
                    if [[ -f "$SELECTED_FILE" ]]; then
                        local selected_branch=$(cat "$SELECTED_FILE")
                        rm -f "$SELECTED_FILE"
                        show_branch_diff "$selected_branch"
                    fi
                    ;;
                remove)
                    if [[ -f "$SELECTED_FILE" ]]; then
                        local selected_branch=$(cat "$SELECTED_FILE")
                        rm -f "$SELECTED_FILE"
                        clear
                        remove_branch "$selected_branch"
                        echo ""
                        read -p "按回车继续..."
                    fi
                    ;;
                batch-delete)
                    clear
                    batch_delete_branches
                    ;;
            esac
        else
            # 用户按 q 或 Ctrl+C 退出
            break
        fi

        # 清屏准备下一次循环
        clear
    done
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    clear
    echo ""
    echo "🌳 Feature 分支管理"
    echo "==================="
    echo ""

    # 1. 依赖检查
    check_fzf

    # 2. 环境检查
    check_current_branch

    echo ""

    # 3. 进入交互模式
    run_interactive_mode

    echo ""
    log_info "退出分支管理"
    echo ""
}

# 执行主流程
# 当在 fzf reload 模式下被 source 时，不执行 main 函数
if [[ -z "$FZF_RELOAD_MODE" ]]; then
    main "$@"
fi
