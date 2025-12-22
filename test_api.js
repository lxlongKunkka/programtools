
// import fetch from 'node-fetch'; // Node 18+ has native fetch

async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 模拟一个 token，如果需要鉴权的话。这里先试试不带 token 或者带个假的
        'Authorization': 'Bearer test_token' 
      }
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text.slice(0, 500)); // 只打印前500字符
  } catch (e) {
    console.error(e);
  }
}

test();
