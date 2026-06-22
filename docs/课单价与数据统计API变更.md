# 课单价与数据统计 API 变更文档

> 本文档记录本次迭代涉及的所有新增字段及 API 变更，供前端对接时查阅。

---

## 一、新增字段说明

### 1.1 课程分类单价（`users.course_categories`）

教练的课程分类 JSON 数组每项新增 `unit_price` 字段，表示该分类的默认课单价。

```json
// 变更前
[{"id": 0, "name": "默认", "desc": "默认分类"}]

// 变更后
[{"id": 0, "name": "默认", "desc": "默认分类", "unit_price": 200}]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `unit_price` | number \| null | 课单价（元/课时）；null 表示未设置，统计时视为 0 |

### 1.2 师生关系课时单价（`student_coach_relations.lessons`）

师生关系的 `lessons` JSON 数组每项新增 `unit_price` 字段，用于覆盖分类默认单价。

```json
[{
  "category_id": 0,
  "remaining_lessons": 10,
  "expire_date": null,
  "is_cleared": false,
  "unit_price": 180
}]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `unit_price` | number \| null | 该师生关系此分类的课单价覆盖值；null 表示使用分类默认单价 |

**单价取值优先级（常规课）：** `relation.lessons[].unit_price` → `coach.course_categories[].unit_price` → `0`

### 1.3 卡片模板单价（`coach_cards.unit_price`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `unit_price` | number | 卡片课单价（元/课时），默认 0 |

### 1.4 卡片实例覆盖单价（`student_card_instances.unit_price`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `unit_price` | number \| null | 实例单价覆盖值；null 表示继承卡片模板单价 |

**单价取值优先级（课程卡）：** `student_card_instances.unit_price` → `coach_cards.unit_price` → `0`

### 1.5 课程扣减课时快照（`course_bookings.lesson_deducted`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `lesson_deducted` | number \| null | 课程完成时实际扣减的课时数；普通课=1，卡片课=`deduct_lessons_per_use`；null=历史老数据（统计时视为 1） |

---

## 二、变更接口

### 2.1 POST /api/h5/categories — 添加课程分类

新增请求参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `unit_price` | number | 否 | 课单价（元/课时），非负数；不传则为 null |

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "id": 2,
    "name": "私教课",
    "desc": "",
    "unit_price": 200
  },
  "message": "添加课程分类成功"
}
```

---

### 2.2 PUT /api/h5/categories/:id — 编辑课程分类

新增请求参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `unit_price` | number \| null | 否 | 课单价；null=清空（还原为未设置状态）；不传=不修改 |

---

### 2.3 PUT /api/h5/relations/:id — 更新师生关系

`category_lessons` 数组每项新增 `unit_price` 字段：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `category_lessons[].unit_price` | number \| null | 否 | 覆盖该分类的课单价；null=使用分类默认单价；不传=不修改 |

> 注意：每次成功调整课时数量后，系统会自动写入课时变动日志（`lesson_change_logs`），用于统计续课数量。

**请求示例：**
```json
{
  "category_lessons": [
    {
      "category_id": 0,
      "remaining_lessons": 20,
      "unit_price": 180
    }
  ]
}
```

---

### 2.4 POST /api/h5/coach-cards — 创建卡片模板

新增请求参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `unit_price` | number | 否 | 卡片课单价（元/课时），默认 0 |

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "id": 5,
    "card_name": "季度卡",
    "card_lessons": 40,
    "unit_price": 150,
    ...
  }
}
```

---

### 2.5 PUT /api/h5/coach-cards/:id — 编辑卡片模板

新增请求参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `unit_price` | number | 否 | 卡片课单价（非负数） |

---

### 2.6 POST /api/h5/card-instances — 为学员添加卡片实例

新增请求参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `unit_price` | number \| null | 否 | 覆盖单价；null 或不传=继承模板单价 |

---

### 2.7 PUT /api/h5/card-instances/:id — 修改卡片实例

新增请求参数及相应错误提示更新：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `unit_price` | number \| null | 否 | 覆盖单价；null=清空（继承模板）；不传=不修改 |

---

## 三、新增接口

### 3.1 GET /api/h5/stats/overview — 数据总览

> 仅教练可访问。

**Query 参数：**

