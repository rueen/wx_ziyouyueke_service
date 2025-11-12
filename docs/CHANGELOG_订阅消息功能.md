# 订阅消息功能开发变更日志

**版本**: v1.0.0  
**日期**: 2025-11-09  
**开发者**: AI Assistant

## 变更概述

本次更新为项目添加了微信小程序订阅消息功能，实现了课程预约相关的自动消息推送。

## 新增文件

### 1. 订阅消息服务类
**文件**: `src/shared/services/subscribeMessageService.js`

**功能**:
- 封装订阅消息发送逻辑
- 提供场景化的消息发送方法
- 支持批量发送消息
- 统一的消息格式处理

**核心方法**:
```javascript
// 场景一：预约确认提醒
SubscribeMessageService.sendBookingConfirmNotice(params)

// 场景二：预约成功通知
SubscribeMessageService.sendBookingSuccessNotice(params)

// 批量发送
SubscribeMessageService.sendBatchMessages(templateType, paramsList)

// 时间格式化工具
SubscribeMessageService.formatTimeSlot(courseDate, startTime, endTime)
```

### 2. 功能说明文档
**文件**: `docs/订阅消息功能说明.md`

**内容**:
- 功能概述
- 技术架构说明
- 已实现场景详解
- 环境变量配置
- 数据流程图
- API 接口说明
- 扩展新场景指南
- 注意事项和测试建议

### 3. 数据库迁移脚本
**文件**: `scripts/004_create_subscribe_message_logs_table.js`

**功能**:
- 创建 subscribe_message_logs 表
- 设置唯一索引防止重复发送

**运行方法**:
```bash
node scripts/004_create_subscribe_message_logs_table.js
```

### 4. 变更日志
**文件**: `docs/CHANGELOG_订阅消息功能.md`

记录本次功能开发的所有变更。

## 修改文件

### 1. CourseController.js
**文件**: `src/h5/controllers/CourseController.js`

**变更内容**:
- 引入 `SubscribeMessageService`
- 在 `createBooking` 方法中集成预约确认提醒
  - 使用 `setImmediate` 异步发送消息
  - 不阻塞 API 响应
  - 添加错误处理和日志记录
- 在 `confirmCourse` 方法中集成预约成功通知
  - 增加关联数据查询（coach, student, address）
  - 获取课程分类名称
  - 异步发送确认消息

**代码示例**:
```javascript
// 在 createBooking 方法中
setImmediate(async () => {
  try {
    const bookerUser = userId === student_id ? student : coach;
    const receiverUser = userId === student_id ? coach : student;

    await SubscribeMessageService.sendBookingConfirmNotice({
      booking,
      bookerUser,
      receiverUser,
      relation,
      address
    });
  } catch (error) {
    logger.error('发送预约确认提醒失败:', error);
  }
});
```

### 3. README.md
**文件**: `README.md`

**变更内容**:
- 项目特性中添加 "📬 微信订阅消息推送"
- 环境配置章节添加订阅消息模板ID配置
- 新增 "功能文档" 章节，包含订阅消息功能说明链接
- 新增 "订阅消息功能" 开发说明
- 新增测试脚本使用说明

## 技术特点

### 1. 高内聚、低耦合
- 订阅消息逻辑独立封装在 `SubscribeMessageService` 中
- 业务代码通过简单的方法调用即可集成
- 易于测试和维护

### 2. 异步非阻塞
- 使用 `setImmediate` 在下一个事件循环中发送消息
- 不影响 API 响应速度
- 提升用户体验

### 3. 容错处理
- 消息发送失败不影响主业务流程
- 完善的错误日志记录
- 参数验证和字段长度限制

### 4. 易于扩展
- 清晰的模板配置机制
- 统一的消息发送接口
- 详细的扩展指南文档

## 实现的场景

### 场景一：预约确认提醒
- **模板ID**: `5UyBW3TXEbdAlvdb_eV_5H6qePB0aEFlVc9ow67ZOXE`
- **触发时机**: 学员或教练创建课程预约后
- **接收人**: 预约的对方
- **消息内容**: 预约人、预约时段、预约地址、预约状态

### 场景二：预约成功通知
- **模板ID**: 待配置
- **触发时机**: 教练或学员确认课程预约后
- **接收人**: 创建预约的人
- **消息内容**: 课程名称、上课时间、上课地点、备注

### 场景三：课程取消通知
- **模板ID**: `7ziRVg9Gnp4huLb3q4v48ylR2z-kCOkEoM5-8Ad-Hkg`
- **触发时机**: 学员或教练取消课程后
- **接收人**: 未取消的一方
- **消息内容**: 上课时间、上课地点、取消原因

## 数据流程

### 创建预约流程
```
用户创建预约
    ↓
验证参数和权限
    ↓
检查课时和时间冲突
    ↓
创建预约记录 (course_bookings)
    ↓
返回成功响应
    ↓
[异步] 发送预约确认提醒
    ↓
用户收到订阅消息
```

### 确认预约流程
```
用户确认预约
    ↓
验证权限和状态
    ↓
更新预约状态为已确认
    ↓
返回成功响应
    ↓
[异步] 发送预约成功通知
    ↓
用户收到订阅消息
```

### 取消课程流程
```
用户取消预约
    ↓
验证权限和状态
    ↓
更新预约状态为已取消
    ↓
返回成功响应
    ↓
[异步] 发送课程取消通知
    ↓
用户收到订阅消息
```

## 配置说明

### 环境变量
需要在 `.env` 文件中配置以下变量：

```bash
# 微信小程序基础配置
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret
```

### 微信公众平台配置
1. 登录微信公众平台
2. 进入 "功能" -> "订阅消息"
3. 选择或添加相应的消息模板
4. 获取模板ID并配置到环境变量

## 测试指南

### 1. 集成测试
1. 创建测试预约
2. 检查日志确认消息发送
3. 在小程序中验证接收情况

### 2. 测试注意事项
- 需要真实的用户 openid
- 用户需要先订阅消息
- 注意微信 API 调用频率限制

## 后续优化建议

### 1. 功能扩展
- [x] 添加课程取消通知
- [ ] 添加课程提醒（上课前X小时）
- [ ] 添加课时余额不足提醒
- [ ] 添加课时过期提醒

### 2. 性能优化
- [ ] 实现消息发送队列
- [ ] 添加消息发送失败重试机制
- [ ] 缓存 access_token 减少 API 调用

### 3. 监控增强
- [ ] 添加消息发送成功率统计
- [ ] 添加发送失败原因分析
- [ ] 接入监控告警系统

### 4. 用户体验
- [ ] 实现订阅引导功能
- [ ] 添加消息订阅状态管理
- [ ] 支持用户自定义通知偏好

## 相关文档

- [订阅消息功能说明](./订阅消息功能说明.md)
- [微信小程序订阅消息官方文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html)
- [API 设计文档](./api_design.md)

## 注意事项

1. **用户订阅**: 用户需要主动订阅才能接收消息
2. **次数限制**: 每次订阅只能发送一次消息
3. **内容规范**: 严格遵循微信订阅消息内容规范
4. **字段限制**: 注意各字段类型和长度限制
5. **频率控制**: 避免短时间内大量发送

## 版本信息

- **初始版本**: v1.0.0
- **发布日期**: 2025-11-09
- **适用环境**: Node.js >= 16.0.0
- **依赖**: 
  - axios (HTTP 请求)
  - moment-timezone (时间处理)
  - 现有的 wechat.js 工具类

## 联系方式

如有问题或建议，请联系开发团队。

