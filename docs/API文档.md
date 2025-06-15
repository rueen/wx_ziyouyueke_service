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

**默认头像**: 新注册用户或没有头像的用户将自动设置默认头像：`https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png`

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
      "last_login_time": "2025-06-02T07:32:00.000Z"
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
      "intro": "我是一名学员"
    }
  },
  "timestamp": 1638360000000
}
```

### 用户信息模块 (`/api/h5/user`)

**头像上传说明**: 用户头像上传请使用通用上传接口 `POST /api/upload/image`，传递 `directory=avatar` 参数。上传成功后，使用返回的URL通过更新用户信息接口设置 `avatar_url` 字段。

#### 1. 获取用户详情

**接口地址**: `GET /api/h5/user/:id`

**接口描述**: 获取指定用户的基本公开信息

**认证**: 不需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 用户ID（路径参数） |

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取用户详情成功",
  "data": {
    "id": 1,
    "nickname": "布兰达",
    "avatar_url": "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png",
    "phone": "13800138000",
    "gender": 2,
    "intro": "我是自由教练",
    "register_time": "2025-06-02T07:30:00.000Z",
    "last_login_time": "2025-06-02T07:32:00.000Z"
  },
  "timestamp": 1638360000000
}
```

**说明**:
- 该接口为公开接口，无需认证即可访问
- 返回用户的基本信息，包含手机号，但不包含 openid 等敏感字段

