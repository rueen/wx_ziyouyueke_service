# 自由约课系统 API 接口设计文档

## 概述

本文档为自由约课微信小程序后端API接口设计规范，基于RESTful架构风格，支持学员和教练的完整约课流程。

## 技术规范

- **架构风格**: RESTful API
- **认证方式**: JWT Token
- **数据格式**: JSON
- **字符编码**: UTF-8
- **HTTP状态码**: 标准HTTP状态码

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体数据
  },
  "timestamp": 1703001234567
}
```

### 错误响应
```json
{
  "success": false,
  "code": 400,
  "message": "错误描述",
  "error": "详细错误信息",
  "timestamp": 1703001234567
}
```

## 认证机制

### JWT Token 格式
```
Authorization: Bearer <token>
```

### Token Payload
```json
{
  "userId": 123,
  "openid": "wx123456",
  "iat": 1703001234,
  "exp": 1703087634
}
```

---

## 1. 认证相关接口

### 1.1 用户注册/登录

**接口路径**: `POST /api/auth/login`

**接口描述**: 微信用户注册/登录，支持教练邀请绑定

**请求参数**:
```json
{
  "code": "wx_login_code",           // 微信登录凭证
  "userInfo": {
    "nickname": "用户昵称",
    "avatarUrl": "头像URL",
    "gender": 1                      // 0-未知,1-男,2-女
  },
  "coach_id": 123                    // 可选：教练ID，用于自动绑定师生关系
}
```

**响应数据**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_string",
    "user": {
      "id": 123,
      "openid": "wx123456",
      "nickname": "用户昵称",
      "avatar_url": "头像URL",
      "phone": null,
      "gender": 1,
      "intro": null,
      "register_time": "2024-12-19T10:00:00Z",
      "last_login_time": "2024-12-19T10:00:00Z"
    },
    "isNewUser": true,               // 是否为新用户
    "autoBindCoach": true            // 是否自动绑定了教练
  }
}
```

**业务逻辑**:
1. 通过微信code获取openid
2. 查询用户是否已注册，如未注册则创建新用户
3. 如果传入coach_id且用户角色为学员，自动创建师生关系
4. 生成JWT token并返回用户信息

### 1.2 用户登出

**接口路径**: `POST /api/auth/logout`

**接口描述**: 用户登出，清除token

**请求参数**: 无

**响应数据**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 2. 用户信息接口

### 2.1 获取用户信息

**接口路径**: `GET /api/user/profile`

**接口描述**: 获取当前登录用户的详细信息

**请求参数**: 无

**响应数据**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "openid": "wx123456",
    "nickname": "用户昵称",
    "avatar_url": "头像URL",
    "phone": "13800138000",
    "gender": 1,
    "intro": "个人介绍",
    "register_time": "2024-12-19T10:00:00Z",
    "last_login_time": "2024-12-19T10:00:00Z",
    "roles": {
      "isCoach": true,               // 是否为教练
      "isStudent": false             // 是否为学员
    }
  }
}
```

### 2.2 编辑用户信息

**接口路径**: `PUT /api/user/profile`

**接口描述**: 编辑当前用户的个人信息

**请求参数**:
```json
{
  "nickname": "新昵称",
  "phone": "13800138000",
  "gender": 1,
  "intro": "个人介绍内容"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "信息更新成功",
  "data": {
    // 更新后的用户信息
  }
}
```

---

## 3. 学员管理接口

### 3.1 获取我的学员列表

**接口路径**: `GET /api/coach/students`

**接口描述**: 教练获取自己的学员列表

**请求参数**:
```
?page=1&limit=20&status=1&search=关键词
```

**响应数据**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 456,
        "student_id": 456,
        "nickname": "学员昵称",
        "avatar_url": "头像URL",
        "phone": "13800138001",
        "remaining_lessons": 10,
        "coach_remark": "教练备注",
        "relation_status": 1,
        "bind_time": "2024-12-01T10:00:00Z",
        "last_course_time": "2024-12-15T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 3.2 获取学员详情

**接口路径**: `GET /api/coach/students/:studentId`

**接口描述**: 教练获取指定学员的详细信息

**路径参数**: 
- `studentId`: 学员ID

**响应数据**:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 456,
      "nickname": "学员昵称",
      "avatar_url": "头像URL",
      "phone": "13800138001",
      "gender": 2,
      "intro": "学员个人介绍"
    },
    "relation": {
      "remaining_lessons": 10,
      "coach_remark": "教练备注",
      "student_remark": "学员备注",
      "relation_status": 1,
      "bind_time": "2024-12-01T10:00:00Z",
      "last_course_time": "2024-12-15T14:00:00Z"
    },
    "courseStats": {
      "totalCourses": 15,
      "completedCourses": 5,
      "cancelledCourses": 0
    }
  }
}
```

