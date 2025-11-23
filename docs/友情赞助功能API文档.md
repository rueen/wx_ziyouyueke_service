# 友情赞助功能 API 文档

## 功能概述

友情赞助功能允许用户通过微信小程序支付对平台进行赞助。系统记录所有赞助信息，支持匿名赞助，并提供赞助列表展示。

## 数据库表结构

### donations 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 赞助ID，主键 |
| user_id | BIGINT | 赞助用户ID |
| openid | VARCHAR(100) | 用户openid |
| amount | INT | 赞助金额(分) |
| message | TEXT | 留言内容 |
| is_anonymous | TINYINT | 是否匿名：0-否，1-是 |
| out_trade_no | VARCHAR(32) | 商户订单号，唯一 |
| transaction_id | VARCHAR(32) | 微信支付订单号 |
| payment_status | TINYINT | 支付状态：0-待支付，1-已支付，2-已关闭，3-支付失败 |
| prepay_id | VARCHAR(64) | 预支付交易会话标识 |
| paid_at | DATETIME | 支付时间 |
| closed_at | DATETIME | 关闭时间 |
| remark | TEXT | 管理员备注 |
| createdAt | DATETIME | 创建时间 |
| updatedAt | DATETIME | 更新时间 |

## H5端 API 接口

### 1. 创建赞助订单

**接口**: `POST /api/h5/donations`

**权限**: 需登录

**请求参数**:
```json
{
  "amount": 1000,           // 必填，赞助金额(分)，范围：100-50000
  "message": "加油！",      // 可选，留言，最多200字
  "is_anonymous": 0         // 可选，是否匿名：0-否 1-是，默认0
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "订单创建成功",
  "data": {
    "donation_id": 123,
    "out_trade_no": "DON20251123123456789",
    "prepay_id": "wx...",
    "timeStamp": "1700000000",
    "nonceStr": "...",
    "package": "prepay_id=wx...",
    "signType": "RSA",
    "paySign": "..."
  },
  "timestamp": 1700000000000
}
```

**小程序调起支付示例**:
```javascript
// 1. 调用创建订单接口
const res = await wx.request({
  url: '/api/h5/donations',
  method: 'POST',
  data: {
    amount: 1000,
    message: '加油！',
    is_anonymous: 0
  }
});

// 2. 调起微信支付
wx.requestPayment({
  timeStamp: res.data.data.timeStamp,
  nonceStr: res.data.data.nonceStr,
  package: res.data.data.package,
  signType: res.data.data.signType,
  paySign: res.data.data.paySign,
  success(res) {
    console.log('支付成功', res);
    // 可以查询订单状态确认支付结果
  },
  fail(err) {
    console.error('支付失败', err);
  }
});
```

---

### 2. 查询赞助订单详情

**接口**: `GET /api/h5/donations/:id`

**权限**: 需登录，只能查询自己的订单

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": 123,
    "amount": 1000,
    "message": "加油！",
    "is_anonymous": 0,
    "payment_status": 1,
    "out_trade_no": "DON20251123123456789",
    "transaction_id": "4200...",
    "created_at": "2025-11-23 10:00:00",
    "paid_at": "2025-11-23 10:01:00"
  },
  "timestamp": 1700000000000
}
```

---

### 3. 获取我的赞助记录

**接口**: `GET /api/h5/donations/my/list`

**权限**: 需登录

**查询参数**:
- `page`: 页码，默认1
- `page_size`: 每页数量，默认10（注意：实际返回字段为 `pageSize`）

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": 123,
        "amount": 1000,
        "message": "加油！",
        "is_anonymous": 0,
        "payment_status": 1,
        "created_at": "2025-11-23 10:00:00",
        "paid_at": "2025-11-23 10:01:00"
      }
    ],
    "total": 10,
    "totalPages": 1,
    "page": 1,
    "pageSize": 10,
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_count": 10,
      "limit": 10
    }
  },
  "timestamp": 1700000000000
}
```

---

### 4. 获取赞助列表（公开）

**接口**: `GET /api/h5/donations/list/public`

**权限**: 无需登录

