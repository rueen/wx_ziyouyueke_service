# 微信约课系统 API 接口文档

## 概述

本文档描述了微信小程序约课系统的后端API接口，供前端开发工程师进行本地接口联调使用。

### 服务信息
- **基础URL**: `http://localhost:3000`
- **接口版本**: v1.0.0
- **数据格式**: JSON
- **字符编码**: UTF-8

### 接口规范

#### 统一响应格式

所有接口都采用统一的响应格式：

```json
{
  "success": true,         // 请求是否成功
  "code": 200,            // 业务状态码
  "message": "操作成功",   // 响应消息
  "data": {},             // 响应数据
  "timestamp": 1638360000000  // 时间戳
}
```

#### 认证方式

需要认证的接口在请求头中携带JWT Token：

```
Authorization: Bearer <token>
```

#### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 1001 | 参数错误 |
| 1002 | 用户未登录 |
| 1003 | 权限不足 |
| 1004 | 资源不存在 |
| 2001 | 微信接口调用失败 |
| 2002 | Token无效或已过期 |
| 5001 | 数据库操作失败 |
| 5002 | 系统内部错误 |
| 429 | 请求过于频繁 |

---

## 基础接口

### 1. 健康检查

**接口地址**: `GET /health`

**接口描述**: 检查服务运行状态

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "message": "服务运行正常",
  "timestamp": "2025-06-02T07:32:10.785Z",
  "version": "1.0.0"
}
```

---

## H5端接口

### 用户认证模块 (`/api/h5/auth`)

#### 1. 用户登录

**接口地址**: `POST /api/h5/auth/login`

**接口描述**: 微信小程序用户登录/注册

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| code | string | 是 | 微信登录凭证 |
| userInfo | object | 否 | 用户信息对象 |
| userInfo.nickname | string | 否 | 用户昵称（最大100字符） |
| userInfo.avatarUrl | string | 否 | 头像URL |
| userInfo.gender | number | 否 | 性别：0-未知，1-男，2-女 |
| coach_id | number | 否 | 教练ID（新用户自动绑定） |

**请求示例**:
```json
{
  "code": "wx_login_code_from_wechat",
  "userInfo": {
    "nickname": "张三",
    "avatarUrl": "https://example.com/avatar.jpg",
    "gender": 1
  },
  "coach_id": 123
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "openid": "wx_openid_123456",
      "nickname": "张三",
      "avatar_url": "https://example.com/avatar.jpg",
      "phone": null,
      "gender": 1,
      "intro": null,
      "register_time": "2025-06-02T07:30:00.000Z",
      "last_login_time": "2025-06-02T07:32:00.000Z",
      "roles": {
        "isCoach": false,
        "isStudent": true
      }
    },
    "isNewUser": true,
    "autoBindCoach": true
  },
  "timestamp": 1638360000000
}
```

#### 2. 用户登出

**接口地址**: `POST /api/h5/auth/logout`

**接口描述**: 用户登出

**认证**: 需要

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "登出成功",
  "data": null,
  "timestamp": 1638360000000
}
```

#### 3. 刷新Token

**接口地址**: `POST /api/h5/auth/refresh`

**接口描述**: 刷新用户Token

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| token | string | 是 | 当前的JWT Token |

**请求示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "Token刷新成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": 1638360000000
}
```

#### 4. 验证Token

**接口地址**: `GET /api/h5/auth/verify`

**接口描述**: 验证Token有效性并获取用户信息

**认证**: 需要

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "Token有效",
  "data": {
    "user": {
      "id": 1,
      "openid": "wx_openid_123456",
      "nickname": "张三",
      "avatar_url": "https://example.com/avatar.jpg",
      "phone": "13800138000",
      "gender": 1,
      "intro": "我是一名学员",
      "roles": {
        "isCoach": false,
        "isStudent": true
      }
    }
  },
  "timestamp": 1638360000000
}
```

### 用户信息模块 (`/api/h5/user`)

#### 1. 获取用户信息

**接口地址**: `GET /api/h5/user/profile`

**接口描述**: 获取当前用户的详细信息