#### 2. 获取用户信息

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
    "status": 1
  },
  "timestamp": 1638360000000
}
```

#### 3. 更新用户信息

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
| avatar_url | string | 否 | 头像URL（最大500字符，必须是有效URL格式） |

**请求示例**:
```json
{
  "nickname": "张三丰",
  "phone": "13800138000",
  "gender": 1,
  "intro": "专业健身教练",
  "avatar_url": "http://localhost:3000/uploads/images/1749211777985_1_1wmcb6.jpeg"
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
    "status": 1
  },
  "timestamp": 1638360000000
}
```

#### 4. 解密微信手机号

**接口地址**: `POST /api/h5/user/decrypt-phone`

**接口描述**: 解密微信小程序获取的加密手机号数据

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| code | string | 是 | 微信小程序 getPhoneNumber 返回的加密code |

**请求示例**:
```json
{
  "code": "wx_encrypted_phone_code_from_getPhoneNumber"
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "手机号解密成功",
  "data": {
    "phone": "13800138000",
    "countryCode": "86",
    "purePhoneNumber": "13800138000"
  },
  "timestamp": 1638360000000
}
```

**错误响应示例**:
```json
{
  "success": false,
  "code": 2001,
  "message": "微信接口调用失败：code无效或已过期",
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

**接口描述**: 获取当前学员绑定的教练列表，包含课程统计信息

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

**请求示例**:
```
GET /api/h5/relations/my-coaches?page=1&limit=10
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取我的教练列表成功",
  "data": {
    "coaches": [
      {
        "id": 1,
        "student_id": 1,
        "coach_id": 123,
        "remaining_lessons": 8,
        "relation_status": 1,
        "student_remark": "我的主教练",
        "createdAt": "2025-05-01T10:00:00.000Z",
        "coach": {
          "id": 123,
          "nickname": "张教练",
          "avatar_url": "https://example.com/coach.jpg",
          "phone": "13800138000",
          "intro": "专业网球教练",
          "gender": 1
        },
        "lesson_stats": {
          "total_lessons": 12,
          "completed_lessons": 4,
          "upcoming_lessons": 2,
          "remaining_lessons": 8
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_count": 2,
      "limit": 10
    }
  },
  "timestamp": 1638360000000
}
```

#### 4. 获取我的学员列表

**接口地址**: `GET /api/h5/relations/my-students`

**接口描述**: 获取当前教练的学员列表，包含师生关系ID，支持分页

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 10 | 每页数量 |

**请求示例**:
```
GET /api/h5/relations/my-students?page=1&limit=10
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取我的学员列表成功",
  "data": {
    "students": [
      {
        "id": 1,
        "student_id": 123,
        "coach_id": 456,
        "remaining_lessons": 8,
        "student_remark": "学员备注",
        "coach_remark": "教练备注",
        "relation_status": 1,
        "createdAt": "2025-06-01T10:00:00.000Z",
        "updatedAt": "2025-06-02T10:00:00.000Z",
        "student": {
          "id": 123,
          "nickname": "张三",
          "avatar_url": "https://example.com/avatar.jpg",
          "phone": "13800138000"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_count": 5,
      "limit": 10
    }
  },
  "timestamp": 1638360000000
}
```

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

### 地址管理模块 (`/api/h5/addresses`)

#### 1. 获取地址列表

**接口地址**: `GET /api/h5/addresses`

**接口描述**: 获取用户的常用地址列表

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取地址列表成功",
  "data": {
    "addresses": [
      {
        "id": 1,
        "user_id": 123,
        "name": "万达广场健身房",
        "address": "北京市朝阳区建国路93号万达广场B1层",
        "latitude": 39.9042,
        "longitude": 116.4074,
        "is_default": true,
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_count": 4,
      "limit": 20
    }
  },
  "timestamp": 1638360000000
}
```

#### 2. 创建地址

**接口地址**: `POST /api/h5/addresses`

**接口描述**: 添加新的常用地址

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 地址名称（最大100字符） |
| address | string | 是 | 详细地址（最大500字符） |
| latitude | number | 是 | 纬度 |
| longitude | number | 是 | 经度 |
| is_default | boolean | 否 | 是否设为默认地址，默认false |

**请求示例**:
```json
{
  "name": "万达广场健身房",
  "address": "北京市朝阳区建国路93号万达广场B1层",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "is_default": false
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "地址添加成功",
  "data": {
    "id": 5,
    "user_id": 123,
    "name": "万达广场健身房",
    "address": "北京市朝阳区建国路93号万达广场B1层",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "is_default": false,
    "created_at": "2024-01-20T14:30:00.000Z",
    "updated_at": "2024-01-20T14:30:00.000Z"
  },
  "timestamp": 1638360000000
}
```

#### 3. 更新地址

**接口地址**: `PUT /api/h5/addresses/:id`

**接口描述**: 更新地址信息

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 否 | 地址名称（最大100字符） |
| address | string | 否 | 详细地址（最大500字符） |
| latitude | number | 否 | 纬度 |
| longitude | number | 否 | 经度 |
| is_default | boolean | 否 | 是否设为默认地址 |

#### 4. 删除地址

**接口地址**: `DELETE /api/h5/addresses/:id`

**接口描述**: 删除指定地址

**认证**: 需要

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "地址删除成功",
  "data": null,
  "timestamp": 1638360000000
}
```

#### 5. 设置默认地址

**接口地址**: `PUT /api/h5/addresses/:id/default`

**接口描述**: 设置指定地址为默认地址

**认证**: 需要

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "默认地址设置成功",
  "data": {
    "id": 1,
    "is_default": true
  },
  "timestamp": 1638360000000
}
```

### 其他模块接口（开发中）

以下接口正在开发中：

### 文件上传模块 (`/api/upload`)

#### 1. 上传图片到OSS

**接口地址**: `POST /api/upload/image`

**接口描述**: 上传图片文件到阿里云OSS，支持头像、封面图等各种图片上传需求

**认证**: 需要

**请求参数**:

- Content-Type: `multipart/form-data`
- 字段名: `file`（必填）- 图片文件
- 字段名: `directory`（可选）- 上传目录，支持：images、avatar、documents、temp，默认为images
- 文件类型: 图片格式（jpg, jpeg, png, gif, webp）
- 文件大小: 最大2MB

**请求示例**:
```
POST /api/upload/image
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <image_file>
directory: avatar
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "图片上传成功",
  "data": {
    "url": "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/1749221234567_123_a1b2c3.jpg",
    "filename": "1749221234567_123_a1b2c3.jpg",
    "objectName": "avatar/1749221234567_123_a1b2c3.jpg",
    "directory": "avatar",
    "size": 1024000,
    "mimetype": "image/jpeg"
  },
  "timestamp": 1638360000000
}
```

**错误示例**:
```json
{
  "success": false,
  "code": 4000,
  "message": "文件格式不支持，请上传图片文件",
  "timestamp": 1638360000000
}
```

#### 2. 删除OSS图片

**接口地址**: `DELETE /api/upload/image/:filename`

**接口描述**: 从阿里云OSS删除指定的图片文件

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| filename | string | 是 | 图片文件名（路径参数） |
| directory | string | 否 | 文件所在目录（查询参数），默认为images |

**请求示例**:
```
DELETE /api/upload/image/1749221234567_123_a1b2c3.jpg?directory=avatar
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "图片删除成功",
  "data": null,
  "timestamp": 1638360000000
}
```

**错误示例**:
```json
{
  "success": false,
  "code": 1004,
  "message": "文件不存在",
  "timestamp": 1638360000000
}
```



**注意事项**:

1. **OSS存储**: 所有文件都存储在阿里云OSS上，不占用服务器本地存储空间
2. **文件命名规则**: 上传的文件会自动重命名为 `时间戳_用户ID_随机字符串.扩展名` 的格式
3. **目录管理**: 支持通过directory参数指定上传目录，默认支持：images、avatar、documents、temp
4. **权限控制**: 用户只能删除自己上传的文件（通过文件名中的用户ID判断）
5. **公开访问**: 上传的文件设置为公开读，可直接通过返回的URL访问
6. **错误处理**: 
   - 4000: 文件相关错误（格式、大小等）
   - 1003: 权限不足（删除他人文件）
   - OSS相关错误会返回具体的错误信息



### 课程管理模块 (`/api/h5/courses`)

#### 1. 预约课程

**接口地址**: `POST /api/h5/courses`

**接口描述**: 创建新的课程预约

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| coach_id | number | 是 | 教练ID |
| student_id | number | 是 | 学员ID |
| relation_id | number | 否 | 师生关系ID |
| course_date | string | 是 | 课程日期（YYYY-MM-DD） |
| start_time | string | 是 | 开始时间（HH:mm） |
| end_time | string | 是 | 结束时间（HH:mm） |
| address_id | number | 是 | 地址ID |
| student_remark | string | 否 | 学员备注 |
| coach_remark | string | 否 | 教练备注 |

**请求示例**:
```json
{
  "coach_id": 1,
  "student_id": 2,
  "relation_id": 3,
  "course_date": "2025-06-03",
  "start_time": "14:00",
  "end_time": "15:00",
  "address_id": 4,
  "student_remark": "",
  "coach_remark": ""
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "预约成功",
  "data": {
    "booking_id": 456,
    "booking_status": 1,
    "remaining_lessons": 7
  },
  "timestamp": 1638360000000
}
```

#### 2. 获取课程列表

**接口地址**: `GET /api/h5/courses`

**接口描述**: 获取课程列表

**认证**: 需要

**逻辑说明**:
- 如果指定了 `student_id` 参数，返回该学员的课程列表
- 如果未指定 `student_id` 参数，返回当前用户相关的所有课程（作为学员或教练的课程）
- 可以同时使用 `coach_id` 和 `student_id` 进行精确筛选

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 10 | 每页数量 |
| status | number | 否 | "" | 状态筛选 |
| coach_id | number | 否 | "" | 教练ID筛选 |
| student_id | number | 否 | "" | 学员ID筛选 |
| start_date | string | 否 | "" | 开始日期 |
| end_date | string | 否 | "" | 结束日期 |

**请求示例**:
```
# 获取指定学员的课程列表
GET /api/h5/courses?student_id=1&status=2

