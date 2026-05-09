const express = require('express');
const router = express.Router();
const TagController = require('../controllers/TagController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 教练标签相关路由
 */

// 获取当前教练的所有标签
router.get('/', authenticateToken, TagController.getTags);

// 创建标签
router.post('/', authenticateToken, TagController.createTag);

// 设置学员标签（全量替换，需放在 /:id 之前避免路由冲突）
router.put('/relation/:relationId', authenticateToken, TagController.setStudentTags);

// 更新标签名称
router.put('/:id', authenticateToken, TagController.updateTag);

// 删除标签
router.delete('/:id', authenticateToken, TagController.deleteTag);

module.exports = router;
