#!/bin/bash

# 开发环境设置脚本
# 用于检查和配置开发环境的必要组件

set -e

echo "🔧 Spider Mind v2 开发环境设置"
echo "================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查命令是否存在
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 检查 Node.js 版本
check_node() {
    log_info "检查 Node.js..."
    if check_command node; then
        node_version=$(node --version)
        log_success "Node.js 已安装: $node_version"
        
        # 检查版本是否满足要求 (>=18)
        major_version=$(echo $node_version | cut -d. -f1 | sed 's/v//')
        if [ "$major_version" -lt 18 ]; then
            log_error "Node.js 版本过低，需要 >= 18.0.0"
            exit 1
        fi
    else
        log_error "Node.js 未安装"
        log_info "请访问 https://nodejs.org/ 安装 Node.js"
        exit 1
    fi
}

# 检查 Yarn
check_yarn() {
    log_info "检查 Yarn..."
    if check_command yarn; then
        yarn_version=$(yarn --version)
        log_success "Yarn 已安装: v$yarn_version"
    else
        log_error "Yarn 未安装"
        log_info "正在安装 Yarn..."
        npm install -g yarn
        log_success "Yarn 安装完成"
    fi
}

# 检查 Git
check_git() {
    log_info "检查 Git..."
    if check_command git; then
        git_version=$(git --version)
        log_success "Git 已安装: $git_version"
    else
        log_error "Git 未安装"
        log_info "请访问 https://git-scm.com/ 安装 Git"
        exit 1
    fi
}

# 检查环境变量文件
check_env_files() {
    log_info "检查环境变量文件..."
    
    if [ -f ".env.local" ]; then
        log_success ".env.local 文件存在"
    else
        if [ -f ".env.local.example" ]; then
            log_warning ".env.local 不存在，正在从示例文件创建..."
            cp .env.local.example .env.local
            log_success ".env.local 已从示例创建"
            log_warning "请编辑 .env.local 文件并填写正确的配置"
        else
            log_warning ".env.local 和 .env.local.example 都不存在"
            log_info "请创建 .env.local 文件并添加必要的环境变量"
        fi
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    yarn install
    log_success "依赖安装完成"
}

# 安装 Playwright 浏览器
install_playwright_browsers() {
    log_info "安装 Playwright 浏览器..."
    yarn test:e2e:install
    log_success "Playwright 浏览器安装完成"
}

# 设置 Husky
setup_husky() {
    log_info "设置 Git hooks (Husky)..."
    if [ -d ".git" ]; then
        yarn prepare
        log_success "Git hooks 设置完成"
    else
        log_warning "不是 Git 仓库，跳过 Husky 设置"
    fi
}

# 验证环境
validate_environment() {
    log_info "验证开发环境..."
    
    # 类型检查
    log_info "运行类型检查..."
    yarn type-check
    log_success "类型检查通过"
    
    # 代码规范检查
    log_info "运行代码规范检查..."
    yarn lint --quiet
    log_success "代码规范检查通过"
    
    # 单元测试
    log_info "运行单元测试..."
    yarn test:unit --passWithNoTests --silent
    log_success "单元测试通过"
}

# 显示后续步骤
show_next_steps() {
    echo ""
    echo "🎉 开发环境设置完成!"
    echo ""
    echo "接下来你可以运行:"
    echo "  yarn dev              # 启动开发服务器"
    echo "  yarn test:watch       # 启动测试监听模式"
    echo "  yarn test:e2e:ui      # 启动 E2E 测试 UI"
    echo "  yarn validate         # 运行完整验证"
    echo ""
    echo "更多命令请查看 package.json 中的 scripts 部分"
    echo ""
}

# 主函数
main() {
    echo ""
    
    # 基础环境检查
    check_node
    check_yarn
    check_git
    
    # 项目设置
    check_env_files
    install_dependencies
    install_playwright_browsers
    setup_husky
    
    # 环境验证
    validate_environment
    
    # 显示后续步骤
    show_next_steps
}

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

# 运行主函数
main