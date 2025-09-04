#!/bin/bash

# 部署脚本 - 支持通过 git pull 更新代码并重启服务
# 使用方法: ./scripts/deploy.sh [环境]
# 环境: production (默认) 或 development

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 获取环境参数
ENVIRONMENT=${1:-production}
PROJECT_DIR="/www/wwwroot/wx_ziyouyueke_service"

log_info "开始部署到 $ENVIRONMENT 环境..."

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "项目目录不存在: $PROJECT_DIR"
    exit 1
fi

# 进入项目目录
cd "$PROJECT_DIR"

# 检查git仓库状态
log_info "检查Git仓库状态..."
if ! git status > /dev/null 2>&1; then
    log_error "不是有效的Git仓库"
    exit 1
fi

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)
log_info "当前分支: $CURRENT_BRANCH"

# 拉取最新代码
log_info "拉取最新代码..."
git fetch origin

# 检查是否有更新
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$CURRENT_BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    log_warning "代码已是最新版本，无需更新"
else
    log_info "发现新版本，开始更新..."
    git pull origin $CURRENT_BRANCH
    log_success "代码更新完成"
fi

# 安装依赖
log_info "安装/更新依赖包..."
npm install --production

# 运行数据库迁移
log_info "运行数据库迁移..."
if npm run migrate; then
    log_success "数据库迁移完成"
else
    log_warning "数据库迁移失败或无需迁移"
fi

# 重启服务
log_info "重启PM2服务..."

if [ "$ENVIRONMENT" = "production" ]; then
    # 生产环境：使用新的微服务配置
    if pm2 list | grep -q "wx_ziyouyueke"; then
        log_info "停止现有服务..."
        pm2 stop all
        pm2 delete all
    fi
    
    log_info "启动生产环境服务..."
    pm2 start ecosystem.production.config.js --env production
    pm2 save
else
    # 开发环境
    if pm2 list | grep -q "wx_ziyouyueke"; then
        log_info "重启现有服务..."
        pm2 restart all
    else
        log_info "启动开发环境服务..."
        pm2 start ecosystem.bt.config.js --env development
    fi
fi

# 检查服务状态
log_info "检查服务状态..."
sleep 3
pm2 status

# 显示服务日志
log_info "显示最近的服务日志..."
pm2 logs --lines 20

log_success "部署完成！"
log_info "服务状态: pm2 status"
log_info "查看日志: pm2 logs"
log_info "重启服务: pm2 restart all"