# 获取指定教练的所有课程
GET /api/h5/courses?coach_id=5

# 获取指定学员与指定教练的课程
GET /api/h5/courses?student_id=1&coach_id=5

# 获取当前用户相关的所有课程（不指定student_id）
GET /api/h5/courses?page=1&limit=10&status=2
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取课程列表成功",
  "data": {
    "courses": [
      {
        "id": 456,
        "course_date": "2025-06-03",
        "start_time": "14:00",
        "end_time": "15:00",
        "booking_status": 2,
        "student_remark": "想练习发球",
        "coach_remark": "",
        "created_at": "2025-06-02T10:00:00.000Z",
        "student": {
          "id": 1,
          "nickname": "小明",
          "avatar_url": "https://example.com/student.jpg",
          "phone": "13900139000"
        },
        "coach": {
          "id": 123,
          "nickname": "张教练",
          "avatar_url": "https://example.com/coach.jpg",
          "phone": "13800138000"
        },
        "address": {
          "id": 4,
          "name": "网球场A",
          "address": "市体育中心网球场A场地",
          "latitude": 39.908823,
          "longitude": 116.397470
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 25,
      "limit": 10
    }
  },
  "timestamp": 1638360000000
}
```

#### 3. 获取课程详情

**接口地址**: `GET /api/h5/courses/:id`

**接口描述**: 获取指定课程的详细信息

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 课程ID（路径参数） |

**请求示例**:
```
GET /api/h5/courses/456
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取课程详情成功",
  "data": {
    "id": 456,
    "course_date": "2025-06-03",
    "start_time": "14:00",
    "end_time": "15:00",
    "booking_status": 2,
    "student_remark": "想练习发球",
    "coach_remark": "",
    "created_at": "2025-06-02T10:00:00.000Z",
    "confirmed_at": "2025-06-02T11:00:00.000Z",
    "student": {
      "id": 1,
      "nickname": "小明",
      "avatar_url": "https://example.com/student.jpg",
      "phone": "13900139000",
      "gender": 1
    },
    "coach": {
      "id": 123,
      "nickname": "张教练",
      "avatar_url": "https://example.com/coach.jpg",
      "phone": "13800138000",
      "gender": 1,
      "intro": "专业网球教练"
    },
    "address": {
      "id": 4,
      "name": "网球场A",
      "address": "市体育中心网球场A场地",
      "latitude": 39.908823,
      "longitude": 116.397470
    }
  },
  "timestamp": 1638360000000
}
```

#### 4. 确认课程

**接口地址**: `PUT /api/h5/courses/:id/confirm`

**接口描述**: 教练确认课程预约

**认证**: 需要（仅教练）

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 课程ID（路径参数） |

**请求示例**:
```
PUT /api/h5/courses/456/confirm
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "课程确认成功",
  "data": {
    "booking_id": 456,
    "booking_status": 2
  },
  "timestamp": 1638360000000
}
```

#### 5. 完成课程

**接口地址**: `PUT /api/h5/courses/:id/complete`

**接口描述**: 教练标记课程完成

**认证**: 需要（仅教练）

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 课程ID（路径参数） |
| feedback | string | 否 | 教练反馈 |

**请求示例**:
```json
{
  "feedback": "学员发球进步明显，建议多练习"
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "课程已标记为完成",
  "data": {
    "booking_id": 456,
    "booking_status": 3
  },
  "timestamp": 1638360000000
}
```

#### 6. 取消课程

**接口地址**: `PUT /api/h5/courses/:id/cancel`

**接口描述**: 取消课程预约（学员或教练都可以）

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 课程ID（路径参数） |
| cancel_reason | string | 否 | 取消原因 |

**请求示例**:
```json
{
  "cancel_reason": "时间有冲突"
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "课程取消成功",
  "data": {
    "booking_id": 456,
    "booking_status": 4
  },
  "timestamp": 1638360000000
}

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

