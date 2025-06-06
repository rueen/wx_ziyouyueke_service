/**
 * 教练详情公开接口测试
 * 验证 GET /api/h5/coach/:id 接口是否可以在不认证的情况下访问
 */

const http = require('http');

/**
 * 测试教练详情接口
 * @param {number} coachId - 教练ID
 */
function testCoachDetailAPI(coachId = 1) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/h5/coach/${coachId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
      // 注意：这里没有 Authorization 头，测试公开访问
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`\n=== 教练详情接口测试结果 ===`);
      console.log(`状态码: ${res.statusCode}`);
      console.log(`响应头: ${JSON.stringify(res.headers, null, 2)}`);
      
      try {
        const result = JSON.parse(data);
        console.log(`响应数据: ${JSON.stringify(result, null, 2)}`);
        
        if (res.statusCode === 200 && result.success) {
          console.log(`✅ 测试成功：无需认证即可访问教练详情`);
          
          // 验证返回的数据结构
          const coach = result.data;
          if (coach && coach.id && coach.nickname) {
            console.log(`✅ 数据结构正确`);
            
            // 验证隐私保护：不应该包含手机号
            if (!coach.phone) {
              console.log(`✅ 隐私保护正确：未暴露手机号`);
            } else {
              console.log(`⚠️  警告：返回数据包含手机号，可能存在隐私泄露`);
            }
          } else {
            console.log(`❌ 数据结构不完整`);
          }
        } else {
          console.log(`❌ 测试失败：${result.message || '未知错误'}`);
        }
      } catch (error) {
        console.log(`❌ 响应解析失败: ${error.message}`);
        console.log(`原始响应: ${data}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`❌ 请求失败: ${error.message}`);
    console.log(`提示：请确保服务器已启动 (npm start)`);
  });

  req.end();
}

console.log('开始测试教练详情公开接口...');
console.log('请确保服务器已启动 (npm start)');

// 测试教练详情接口
testCoachDetailAPI(1);

// 也可以测试不存在的教练ID
setTimeout(() => {
  console.log('\n--- 测试不存在的教练ID ---');
  testCoachDetailAPI(99999);
}, 2000); 