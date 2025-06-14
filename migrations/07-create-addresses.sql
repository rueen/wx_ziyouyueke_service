-- 创建地址表
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '地址ID',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '用户ID',
  `name` varchar(100) NOT NULL COMMENT '地址名称',
  `address` varchar(500) NOT NULL COMMENT '详细地址',
  `latitude` decimal(10,8) NOT NULL COMMENT '纬度',
  `longitude` decimal(11,8) NOT NULL COMMENT '经度',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为默认地址',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_default` (`user_id`, `is_default`),
  KEY `idx_created_at` (`createdAt`),
  CONSTRAINT `fk_addresses_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地址表';

-- 创建索引以优化查询
-- 由于在表定义中已经创建了索引，这里不需要重复创建

-- 插入示例数据（可选）
-- INSERT INTO `addresses` (`user_id`, `name`, `address`, `latitude`, `longitude`, `is_default`) VALUES
-- (1, '万达广场健身房', '北京市朝阳区建国路93号万达广场B1层', 39.9042, 116.4074, 1),
-- (1, '五道口体育馆', '北京市海淀区五道口华清嘉园附近', 40.0055, 116.3403, 0); 