### CourseBooking (课程预约)

```typescript
interface CourseBooking {
  id: number;                  // 预约ID
  student_id: number;          // 学员ID
  coach_id: number;            // 教练ID
  relation_id?: number;        // 师生关系ID
  course_date: string;         // 课程日期（YYYY-MM-DD）
  start_time: string;          // 开始时间（HH:mm）
  end_time: string;            // 结束时间（HH:mm）
  booking_status: number;      // 预约状态：1-待确认，2-已确认，3-已完成，4-已取消
  address_id: number;          // 地址ID
  student_remark?: string;     // 学员备注
  coach_remark?: string;       // 教练备注
  created_by: number;          // 创建人ID
  confirmed_at?: string;       // 确认时间
  cancelled_at?: string;       // 取消时间
  cancelled_by?: number;       // 取消人ID
  cancel_reason?: string;      // 取消原因
  updated_at: string;          // 更新时间
  complete_at?: string;        // 完成时间
  created_at: string;          // 创建时间
  student?: User;              // 学员信息
  coach?: User;                // 教练信息
  address?: Address;           // 地址信息
}

// 课程状态枚举
enum BookingStatus {
  PENDING = 1,                 // 待确认
  CONFIRMED = 2,               // 已确认
  COMPLETED = 3,               // 已完成
  CANCELLED = 4                // 已取消
}
```

