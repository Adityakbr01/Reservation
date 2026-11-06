const https = require('https');

https.get('https://laravel.hamptworthstays.com/some-random-page-12345', res => {
  console.log('Status for random page:', res.statusCode);
});

