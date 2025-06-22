#!/bin/bash

# 聚义厅MCP客户端发布脚本
# 自动化构建、测试和发布流程

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="聚义厅MCP客户端"
PACKAGE_NAME="@juyiting/mcp-client"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 检查必要工具
check_dependencies() {
    log_step "检查依赖工具..."
    
    local missing_tools=()
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js")
    else
        node_version=$(node --version)
        log_info "Node.js 版本: $node_version"
        
        # 检查 Node.js 版本是否符合要求 (18+)
        node_major=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_major" -lt 18 ]; then
            log_error "Node.js 版本过低，需要 18.0.0 或更高版本"
            exit 1
        fi
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        npm_version=$(npm --version)
        log_info "npm 版本: $npm_version"
    fi
    
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    else
        git_version=$(git --version)
        log_info "$git_version"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "所有依赖工具已安装"
}

# 检查项目根目录
check_project_root() {
    log_step "检查项目根目录..."
    
    if [ ! -f "package.json" ]; then
        log_error "未找到 package.json，请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 验证项目名称
    current_package=$(node -p "require('./package.json').name")
    if [ "$current_package" != "$PACKAGE_NAME" ]; then
        log_error "项目名称不匹配，期望: $PACKAGE_NAME，实际: $current_package"
        exit 1
    fi
    
    log_success "项目根目录检查通过"
}

# 检查工作区状态
check_workspace() {
    log_step "检查工作区状态..."
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_warning "工作区有未提交的更改"
        git status --porcelain
        echo
        read -p "是否继续发布? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "发布已取消"
            exit 0
        fi
    fi
    
    # 检查当前分支
    current_branch=$(git branch --show-current)
    log_info "当前分支: $current_branch"
    
    if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
        log_warning "当前不在主分支"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "发布已取消"
            exit 0
        fi
    fi
    
    # 检查是否是最新代码
    git fetch origin
    if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/$current_branch)" ]; then
        log_warning "本地代码不是最新的"
        read -p "是否先拉取最新代码? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            git pull origin "$current_branch"
            log_success "已拉取最新代码"
        fi
    fi
    
    log_success "工作区状态检查通过"
}

# 安装依赖
install_dependencies() {
    log_step "安装项目依赖..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "依赖安装完成"
}

# 代码质量检查
quality_check() {
    log_step "执行代码质量检查..."
    
    # TypeScript 类型检查
    log_info "执行 TypeScript 类型检查..."
    if npm run type-check; then
        log_success "类型检查通过"
    else
        log_error "类型检查失败"
        exit 1
    fi
    
    # ESLint 代码检查
    log_info "执行 ESLint 代码检查..."
    if npm run lint; then
        log_success "代码检查通过"
    else
        log_warning "代码检查发现问题"
        read -p "是否尝试自动修复? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            npm run lint:fix
            log_info "已尝试自动修复，请检查结果"
        fi
    fi
    
    log_success "代码质量检查完成"
}

# 运行测试
run_tests() {
    log_step "运行测试套件..."
    
    # 运行单元测试和集成测试
    if npm test; then
        log_success "所有测试通过"
    else
        log_error "测试失败，发布中止"
        
        # 询问是否查看覆盖率报告
        read -p "是否生成测试覆盖率报告? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run test:coverage
        fi
        
        exit 1
    fi
    
    # 可选：生成覆盖率报告
    read -p "是否生成测试覆盖率报告? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run test:coverage
        log_info "覆盖率报告已生成"
    fi
}

# 构建项目
build_project() {
    log_step "构建项目..."
    
    # 清理旧的构建文件
    log_info "清理旧的构建文件..."
    npm run clean
    
    # 执行构建
    log_info "执行 TypeScript 编译..."
    if npm run build; then
        log_success "构建完成"
    else
        log_error "构建失败"
        exit 1
    fi
    
    # 检查构建输出
    if [ ! -d "dist" ] || [ ! -f "dist/server.js" ]; then
        log_error "构建输出不完整，缺少关键文件"
        exit 1
    fi
    
    # 验证构建文件可执行
    log_info "验证构建文件..."
    if node dist/server.js --version &> /dev/null || node dist/server.js --help &> /dev/null; then
        log_success "构建文件验证通过"
    else
        log_warning "构建文件验证失败，但继续发布流程"
    fi
}

# 版本管理
manage_version() {
    log_step "管理版本..."
    
    # 获取当前版本
    current_version=$(node -p "require('./package.json').version")
    log_info "当前版本: $current_version"
    
    # 计算可能的新版本
    patch_version=$(npm version patch --dry-run | cut -d'v' -f2)
    minor_version=$(npm version minor --dry-run | cut -d'v' -f2)
    major_version=$(npm version major --dry-run | cut -d'v' -f2)
    
    # 询问版本类型
    echo
    echo "选择版本更新类型:"
    echo "1) patch (修复) - $current_version -> $patch_version"
    echo "2) minor (功能) - $current_version -> $minor_version"
    echo "3) major (重大) - $current_version -> $major_version"
    echo "4) 跳过版本更新"
    echo
    
    read -p "请选择 (1-4): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            new_version=$(npm version patch --no-git-tag-version)
            log_success "版本已更新为: $new_version"
            version_updated=true
            ;;
        2)
            new_version=$(npm version minor --no-git-tag-version)
            log_success "版本已更新为: $new_version"
            version_updated=true
            ;;
        3)
            new_version=$(npm version major --no-git-tag-version)
            log_success "版本已更新为: $new_version"
            version_updated=true
            ;;
        4)
            log_info "跳过版本更新"
            new_version="v$current_version"
            version_updated=false
            ;;
        *)
            log_error "无效选择"
            exit 1
            ;;
    esac
}