**认证**: 需要

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "id": 1,
    "openid": "wx_openid_123456",
    "nickname": "张三",
    "avatar_url": "https://example.com/avatar.jpg",
    "phone": "13800138000",
    "gender": 1,
    "intro": "我是一名学员",
    "register_time": "2025-06-02T07:30:00.000Z",
    "last_login_time": "2025-06-02T07:32:00.000Z",
    "status": 1,
    "roles": {
      "isCoach": false,
      "isStudent": true
    }
  },
  "timestamp": 1638360000000
}
```

#### 2. 更新用户信息

**接口地址**: `PUT /api/h5/user/profile`

**接口描述**: 更新用户个人信息

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| nickname | string | 否 | 用户昵称（1-100字符） |
| phone | string | 否 | 手机号（中国大陆格式） |
| gender | number | 否 | 性别：0-未知，1-男，2-女 |
| intro | string | 否 | 个人介绍（最大500字符） |

**请求示例**:
```json
{
  "nickname": "张三丰",
  "phone": "13800138000",
  "gender": 1,
  "intro": "专业健身教练"
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "用户信息更新成功",
  "data": {
    "id": 1,
    "openid": "wx_openid_123456",
    "nickname": "张三丰",
    "avatar_url": "https://example.com/avatar.jpg",
    "phone": "13800138000",
    "gender": 1,
    "intro": "专业健身教练",
    "register_time": "2025-06-02T07:30:00.000Z",
    "last_login_time": "2025-06-02T07:32:00.000Z",
    "status": 1,
    "roles": {
      "isCoach": true,
      "isStudent": true
    }
  },
  "timestamp": 1638360000000
}
```

#### 3. 获取用户统计信息

**接口地址**: `GET /api/h5/user/stats`

**接口描述**: 获取用户的统计数据

**认证**: 需要

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取用户统计信息成功",
  "data": {
    "roles": {
      "isCoach": true,
      "isStudent": true
    },
    "coachStats": {
      "totalStudents": 5,
      "totalCourses": 20,
      "completedCourses": 18,
      "pendingCourses": 2
    },
    "studentStats": {
      "totalCoaches": 2,
      "totalCourses": 15,
      "completedCourses": 12,
      "remainingLessons": 8,
      "pendingCourses": 3
    }
  },
  "timestamp": 1638360000000
}
```

#### 4. 上传头像

**接口地址**: `POST /api/h5/user/avatar`

**接口描述**: 上传用户头像（暂未实现）

**认证**: 需要

**响应示例**:
```json
{
  "success": false,
  "code": 1001,
  "message": "头像上传功能暂未实现",
  "timestamp": 1638360000000
}
```

### 时间模板模块 (`/api/h5/time-templates`)

#### 1. 获取时间模板列表

**接口地址**: `GET /api/h5/time-templates`

**接口描述**: 获取教练时间模板列表

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| coach_id | number | 否 | 教练ID（默认为当前用户） |

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取时间模板成功",
  "data": [
    {
      "id": 1,
      "coach_id": 1,
      "min_advance_days": 1,
      "max_advance_days": 30,
      "time_slots": "[{\"startTime\":\"09:00\",\"endTime\":\"10:00\"},{\"startTime\":\"14:00\",\"endTime\":\"15:00\"}]",
      "is_active": 1,
      "createdAt": "2025-06-02T08:00:00.000Z",
      "updatedAt": "2025-06-02T08:00:00.000Z"
    }
  ],
  "timestamp": 1638360000000
}
```

#### 2. 创建时间模板

**接口地址**: `POST /api/h5/time-templates`

**接口描述**: 创建教练时间模板

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| min_advance_days | number | 是 | 最少提前天数（0-30） |
| max_advance_days | number | 是 | 最多预约天数（1-365） |
| time_slots | array | 是 | 时间段数组 |
| time_slots[].startTime | string | 是 | 开始时间（HH:mm格式） |
| time_slots[].endTime | string | 是 | 结束时间（HH:mm格式） |
| is_active | number | 否 | 是否启用（0-禁用，1-启用，默认1） |

**请求示例**:
```json
{
  "min_advance_days": 1,
  "max_advance_days": 30,
  "time_slots": [
    {
      "startTime": "09:00",
      "endTime": "10:00"
    },
    {
      "startTime": "14:00",
      "endTime": "15:00"
    }
  ],
  "is_active": 1
}
```

#### 3. 更新时间模板

**接口地址**: `PUT /api/h5/time-templates/:id`

**接口描述**: 更新时间模板

**认证**: 需要

**请求参数**: 同创建接口（所有字段可选）

#### 4. 删除时间模板

**接口地址**: `DELETE /api/h5/time-templates/:id`

**接口描述**: 删除时间模板

**认证**: 需要

#### 5. 启用/禁用时间模板

**接口地址**: `PUT /api/h5/time-templates/:id/toggle`

**接口描述**: 切换时间模板启用状态

**认证**: 需要

### 师生关系模块 (`/api/h5/relations`)

#### 1. 获取师生关系列表

**接口地址**: `GET /api/h5/relations`

**接口描述**: 获取当前用户相关的师生关系列表

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码（默认1） |
| limit | number | 否 | 每页数量（默认20，最大100） |
| status | number | 否 | 关系状态（0-禁用，1-启用） |

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取师生关系列表成功",
  "data": {
    "list": [
      {
        "id": 1,
        "student_id": 2,
        "coach_id": 1,
        "remaining_lessons": 5,
        "relation_status": 1,
        "student_remark": "希望提高体能",
        "coach_remark": "学员很努力",
        "createdAt": "2025-06-02T08:00:00.000Z",
        "student": {
          "id": 2,
          "nickname": "李四",
          "avatar_url": "https://example.com/avatar2.jpg",
          "phone": "13800138001"
        },
        "coach": {
          "id": 1,
          "nickname": "张教练",
          "avatar_url": "https://example.com/avatar1.jpg",
          "phone": "13800138000",
          "intro": "专业健身教练"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "timestamp": 1638360000000
}
```