---

## 4. 教练管理接口

### 4.1 获取我的教练列表

**接口路径**: `GET /api/student/coaches`

**接口描述**: 学员获取自己的教练列表

**请求参数**:
```
?page=1&limit=20&status=1
```

**响应数据**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 123,
        "coach_id": 123,
        "nickname": "教练昵称",
        "avatar_url": "头像URL",
        "phone": "13800138000",
        "intro": "教练个人介绍",
        "remaining_lessons": 8,
        "student_remark": "学员备注",
        "relation_status": 1,
        "bind_time": "2024-12-01T10:00:00Z",
        "last_course_time": "2024-12-15T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

### 4.2 获取教练详情

**接口路径**: `GET /api/student/coaches/:coachId`

**接口描述**: 学员获取指定教练的详细信息

**路径参数**: 
- `coachId`: 教练ID

**响应数据**:
```json
{
  "success": true,
  "data": {
    "coach": {
      "id": 123,
      "nickname": "教练昵称",
      "avatar_url": "头像URL",
      "phone": "13800138000",
      "gender": 1,
      "intro": "教练个人介绍"
    },
    "relation": {
      "remaining_lessons": 8,
      "coach_remark": "教练备注",
      "student_remark": "学员备注",
      "relation_status": 1,
      "bind_time": "2024-12-01T10:00:00Z",
      "last_course_time": "2024-12-15T14:00:00Z"
    },
    "courseStats": {
      "totalCourses": 12,
      "completedCourses": 4,
      "cancelledCourses": 0
    }
  }
}
```

---

## 5. 时间模板接口

### 5.1 获取教练时间模板

**接口路径**: `GET /api/coaches/:coachId/time-templates`

**接口描述**: 获取指定教练的时间模板

**路径参数**: 
- `coachId`: 教练ID

**响应数据**:
```json
{
  "success": true,
  "data": {
    "coachInfo": {
      "id": 123,
      "nickname": "教练昵称",
      "avatar_url": "头像URL",
      "intro": "教练介绍"
    },
    "templates": [
      {
        "id": 1,
        "coach_id": 123,
        "min_advance_days": 1,
        "max_advance_days": 5,
        "time_slots": [
          {
            "startTime": "09:00",
            "endTime": "12:00"
          },
          {
            "startTime": "14:00",
            "endTime": "17:00"
          }
        ],
        "is_active": 1,
        "created_at": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

### 5.2 创建/更新时间模板

**接口路径**: `POST /api/coach/time-templates`

**接口描述**: 教练创建或更新时间模板

**请求参数**:
```json
{
  "min_advance_days": 1,
  "max_advance_days": 5,
  "time_slots": [
    {
      "startTime": "09:00",
      "endTime": "12:00"
    },
    {
      "startTime": "14:00",
      "endTime": "17:00"
    }
  ],
  "is_active": 1
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "时间模板保存成功",
  "data": {
    "id": 1,
    // 完整的时间模板信息
  }
}
```

---

## 6. 课程预约接口

### 6.1 课程预约

**接口路径**: `POST /api/courses/booking`

**接口描述**: 学员预约课程

**请求参数**:
```json
{
  "coach_id": 123,
  "course_date": "2024-12-25",
  "start_time": "09:00",
  "end_time": "12:00",
  "location": "万达广场健身房",
  "student_remark": "学员备注信息"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "预约成功",
  "data": {
    "booking": {
      "id": 789,
      "booking_no": "BK20241219001",
      "student_id": 456,
      "coach_id": 123,
      "course_date": "2024-12-25",
      "start_time": "09:00",
      "end_time": "12:00",
      "location": "万达广场健身房",
      "student_remark": "学员备注信息",
      "booking_status": 1,
      "created_at": "2024-12-19T10:00:00Z"
    }
  }
}
```

### 6.2 我的课程列表

**接口路径**: `GET /api/courses`

**接口描述**: 获取用户的课程列表

**请求参数**:
```
?page=1&limit=20&status=1&role=student&date_start=2024-12-01&date_end=2024-12-31
```

**参数说明**:
- `status`: 课程状态 (1-待确认,2-已确认,3-已完成,4-已取消)
- `role`: 用户角色 (student-学员视角,coach-教练视角)
- `date_start`: 开始日期
- `date_end`: 结束日期

**响应数据**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 789,
        "booking_no": "BK20241219001",
        "course_date": "2024-12-25",
        "start_time": "09:00",
        "end_time": "12:00",
        "location": "万达广场健身房",
        "booking_status": 1,
        "booking_status_text": "待确认",
        "student_remark": "学员备注",
        "coach_remark": "教练备注",
        "created_at": "2024-12-19T10:00:00Z",
        // 对方信息（学员视角显示教练，教练视角显示学员）
        "partner": {
          "id": 123,
          "nickname": "教练昵称",
          "avatar_url": "头像URL",
          "phone": "13800138000"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    },
    "statistics": {
      "pending": 2,
      "confirmed": 5,
      "completed": 3,
      "cancelled": 0
    }
  }
}
```

