# 团课功能 API 文档

## 概述

团课功能允许教练创建和管理团体课程，学员可以报名参加团课。团课支持多种收费方式，包括扣课时、金额展示（暂不真实支付）和免费。

## 数据库设计

### 团课表 (group_courses)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 团课ID |
| coach_id | BIGINT | 教练ID |
| category_id | BIGINT | 课程分类ID |
| title | VARCHAR(100) | 团课标题 |
| content | LONGTEXT | 团课活动详情 |
| cover_images | JSON | 封面图片数组 |
| images | JSON | 活动详情图片数组 |
| course_date | DATE | 上课日期 |
| start_time | TIME | 开始时间 |
| end_time | TIME | 结束时间 |
| duration | INT | 课程时长（分钟） |
| address_id | BIGINT | 地址ID |
| max_participants | INT | 最大参与人数 |
| min_participants | INT | 最小开课人数 |
| current_participants | INT | 当前报名人数 |
| price_type | TINYINT | 收费方式：1-扣课时，2-金额展示，3-免费 |
| lesson_cost | INT | 扣除课时数 |
| price_amount | DECIMAL(10,2) | 费用金额 |
| enrollment_scope | TINYINT | 报名范围：1-仅学员，2-所有人 |
| auto_confirm | TINYINT | 是否自动确认：0-需审核，1-自动确认 |
| status | TINYINT | 课程状态：0-待发布，1-报名中，2-已结束 |
| is_published | TINYINT | 发布状态：0-草稿，1-已发布 |

### 团课报名表 (group_course_registrations)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 报名ID |
| group_course_id | BIGINT | 团课ID |
| student_id | BIGINT | 学员ID |
| coach_id | BIGINT | 教练ID（冗余字段） |
| relation_id | BIGINT | 师生关系ID（可选） |
| registration_status | TINYINT | 报名状态：1-待确认，2-已确认，3-已完成，4-已取消，5-已拒绝 |
| payment_type | TINYINT | 支付方式：1-课时，2-金额，3-免费 |
| lesson_deducted | INT | 已扣除的课时数 |
| amount_paid | DECIMAL(10,2) | 支付金额 |
| payment_status | TINYINT | 支付状态：0-待支付，1-已支付，2-已退款 |
| check_in_status | TINYINT | 签到状态：0-未签到，1-已签到，2-缺席 |
| check_in_time | DATETIME | 签到时间 |
| checked_in_by | BIGINT | 签到操作人ID |

## API 接口

### 1. 团课管理接口

#### 1.1 创建团课

**接口地址：** `POST /api/h5/group-courses`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "category_id": 0,                    // 课程分类ID，默认0
  "title": "瑜伽团课",                 // 团课标题，必填
  "content": "详细的团课介绍...",       // 团课详情，可选
  "cover_images": ["url1", "url2"],    // 封面图片数组，可选
  "images": ["url1", "url2"],          // 详情图片数组，可选
  "course_date": "2025-01-15",         // 上课日期，必填
  "start_time": "10:00",               // 开始时间，必填
  "end_time": "11:30",                 // 结束时间，必填
  "duration": 90,                      // 课程时长（分钟），可选
  "address_id": 1,                     // 地址ID，可选
  "max_participants": 10,              // 最大参与人数，默认10
  "min_participants": 3,               // 最小开课人数，默认1
  "price_type": 1,                     // 收费方式，默认1
  "lesson_cost": 1,                    // 扣除课时数，默认1
  "price_amount": 0,                   // 费用金额，默认0
  "enrollment_scope": 1,               // 报名范围，默认1
  "auto_confirm": 1                    // 是否自动确认，默认1
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "团课创建成功",
  "data": {
    "id": 1,
    "coach_id": 123,
    "title": "瑜伽团课",
    "course_date": "2025-01-15",
    "start_time": "10:00:00",
    "end_time": "11:30:00",
    "max_participants": 10,
    "current_participants": 0,
    "status": 1,
    "is_published": 0,
    "created_at": "2025-01-09T12:00:00Z"
  }
}
```

**说明：** 团课创建后默认为草稿状态（is_published=0），需要调用发布接口才能公开显示。

#### 1.2 获取团课列表

**接口地址：** `GET /api/h5/group-courses`

**请求参数：**
```
page=1                    // 页码，默认1
limit=10                  // 每页数量，默认10
coach_id=123              // 教练ID，可选
category_id=0             // 课程分类ID，可选
status=1                  // 课程状态，可选
course_date_start=2025-01-10  // 开始日期，可选
course_date_end=2025-01-20    // 结束日期，可选
is_published=1            // 发布状态：0-草稿，1-已发布，不传默认显示已发布（查看草稿需要登录）
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "瑜伽团课",
        "course_date": "2025-01-15",
        "start_time": "10:00:00",
        "end_time": "11:30:00",
        "max_participants": 10,
        "current_participants": 3,
        "price_type": 1,
        "lesson_cost": 1,
        "status": 1,
        "end_reason": null,
        "coach": {
          "id": 123,
          "nickname": "张教练",
          "avatar_url": "avatar.jpg",
          "course_categories": [
            {"id": 0, "name": "默认", "desc": "默认分类"}
          ]
        },
        "address": {
          "id": 1,
          "name": "健身房A",
          "address": "北京市朝阳区...",
          "latitude": "39.123456",
          "longitude": "116.123456"
        },
        "registrations": [
          {
            "id": 1,
            "registration_status": 2,
            "student": {
              "id": 456,
              "nickname": "学员小王",
              "avatar_url": "student_avatar.jpg"
            }
          }
        ]
      }
    ],
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### 1.3 获取团课详情