# 发布前检查
pre_publish_check() {
    log_step "执行发布前检查..."
    
    # 检查 package.json 必要字段
    log_info "检查 package.json 配置..."
    if ! node -e "
        const pkg = require('./package.json');
        const required = ['name', 'version', 'description', 'main', 'bin'];
        const missing = required.filter(field => !pkg[field]);
        if (missing.length > 0) {
            console.error('缺少必要字段:', missing.join(', '));
            process.exit(1);
        }
        console.log('package.json 配置检查通过');
    "; then
        log_error "package.json 配置不完整"
        exit 1
    fi
    
    # 检查关键文件
    local missing_files=()
    
    if [ ! -f "README.md" ]; then
        missing_files+=("README.md")
    fi
    
    if [ ! -f "LICENSE" ]; then
        missing_files+=("LICENSE")
    fi
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        log_warning "缺少文件: ${missing_files[*]}"
        read -p "是否继续发布? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "发布已取消"
            exit 0
        fi
    fi
    
    # 检查 .npmignore 或 files 字段
    if [ ! -f ".npmignore" ]; then
        log_info "检查 package.json files 字段配置..."
        files_config=$(node -p "JSON.stringify(require('./package.json').files || [])")
        log_info "将发布的文件: $files_config"
    fi
    
    log_success "发布前检查完成"
}

# 发布到 npm
publish_to_npm() {
    log_step "发布到 npm..."
    
    # 检查是否已登录 npm
    if ! npm whoami &> /dev/null; then
        log_error "未登录 npm，请先运行 'npm login'"
        log_info "如果是首次发布，请确保已注册 npm 账号并加入 @juyiting 组织"
        exit 1
    fi
    
    local npm_user=$(npm whoami)
    log_info "当前 npm 用户: $npm_user"
    
    # 显示发布信息
    local package_name=$(node -p "require('./package.json').name")
    local package_version=$(node -p "require('./package.json').version")
    
    echo
    log_info "准备发布包信息:"
    echo "  包名: $package_name"
    echo "  版本: $package_version"
    echo "  用户: $npm_user"
    echo
    
    # 检查版本是否已存在
    if npm view "$package_name@$package_version" version &> /dev/null; then
        log_error "版本 $package_version 已存在于 npm registry"
        exit 1
    fi
    
    # 确认发布
    read -p "确认发布到 npm? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "发布已取消"
        exit 0
    fi
    
    # 执行发布
    log_info "正在发布..."
    if npm publish --access public; then
        log_success "发布成功: $package_name@$package_version"
        echo
        log_info "包地址: https://www.npmjs.com/package/$package_name"
    else
        log_error "发布失败"
        exit 1
    fi
}

# 创建 Git 标签并推送
create_git_tag() {
    if [ "$version_updated" = true ]; then
        log_step "创建 Git 标签..."
        
        local package_version=$(node -p "require('./package.json').version")
        local tag_name="v$package_version"
        
        # 提交版本更改
        git add package.json package-lock.json
        git commit -m "chore: bump version to $package_version"
        
        # 创建标签
        git tag -a "$tag_name" -m "Release $tag_name"
        
        log_success "已创建标签: $tag_name"
    fi
}

# 推送到 Git
push_to_git() {
    log_step "推送更改到 Git..."
    
    local current_branch=$(git branch --show-current)
    
    # 推送代码
    git push origin "$current_branch"
    
    # 推送标签
    git push origin --tags
    
    log_success "已推送到 Git 仓库"
}

# 生成二进制包（可选）
build_binaries() {
    read -p "是否生成跨平台二进制包? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_step "生成跨平台二进制包..."
        
        if npm run package; then
            log_success "二进制包生成完成，位于 ./releases/ 目录"
            ls -la releases/
        else
            log_warning "二进制包生成失败，但不影响发布"
        fi
    fi
}

# 清理临时文件
cleanup() {
    log_step "清理临时文件..."
    
    # 清理 npm 缓存
    # npm cache clean --force
    
    log_success "清理完成"
}

# 显示发布总结
show_summary() {
    local package_name=$(node -p "require('./package.json').name")
    local package_version=$(node -p "require('./package.json').version")
    
    echo
    echo "🎉 $PROJECT_NAME 发布完成！"
    echo
    echo "📦 发布信息:"
    echo "  包名: $package_name"
    echo "  版本: $package_version"
    echo "  时间: $(date)"
    echo
    echo "🔗 相关链接:"
    echo "  NPM 包: https://www.npmjs.com/package/$package_name"
    echo "  安装命令: npm install -g $package_name"
    echo "  使用命令: npx $package_name"
    echo
    echo "📋 后续步骤建议:"
    echo "  1. 更新项目文档和 CHANGELOG"
    echo "  2. 通知团队成员新版本发布"
    echo "  3. 在相关平台发布更新说明"
    echo "  4. 收集用户反馈和改进建议"
    echo
}

# 主函数
main() {
    echo "🚀 开始 $PROJECT_NAME 发布流程..."
    echo "========================================"
    
    # 初始化变量
    version_updated=false
    
    # 执行发布流程
    check_dependencies
    check_project_root
    check_workspace
    install_dependencies
    quality_check
    run_tests
    build_project
    manage_version
    pre_publish_check
    publish_to_npm
    create_git_tag
    push_to_git
    build_binaries
    cleanup
    show_summary
}

# 错误处理
trap 'log_error "发布过程中出现错误 (退出码: $?)"; cleanup; exit 1' ERR

# 执行主函数
main "$@" 