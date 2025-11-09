# 自由约课微信小程序后端服务

基于 Node.js + Express + MySQL 的自由约课系统后端API服务。

## 项目特性

- 🚀 基于 Express.js 框架
- 🗄️ MySQL 数据库 + Sequelize ORM
- 🔐 JWT 身份认证
- 📱 微信小程序登录集成
- 📬 微信订阅消息推送
- 🛡️ 完善的错误处理和日志记录
- 📝 JSDoc 代码注释
- 🔧 参数验证和安全防护

## 技术栈

- **后端框架**: Express.js
- **数据库**: MySQL
- **ORM**: Sequelize
- **身份认证**: JWT
- **参数验证**: express-validator
- **日志记录**: 自定义 Logger
- **安全防护**: helmet, cors, rate-limit

## 项目结构

```
wx_ziyouyueke_service/
├── app.js                 # 应用入口文件
├── package.json           # 项目依赖配置
├── config/
│   ├── database.js        # 数据库配置
│   └── env.example        # 环境变量模板
├── models/                # 数据模型
│   ├── index.js           # 模型关联配置
│   ├── User.js            # 用户模型
│   ├── StudentCoachRelation.js  # 师生关系模型
│   ├── TimeTemplate.js    # 时间模板模型
│   ├── CourseBooking.js   # 课程预约模型
│   ├── Notification.js    # 消息通知模型
│   └── OperationLog.js    # 操作日志模型
├── controllers/           # 控制器
│   └── h5/               # H5端控制器
│       └── AuthController.js  # 认证控制器
├── routes/               # 路由配置
│   ├── h5/              # H5端路由
│   └── admin/           # 管理端路由（预留）
├── middleware/          # 中间件
│   ├── auth.js         # 认证中间件
│   ├── validation.js   # 参数验证中间件
│   └── errorHandler.js # 错误处理中间件
├── utils/              # 工具函数
│   ├── logger.js       # 日志工具
│   ├── wechat.js       # 微信API工具
│   ├── jwt.js          # JWT工具
│   └── response.js     # 响应格式工具
├── scripts/            # 脚本文件
│   └── migrate.js      # 数据库迁移脚本
├── docs/               # 文档
│   ├── api_design.md   # API接口设计文档
│   └── database_design.md  # 数据库设计文档
└── logs/               # 日志文件目录
```

## 快速开始

### 1. 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下参数：

```env
# 阿里云OSS配置（必填）
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_oss_bucket_name

# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=yueke
DB_USER=root
DB_PASSWORD=

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

```

**重要说明**: 
- OSS配置为必填项，用于文件上传功能
- 请确保 `.env` 文件已添加到 `.gitignore` 中，避免敏感信息泄露
- 生产环境请使用强密码和安全的访问密钥

### 4. 数据库准备

确保 MySQL 服务已启动，然后创建数据库：

```sql
CREATE DATABASE yueke CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 数据库迁移

运行数据库迁移脚本：

```bash
npm run migrate
```

### 6. 启动服务

开发环境：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

服务启动后，访问 http://localhost:3000/health 检查服务状态。

## 功能文档

- [API 接口文档](docs/api_design.md) - 详细的API接口说明
- [数据库设计文档](docs/database_design.md) - 数据库表结构设计
- [订阅消息功能说明](docs/订阅消息功能说明.md) - 微信订阅消息集成指南

## API 文档

详细的API接口文档请参考：[API设计文档](docs/api_design.md)

### 主要接口

- **认证相关**: `/api/h5/auth/*`
  - `POST /api/h5/auth/login` - 用户登录
  - `POST /api/h5/auth/logout` - 用户登出
  - `GET /api/h5/auth/verify` - 验证token

- **用户管理**: `/api/h5/user/*`
- **教练功能**: `/api/h5/coach/*`
- **学员功能**: `/api/h5/student/*`
- **课程管理**: `/api/h5/courses/*`
- **关系管理**: `/api/h5/relations/*`
- **时间模板**: `/api/h5/time-templates/*`

## 数据库设计

详细的数据库设计文档请参考：[数据库设计文档](docs/database_design.md)

### 核心表结构

- `users` - 用户表
- `student_coach_relations` - 师生关系表
- `time_templates` - 时间模板表
- `course_bookings` - 课程预约表
- `notifications` - 消息通知表
- `operation_logs` - 操作日志表

## 开发说明

### 代码规范

- 使用 JSDoc 注释格式
- 遵循 RESTful API 设计原则
- 统一的错误处理和响应格式
- 完善的参数验证

### 错误码定义

| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| 1001 | 参数错误 | 400 |
| 1002 | 用户未登录 | 401 |
| 1003 | 权限不足 | 403 |
| 1004 | 资源不存在 | 404 |
| 2001 | 微信登录失败 | 400 |
| 2002 | Token无效 | 401 |
| 5001 | 数据库操作失败 | 500 |
| 5002 | 系统内部错误 | 500 |

### 日志记录

系统会自动记录以下日志：
- 请求访问日志
- 错误异常日志
- 业务操作日志
- 数据库操作日志

日志文件存储在 `logs/` 目录下，按日期分文件存储。

### 订阅消息功能

项目已集成微信小程序订阅消息功能，支持以下场景：

- **预约确认提醒**: 学员或教练创建课程预约后，自动通知对方
- **预约成功通知**: 课程预约确认后，自动通知预约发起人

详细说明请参考：[订阅消息功能说明](docs/订阅消息功能说明.md)

## 部署说明

### 生产环境配置

1. 设置环境变量 `NODE_ENV=production`
2. 配置生产数据库连接
3. 设置强密码的 JWT_SECRET
4. 配置正确的微信小程序 AppID 和 AppSecret
5. 设置适当的 CORS 域名白名单

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name "yueke-api"

# 查看状态
pm2 status

# 查看日志
pm2 logs yueke-api
```

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。 