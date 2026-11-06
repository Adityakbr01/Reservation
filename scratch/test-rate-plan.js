const http = require('http');

function post(path, token, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(data),
      }
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') }));
    });
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:8000${path}`, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve(JSON.parse(buf || '{}')));
    });
  });
}

async function run() {
  const login = await post('/api/v1/auth/login', '', { email: 'admin@gmail.com', password: 'admin@gmail.com' });
  const token = login.data?.data?.token;
  const roomTypes = await get('/api/public/room-types');
  const rtId = roomTypes.data[0].id;
  console.log('RoomType ID:', rtId);

  const res = await post('/api/v1/admin/rate-plans', token, {
    room_type_id: rtId,
    name: 'Standard Best Available Rate',
    description: 'Our most flexible leisure rate',
    price: 15000,
    multiplier: 1.0,
    status: 'ACTIVE',
  });
  console.log('Status:', res.status, 'Response:', JSON.stringify(res.data, null, 2));
}

run();

