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
CYAN='\033[0;36m'
GRAY='\033[0;90m'
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

# 获取最后提交时间（相对时间）
get_last_commit_time() {
    local branch="$1"
    git log -1 --format="%ar" "$branch" 2>/dev/null || echo "未知"
}

# 获取提交数量（相对 develop）
get_commit_count() {
    local branch="$1"
    local count=$(git rev-list --count develop.."$branch" 2>/dev/null)
    echo "${count:-0}"
}

# 检查 worktree 是否有未提交修改
check_worktree_dirty() {
    local worktree_path="$1"

    if [[ -z "$worktree_path" ]]; then
        echo ""
        return
    fi

    if [[ -n $(git -C "$worktree_path" status --porcelain 2>/dev/null) ]]; then
        echo "dirty"
    else
        echo "clean"
    fi
}

# 格式化 worktree 状态符号
format_worktree_status() {
    local status="$1"

    case "$status" in
        dirty)
            echo " ${YELLOW}⚠️${NC}"
            ;;
        clean)
            echo " ${GREEN}✓${NC}"
            ;;
        *)
            echo ""
            ;;
    esac
}

# 从格式化的行中提取分支名
extract_branch_name() {
    local branch_line="$1"
    # 移除 ANSI 颜色代码，提取第二列（分支名）
    echo "$branch_line" | sed -E 's/\x1b\[[0-9;]*m//g' | awk '{print $2}'
}

# 获取分支详细信息（用于详情视图）
get_branch_details() {
    local branch="$1"

    # 最后提交的绝对时间
    local commit_time_abs=$(git log -1 --format="%ci" "$branch" 2>/dev/null || echo "未知")

    # 提交者
    local commit_author=$(git log -1 --format="%an <%ae>" "$branch" 2>/dev/null || echo "未知")

    # 提交信息
    local commit_message=$(git log -1 --format="%s" "$branch" 2>/dev/null || echo "无提交信息")

    # 文件修改统计
    local files_stat=$(git diff --shortstat develop.."$branch" 2>/dev/null || echo "")

    # 输出为分隔的字符串（使用 | 分隔）
    echo "${commit_time_abs}|${commit_author}|${commit_message}|${files_stat}"
}

# 获取 worktree 详细状态
get_worktree_details() {
    local worktree_path="$1"

    if [[ -z "$worktree_path" ]] || [[ ! -d "$worktree_path" ]]; then
        echo ""
        return
    fi

    # 获取状态摘要
    local status=$(git -C "$worktree_path" status --short 2>/dev/null)

    if [[ -z "$status" ]]; then
        echo ""
        return
    fi

    # 统计修改类型
    local modified=$(echo "$status" | grep -c "^ M" || echo "0")
    local added=$(echo "$status" | grep -c "^??" || echo "0")
    local deleted=$(echo "$status" | grep -c "^ D" || echo "0")

    local result=""
    [[ "$modified" -gt 0 ]] && result="${modified} 个文件已修改"
    [[ "$added" -gt 0 ]] && result="${result}${result:+，}${added} 个新文件"
    [[ "$deleted" -gt 0 ]] && result="${result}${result:+，}${deleted} 个文件已删除"

    echo "$result"
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
        local merged_mark="${GRAY}•${NC}"
        if is_branch_merged "$branch"; then
            merged_mark="${GREEN}✓${NC}"
        fi

        # 获取最后提交时间
        local commit_time=$(get_last_commit_time "$branch")
        local time_info="${CYAN}(${commit_time})${NC}"

        # 获取提交数量
        local commit_count=$(get_commit_count "$branch")
        local count_info="${BLUE}+${commit_count}↑${NC}"

        # 获取 worktree 路径
        local worktree_path=$(get_branch_worktree "$branch")
        local worktree_info=""
        local worktree_status_symbol=""

        if [[ -n "$worktree_path" ]]; then
            local formatted_path=$(format_worktree_path "$worktree_path")
            worktree_info=" → $formatted_path"

            # 检查 worktree 状态
            local worktree_status=$(check_worktree_dirty "$worktree_path")
            worktree_status_symbol=$(format_worktree_status "$worktree_status")
        fi

        # 输出格式化的分支信息
        echo -e "${merged_mark} ${branch} ${time_info} ${count_info}${worktree_info}${worktree_status_symbol}"
    done <<< "$branches"
}

