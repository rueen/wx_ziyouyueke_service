-- 课程预约状态调整脚本
-- 新状态：1-待确认，2-已确认，3-已完成，4-已取消
-- 旧状态：1-待确认，2-已确认，3-进行中，4-已完成，5-已取消

USE yueke;

-- 备份原始数据（可选）
-- CREATE TABLE course_bookings_backup AS SELECT * FROM course_bookings;

-- 开始事务
START TRANSACTION;

-- 更新状态映射
-- 原状态3（进行中）-> 新状态2（已确认）
UPDATE course_bookings 
SET booking_status = 2 
WHERE booking_status = 3;

-- 原状态4（已完成）-> 新状态3（已完成）
UPDATE course_bookings 
SET booking_status = 3 
WHERE booking_status = 4;

-- 原状态5（已取消）-> 新状态4（已取消）
UPDATE course_bookings 
SET booking_status = 4 
WHERE booking_status = 5;

-- 验证更新结果
SELECT 
    booking_status,
    COUNT(*) as count,
    CASE booking_status
        WHEN 1 THEN '待确认'
        WHEN 2 THEN '已确认'
        WHEN 3 THEN '已完成'
        WHEN 4 THEN '已取消'
        ELSE '未知状态'
    END as status_name
FROM course_bookings 
GROUP BY booking_status 
ORDER BY booking_status;

-- 如果结果正确，提交事务
COMMIT;

-- 如果有问题，可以回滚事务
-- ROLLBACK; 