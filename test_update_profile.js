/**
 * 用户信息更新接口测试
 * 测试 PUT /api/h5/user/profile
 */

const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'your_test_token_here'; // 需要替换为真实的token

async function testUpdateProfile() {
  console.log('=== 用户信息更新接口测试 ===\n');

  // 测试用例 1: 测试更新完整用户信息（包括avatar_url）
  console.log('1. 测试更新完整用户信息（包括avatar_url）...');
  try {
    const updateData = {
      avatar_url: "http://localhost:3000/uploads/images/1749211777985_1_1wmcb6.jpeg",
      gender: 2,
      intro: "我是自由教练",
      nickname: "布兰达",
      phone: "19157755972"
    };

    const response = await axios.put(`${BASE_URL}/api/h5/user/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ 用户信息更新成功');
      console.log('更新后的用户信息:', {
        nickname: response.data.data.nickname,
        avatar_url: response.data.data.avatar_url,
        gender: response.data.data.gender,
        intro: response.data.data.intro,
        phone: response.data.data.phone
      });
      
      // 验证avatar_url是否正确保存
      if (response.data.data.avatar_url === updateData.avatar_url) {
        console.log('✅ avatar_url 保存成功');
      } else {
        console.log('❌ avatar_url 保存失败');
        console.log('期望:', updateData.avatar_url);
        console.log('实际:', response.data.data.avatar_url);
      }
    } else {
      console.log('❌ 更新失败:', response.data.message);
    }
  } catch (error) {
    if (error.response?.data?.code === 1002) {
      console.log('⚠️ 需要有效的认证token才能完成测试');
    } else {
      console.log('❌ 意外错误:', error.response?.data?.message || error.message);
    }
  }

  // 测试用例 2: 测试只更新avatar_url
  console.log('\n2. 测试只更新avatar_url...');
  try {
    const updateData = {
      avatar_url: "http://localhost:3000/uploads/images/new_avatar_123.jpg"
    };

    const response = await axios.put(`${BASE_URL}/api/h5/user/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ avatar_url 单独更新成功');
      console.log('新的头像URL:', response.data.data.avatar_url);
    } else {
      console.log('❌ 更新失败:', response.data.message);
    }
  } catch (error) {
    if (error.response?.data?.code === 1002) {
      console.log('⚠️ 需要有效的认证token才能完成测试');
    } else {
      console.log('❌ 意外错误:', error.response?.data?.message || error.message);
    }
  }

  // 测试用例 3: 测试无效的avatar_url格式
  console.log('\n3. 测试无效的avatar_url格式...');
  try {
    const updateData = {
      avatar_url: "invalid_url_format"
    };

    const response = await axios.put(`${BASE_URL}/api/h5/user/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('❌ 应该返回验证错误');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 正确返回URL格式验证错误:', error.response.data.message);
    } else {
      console.log('❌ 意外错误:', error.response?.data?.message || error.message);
    }
  }

  // 测试用例 4: 测试获取更新后的用户信息
  console.log('\n4. 测试获取更新后的用户信息...');
  try {
    const response = await axios.get(`${BASE_URL}/api/h5/user/profile`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 获取用户信息成功');
      console.log('当前用户信息:', {
        id: response.data.data.id,
        nickname: response.data.data.nickname,
        avatar_url: response.data.data.avatar_url,
        gender: response.data.data.gender,
        intro: response.data.data.intro,
        phone: response.data.data.phone
      });
    } else {
      console.log('❌ 获取失败:', response.data.message);
    }
  } catch (error) {
    if (error.response?.data?.code === 1002) {
      console.log('⚠️ 需要有效的认证token才能完成测试');
    } else {
      console.log('❌ 意外错误:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n=== 测试完成 ===');
  console.log('\n注意事项:');
  console.log('1. 需要启动服务器: npm run dev');
  console.log('2. 需要替换TEST_TOKEN为真实的JWT token');
  console.log('3. avatar_url 现在支持通过 PUT /api/h5/user/profile 接口更新');
  console.log('4. avatar_url 必须是有效的URL格式');
}

// 运行测试
if (require.main === module) {
  testUpdateProfile().catch(console.error);
}

module.exports = testUpdateProfile; 