# 自由约课管理端 API 文档

## 📝 概述

本文档描述了自由约课微信小程序管理端的 RESTful API 接口。管理端提供用户管理、课程管理等功能。

**基础信息：**
- 基础URL: `http://localhost:3001/api/admin` (开发环境)
- 生产环境: `http://your-admin-domain.com/api/admin`
- 认证方式: JWT Token (Bearer Authentication)
- 内容类型: `application/json`
- 字符编码: `UTF-8`

## 🔐 认证说明

除登录接口外，所有接口都需要在请求头中携带有效的 JWT Token：

```
Authorization: Bearer <your_jwt_token>
```

## 📋 通用响应格式

### 成功响应
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": 1234567890
}
```

### 错误响应
```json
{
  "success": false,
  "code": 400,
  "message": "错误信息",
  "timestamp": 1234567890
}
```

## 📚 接口列表

---

## 🔑 认证管理

### 1. 管理员登录

**接口地址:** `POST /auth/login`

**请求参数:**
```json
{
  "username": "admin",
  "password": "lucky123"
}
```

**参数说明:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": 1,
      "username": "admin",
      "real_name": "系统管理员",
      "email": null,
      "last_login_time": "2025-01-01T12:00:00.000Z"
    }
  },
  "timestamp": 1234567890
}
```

### 2. 管理员退出登录

**接口地址:** `POST /auth/logout`

**请求头:** 需要 Authorization

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "退出登录成功",
  "data": null,
  "timestamp": 1234567890
}
```

### 3. 获取管理员信息

**接口地址:** `GET /auth/profile`

**请求头:** 需要 Authorization

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取管理员信息成功",
  "data": {
    "id": 1,
    "username": "admin",
    "real_name": "系统管理员",
    "email": null,
    "last_login_time": "2025-01-01T12:00:00.000Z",
    "status": 1
  },
  "timestamp": 1234567890
}
```

---

## 👥 用户管理

### 1. 获取用户列表

**接口地址:** `GET /users`

**请求头:** 需要 Authorization

**查询参数:**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| limit | integer | 否 | 20 | 每页数量（1-100） |
| keyword | string | 否 | - | 搜索关键词（昵称/手机号） |
| status | integer | 否 | - | 用户状态（0-禁用，1-正常） |
| start_date | string | 否 | - | 注册开始日期（YYYY-MM-DD） |
| end_date | string | 否 | - | 注册结束日期（YYYY-MM-DD） |

**请求示例:**
```
GET /users?page=1&limit=20&keyword=张三&status=1&start_date=2025-01-01&end_date=2025-01-31
```

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取用户列表成功",
  "data": {
    "users": [
      {
        "id": 1,
        "nickname": "张三",
        "avatar_url": "https://example.com/avatar.jpg",
        "phone": "13800138000",
        "gender": "男",
        "register_time": "2025-01-01T12:00:00.000Z",
        "last_login_time": "2025-01-02T10:30:00.000Z",
        "status": 1,
        "status_text": "正常"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  },
  "timestamp": 1234567890
}
```

### 2. 获取用户详情

**接口地址:** `GET /users/{id}`

**请求头:** 需要 Authorization

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 用户ID |

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取用户详情成功",
  "data": {
    "id": 1,
    "openid": "oXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "unionid": "uXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "nickname": "张三",
    "avatar_url": "https://example.com/avatar.jpg",
    "phone": "13800138000",
    "gender": "男",
    "gender_value": 1,
    "intro": "这是我的个人介绍",
    "register_time": "2025-01-01T12:00:00.000Z",
    "last_login_time": "2025-01-02T10:30:00.000Z",
    "status": 1,
    "status_text": "正常"
  },
  "timestamp": 1234567890
}
```

### 3. 删除用户

**接口地址:** `DELETE /users/{id}`

**请求头:** 需要 Authorization

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 用户ID |

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "删除用户成功",
  "data": null,
  "timestamp": 1234567890
}
```

### 4. 修改用户状态

**接口地址:** `PUT /users/{id}/status`

**请求头:** 需要 Authorization

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 用户ID |

**请求参数:**
```json
{
  "status": 1
}
```

**参数说明:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | integer | 是 | 用户状态（0-禁用，1-正常） |

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "启用用户成功",
  "data": null,
  "timestamp": 1234567890
}
```

---

## 📚 课程管理

### 1. 获取课程列表

**接口地址:** `GET /courses`

**请求头:** 需要 Authorization

**查询参数:**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| limit | integer | 否 | 20 | 每页数量（1-100） |
| keyword | string | 否 | - | 搜索关键词（学员昵称/手机号） |
| status | integer | 否 | - | 课程状态（1-待确认，2-已确认，3-已完成，4-已取消，5-超时取消） |
| start_date | string | 否 | - | 课程开始日期（YYYY-MM-DD） |
| end_date | string | 否 | - | 课程结束日期（YYYY-MM-DD） |