#### 2. 绑定师生关系

**接口地址**: `POST /api/h5/relations`

**接口描述**: 绑定师生关系

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| coach_id | number | 是 | 教练ID |
| student_id | number | 否 | 学员ID（默认为当前用户） |
| remaining_lessons | number | 否 | 剩余课时（默认0） |
| student_remark | string | 否 | 学员备注（最大500字符） |

**请求示例**:
```json
{
  "coach_id": 1,
  "remaining_lessons": 10,
  "student_remark": "希望提高体能"
}
```

#### 3. 获取我的教练列表

**接口地址**: `GET /api/h5/relations/my-coaches`

**接口描述**: 获取当前用户绑定的教练列表

**认证**: 需要

#### 4. 获取我的学员列表

**接口地址**: `GET /api/h5/relations/my-students`

**接口描述**: 获取当前教练的学员列表

**认证**: 需要

#### 5. 更新师生关系

**接口地址**: `PUT /api/h5/relations/:id`

**接口描述**: 更新师生关系备注和信息

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| coach_remark | string | 否 | 教练备注（教练可用） |
| student_remark | string | 否 | 学员备注（学员可用） |
| remaining_lessons | number | 否 | 剩余课时（教练可用） |

#### 6. 解除师生关系

**接口地址**: `DELETE /api/h5/relations/:id`

**接口描述**: 解除师生关系

**认证**: 需要

### 其他模块接口（开发中）

以下接口正在开发中：

#### 教练相关模块 (`/api/h5/coach`)
- `GET /api/h5/coach/list` - 获取教练列表
- `GET /api/h5/coach/:id` - 获取教练详情
- `GET /api/h5/coach/:id/schedule` - 获取教练课程安排

#### 学员相关模块 (`/api/h5/student`)
- `GET /api/h5/student/bookings` - 获取学员预约记录
- `GET /api/h5/student/coaches` - 获取绑定的教练列表

#### 课程管理模块 (`/api/h5/courses`)
- `POST /api/h5/courses` - 预约课程
- `GET /api/h5/courses` - 获取课程列表
- `GET /api/h5/courses/:id` - 获取课程详情
- `PUT /api/h5/courses/:id/confirm` - 确认课程
- `PUT /api/h5/courses/:id/cancel` - 取消课程
- `PUT /api/h5/courses/:id/complete` - 完成课程

---

## 管理端接口 (`/api/admin`)

### 基础接口

#### 1. 健康检查

**接口地址**: `GET /api/admin/health`

