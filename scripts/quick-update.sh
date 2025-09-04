#!/bin/bash

# 快速更新脚本 - 仅拉取代码并重启服务
# 使用方法: ./scripts/quick-update.sh

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

PROJECT_DIR="/www/wwwroot/wx_ziyouyueke_service"

log_info "快速更新开始..."

cd "$PROJECT_DIR"

# 拉取最新代码
log_info "拉取最新代码..."
git pull origin main

# 重启服务
log_info "重启服务..."
pm2 restart all

log_success "快速更新完成！"
