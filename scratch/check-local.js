const http = require('http');

http.get('http://127.0.0.1:8000/storage/media/test.jpg', res => {
  console.log('Local Status:', res.statusCode);
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('Local Body:', d.slice(0, 200)));
});

