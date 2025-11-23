# 卡片功能 API 文档

## 功能概述

卡片功能支持教练创建和管理卡片模板，并为学员分配卡片实例。学员可以使用卡片预约课程，核销时从卡片中扣除课时。

## 核心概念

### 1. 卡片模板（CoachCard）
- 教练统一管理的卡片类型/模板
- 包含：卡片名称、颜色、课时数、有效天数、描述等
- 支持无限次数卡片（card_lessons 为 null）
- 支持启用/禁用/软删除

### 2. 卡片实例（StudentCardInstance）
- 学员从教练那里获得的具体卡片
- 从卡片模板创建，独立计算课时和有效期
- 支持开卡、停卡、重新开启、删除等操作
- 状态：0-未开启，1-已开启，2-已停用，3-已过期

### 3. 预约类型（booking_type）
- 1：普通课程（使用分类课时）
- 2：卡片课程（使用卡片课时）

## 数据库表结构

### coach_cards - 教练卡片模板表

```sql
CREATE TABLE coach_cards (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  coach_id BIGINT UNSIGNED NOT NULL,
  card_name VARCHAR(50) NOT NULL,
  card_color VARCHAR(20) NOT NULL,
  card_lessons INT UNSIGNED,  -- NULL 表示无限次数
  valid_days INT UNSIGNED NOT NULL,
  card_desc TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME,  -- 软删除
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

### student_card_instances - 学员卡片实例表

```sql
CREATE TABLE student_card_instances (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  coach_card_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NOT NULL,
  relation_id BIGINT UNSIGNED NOT NULL,
  total_lessons INT UNSIGNED,  -- NULL 表示无限次数
  remaining_lessons INT UNSIGNED,  -- NULL 表示无限次数
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  expire_date DATE NOT NULL,
  card_status TINYINT(1) NOT NULL DEFAULT 0,
  activated_at DATETIME,
  deactivated_at DATETIME,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

### course_bookings - 课程预约表（新增字段）

```sql
ALTER TABLE course_bookings 
ADD COLUMN card_instance_id BIGINT UNSIGNED,
ADD COLUMN booking_type TINYINT(1) NOT NULL DEFAULT 1;
```

## API 接口

### 一、卡片模板管理（教练端）

#### 1.1 获取我的卡片模板列表

```
GET /api/h5/coach-cards
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "coach_id": 10,
        "card_name": "月卡",
        "card_color": "#FF5733",
        "card_lessons": 30,
        "valid_days": 30,
        "card_desc": "30次课程，30天有效期",
        "is_active": 1,
        "is_unlimited": false
      }
    ],
    "total": 1
  },
  "message": "获取卡片模板列表成功"
}
```

#### 1.2 创建卡片模板

```
POST /api/h5/coach-cards
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "card_name": "月卡",
  "card_color": "#FF5733",
  "card_lessons": 30,  // null 或不传表示无限次数
  "valid_days": 30,
  "card_desc": "30次课程，30天有效期"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "card_name": "月卡",
    "card_color": "#FF5733",
    "card_lessons": 30,
    "valid_days": 30,
    "is_unlimited": false
  },
  "message": "卡片模板创建成功"
}
```

#### 1.3 编辑卡片模板

```
PUT /api/h5/coach-cards/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "card_name": "季卡",
  "card_color": "#00FF00",
  "card_lessons": 90,
  "valid_days": 90,
  "card_desc": "更新后的描述"
}
```

#### 1.4 启用/禁用卡片模板

```
PUT /api/h5/coach-cards/:id/toggle-active
Authorization: Bearer <token>
```

#### 1.5 删除卡片模板（软删除）

```
DELETE /api/h5/coach-cards/:id
Authorization: Bearer <token>
```

**说明：** 只能删除已禁用的卡片模板

#### 1.6 获取启用的卡片模板列表

```
GET /api/h5/coach-cards/active-list
Authorization: Bearer <token>
```

**说明：** 用于添加卡片实例时选择卡片模板

---

### 二、卡片实例管理

#### 2.1 为学员添加卡片实例（教练操作）

```
POST /api/h5/card-instances
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "student_id": 123,
  "relation_id": 456,
  "coach_card_id": 789  // 选择的卡片模板ID
}
```

**说明：**
- 课时数和有效期自动从模板复制
- 有效期 = 当前日期 + 模板的 valid_days
- 默认状态为"未开启"

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "coach_card_id": 789,
    "card_name": "月卡",
    "card_color": "#FF5733",
    "total_lessons": 30,
    "remaining_lessons": 30,
    "used_count": 0,
    "expire_date": "2025-12-22",
    "card_status": 0,
    "card_status_text": "未开启",
    "is_expired": false,
    "is_unlimited": false
  },
  "message": "卡片添加成功"
}
```

#### 2.2 开卡（教练操作）

```
PUT /api/h5/card-instances/:id/activate
Authorization: Bearer <token>
```

**说明：** 
- 只有未开启的卡片才能开卡
- 已过期的卡片无法开启

#### 2.3 停卡（教练操作）

```
PUT /api/h5/card-instances/:id/deactivate
Authorization: Bearer <token>
```

**说明：**
- 只有已开启的卡片才能停卡
- 停卡不影响已确认/待确认的课程

#### 2.4 重新开启（教练操作）

```
PUT /api/h5/card-instances/:id/reactivate
Authorization: Bearer <token>
```

**说明：**
- 只有已停用的卡片才能重新开启
- 已过期的卡片无法开启

#### 2.5 删除卡片实例（教练操作）

```
DELETE /api/h5/card-instances/:id
Authorization: Bearer <token>
```

**说明：**
- 有效期内且有剩余课时且存在使用记录时不允许删除
- 已过期的卡片可以删除

#### 2.6 获取学员的卡片实例列表（教练视角）

```
GET /api/h5/card-instances/student/:studentId
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "card_name": "月卡",
        "card_color": "#FF5733",
        "total_lessons": 30,
        "remaining_lessons": 25,
        "used_count": 5,
        "expire_date": "2025-12-22",
        "card_status": 1,
        "card_status_text": "已开启",
        "is_expired": false,
        "is_unlimited": false
      }
    ],
    "total": 1
  },
  "message": "获取卡片列表成功"
}
```

**说明：** 已过期的卡片排在最后

#### 2.7 获取我的卡片实例列表（学员视角）

```
GET /api/h5/card-instances/my-cards/:coachId
Authorization: Bearer <token>
```

#### 2.8 获取可用的卡片实例列表（用于约课）

```
GET /api/h5/card-instances/available/:coachId
Authorization: Bearer <token>
```

**说明：** 只返回已开启、未过期且有剩余课时的卡片

#### 2.9 获取卡片实例详情

```
GET /api/h5/card-instances/:id
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "card_name": "月卡",
    "card_color": "#FF5733",
    "total_lessons": 30,
    "remaining_lessons": 25,
    "used_count": 5,
    "expire_date": "2025-12-22",
    "card_status": 1,
    "student": {
      "id": 123,
      "nickname": "张三",
      "avatar_url": "..."
    },
    "coach": {
      "id": 456,
      "nickname": "李教练",
      "avatar_url": "..."
    },
    "usage_records": [
      {
        "id": 1,
        "course_date": "2025-11-22",
        "start_time": "10:00",
        "end_time": "11:00",
        "booking_status": 3,
        "complete_at": "2025-11-22T11:00:00.000Z"
      }
    ]
  },
  "message": "获取卡片详情成功"
}
```

---

### 三、约课与核销

#### 3.1 使用卡片预约课程

```
POST /api/h5/courses
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "coach_id": 10,
  "student_id": 20,
  "relation_id": 30,
  "course_date": "2025-11-25",
  "start_time": "10:00",
  "end_time": "11:00",
  "address_id": 1,
  "booking_type": 2,  // 2 表示卡片课程
  "card_instance_id": 100,  // 卡片实例ID
  "student_remark": "备注"
}
```

**说明：**
- `booking_type`: 1-普通课程（使用分类课时），2-卡片课程（使用卡片课时）
- 卡片课程必须提供 `card_instance_id`
- 系统会验证卡片是否可用（状态、有效期、剩余课时）
- 课程日期必须在卡片有效期内

#### 3.2 核销课程

```
PUT /api/h5/courses/:id/complete
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**
```json
{
  "feedback": "课程反馈"
}
```