| 参数 | 类型 | 说明 |
|---|---|---|
| `student_ids` | string | 逗号分隔学员ID，不传统计全部（如 `10,11,12`） |
| `start_date` | string | 起始日期 `YYYY-MM-DD`（含），不传不限 |
| `end_date` | string | 截止日期 `YYYY-MM-DD`（含），不传不限 |
| `category_id` | number | 按课程分类过滤（常规课），与 `card_id` 互斥 |
| `card_id` | number | 按卡片模板 ID 过滤（课程卡），与 `category_id` 互斥 |

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "completed_lessons": 338,
    "completed_revenue": 86220.00,
    "remaining_lessons": 127,
    "remaining_revenue": 31000.00
  },
  "message": "获取统计总览成功"
}
```

| 字段 | 说明 |
|---|---|
| `completed_lessons` | 已消课时数（受 start_date/end_date 约束） |
| `completed_revenue` | 消课收入，元（受时间约束） |
| `remaining_lessons` | 当前剩余课时数（**不受时间约束**） |
| `remaining_revenue` | 未消课金额/负债，元（**不受时间约束**） |

---

### 3.2 GET /api/h5/stats/completion-ranking — 消课排行榜

> 仅教练可访问。

**Query 参数：**

| 参数 | 类型 | 说明 |
|---|---|---|
| `start_date` | string | 起始日期 `YYYY-MM-DD` |
| `end_date` | string | 截止日期 `YYYY-MM-DD` |
| `limit` | number | 返回前 N 名，默认 20，最大 100 |

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "rank": 1,
        "student_id": 10,
        "student_name": "蒋X",
        "avatar_url": "https://...",
        "completed_lessons": 28
      },
      {
        "rank": 2,
        "student_id": 15,
        "student_name": "王X",
        "avatar_url": null,
        "completed_lessons": 20
      }
    ]
  },
  "message": "获取消课排行榜成功"
}
```

---

### 3.3 GET /api/h5/lesson-change-logs — 课时变动日志

> 教练可查自己名下所有学员的日志；学员只能查自己的日志。

**Query 参数：**

| 参数 | 类型 | 说明 |
|---|---|---|
| `relation_id` | number | 按师生关系筛选 |
| `student_id` | number | 按学员筛选（仅教练有效） |
| `category_id` | number | 按课程分类筛选 |
| `change_type` | 1\|2\|3 | 变动类型：1-增加，2-减少，3-清零 |
| `start_date` | string | 起始日期 `YYYY-MM-DD` |
| `end_date` | string | 截止日期 `YYYY-MM-DD` |
| `page` | number | 页码，默认 1 |
| `limit` | number | 每页条数，默认 20，最大 100 |

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 101,
        "relation_id": 88,
        "coach_id": 1,
        "student_id": 10,
        "student_name": "小明",
        "student_avatar": "https://...",
        "category_id": 0,
        "change_type": 1,
        "change_type_text": "增加",
        "before_lessons": 0,
        "after_lessons": 20,
        "change_amount": 20,
        "unit_price": 180,
        "operator_id": 1,
        "remark": null,
        "created_at": "2026-06-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 56,
      "page": 1,
      "limit": 20,
      "total_pages": 3
    }
  },
  "message": "获取课时变动日志成功"
}
```

| 字段 | 说明 |
|---|---|
| `change_type` | 1=增加（购课/续课），2=减少（消课/手动调减），3=清零 |
| `change_type_text` | 变动类型文本 |
| `before_lessons` | 变动前剩余课时 |
| `after_lessons` | 变动后剩余课时 |
| `change_amount` | 变动数量（绝对值） |
| `unit_price` | 变动时的课单价快照（可能为 null，表示未记录） |

---

## 四、自动写入日志的场景

以下操作会自动写入课时变动日志，无需前端额外处理：

| 触发点 | 变动类型 | 说明 |
|---|---|---|
| `PUT /api/h5/relations/:id` 教练调增课时 | 增加（1） | 购课/续课 |
| `PUT /api/h5/relations/:id` 教练调减课时 | 减少（2） | 手动调整 |
| `PUT /api/h5/relations/:id` 设置 `is_cleared=true` | 清零（3） | 合同到期等 |
| 普通课完成（`PUT /api/h5/courses/:id/complete`） | 减少（2） | 自动消课，change_amount=1 |
| 超时取消课程补录完成（`PUT /api/h5/courses/:id/restore-complete`） | 减少（2） | 补录消课，change_amount=1 |
