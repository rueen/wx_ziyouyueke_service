/**
 * 创建训练计划表 (plans) 的 SQL 脚本
 * 
 * 使用方法：
 * 1. 直接在 MySQL 客户端执行此 SQL
 * 2. 或使用命令：mysql -u用户名 -p数据库名 < create-plans-table.sql
 */

CREATE TABLE IF NOT EXISTS `plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '训练计划ID',
  `student_id` BIGINT UNSIGNED NOT NULL COMMENT '学员ID',
  `coach_id` BIGINT UNSIGNED NOT NULL COMMENT '教练ID',
  `plan_name` VARCHAR(100) NOT NULL COMMENT '计划名称',
  `plan_content` JSON DEFAULT NULL COMMENT '计划内容，JSON格式，方便扩展',
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否对学员可见：0-不可见，1-可见',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_coach_id` (`coach_id`),
  INDEX `idx_student_coach` (`student_id`, `coach_id`),
  INDEX `idx_is_visible` (`is_visible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='训练计划表';
