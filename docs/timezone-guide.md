# 多时区支持文档

## 概述

系统现在支持多时区处理，用户可以使用自己当前所在时区的时间进行操作。

## 工作原理

### 1. 时区获取方式

系统通过以下方式获取用户时区：

1. **请求头方式**（推荐）：
   ```javascript
   // 前端发送请求时添加时区头
   headers: {
     'X-Timezone': 'Asia/Shanghai',  // 或其他时区
     'Content-Type': 'application/json'
   }
   ```

2. **自动推断**：
   - 微信小程序环境：默认使用 `Asia/Shanghai`
   - 其他环境：默认使用 `Asia/Shanghai`

### 2. 支持的时区

```javascript
const supportedTimezones = {
  'Asia/Shanghai': 'UTC+8',      // 中国标准时间
  'Asia/Tokyo': 'UTC+9',         // 日本标准时间
  'Asia/Hong_Kong': 'UTC+8',     // 香港时间
  'Asia/Singapore': 'UTC+8',     // 新加坡时间
  'America/New_York': 'UTC-5',   // 美国东部时间
  'America/Los_Angeles': 'UTC-8', // 美国西部时间
  'Europe/London': 'UTC+0',      // 英国时间
  'Europe/Paris': 'UTC+1',       // 欧洲中部时间
  'Australia/Sydney': 'UTC+10',  // 澳大利亚东部时间
  'UTC': 'UTC+0'                 // 协调世界时
};
```

## 前端集成

### 1. 微信小程序

```javascript
// 在 app.js 中获取用户时区
App({
  onLaunch() {
    // 获取系统信息中的时区
    const systemInfo = wx.getSystemInfoSync();
    const timezone = systemInfo.timeZone || 'Asia/Shanghai';
    
    // 存储到全局
    this.globalData.timezone = timezone;
  },
  
  globalData: {
    timezone: 'Asia/Shanghai'
  }
});

// 在请求拦截器中添加时区头
const request = (url, options = {}) => {
  const app = getApp();
  return wx.request({
    url: `${baseURL}${url}`,
    header: {
      'Content-Type': 'application/json',
      'X-Timezone': app.globalData.timezone,
      'Authorization': wx.getStorageSync('token'),
      ...options.header
    },
    ...options
  });
};
```

### 2. Web 应用

```javascript
// 获取用户时区
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// 在 axios 请求中添加时区头
axios.defaults.headers.common['X-Timezone'] = userTimezone;

// 或者在每个请求中添加
const api = axios.create({
  baseURL: 'http://your-api.com',
  headers: {
    'X-Timezone': userTimezone
  }
});
```

## API 影响

### 1. 受影响的接口

所有与时间相关的接口都会考虑用户时区：

- `POST /api/h5/courses` - 创建课程预约
- `GET /api/h5/courses` - 获取课程列表
- `GET /api/h5/courses/:id` - 获取课程详情
- `PUT /api/h5/courses/:id/confirm` - 确认课程
- 超时取消自动任务

### 2. 时间字段处理

- **输入时间**：前端按用户时区输入，后端自动处理
- **输出时间**：后端统一使用 UTC 存储，前端可根据需要转换显示
- **超时判断**：基于用户时区进行判断

## 使用示例

### 1. 创建课程预约

```javascript
// 前端代码
const createCourse = async () => {
  const response = await request('/api/h5/courses', {
    method: 'POST',
    data: {
      coach_id: 1,
      student_id: 2,
      course_date: '2024-01-15',  // 用户时区的日期
      start_time: '14:00',        // 用户时区的时间
      end_time: '15:00',          // 用户时区的时间
      address_id: 1
    }
  });
};
```

### 2. 时区转换工具

```javascript
// 后端工具方法
const TimezoneUtil = require('./utils/timezone');

// 获取用户时区的当前时间
const currentTime = TimezoneUtil.getCurrentTime('Asia/Shanghai');

// 检查时间是否过期
const isExpired = TimezoneUtil.isTimeExpired('2024-01-15', '14:00', 'Asia/Shanghai');

// 时间格式化
const formatted = TimezoneUtil.formatTime(new Date(), 'Asia/Shanghai', 'datetime');
```

## 注意事项

### 1. 数据库存储

- 所有时间戳字段（如 `created_at`, `confirmed_at`）继续使用 UTC 时间存储
- 日期和时间字段（如 `course_date`, `start_time`）按照用户时区存储

### 2. 兼容性

- 如果前端没有发送时区信息，系统默认使用 `Asia/Shanghai`
- 老版本前端仍然可以正常工作

### 3. 性能考虑

- 时区转换在内存中进行，性能影响很小
- 超时检查任务根据主要用户群体的时区运行

## 测试

### 1. 测试不同时区

```javascript
// 测试代码
const testTimezones = ['Asia/Shanghai', 'America/New_York', 'Europe/London'];

testTimezones.forEach(timezone => {
  console.log(`${timezone}: ${TimezoneUtil.getCurrentTime(timezone)}`);
});
```

### 2. 模拟不同时区请求

```bash
# 中国时区
curl -H "X-Timezone: Asia/Shanghai" http://api.example.com/courses

# 美国东部时区
curl -H "X-Timezone: America/New_York" http://api.example.com/courses

# 欧洲时区
curl -H "X-Timezone: Europe/London" http://api.example.com/courses
```

## 故障排除

### 1. 时区不识别

如果系统不识别某个时区，会自动回退到默认时区 `Asia/Shanghai`。

### 2. 时间显示异常

检查前端是否正确发送了 `X-Timezone` 请求头。

### 3. 超时判断错误

确保服务器时间正确，建议使用 NTP 同步服务器时间。
