# 课程内容记录功能 API 文档

## 概述

课程内容记录功能允许教练在课程结束后记录上课内容，包括文字、图片、音频、视频。支持一对一课程和团课。

## 功能特性

- ✅ 支持文字、图片、音频、视频多种内容形式
- ✅ 音频和视频文件存储在阿里云OSS
- ✅ 支持一对一课程和团课
- ✅ 只有教练可以添加/编辑内容
- ✅ 只有已完成的课程才能添加内容
- ✅ 支持清空内容（相当于删除）

## 数据库设计

### 课程内容表 (course_contents)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| course_type | TINYINT | 课程类型：1-一对一，2-团课 |
| booking_id | BIGINT | 一对一课程ID（可空） |
| group_course_id | BIGINT | 团课ID（可空） |
| coach_id | BIGINT | 教练ID |
| text_content | TEXT | 文本内容 |
| images | JSON | 图片URL数组 |
| audios | JSON | 音频数组（含时长）|
| videos | JSON | 视频数组（含时长）|
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## API 接口

### 1. 上传音频文件

**接口地址**: `POST /api/upload/audio`

**接口描述**: 上传音频文件到阿里云OSS

**认证**: 需要

**请求参数**:
- Content-Type: `multipart/form-data`
- 字段名: `file`
- 支持格式: mp3, m4a, aac, amr
- 最大大小: 20MB

**请求示例**:
```bash
POST /api/upload/audio
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <audio_file>
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "音频上传成功",
  "data": {
    "url": "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/audio/1749221234567_123_a1b2c3.mp3",
    "filename": "1749221234567_123_a1b2c3.mp3",
    "objectName": "audio/1749221234567_123_a1b2c3.mp3",
    "size": 5242880,
    "mimetype": "audio/mpeg"
  },
  "timestamp": 1638360000000
}
```

### 2. 上传视频文件

**接口地址**: `POST /api/upload/video`

**接口描述**: 上传视频文件到阿里云OSS

**认证**: 需要

**请求参数**:
- Content-Type: `multipart/form-data`
- 字段名: `file`
- 支持格式: mp4, mov, avi
- 最大大小: 100MB

**请求示例**:
```bash
POST /api/upload/video
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <video_file>
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "视频上传成功",
  "data": {
    "url": "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/video/1749221234567_123_a1b2c3.mp4",
    "filename": "1749221234567_123_a1b2c3.mp4",
    "objectName": "video/1749221234567_123_a1b2c3.mp4",
    "size": 52428800,
    "mimetype": "video/mp4"
  },
  "timestamp": 1638360000000
}
```

### 3. 添加课程内容

**接口地址**: `POST /api/h5/course-content`

**接口描述**: 为已完成的课程添加内容记录

**认证**: 需要（教练）

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| course_type | number | 是 | 课程类型：1-一对一，2-团课 |
| booking_id | number | 条件 | 一对一课程ID（course_type=1时必填） |
| group_course_id | number | 条件 | 团课ID（course_type=2时必填） |
| text_content | string | 否 | 文本内容 |
| images | array | 否 | 图片URL数组 |
| audios | array | 否 | 音频数组，格式：`[{"url": "xxx", "duration": 60}]` |
| videos | array | 否 | 视频数组，格式：`[{"url": "xxx", "duration": 120}]` |

**请求示例**:
```json
{
  "course_type": 1,
  "booking_id": 123,
  "text_content": "今天学习了瑜伽基础动作，学员进步很大。",
  "images": [
    "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/images/xxx.jpg"
  ],
  "audios": [
    {
      "url": "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/audio/xxx.mp3",
      "duration": 120
    }
  ],
  "videos": [
    {
      "url": "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/video/xxx.mp4",
      "duration": 300
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "课程内容添加成功",
  "data": {
    "id": 1,
    "course_type": 1,
    "booking_id": 123,
    "group_course_id": null,
    "coach_id": 10,
    "text_content": "今天学习了瑜伽基础动作，学员进步很大。",
    "images": ["https://..."],
    "audios": [{"url": "https://...", "duration": 120}],
    "videos": [{"url": "https://...", "duration": 300}],
    "created_at": "2025-11-30T10:00:00.000Z",
    "updated_at": "2025-11-30T10:00:00.000Z"
  },
  "timestamp": 1638360000000
}
```

### 4. 编辑课程内容

**接口地址**: `PUT /api/h5/course-content/:id`

**接口描述**: 编辑已有的课程内容