**查询参数**:
- `page`: 页码，默认1
- `page_size`: 每页数量，默认20（注意：实际返回字段为 `pageSize`）

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": 123,
        "nickname": "用户昵称",     // 匿名显示"匿名用户"
        "avatar_url": "...",        // 匿名时为空
        "amount": 1000,
        "message": "加油！",
        "paid_at": "2025-11-23 10:01:00"
      }
    ],
    "total": 100,
    "totalPages": 5,
    "page": 1,
    "pageSize": 20,
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "limit": 20
    }
  },
  "timestamp": 1700000000000
}
```

**说明**: 
- 列表按支付时间倒序排列
- 匿名用户昵称显示为"匿名用户"，头像为空
- 只显示已支付的订单

---

### 5. 查询订单支付状态

**接口**: `GET /api/h5/donations/:id/status`

**权限**: 需登录

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "payment_status": 1,
    "trade_state": "SUCCESS",
    "trade_state_desc": "支付成功"
  },
  "timestamp": 1700000000000
}
```

**支付状态说明**:
- `0`: 待支付
- `1`: 已支付
- `2`: 已关闭
- `3`: 支付失败

---

### 6. 支付结果回调

**接口**: `POST /api/h5/donations/notify`

**权限**: 微信服务器回调，需验证签名

**说明**: 此接口由微信支付服务器调用，开发者无需手动调用

---

## Admin端 API 接口

### 1. 获取赞助列表

**接口**: `GET /api/admin/donations`

**权限**: 需管理员登录

**查询参数**:
- `page`: 页码，默认1
- `page_size`: 每页数量，默认20（注意：实际返回字段为 `pageSize`）
- `payment_status`: 支付状态筛选（可选）
- `start_date`: 开始日期（可选，格式：2025-11-23）
- `end_date`: 结束日期（可选，格式：2025-11-23）

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": 123,
        "user_id": 1,
        "user_nickname": "张三",
        "user_phone": "13800138000",
        "amount": 1000,
        "message": "加油！",
        "is_anonymous": 0,
        "payment_status": 1,
        "out_trade_no": "DON20251123123456789",
        "transaction_id": "4200...",
        "created_at": "2025-11-23 10:00:00",
        "paid_at": "2025-11-23 10:01:00",
        "closed_at": null,
        "remark": null
      }
    ],
    "total": 100,
    "totalPages": 5,
    "page": 1,
    "pageSize": 20,
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "limit": 20
    }
  },
  "timestamp": 1700000000000
}
```

---

### 2. 获取赞助统计

**接口**: `GET /api/admin/donations/statistics`

**权限**: 需管理员登录

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "total_amount": 50000,    // 总赞助金额(分)
    "total_count": 100,       // 总赞助笔数
    "today_amount": 1000,     // 今日赞助金额(分)
    "today_count": 5,         // 今日赞助笔数
    "month_amount": 10000,    // 本月赞助金额(分)
    "month_count": 30         // 本月赞助笔数
  },
  "timestamp": 1700000000000
}
```

---

### 3. 获取赞助详情

**接口**: `GET /api/admin/donations/:id`

**权限**: 需管理员登录

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": 123,
    "user_id": 1,
    "user": {
      "id": 1,
      "nickname": "张三",
      "avatar_url": "...",
      "phone": "13800138000",
      "openid": "oXXXXXXXXX"
    },
    "amount": 1000,
    "message": "加油！",
    "is_anonymous": 0,
    "payment_status": 1,
    "out_trade_no": "DON20251123123456789",
    "transaction_id": "4200...",
    "prepay_id": "wx...",
    "created_at": "2025-11-23 10:00:00",
    "paid_at": "2025-11-23 10:01:00",
    "closed_at": null,
    "remark": null
  },
  "timestamp": 1700000000000
}
```

---

### 4. 更新赞助备注

**接口**: `PUT /api/admin/donations/:id/remark`

**权限**: 需管理员登录

**请求参数**:
```json
{
  "remark": "备注信息"
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "更新成功",
  "data": null,
  "timestamp": 1700000000000
}
```

---

## 业务规则

1. **金额限制**：
   - 最低赞助金额：100分（1元）
   - 最高赞助金额：50000分（500元）

2. **留言规则**：
   - 最多200个字符
   - 可为空

3. **匿名规则**：
   - 匿名用户在公开列表显示为"匿名用户"
   - 匿名用户头像为空字符串
   - 管理端可见真实用户信息

4. **订单规则**：
   - 订单号格式：`DON + 年月日时分秒 + 5位随机数`
   - 订单创建后2小时未支付自动关闭
   - 支付完成后状态不可更改

5. **列表展示**：
   - 公开列表按支付时间倒序排列
   - 只显示已支付成功的订单
   - 匿名用户信息脱敏处理

---

## 微信支付配置

### 需要的环境变量

```bash
# 微信小程序配置
WECHAT_APP_ID=wx...              # 小程序AppID
WECHAT_APP_SECRET=...            # 小程序AppSecret

