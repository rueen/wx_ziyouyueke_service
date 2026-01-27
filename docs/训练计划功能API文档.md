# 训练计划功能 API 文档

## 功能概述

训练计划功能允许教练为学员制定和管理训练计划。计划内容采用 JSON 格式存储，方便后续扩展。支持设置计划对学员的可见性，学员只能查看可见的训练计划。

## 数据库表结构

### plans - 训练计划表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT UNSIGNED | 训练计划ID（主键，自增） |
| student_id | BIGINT UNSIGNED | 学员ID（必填） |
| coach_id | BIGINT UNSIGNED | 教练ID（必填） |
| plan_name | VARCHAR(100) | 计划名称（必填） |
| plan_content | JSON | 计划内容，JSON格式，方便扩展（可选） |
| is_visible | TINYINT(1) | 是否对学员可见：0-不可见，1-可见（默认1） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 权限说明

- **学员（role=1）**：只能查看自己的且可见的训练计划
- **教练（role=2）**：可以查看和管理自己制定的所有训练计划，可以按学员筛选

## API 接口

### 1. 获取训练计划列表

**接口地址：** `GET /api/h5/plans`

**请求头：**
```
Authorization: Bearer <token>
```

**请求参数（Query）：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| student_id | Number | 否 | 学员ID（仅教练可传，用于筛选特定学员的计划） |
| is_visible | Number | 否 | 是否可见：0-不可见，1-可见（仅教练可传） |
| page | Number | 否 | 页码，默认1 |
| page_size | Number | 否 | 每页数量，默认20 |

**响应示例：**
```json
{
  "success": true,
  "message": "获取训练计划列表成功",
  "data": {
    "list": [
      {
        "id": 1,
        "student_id": 100,
        "coach_id": 200,
        "plan_name": "增肌训练计划",
        "plan_content": {
          "exercises": [
            {
              "name": "深蹲",
              "sets": 3,
              "reps": 12
            }
          ],
          "duration": 30,
          "frequency": "每周3次"
        },
        "is_visible": 1,
        "created_at": "2025-01-27T10:00:00.000Z",
        "updated_at": "2025-01-27T10:00:00.000Z",
        "student": {
          "id": 100,
          "nickname": "学员昵称",
          "avatar_url": "https://example.com/avatar.jpg",
          "phone": "13800138000"
        },
        "coach": {
          "id": 200,
          "nickname": "教练昵称",
          "avatar_url": "https://example.com/coach.jpg",
          "phone": "13900139000"
        }
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "page_size": 20,
      "total_pages": 1
    }
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "code": 1003,
  "message": "无权查看该学员的训练计划"
}
```

---

### 2. 获取训练计划详情

**接口地址：** `GET /api/h5/plans/:id`

**请求头：**
```
Authorization: Bearer <token>
```

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | Number | 是 | 训练计划ID |

**响应示例：**
```json
{
  "success": true,
  "message": "获取训练计划详情成功",
  "data": {
    "id": 1,
    "student_id": 100,
    "coach_id": 200,
    "plan_name": "增肌训练计划",
    "plan_content": {
      "exercises": [
        {
          "name": "深蹲",
          "sets": 3,
          "reps": 12,
          "weight": "自身体重"
        },
        {
          "name": "卧推",
          "sets": 4,
          "reps": 10,
          "weight": "60kg"
        }
      ],
      "duration": 30,
      "frequency": "每周3次",
      "notes": "注意动作标准，避免受伤"
    },
    "is_visible": 1,
    "created_at": "2025-01-27T10:00:00.000Z",
    "updated_at": "2025-01-27T10:00:00.000Z",
    "student": {
      "id": 100,
      "nickname": "学员昵称",
      "avatar_url": "https://example.com/avatar.jpg",
      "real_name": "张三"
    },
    "coach": {
      "id": 200,
      "nickname": "教练昵称",
      "avatar_url": "https://example.com/coach.jpg",
      "real_name": "李教练"
    }
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "code": 4004,
  "message": "训练计划不存在"
}
```

```json
{
  "success": false,
  "code": 1003,
  "message": "无权查看该训练计划"
}
```

---

### 3. 新增训练计划

**接口地址：** `POST /api/h5/plans`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数（Body）：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| student_id | Number | 是 | 学员ID |
| plan_name | String | 是 | 计划名称（最大100字符） |
| plan_content | Object | 否 | 计划内容，JSON对象格式 |
| is_visible | Number | 否 | 是否对学员可见：0-不可见，1-可见（默认1） |