### Address (地址)

```typescript
interface Address {
  id: number;                   // 地址ID
  user_id: number;             // 用户ID
  name: string;                // 地址名称
  address: string;             // 详细地址
  latitude: number;            // 纬度
  longitude: number;           // 经度
  is_default: boolean;         // 是否为默认地址
  created_at: string;          // 创建时间
  updated_at: string;          // 更新时间
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

3. **用户角色逻辑**:
   - 每个用户都可能同时具有学员和教练身份
   - 教练身份判断：在 `student_coach_relations` 表中作为 `coach_id` 存在，或在 `time_templates` 表中有记录
   - 学员身份判断：在 `student_coach_relations` 表中作为 `student_id` 存在
   - "我的教练"列表：来源于 `student_coach_relations` 表中该学员绑定的教练

4. **Token管理**:
   - JWT Token 默认有效期：24小时
   - 支持Token刷新机制
   - 客户端需要处理Token过期情况

5. **错误处理**:
   - 所有接口都有统一的错误处理
   - 建议客户端根据 `success` 字段判断请求结果
   - 根据 `code` 字段进行具体错误处理

5. **开发状态**:
   - 认证模块：✅ 已完成
   - 用户信息模块：✅ 已完成
   - 时间模板模块：✅ 已完成
   - 师生关系模块：✅ 已完成
   - 教练相关模块：✅ 已完成
   - 学员相关模块：✅ 已完成
   - 课程管理模块：✅ 已完成
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

# 测试手机号解密接口（需要真实的微信getPhoneNumber返回的code）
curl -X POST http://localhost:3000/api/h5/user/decrypt-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"code":"wx_encrypted_phone_code"}'

# 测试时间模板接口
curl -X GET http://localhost:3000/api/h5/time-templates \
  -H "Authorization: Bearer <your_token>"

# 测试学员预约记录
curl -X GET "http://localhost:3000/api/h5/student/bookings?status=2" \
  -H "Authorization: Bearer <your_token>"

# 测试课程预约
curl -X POST http://localhost:3000/api/h5/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "coach_id": 123,
    "booking_date": "2025-06-05",
    "start_time": "14:00",
    "end_time": "15:00",
    "notes": "想练习发球"
  }'

# 测试课程列表
curl -X GET "http://localhost:3000/api/h5/courses?role=student&status=2" \
  -H "Authorization: Bearer <your_token>"

# 测试上传图片（需要有效token和图片文件）
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@/path/to/your/image.jpg"
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