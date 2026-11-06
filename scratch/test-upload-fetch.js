const http = require('http');

function postMultipart(path, token, filename, content) {
  return new Promise((resolve) => {
    const boundary = '----Boundary' + Math.random().toString(36).slice(2);
    const crlf = '\r\n';
    const parts = [
      Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="files"; filename="${filename}"${crlf}Content-Type: image/png${crlf}${crlf}`),
      content,
      Buffer.from(`${crlf}--${boundary}--${crlf}`)
    ];
    const body = Buffer.concat(parts);

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d || '{}') }));
    });
    req.write(body);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve) => {
    http.get(url, res => {
      let len = 0;
      res.on('data', c => len += c.length);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, length: len }));
    });
  });
}

async function run() {
  const loginRes = await new Promise((resolve) => {
    const data = JSON.stringify({ email: 'admin@gmail.com', password: 'admin@gmail.com' });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(data);
    req.end();
  });

  const token = loginRes.data?.token;
  const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  
  const uploadRes = await postMultipart('/api/v1/admin/media', token, 'my-logo.png', samplePng);
  console.log('Upload Result:', JSON.stringify(uploadRes.data, null, 2));

  const imgUrl = uploadRes.data.data[0].url;
  console.log('Fetching uploaded image:', imgUrl);
  // Replace base with localhost:8000 for local test
  const localUrl = imgUrl.replace('https://laravel.hamptworthstays.com', 'http://127.0.0.1:8000');
  const fetchRes = await get(localUrl);
  console.log('Image Fetch Status:', fetchRes.status);
  console.log('Content-Type:', fetchRes.headers['content-type']);
  console.log('Downloaded Bytes:', fetchRes.length);
}

run();