# 微信支付配置
WECHAT_MCH_ID=1234567890         # 商户号
WECHAT_API_V3_KEY=...            # APIv3密钥（32位）
WECHAT_SERIAL_NO=...             # 商户API证书序列号
WECHAT_PRIVATE_KEY_PATH=/path/to/apiclient_key.pem  # 商户私钥文件路径
WECHAT_NOTIFY_URL=https://your-domain.com/api/h5/donations/notify  # 支付回调地址
```

### 获取商户证书

1. 登录微信支付商户平台
2. 进入"账户中心" -> "API安全"
3. 下载商户API证书
4. 将 `apiclient_key.pem` 保存到服务器
5. 配置 `WECHAT_PRIVATE_KEY_PATH` 为文件路径
6. 获取证书序列号，配置到 `WECHAT_SERIAL_NO`

### 配置支付回调地址

1. 登录微信支付商户平台
2. 进入"产品中心" -> "开发配置"
3. **重要**：找到"JSAPI支付回调链接"或"支付回调URL"（不是"Native支付回调链接"）
   - ✅ 正确：JSAPI支付回调链接（用于小程序支付）
   - ❌ 错误：Native支付回调链接（用于扫码支付，PC网站等）
4. 配置回调URL为：`https://your-domain.com/api/h5/donations/notify`
5. 确保URL可以被外网访问
6. 回调URL必须使用HTTPS

**注意**：
- 小程序支付（JSAPI）使用"JSAPI支付回调链接"
- Native支付（扫码支付）使用"Native支付回调链接"
- 如果找不到"JSAPI支付回调链接"，可能显示为"支付回调URL"或"支付通知URL"

---

## 数据库迁移

### 创建赞助表

```bash
node scripts/add-donation-table.js
```

此脚本会自动创建 `donations` 表结构。

---

## 测试流程

### 1. 配置环境变量

复制 `src/shared/config/env.example` 为 `.env`，填写微信支付配置。

### 2. 运行数据库迁移

```bash
node scripts/add-donation-table.js
```

### 3. 启动服务

```bash
npm run start:h5    # 启动H5端服务
npm run start:admin # 启动Admin端服务
```

### 4. 测试支付流程

1. 在小程序中调用创建订单接口
2. 使用返回的支付参数调起微信支付
3. 完成支付
4. 等待微信回调通知
5. 查询订单状态确认支付成功

---

## 注意事项

1. **生产环境必须使用HTTPS**：微信支付回调只支持HTTPS
2. **证书安全**：商户私钥文件需妥善保管，不要上传到代码仓库
3. **回调验证**：当前代码中回调签名验证为简化版本，生产环境需实现完整的签名验证逻辑
4. **证书管理**：需要实现微信支付平台证书的下载和缓存机制
5. **订单超时**：建议设置定时任务自动关闭超时未支付的订单
6. **日志记录**：所有支付相关操作都有详细日志，便于排查问题

---

## 后续优化建议

1. **完善签名验证**：实现完整的微信支付回调签名验证
2. **证书管理**：实现平台证书的自动下载和定期更新
3. **定时任务**：添加定时任务自动关闭超时订单
4. **支付重试**：实现支付失败的重试机制
5. **数据统计**：增加更详细的赞助数据统计分析
6. **通知功能**：支付成功后发送模板消息通知（如需要）