**接口描述**: 检查管理端接口状态

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "message": "管理端接口正常",
  "timestamp": "2025-06-02T07:32:35.958Z"
}
```

#### 2. 其他管理端接口

**接口地址**: `* /api/admin/*`

**接口描述**: 管理端功能开发中

**响应示例**:
```json
{
  "success": false,
  "code": 501,
  "message": "管理端功能正在开发中，敬请期待",
  "timestamp": 1638360000000
}
```

---

## 数据模型定义

### User (用户)

```typescript
interface User {
  id: number;                    // 用户ID
  openid: string;               // 微信openid
  unionid?: string;             // 微信unionid
  nickname?: string;            // 用户昵称
  avatar_url?: string;          // 头像URL
  phone?: string;               // 手机号
  gender?: number;              // 性别：0-未知，1-男，2-女
  intro?: string;               // 个人介绍
  register_time: string;        // 注册时间
  last_login_time?: string;     // 最后登录时间
  status: number;               // 账户状态：0-禁用，1-正常
  roles: {                      // 用户角色
    isCoach: boolean;           // 是否为教练
    isStudent: boolean;         // 是否为学员
  };
}
```

### TimeTemplate (时间模板)

```typescript
interface TimeTemplate {
  id: number;                   // 模板ID
  coach_id: number;            // 教练ID
  min_advance_days: number;    // 最少提前天数
  max_advance_days: number;    // 最多预约天数
  time_slots: string;          // 时间段JSON字符串
  is_active: number;           // 是否启用：0-禁用，1-启用
  createdAt: string;           // 创建时间
  updatedAt: string;           // 更新时间
}

interface TimeSlot {
  startTime: string;           // 开始时间（HH:mm）
  endTime: string;             // 结束时间（HH:mm）
}
```

### StudentCoachRelation (师生关系)

```typescript
interface StudentCoachRelation {
  id: number;                  // 关系ID
  student_id: number;          // 学员ID
  coach_id: number;            // 教练ID
  remaining_lessons: number;    // 剩余课时
  relation_status: number;     // 关系状态：0-禁用，1-启用
  student_remark?: string;     // 学员备注
  coach_remark?: string;       // 教练备注
  createdAt: string;           // 创建时间
  updatedAt: string;           // 更新时间
  student?: User;              // 学员信息
  coach?: User;                // 教练信息
}
```

### JWT Token Payload

```typescript
interface TokenPayload {
  userId: number;               // 用户ID
  openid: string;              // 微信openid
  iat: number;                 // 签发时间
  exp: number;                 // 过期时间
}
```

---

## 错误处理

### 参数验证错误

```json
{
  "success": false,
  "code": 1001,
  "message": "参数错误",
  "errors": [
    {
      "field": "code",
      "message": "微信登录凭证不能为空",
      "value": ""
    }
  ],
  "timestamp": 1638360000000
}
```

### 认证错误

```json
{
  "success": false,
  "code": 1002,
  "message": "用户未登录",
  "timestamp": 1638360000000
}
```

### 系统错误

```json
{
  "success": false,
  "code": 5002,
  "message": "系统内部错误",
  "timestamp": 1638360000000
}
```

---

## 开发注意事项

1. **环境配置**: 
   - 本地开发环境默认端口：3000
   - 数据库：MySQL (yueke)
   - Redis：暂未使用

2. **微信配置**:
   - 需要配置微信小程序的 APP_ID 和 APP_SECRET
   - 环境变量文件：`.env`

3. **Token管理**:
   - JWT Token 默认有效期：24小时
   - 支持Token刷新机制
   - 客户端需要处理Token过期情况

4. **错误处理**:
   - 所有接口都有统一的错误处理
   - 建议客户端根据 `success` 字段判断请求结果
   - 根据 `code` 字段进行具体错误处理

5. **开发状态**:
   - 认证模块：✅ 已完成
   - 用户信息模块：✅ 已完成
   - 时间模板模块：✅ 已完成
   - 师生关系模块：✅ 已完成
   - 课程管理模块：🚧 开发中
   - 教练/学员模块：🚧 开发中
   - 管理端：📋 规划中

---

## 联调测试

### 测试环境
- 服务地址：`http://localhost:3000`
- 健康检查：`curl http://localhost:3000/health`

### 快速测试

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试认证接口（需要真实的微信code）
curl -X POST http://localhost:3000/api/h5/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code":"wx_login_code"}'

# 测试Token验证（需要有效token）
curl -X GET http://localhost:3000/api/h5/auth/verify \
  -H "Authorization: Bearer <your_token>"

# 测试用户信息接口
curl -X GET http://localhost:3000/api/h5/user/profile \
  -H "Authorization: Bearer <your_token>"

# 测试时间模板接口
curl -X GET http://localhost:3000/api/h5/time-templates \
  -H "Authorization: Bearer <your_token>"
```

### 常见问题

1. **CORS错误**: 已配置CORS，支持本地开发
2. **Token过期**: 使用refresh接口刷新Token
3. **参数验证**: 参考接口文档确保参数格式正确
4. **数据库连接**: 确保MySQL服务正常运行

---

**文档版本**: v1.1.0  
**更新时间**: 2025-06-02  
**维护者**: 开发团队 