### 6.3 课程确认

**接口路径**: `PUT /api/courses/:courseId/confirm`

**接口描述**: 教练确认课程

**路径参数**: 
- `courseId`: 课程ID

**请求参数**:
```json
{
  "coach_remark": "教练确认备注"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "课程确认成功",
  "data": {
    "course": {
      "id": 789,
      "booking_status": 2,
      "confirm_time": "2024-12-19T11:00:00Z",
      "coach_remark": "教练确认备注"
    }
  }
}
```

### 6.4 课程取消

**接口路径**: `PUT /api/courses/:courseId/cancel`

**接口描述**: 取消课程

**路径参数**: 
- `courseId`: 课程ID

**请求参数**:
```json
{
  "cancel_reason": "临时有事无法上课"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "课程取消成功",
  "data": {
    "course": {
      "id": 789,
      "booking_status": 4,
      "cancel_time": "2024-12-19T11:00:00Z",
      "cancel_reason": "临时有事无法上课",
      "canceled_by": 456
    }
  }
}
```

### 6.5 课程完成

**接口路径**: `PUT /api/courses/:courseId/complete`

**接口描述**: 标记课程为已完成

**路径参数**: 
- `courseId`: 课程ID

**请求参数**:
```json
{
  "coach_remark": "课程完成备注"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "课程标记完成",
  "data": {
    "course": {
      "id": 789,
      "booking_status": 3,
      "complete_time": "2024-12-19T12:00:00Z",
      "coach_remark": "课程完成备注"
    }
  }
}
```

---

## 7. 关系管理接口

### 7.1 绑定师生关系

**接口路径**: `POST /api/relations`

**接口描述**: 绑定学员和教练的关系

**请求参数**:
```json
{
  "coach_id": 123,
  "student_id": 456,           // 可选，默认为当前用户
  "remaining_lessons": 10,
  "student_remark": "学员备注"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "绑定成功",
  "data": {
    "relation": {
      "id": 1,
      "student_id": 456,
      "coach_id": 123,
      "remaining_lessons": 10,
      "student_remark": "学员备注",
      "relation_status": 1,
      "bind_time": "2024-12-19T10:00:00Z"
    }
  }
}
```

### 7.2 更新关系备注

**接口路径**: `PUT /api/relations/:relationId/remark`

**接口描述**: 更新师生关系的备注信息

**路径参数**: 
- `relationId`: 关系ID

**请求参数**:
```json
{
  "coach_remark": "教练备注",     // 可选
  "student_remark": "学员备注"   // 可选
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "备注更新成功"
}
```

---

## 8. 错误码定义

| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| 1001 | 参数错误 | 400 |
| 1002 | 用户未登录 | 401 |
| 1003 | 权限不足 | 403 |
| 1004 | 资源不存在 | 404 |
| 1005 | 用户不存在 | 404 |
| 2001 | 微信登录失败 | 400 |
| 2002 | Token无效 | 401 |
| 3001 | 教练不存在 | 404 |
| 3002 | 学员不存在 | 404 |
| 3003 | 师生关系不存在 | 404 |
| 4001 | 课程不存在 | 404 |
| 4002 | 课程状态错误 | 400 |
| 4003 | 预约时间冲突 | 400 |
| 4004 | 超出预约时间范围 | 400 |
| 4005 | 剩余课时不足 | 400 |
| 5001 | 数据库操作失败 | 500 |
| 5002 | 系统内部错误 | 500 |

---

## 9. 中间件和工具

### 9.1 认证中间件
```javascript
// auth.middleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      code: 1002,
      message: '用户未登录'
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        success: false,
        code: 2002,
        message: 'Token无效'
      });
    }
    req.user = user;
    next();
  });
};
```

### 9.2 参数验证中间件
```javascript
// validation.middleware.js
const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: '参数错误',
      errors: errors.array()
    });
  }
  next();
};
```

---

**文档版本**：v1.0  
**创建时间**：2024-12-19  
**维护人员**：后端开发团队  
**审核状态**：待审核 