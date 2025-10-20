# 小程序码 API 文档

## 概述

本文档描述了小程序码生成相关的API接口，基于微信官方的[获取不限制的小程序码](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html)接口实现。

## 基础信息

- **基础URL**: `http://localhost:3000/api/h5`
- **认证方式**: Bearer Token
- **内容类型**: `application/json`

## 接口列表

### 1. 生成小程序码（返回图片）

**接口地址：** `POST /api/h5/qrcode/generate`

**功能描述：** 生成小程序码并直接返回PNG图片数据

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| scene | string | 是 | 场景值，最大32个可见字符，只支持数字、大小写英文及部分特殊字符：!#$&'()*+,/:;=?@-._~ |
| page | string | 否 | 页面路径，默认为 `pages/index/index` |
| check_path | boolean | 否 | 是否检查page路径，默认 `true` |
| env_version | string | 否 | 版本，可选值：`release`（正式版）、`trial`（体验版）、`develop`（开发版），默认 `release` |
| width | number | 否 | 二维码宽度，单位px，范围280-1280，默认430 |
| auto_color | boolean | 否 | 自动配置线条颜色，默认 `false` |
| line_color | object | 否 | 线条颜色，格式：`{"r": 0, "g": 0, "b": 0}`，默认黑色 |
| is_hyaline | boolean | 否 | 是否需要透明底色，默认 `false` |

**请求示例：**
```json
{
  "scene": "courseId=123",
  "page": "pages/course/detail",
  "width": 500,
  "auto_color": false,
  "line_color": {
    "r": 0,
    "g": 0,
    "b": 0
  }
}
```

**响应格式：**
- **成功**：直接返回PNG图片数据
- **失败**：返回JSON错误信息

**响应头（成功）：**
```
Content-Type: image/png
Content-Length: <图片大小>
Cache-Control: public, max-age=3600
Content-Disposition: inline; filename="qrcode_<scene>.png"
```

**错误响应示例：**
```json
{
  "success": false,
  "message": "scene参数不能为空",
  "code": 400,
  "timestamp": "2025-01-15T10:00:00Z"
}
```

---

### 2. 生成小程序码（返回Base64）

**接口地址：** `POST /api/h5/qrcode/generate-base64`

**功能描述：** 生成小程序码并返回Base64编码的图片数据

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数：**

参数与上述接口完全相同。

**请求示例：**
```json
{
  "scene": "coachId=456&type=share",
  "page": "pages/coach/profile",
  "width": 300,
  "is_hyaline": true
}
```

**响应示例：**
```json
{
  "success": true,
  "code": 200,
  "message": "生成小程序码成功",
  "data": {
    "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "size": 15234,
    "scene": "coachId=456&type=share",
    "page": "pages/coach/profile",
    "width": 300
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

**响应参数说明：**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| qrcode | string | 完整的Data URL格式图片数据 |
| base64 | string | 纯Base64编码的图片数据 |
| size | number | 图片大小（字节） |
| scene | string | 场景值 |
| page | string | 页面路径 |
| width | number | 图片宽度 |

---

## 错误码说明

| 错误码 | 错误描述 | 解决方案 |
|--------|----------|----------|
| 400 | 参数验证失败 | 检查请求参数格式和内容 |
| 401 | 未授权 | 检查Authorization头是否正确 |
| 500 | 服务器内部错误 | 联系技术支持 |

### 微信接口错误码

| 错误码 | 错误描述 | 解决方案 |
|--------|----------|----------|
| 40001 | access_token无效或已过期 | 系统会自动重试获取新token |
| 40129 | scene参数格式错误 | 检查scene参数是否包含不支持的字符 |
| 41030 | page路径不正确 | 检查页面路径是否存在于小程序中 |
| 85096 | 包含系统保留参数 | 不要在scene中使用scancode_time参数 |
| 40097 | 参数错误 | 检查所有参数格式是否正确 |
| 40169 | scene参数不合法 | 检查scene参数长度和格式 |

---

## 使用示例

### 前端调用示例（JavaScript）

#### 1. 获取图片URL（适用于直接显示）

```javascript
// 生成小程序码并获取图片URL
async function generateQRCodeImage(scene, page = 'pages/index/index') {
  try {
    const response = await fetch('/api/h5/qrcode/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scene: scene,
        page: page,
        width: 430
      })
    });

    if (response.ok) {
      // 创建图片URL
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      // 显示图片
      const img = document.createElement('img');
      img.src = imageUrl;
      document.body.appendChild(img);
      
      return imageUrl;
    } else {
      const error = await response.json();
      console.error('生成小程序码失败:', error.message);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 使用示例
generateQRCodeImage('courseId=123', 'pages/course/detail');
```

#### 2. 获取Base64数据（适用于保存或传输）

```javascript
// 生成小程序码并获取Base64数据
async function generateQRCodeBase64(scene, page = 'pages/index/index') {
  try {
    const response = await fetch('/api/h5/qrcode/generate-base64', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scene: scene,
        page: page,
        width: 430,
        auto_color: true
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // 使用Base64数据
      const { qrcode, base64, size } = result.data;
      
      // 方式1：直接设置为img的src
      document.getElementById('qrcode-img').src = qrcode;
      
      // 方式2：使用纯Base64数据
      console.log('Base64数据:', base64);
      console.log('图片大小:', size, '字节');
      
      return result.data;
    } else {
      console.error('生成失败:', result.message);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 使用示例
generateQRCodeBase64('coachId=456&action=share', 'pages/coach/profile');
```

### 微信小程序调用示例

```javascript
// 微信小程序中调用
function generateQRCode(scene, page) {
  wx.request({
    url: 'https://your-domain.com/api/h5/qrcode/generate-base64',
    method: 'POST',
    header: {
      'Authorization': `Bearer ${wx.getStorageSync('token')}`,
      'Content-Type': 'application/json'
    },
    data: {
      scene: scene,
      page: page,
      width: 500
    },
    success: function(res) {
      if (res.data.success) {
        // 保存图片到相册
        const base64 = res.data.data.base64;
        const filePath = wx.env.USER_DATA_PATH + '/qrcode.png';
        
        wx.getFileSystemManager().writeFile({
          filePath: filePath,
          data: base64,
          encoding: 'base64',
          success: function() {
            wx.saveImageToPhotosAlbum({
              filePath: filePath,
              success: function() {
                wx.showToast({
                  title: '保存成功',
                  icon: 'success'
                });
              }
            });
          }
        });
      }
    }
  });
}
```

---

## 注意事项

### 1. 场景值（scene）限制
- 最大32个可见字符
- 只支持数字、大小写英文及部分特殊字符：`!#$&'()*+,/:;=?@-._~`
- 不支持中文，如需传递中文请先编码
- 不能包含系统保留参数 `scancode_time`

### 2. 页面路径（page）限制
- 必须是已发布的小程序页面
- 路径前不要加 `/`
- 不能携带参数，参数请放在scene中
- 设置 `check_path=false` 可跳过页面检查

### 3. 性能建议
- 生成的小程序码会被缓存1小时
- 相同参数的请求建议客户端也进行缓存
- 图片大小通常在10-50KB之间

### 4. 安全建议
- 接口需要用户认证，确保token有效
- scene参数可能包含敏感信息，注意数据安全
- 建议对生成频率进行限制，防止滥用

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-15 | 初始版本，支持小程序码生成 |

---

## 技术支持

如有问题请联系技术团队或查看微信官方文档：
- [获取不限制的小程序码 - 微信官方文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html)