**请求示例:**
```
GET /courses?page=1&limit=20&keyword=张三&status=2&start_date=2025-01-01&end_date=2025-01-31
```

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取课程列表成功",
  "data": {
    "courses": [
      {
        "id": 1,
        "student": {
          "id": 1,
          "nickname": "张三",
          "phone": "13800138000",
          "avatar_url": "https://example.com/avatar.jpg"
        },
        "coach": {
          "id": 2,
          "nickname": "李教练",
          "phone": "13900139000",
          "avatar_url": "https://example.com/coach.jpg"
        },
        "course_date": "2025-01-15",
        "start_time": "14:00:00",
        "end_time": "16:00:00",
        "booking_status": 2,
        "status_text": "已确认",
        "address": {
          "id": 1,
          "name": "训练场A",
          "detailed_address": "北京市朝阳区XXX路XXX号"
        },
        "student_remark": "希望重点练习技巧",
        "coach_remark": "学员基础较好",
        "confirmed_at": "2025-01-10T10:00:00.000Z",
        "cancelled_at": null,
        "cancel_reason": null,
        "complete_at": null,
        "created_at": "2025-01-10T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  },
  "timestamp": 1234567890
}
```

### 2. 获取课程详情

**接口地址:** `GET /courses/{id}`

**请求头:** 需要 Authorization

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 课程ID |

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取课程详情成功",
  "data": {
    "id": 1,
    "student": {
      "id": 1,
      "nickname": "张三",
      "phone": "13800138000",
      "avatar_url": "https://example.com/avatar.jpg",
      "gender": "男"
    },
    "coach": {
      "id": 2,
      "nickname": "李教练",
      "phone": "13900139000",
      "avatar_url": "https://example.com/coach.jpg",
      "gender": "女"
    },
    "course_date": "2025-01-15",
    "start_time": "14:00:00",
    "end_time": "16:00:00",
    "booking_status": 2,
    "status_text": "已确认",
    "address": {
      "id": 1,
      "name": "训练场A",
      "detailed_address": "北京市朝阳区XXX路XXX号",
      "latitude": 39.908823,
      "longitude": 116.397470
    },
    "student_remark": "希望重点练习技巧",
    "coach_remark": "学员基础较好",
    "confirmed_at": "2025-01-10T10:00:00.000Z",
    "cancelled_at": null,
    "cancelled_by": null,
    "cancel_reason": null,
    "complete_at": null,
    "created_at": "2025-01-10T08:00:00.000Z",
    "updated_at": "2025-01-10T10:00:00.000Z"
  },
  "timestamp": 1234567890
}
```

### 3. 删除课程

**接口地址:** `DELETE /courses/{id}`

**请求头:** 需要 Authorization

**路径参数:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 课程ID |

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "删除课程成功",
  "data": null,
  "timestamp": 1234567890
}
```

### 4. 获取课程统计

**接口地址:** `GET /courses/stats`

**请求头:** 需要 Authorization

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "获取课程统计成功",
  "data": {
    "total": 120,
    "by_status": {
      "1": {
        "count": 15,
        "name": "待确认"
      },
      "2": {
        "count": 25,
        "name": "已确认"
      },
      "3": {
        "count": 60,
        "name": "已完成"
      },
      "4": {
        "count": 15,
        "name": "已取消"
      },
      "5": {
        "count": 5,
        "name": "超时取消"
      }
    }
  },
  "timestamp": 1234567890
}
```

---

## 🔧 系统健康检查

### 健康检查

**接口地址:** `GET /health`

**无需认证**

**成功响应:**
```json
{
  "success": true,
  "message": "管理端接口正常",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 🚀 启动命令

项目采用微服务架构，支持独立启动：

```bash
# 数据库迁移（首次运行或数据库结构变更时）
npm run migrate

# 启动管理端服务（生产环境，默认端口3001）
npm run start:admin

# 启动H5端服务（生产环境，默认端口3000）
npm run start:h5

# 同时启动两个服务（生产环境）
npm run start:all

# 启动管理端服务（开发环境）
npm run dev:admin

# 启动H5端服务（开发环境）
npm run dev:h5

# 同时启动两个服务（开发环境）
npm run dev:all

# 清理过期日志文件
npm run clean-logs
```

### 服务端口说明
- **H5端服务**: http://localhost:3000
- **管理端服务**: http://localhost:3001
- 可通过环境变量 `H5_PORT` 和 `ADMIN_PORT` 自定义端口

---

## 📊 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（token无效或过期） |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 501 | 功能未实现 |

---

## 🔒 默认管理员账号

**用户名:** `admin`  
**密码:** `lucky123`

> ⚠️ **安全提示:** 生产环境中请及时修改默认密码！

---

## 📝 注意事项

1. **Token 有效期:** 默认24小时，过期后需要重新登录
2. **请求频率限制:** 每个IP每15分钟最多500次请求
3. **分页限制:** 每页最多返回100条记录
4. **删除操作:** 删除用户/课程为物理删除，不可恢复
5. **时间格式:** 所有时间字段均为 ISO 8601 格式 (YYYY-MM-DDTHH:mm:ss.sssZ)

---

## 🔄 更新日志

### v1.1.0 (2025-01-01)
- 🏗️ 重构为微服务架构
- 🚀 支持独立启动管理端和H5端
- 📦 添加数据库迁移脚本
- 🧹 添加日志清理工具
- 🔧 优化启动命令结构

### v1.0.0 (2025-01-01)
- ✨ 初始版本发布
- 🔐 实现管理员认证系统
- 👥 实现用户管理功能
- 📚 实现课程管理功能
- 📖 完善API文档

---

**文档更新时间:** 2025-01-01  
**API版本:** v1.0.0  
**维护团队:** 开发团队