# ============================================================================
# 分支操作
# ============================================================================

# 合并分支
merge_branch() {
    local branch_line="$1"
    # 从格式化的行中提取分支名
    local branch=$(extract_branch_name "$branch_line")

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
    local branch=$(extract_branch_name "$branch_line")

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
    # 从格式化的行中提取分支名
    local branch=$(extract_branch_name "$branch_line")
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
    if ! is_branch_merged "$branch"; then
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

# 显示分支详细信息
show_branch_info() {
    local branch_line="$1"
    # 从格式化的行中提取分支名
    local branch=$(extract_branch_name "$branch_line")

    echo ""
    echo "╭─────────────────────────────────────────────────╮"
    echo "│ 分支详情: $branch"
    echo "╰─────────────────────────────────────────────────╯"
    echo ""

    # 状态部分
    echo -e "${BLUE}状态${NC}"

    # 合并状态
    if is_branch_merged "$branch"; then
        echo -e "  合并状态: ${GREEN}✓ 已合并到 develop${NC}"
    else
        echo -e "  合并状态: ${GRAY}• 未合并${NC}"
    fi

    # Worktree 信息
    local worktree_path=$(get_branch_worktree "$branch")
    if [[ -n "$worktree_path" ]]; then
        local worktree_status=$(check_worktree_dirty "$worktree_path")
        if [[ "$worktree_status" == "dirty" ]]; then
            echo -e "  Worktree: $worktree_path ${YELLOW}⚠️ 有未提交修改${NC}"
        else
            echo -e "  Worktree: $worktree_path ${GREEN}✓ 工作区干净${NC}"
        fi
    else
        echo -e "  Worktree: ${GRAY}无关联${NC}"
    fi

    echo ""

    # 最后提交部分
    echo -e "${BLUE}最后提交${NC}"

    local details=$(get_branch_details "$branch")
    IFS='|' read -r commit_time_abs commit_author commit_message files_stat <<< "$details"

    local commit_time_rel=$(get_last_commit_time "$branch")
    echo "  时间: $commit_time_rel ($commit_time_abs)"
    echo "  作者: $commit_author"
    echo "  信息: $commit_message"

    echo ""

    # 分支统计部分
    echo -e "${BLUE}分支统计${NC}"

    local commit_count=$(get_commit_count "$branch")
    echo "  相对 develop: 领先 ${commit_count} 个提交"

    if [[ -n "$files_stat" ]]; then
        echo "  文件修改: $files_stat"
    else
        echo "  文件修改: 无修改"
    fi

    # Worktree 详细状态（如果有）
    if [[ -n "$worktree_path" ]]; then
        echo ""
        echo -e "${BLUE}Worktree 状态${NC}"
        echo "  工作目录: $worktree_path"

        local worktree_details=$(get_worktree_details "$worktree_path")
        if [[ -n "$worktree_details" ]]; then
            echo "  未提交修改: $worktree_details"
        else
            echo -e "  未提交修改: ${GREEN}工作区干净${NC}"
        fi
    fi

    echo ""
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
            --header="Feature 分支管理 | F2:刷新 i:详情 m:合并 d:差异 r:删除 ctrl-d:批量删除 q:退出" \
            --bind="f2:reload($RELOAD_CMD)" \
            --bind="i:execute-silent(echo info > $ACTION_FILE; echo {..} > $SELECTED_FILE)+abort" \
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
            --ansi \
            --color="header:italic:underline" \
            2>/dev/null) || true

        # 检查是否有操作
        if [[ -f "$ACTION_FILE" ]]; then
            local action=$(cat "$ACTION_FILE")
            rm -f "$ACTION_FILE"

            case "$action" in
                info)
                    if [[ -f "$SELECTED_FILE" ]]; then
                        local selected_branch=$(cat "$SELECTED_FILE")
                        rm -f "$SELECTED_FILE"
                        clear
                        show_branch_info "$selected_branch"
                        read -p "按回车继续..."
                    fi
                    ;;
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