**接口地址：** `GET /api/h5/group-courses/:id`

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "瑜伽团课",
    "content": "详细的团课介绍...",
    "cover_images": ["url1", "url2"],
    "images": ["url1", "url2"],
    "course_date": "2025-01-15",
    "start_time": "10:00:00",
    "end_time": "11:30:00",
    "duration": 90,
    "max_participants": 10,
    "current_participants": 3,
    "price_type": 1,
    "lesson_cost": 1,
    "enrollment_scope": 1,
    "status": 1,
    "end_reason": null,
    "coach": {
      "id": 123,
      "nickname": "张教练",
      "avatar_url": "avatar.jpg",
      "course_categories": [...]
    },
    "address": {
      "id": 1,
      "name": "健身房A",
      "address": "北京市朝阳区..."
    },
    "registrations": [
      {
        "id": 1,
        "registration_status": 2,
        "student": {
          "id": 456,
          "nickname": "学员A",
          "avatar_url": "avatar.jpg"
        }
      }
    ]
  }
}
```

#### 1.4 更新团课

**接口地址：** `PUT /api/h5/group-courses/:id`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：** （所有字段都是可选的，只传需要更新的字段）
```json
{
  "title": "更新后的团课标题",
  "content": "更新后的详情",
  "max_participants": 15
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "团课更新成功",
  "data": {
    "id": 1,
    "title": "更新后的团课标题",
    "max_participants": 15,
    "updated_at": "2025-01-09T12:30:00Z"
  }
}
```

#### 1.5 发布团课

**接口地址：** `PUT /api/h5/group-courses/:id/publish`

**请求头：**
```
Authorization: Bearer <token>
```

**功能说明：** 将草稿状态的团课发布，发布后团课将在列表中显示，用户可以报名。

**响应示例：**
```json
{
  "success": true,
  "message": "团课发布成功",
  "data": {
    "id": 1,
    "title": "瑜伽团课",
    "is_published": 1,
    "published_at": "2025-01-09T12:30:00Z",
    "status": 1
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "只能发布草稿状态的团课"
}
```

#### 1.6 取消团课

**接口地址：** `PUT /api/h5/group-courses/:id/cancel`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "cancel_reason": "教练临时有事"  // 取消原因，可选
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "团课取消成功"
}
```

#### 1.7 删除团课

**接口地址：** `DELETE /api/h5/group-courses/:id`

**请求头：**
```
Authorization: Bearer <token>
```

**删除条件：**
- 谁创建谁有权删除
- 已取消/人数不足取消的团课可以删除
- 无人报名的团课可以删除

**功能说明：** 真删除团课记录，删除后无法恢复。

**响应示例：**
```json
{
  "success": true,
  "message": "团课删除成功"
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "有学员报名的团课不能删除，请先取消团课"
}
```

### 2. 报名相关接口

#### 2.1 报名团课

**接口地址：** `POST /api/h5/group-courses/:id/register`

**请求头：**
```
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "message": "报名成功",
  "data": {
    "id": 1,
    "group_course_id": 1,
    "student_id": 456,
    "registration_status": 2,
    "payment_type": 1,
    "registered_at": "2025-01-09T12:00:00Z"
  }
}
```

#### 2.2 取消报名

**接口地址：** `DELETE /api/h5/group-courses/:id/register`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "cancel_reason": "临时有事无法参加"  // 取消原因，可选
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "取消报名成功"
}
```

#### 2.3 获取我的团课报名列表（学员视角）

**接口地址：** `GET /api/h5/group-courses/my-registrations`

**请求头：**
```
Authorization: Bearer <token>
```

**请求参数：**
```
page=1      // 页码，默认1
limit=10    // 每页数量，默认10
status=2    // 报名状态，可选
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "registrations": [
      {
        "id": 1,
        "registration_status": 2,
        "payment_type": 1,
        "check_in_status": 0,
        "registered_at": "2025-01-09T12:00:00Z",
        "groupCourse": {
          "id": 1,
          "title": "瑜伽团课",
          "course_date": "2025-01-15",
          "start_time": "10:00:00",
          "coach": {
            "id": 123,
            "nickname": "张教练",
            "avatar_url": "avatar.jpg"
          },
          "address": {
            "id": 1,
            "name": "健身房A",
            "address": "北京市朝阳区..."
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

#### 2.4 获取团课报名列表（教练视角）

**接口地址：** `GET /api/h5/group-courses/:id/registrations`

**请求头：**
```
Authorization: Bearer <token>
```

**请求参数：**
```
page=1      // 页码，默认1
limit=10    // 每页数量，默认10
status=2    // 报名状态，可选
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "registrations": [
      {
        "id": 1,
        "registration_status": 2,
        "payment_type": 1,
        "check_in_status": 0,
        "registered_at": "2025-01-09T12:00:00Z",
        "student": {
          "id": 456,
          "nickname": "学员A",
          "avatar_url": "avatar.jpg",
          "phone": "13800138000"
        },
        "relation": {
          "id": 1,
          "student_remark": "学员备注",
          "coach_remark": "教练备注"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

#### 2.5 签到团课

**接口地址：** `POST /api/h5/group-courses/:courseId/registrations/:registrationId/check-in`

**请求头：**
```
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "message": "签到成功",
  "data": {
    "id": 1,
    "check_in_status": 1,
    "check_in_time": "2025-01-15T10:00:00Z",
    "registration_status": 3,
    "lesson_deducted": 1,
    "payment_status": 1
  }
}
```

## 业务逻辑说明

### 课时管理集成

1. **课时占用统计**：团课报名会占用学员的可用课时，防止超卖
2. **课时扣除时机**：签到时扣除课时，而非报名时
3. **可用课时计算**：总课时 - 常规课占用 - 团课占用

### 报名流程

1. **权限检查**：根据 `enrollment_scope` 检查报名权限
2. **课时验证**：扣课时类型需验证可用课时是否足够
3. **自动确认**：根据 `auto_confirm` 决定是否自动确认报名
4. **人数管理**：确认报名时增加 `current_participants`
5. **简化逻辑**：课程创建后立即可报名，无时间限制

### 签到流程

1. **权限验证**：只有教练可以为学员签到
2. **课时扣除**：签到时扣除对应分类的课时
3. **状态更新**：更新签到状态和报名状态为已完成

### 数据约束

系统包含以下业务约束：

1. **参与人数约束**：`current_participants <= max_participants`
2. **最小最大人数约束**：`min_participants <= max_participants`
3. **时间顺序约束**：`start_time < end_time`
4. **课时费用约束**：扣课时类型必须设置 `lesson_cost > 0`
5. **金额费用约束**：金额类型必须设置 `price_amount > 0`

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 参数验证失败 |
| 401 | 未授权访问 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 422 | 业务逻辑错误（如课时不足、已报名等） |
| 500 | 服务器内部错误 |

## 状态说明

### 团课状态 (status)
- 1: 报名中
- 2: 已结束（包括已取消、已完成、人数不足取消等）

### 结束原因 (end_reason)
当 `status = 2`（已结束）时，会返回 `end_reason` 字段说明结束原因：
- `null`: 当 `status = 1`（报名中）时
- `"课程已完成"`: 当设置了 `completed_at` 时间时
- 具体的取消原因: 当设置了 `cancel_reason` 时，显示实际的取消原因
- `"人数不足取消"`: 当 `current_participants < min_participants` 时
- `"已取消"`: 其他已结束情况

### 报名记录状态 (registration_status)
- 1: 待确认
- 2: 已确认
- 3: 已完成
- 4: 已取消
- 5: 已拒绝

### 签到状态 (check_in_status)
- 0: 未签到
- 1: 已签到
- 2: 缺席
