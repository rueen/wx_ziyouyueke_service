const express = require('express');
const router = express.Router();

/**
 * 管理端路由配置（预留）
 * 当前MVP版本暂不实现，为后期扩展预留
 */

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '管理端接口正常',
    timestamp: new Date().toISOString()
  });
});

// 暂未实现的提示
router.use('*', (req, res) => {
  res.status(501).json({
    success: false,
    code: 501,
    message: '管理端功能正在开发中，敬请期待',
    timestamp: Date.now()
  });
});

module.exports = router; 