# 自由约课系统数据库设计文档

## 概述

本文档为自由约课微信小程序系统的数据库设计规范，支持学员和教练的多对多关系管理，以及完整的课程预约流程。

## 设计原则

- **数据一致性**：确保数据的完整性和一致性
- **扩展性**：支持未来功能扩展和业务增长
- **性能优化**：合理的索引设计和查询优化
- **安全性**：敏感数据加密和权限控制
- **维护性**：清晰的字段命名和完整的注释

## 表结构设计

### 1. 用户表 (users)

用户基础信息表。

```sql
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '微信openid',
  `unionid` varchar(100) DEFAULT NULL COMMENT '微信unionid',
  `nickname` varchar(100) DEFAULT NULL COMMENT '用户昵称',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `gender` tinyint(1) DEFAULT NULL COMMENT '性别：0-未知，1-男，2-女',
  `intro` text COMMENT '个人介绍',
  `register_time` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `last_login_time` timestamp DEFAULT NULL COMMENT '最后登录时间',
  `status` tinyint(1) DEFAULT 1 COMMENT '账户状态：0-禁用，1-正常',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 2. 学员教练关系表 (student_coach_relations)

多对多关系表，管理学员和教练的绑定关系。

```sql
CREATE TABLE `student_coach_relations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `student_id` bigint(20) unsigned NOT NULL COMMENT '学员ID',
  `coach_id` bigint(20) unsigned NOT NULL COMMENT '教练ID',
  `remaining_lessons` int(11) DEFAULT 0 COMMENT '剩余课时',
  `coach_remark` text COMMENT '教练备注',
  `student_remark` text COMMENT '学员备注',
  `relation_status` tinyint(1) DEFAULT 1 COMMENT '关系状态：0-已解除，1-正常',
  `bind_time` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
  `last_course_time` timestamp NULL DEFAULT NULL COMMENT '最后上课时间',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_coach` (`student_id`, `coach_id`),
  KEY `idx_coach_id` (`coach_id`),
  KEY `idx_relation_status` (`relation_status`),
  CONSTRAINT `fk_relations_student_id` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_relations_coach_id` FOREIGN KEY (`coach_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学员教练关系表';