**请求示例：**
```json
{
  "student_id": 100,
  "plan_name": "减脂训练计划",
  "plan_content": {
    "exercises": [
      {
        "name": "跑步",
        "duration": 30,
        "intensity": "中等"
      },
      {
        "name": "力量训练",
        "sets": 3,
        "reps": 15
      }
    ],
    "duration": 60,
    "frequency": "每周5次",
    "diet_notes": "控制热量摄入"
  },
  "is_visible": 1
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "训练计划创建成功",
  "data": {
    "id": 1,
    "student_id": 100,
    "coach_id": 200,
    "plan_name": "减脂训练计划",
    "plan_content": {
      "exercises": [
        {
          "name": "跑步",
          "duration": 30,
          "intensity": "中等"
        },
        {
          "name": "力量训练",
          "sets": 3,
          "reps": 15
        }
      ],
      "duration": 60,
      "frequency": "每周5次",
      "diet_notes": "控制热量摄入"
    },
    "is_visible": 1,
    "created_at": "2025-01-27T10:00:00.000Z",
    "updated_at": "2025-01-27T10:00:00.000Z",
    "student": {
      "id": 100,
      "nickname": "学员昵称",
      "avatar_url": "https://example.com/avatar.jpg",
      "real_name": "张三"
    },
    "coach": {
      "id": 200,
      "nickname": "教练昵称",
      "avatar_url": "https://example.com/coach.jpg",
      "real_name": "李教练"
    }
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "学员ID不能为空"
}
```

```json
{
  "success": false,
  "message": "计划名称不能为空"
}
```

```json
{
  "success": false,
  "code": 1003,
  "message": "只有教练可以创建训练计划"
}
```

```json
{
  "success": false,
  "code": 1003,
  "message": "只能为自己的学员创建训练计划"
}
```

---

### 4. 编辑训练计划

**接口地址：** `PUT /api/h5/plans/:id`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | Number | 是 | 训练计划ID |

**请求参数（Body）：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| plan_name | String | 否 | 计划名称（最大100字符） |
| plan_content | Object | 否 | 计划内容，JSON对象格式 |
| is_visible | Number | 否 | 是否对学员可见：0-不可见，1-可见 |

**请求示例：**
```json
{
  "plan_name": "更新后的训练计划",
  "plan_content": {
    "exercises": [
      {
        "name": "深蹲",
        "sets": 4,
        "reps": 15
      }
    ],
    "notes": "增加训练强度"
  },
  "is_visible": 1
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "训练计划更新成功",
  "data": {
    "id": 1,
    "student_id": 100,
    "coach_id": 200,
    "plan_name": "更新后的训练计划",
    "plan_content": {
      "exercises": [
        {
          "name": "深蹲",
          "sets": 4,
          "reps": 15
        }
      ],
      "notes": "增加训练强度"
    },
    "is_visible": 1,
    "created_at": "2025-01-27T10:00:00.000Z",
    "updated_at": "2025-01-27T11:00:00.000Z",
    "student": {
      "id": 100,
      "nickname": "学员昵称",
      "avatar_url": "https://example.com/avatar.jpg",
      "real_name": "张三"
    },
    "coach": {
      "id": 200,
      "nickname": "教练昵称",
      "avatar_url": "https://example.com/coach.jpg",
      "real_name": "李教练"
    }
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "code": 4004,
  "message": "训练计划不存在"
}
```

```json
{
  "success": false,
  "code": 1003,
  "message": "只有创建该计划的教练可以编辑"
}
```

---

### 5. 删除训练计划

**接口地址：** `DELETE /api/h5/plans/:id`

**请求头：**
```
Authorization: Bearer <token>
```

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | Number | 是 | 训练计划ID |

**响应示例：**
```json
{
  "success": true,
  "message": "训练计划删除成功",
  "data": null
}
```

**错误响应：**
```json
{
  "success": false,
  "code": 4004,
  "message": "训练计划不存在"
}
```

```json
{
  "success": false,
  "code": 1003,
  "message": "只有创建该计划的教练可以删除"
}
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 1003 | 权限不足 |
| 4000 | 业务逻辑错误 |
| 4004 | 资源不存在 |

## 注意事项

1. **权限控制**：
   - 只有教练可以创建、编辑、删除训练计划
   - 学员只能查看自己的且可见的训练计划
   - 教练只能管理自己创建的训练计划

2. **师生关系验证**：
   - 创建训练计划时，系统会验证教练与学员的师生关系
   - 只有存在有效师生关系的学员才能被创建训练计划

3. **计划内容格式**：
   - `plan_content` 字段为 JSON 格式，可以灵活存储各种训练内容
   - 建议前端统一规划 JSON 结构，便于后续扩展

4. **可见性控制**：
   - `is_visible=0` 时，学员无法查看该计划
   - `is_visible=1` 时，学员可以查看该计划
   - 教练可以查看所有自己创建的计划，不受可见性限制

5. **分页说明**：
   - 列表接口支持分页，默认每页20条
   - 返回数据包含分页信息：总数、当前页、每页数量、总页数