**说明：**
- 根据 `booking_type` 自动判断扣除来源
- `booking_type=2`：从卡片实例扣除课时
- `booking_type=1`：从分类课时扣除课时（原有逻辑）
- 无限次数卡片只增加使用次数，不扣除课时

---

## 业务逻辑说明

### 1. 卡片与课程分类的关系

- **完全独立**：卡片与课程分类完全独立
- 教练可以自由命名卡片（如"瑜伽月卡"）
- 约课时，卡片类型和课程类型二选一

### 2. 卡片状态管理

- **未开启(0)**：卡片刚创建，未激活
- **已开启(1)**：卡片已激活，可以使用
- **已停用(2)**：教练手动停用，可重新开启
- **已过期(3)**：有效期到期，系统自动标记

### 3. 有效期处理

- 创建卡片实例时，有效期 = 当前日期 + 模板的 valid_days
- 有效期到期后，卡片状态自动变为"已过期"
- 过期后保留剩余课时记录（不清零）
- 约课时检查卡片是否在有效期内

### 4. 无限次数卡片

- `total_lessons` 和 `remaining_lessons` 为 null
- 核销时只增加 `used_count`，不扣除课时
- 仍受有效期限制

### 5. 卡片删除限制

- **可以删除**：已过期，或有效期内但课时已用完且无使用记录
- **不可删除**：有效期内 且 有剩余课时 且 有使用记录

### 6. 卡片模板软删除

- 模板被删除后，已发放的卡片实例仍可正常使用
- 查询卡片实例时，即使模板已删除，仍可获取模板信息

---

## 数据库迁移

### 执行迁移脚本

```bash
node scripts/add-card-tables.js
```

### 迁移内容

1. 创建 `coach_cards` 表
2. 创建 `student_card_instances` 表
3. 为 `course_bookings` 表添加 `card_instance_id` 和 `booking_type` 字段

---

## 常见问题

### Q1: 如何创建无限次数的卡片？

A: 创建卡片模板时，将 `card_lessons` 设置为 `null` 或不传该字段。

### Q2: 停卡后，已预约的课程会怎样？

A: 停卡不影响已确认/待确认的课程，这些课程仍可正常进行和核销。

### Q3: 卡片过期后还能恢复吗？

A: 不能。卡片过期后状态变为"已过期"，无法重新开启。但可以为学员添加新的卡片实例。

### Q4: 一个学员可以有多张卡片吗？

A: 可以。教练可以为一个学员添加多张不同的卡片实例（如月卡、季卡、年卡等）。

### Q5: 约课时如何选择使用哪张卡片？

A: 前端调用"获取可用的卡片实例列表"接口，展示给用户选择，然后在约课时传入 `card_instance_id`。

---

## 注意事项

1. 所有日期格式为 `YYYY-MM-DD`
2. 卡片颜色建议使用十六进制颜色码（如 `#FF5733`）
3. 教练操作卡片实例时，系统会自动验证师生关系
4. 卡片实例列表默认已过期的排在最后
5. 建议定期清理已过期且已用完的卡片实例