```

### 3. 时间模板表 (time_templates)

教练的可预约时间模板和预约规则。

```sql
CREATE TABLE `time_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `coach_id` bigint(20) unsigned NOT NULL COMMENT '教练ID',
  `min_advance_days` int(11) DEFAULT 1 COMMENT '最少提前预约天数',
  `max_advance_days` int(11) DEFAULT 5 COMMENT '最多可预约天数',
  `time_slots` json DEFAULT NULL COMMENT '时间段数组，格式：[{"startTime":"09:00","endTime":"12:00"}]',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '是否启用：0-禁用，1-启用',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_coach_active` (`coach_id`, `is_active`),
  CONSTRAINT `fk_time_templates_coach_id` FOREIGN KEY (`coach_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='时间模板表';
```

### 4. 课程预约表 (course_bookings)

核心的课程预约记录表。

```sql
CREATE TABLE `course_bookings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '课程ID',
  `booking_no` varchar(32) NOT NULL COMMENT '预约单号',
  `student_id` bigint(20) unsigned NOT NULL COMMENT '学员ID',
  `coach_id` bigint(20) unsigned NOT NULL COMMENT '教练ID',
  `relation_id` bigint(20) unsigned NOT NULL COMMENT '学员教练关系ID',
  `template_id` bigint(20) unsigned DEFAULT NULL COMMENT '时间模板ID',
  `course_date` date NOT NULL COMMENT '上课日期',
  `start_time` time NOT NULL COMMENT '开始时间',
  `end_time` time NOT NULL COMMENT '结束时间',
  `location` varchar(200) DEFAULT NULL COMMENT '上课地点',
  `student_remark` text COMMENT '学员备注',
  `coach_remark` text COMMENT '教练备注',
  `booking_status` tinyint(1) DEFAULT 1 COMMENT '预约状态：1-待确认，2-已确认，3-已完成，4-已取消',
  `confirm_time` timestamp NULL DEFAULT NULL COMMENT '确认时间',
  `complete_time` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `cancel_time` timestamp NULL DEFAULT NULL COMMENT '取消时间',
  `cancel_reason` varchar(200) DEFAULT NULL COMMENT '取消原因',
  `canceled_by` bigint(20) unsigned DEFAULT NULL COMMENT '取消操作人ID',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_booking_no` (`booking_no`),
  KEY `idx_student_date` (`student_id`, `course_date`),
  KEY `idx_coach_date` (`coach_id`, `course_date`),
  KEY `idx_relation_id` (`relation_id`),
  KEY `idx_booking_status` (`booking_status`),
  KEY `idx_course_date_time` (`course_date`, `start_time`),
  CONSTRAINT `fk_bookings_student_id` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_bookings_coach_id` FOREIGN KEY (`coach_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_bookings_relation_id` FOREIGN KEY (`relation_id`) REFERENCES `student_coach_relations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程预约表';
```

### 5. 消息通知表 (notifications)

系统消息和通知记录。

```sql
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '接收用户ID',
  `title` varchar(200) NOT NULL COMMENT '通知标题',
  `content` text COMMENT '通知内容',
  `notification_type` varchar(50) NOT NULL COMMENT '通知类型：booking,cancel,confirm,complete,system',
  `related_id` bigint(20) unsigned DEFAULT NULL COMMENT '关联ID（如课程ID）',
  `related_type` varchar(50) DEFAULT NULL COMMENT '关联类型',
  `is_read` tinyint(1) DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  `read_time` timestamp NULL DEFAULT NULL COMMENT '阅读时间',
  `send_time` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  `expire_time` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_send_time` (`send_time`),
  CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息通知表';
```

### 6. 操作日志表 (operation_logs)

重要操作的审计日志。

```sql
CREATE TABLE `operation_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) unsigned DEFAULT NULL COMMENT '操作用户ID',
  `operation_type` varchar(50) NOT NULL COMMENT '操作类型',
  `operation_desc` varchar(200) DEFAULT NULL COMMENT '操作描述',
  `table_name` varchar(50) DEFAULT NULL COMMENT '涉及表名',
  `record_id` bigint(20) unsigned DEFAULT NULL COMMENT '记录ID',
  `old_data` json DEFAULT NULL COMMENT '操作前数据',
  `new_data` json DEFAULT NULL COMMENT '操作后数据',
  `ip_address` varchar(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) DEFAULT NULL COMMENT '用户代理',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_operation_type` (`operation_type`),
  KEY `idx_table_record` (`table_name`, `record_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
```

## 核心业务关系图

```
┌─────────────┐    ┌─────────────────────┐    ┌─────────────┐
│    users    │    │ student_coach_      │    │    users    │
│  (学员)      │◄──►│   relations         │◄──►│  (教练)      │
│             │    │   (多对多关系)        │    │             │
└─────────────┘    └─────────────────────┘    └─────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  course_bookings    │
                   │    (课程预约)        │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   time_templates    │
                   │    (时间模板)        │
                   └─────────────────────┘
```

## ⚠️ 重要提醒

基于当前的设计调整，数据库结构已极度简化：

### 1. 时间模板设计优化
- **新增预约规则**：`min_advance_days`（最少提前预约天数）、`max_advance_days`（最多可预约天数，默认5天）
- **灵活时间配置**：通过 `time_slots` JSON数组存储多个时间段
- **时间段格式示例**：
```json
[
  {"startTime": "09:00", "endTime": "12:00"},
  {"startTime": "14:00", "endTime": "16:00"},
  {"startTime": "19:00", "endTime": "21:00"}
]
```

### 2. 课程预约完整性
- **恢复时间字段**：`start_time` 和 `end_time` 用于记录具体上课时间
- **时间索引优化**：支持按日期和时间快速查询课程

### 3. 架构极简化优势
- **统一用户表**：所有用户信息集中在 `users` 表中，包含 `intro` 个人介绍
- **删除扩展表**：不再需要 `coach_profiles` 和 `student_profiles` 表
- **关系表增强**：在 `student_coach_relations` 表中添加双向备注功能
- **身份判断简化**：通过业务逻辑区分教练和学员角色
- **减少表关联**：从8个表减少到6个表，降低查询复杂度

### 4. 身份判断机制
- **动态角色识别**：通过用户在系统中的行为判断身份
  - 创建时间模板 → 教练身份
  - 预约课程 → 学员身份
  - 可同时具备双重身份
- **业务逻辑示例**：
  ```sql
  -- 判断是否为教练（有时间模板）
  SELECT EXISTS(SELECT 1 FROM time_templates WHERE coach_id = ?)
  
  -- 判断是否为学员（有预约记录或师生关系）
  SELECT EXISTS(SELECT 1 FROM student_coach_relations WHERE student_id = ?)
  ```

### 5. 备注功能增强
- **关系备注**：教练和学员可在关系表中互相添加备注
- **课程备注**：在课程预约表中记录具体课程的备注信息
- **多层次备注体系**：
  - `users.intro` - 个人介绍（公开）
  - `student_coach_relations.coach_remark` - 教练对学员的备注（私密）
  - `student_coach_relations.student_remark` - 学员对教练的备注（私密）
  - `course_bookings.coach_remark` - 课程教练备注
  - `course_bookings.student_remark` - 课程学员备注

### 6. 业务逻辑建议
- 学员预约时需检查是否在教练的 `min_advance_days` 和 `max_advance_days` 范围内
- 预约时间必须匹配教练时间模板中的 `time_slots` 配置
- 统计信息通过实时计算获取，减少数据冗余

---

**文档版本**：v2.0  
**创建时间**：2024-12-19  
**修改时间**：2024-12-19  
**维护人员**：架构团队  
**审核状态**：待审核

## 课程码设计

课程码由前端直接拼接课程ID生成，格式建议：`COURSE_{course_id}_{timestamp}`

例如：`COURSE_123456_1703001234`

## 索引策略

### 核心业务索引
1. **用户查询**：`idx_openid`, `idx_phone`
2. **课程查询**：`idx_student_date`, `idx_coach_date`, `idx_course_date_time`
3. **关系查询**：`idx_student_coach`, `idx_coach_id`
4. **时间模板**：`idx_coach_active`

### 复合索引优化
- `(student_id, course_date)` - 学员课程日历查询
- `(coach_id, course_date)` - 教练课程日历查询
- `(course_date, start_time)` - 按时间段查询课程
- `(booking_status, course_date)` - 按状态查询课程

## 数据安全考虑

1. **敏感信息加密**：身份证号、手机号等
2. **软删除策略**：重要数据使用状态标记而非物理删除
3. **审计追踪**：操作日志记录关键业务变更
4. **数据备份**：定期备份和恢复机制

## 性能优化建议

1. **分区策略**：按时间分区课程预约表
2. **缓存设计**：热点数据Redis缓存
3. **读写分离**：查询和写入操作分库处理
4. **异步处理**：消息通知异步队列处理

## 扩展考虑

1. **多机构支持**：增加机构表支持连锁健身房
2. **课程包管理**：支持课程套餐和优惠券
3. **支付集成**：对接微信支付等支付方式
4. **数据分析**：用户行为和业务分析表设计 