**认证**: 需要（教练）

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| text_content | string | 否 | 文本内容（传null或空字符串清空） |
| images | array | 否 | 图片URL数组（传null或空数组清空） |
| audios | array | 否 | 音频数组（传null或空数组清空） |
| videos | array | 否 | 视频数组（传null或空数组清空） |

**请求示例**:
```json
{
  "text_content": "更新后的文本内容",
  "images": [],
  "audios": null,
  "videos": [
    {
      "url": "https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/video/new.mp4",
      "duration": 180
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "课程内容更新成功",
  "data": {
    "id": 1,
    "course_type": 1,
    "booking_id": 123,
    "text_content": "更新后的文本内容",
    "images": null,
    "audios": null,
    "videos": [{"url": "https://...", "duration": 180}],
    "created_at": "2025-11-30T10:00:00.000Z",
    "updated_at": "2025-11-30T11:00:00.000Z"
  },
  "timestamp": 1638360000000
}
```

### 5. 获取课程详情（含课程内容）

**接口地址**: `GET /api/h5/courses/:id`

**接口描述**: 获取一对一课程详情，自动包含课程内容

**认证**: 需要

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取课程详情成功",
  "data": {
    "id": 123,
    "student_id": 5,
    "coach_id": 10,
    "course_date": "2025-11-30",
    "start_time": "10:00:00",
    "end_time": "11:00:00",
    "booking_status": 3,
    "student": {...},
    "coach": {...},
    "address": {...},
    "course_content": {
      "id": 1,
      "course_type": 1,
      "booking_id": 123,
      "text_content": "今天学习了瑜伽基础动作...",
      "images": ["https://..."],
      "audios": [{"url": "https://...", "duration": 120}],
      "videos": [{"url": "https://...", "duration": 300}],
      "created_at": "2025-11-30T10:00:00.000Z",
      "updated_at": "2025-11-30T10:00:00.000Z"
    }
  },
  "timestamp": 1638360000000
}
```

### 6. 根据课程ID获取课程内容

**接口地址**: `GET /api/h5/course-content/by-course`

**接口描述**: 根据课程类型和ID查询课程内容

**认证**: 需要

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| course_type | number | 是 | 课程类型：1-一对一，2-团课 |
| booking_id | number | 条件 | 一对一课程ID（course_type=1时必填） |
| group_course_id | number | 条件 | 团课ID（course_type=2时必填） |

**请求示例**:
```
GET /api/h5/course-content/by-course?course_type=1&booking_id=123
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "course_type": 1,
    "booking_id": 123,
    "text_content": "今天学习了瑜伽基础动作...",
    "images": ["https://..."],
    "audios": [{"url": "https://...", "duration": 120}],
    "videos": [{"url": "https://...", "duration": 300}]
  },
  "timestamp": 1638360000000
}
```

## 业务规则

1. **权限控制**
   - 只有教练可以添加和编辑课程内容
   - 教练只能操作自己的课程内容

2. **状态限制**
   - 一对一课程：只有状态为"已完成"（booking_status=3）的课程才能添加内容
   - 团课：只有状态为"已结束"（status=2）的团课才能添加内容

3. **唯一性**
   - 每个课程只能有一条内容记录
   - 如需修改，使用编辑接口

4. **内容要求**
   - 添加时至少需要填写一项内容（文本、图片、音频或视频）
   - 编辑时可以清空任意字段

5. **删除方式**
   - 不提供单独的删除接口
   - 通过编辑接口将所有字段清空即可达到删除效果

## 数据库迁移

执行以下命令创建课程内容表：

```bash
node scripts/migrations/add-course-content-table.js
```

## 注意事项

1. **文件大小限制**
   - 图片：2MB
   - 音频：20MB（可通过环境变量 `MAX_AUDIO_FILE_SIZE` 配置）
   - 视频：100MB（可通过环境变量 `MAX_VIDEO_FILE_SIZE` 配置）

2. **支持格式**
   - 图片：jpg, jpeg, png, gif, webp
   - 音频：mp3, m4a, aac, amr
   - 视频：mp4, mov, avi

3. **存储位置**
   - 图片：OSS `images/` 目录
   - 音频：OSS `audio/` 目录
   - 视频：OSS `video/` 目录

4. **时长字段**
   - 音频和视频的 `duration` 字段单位为秒
   - 前端需要在上传后获取媒体时长并传给后端

5. **JSON字段格式**
   ```json
   {
     "images": ["url1", "url2"],
     "audios": [
       {"url": "audio_url", "duration": 60}
     ],
     "videos": [
       {"url": "video_url", "duration": 120}
     ]
   }
   ```

