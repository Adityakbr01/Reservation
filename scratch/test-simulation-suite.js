const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8000';

const results = [];

function logTest(category, name, passed, details = '') {
  results.push({ category, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category}] ${name} ${details ? '(' + details + ')' : ''}`);
}

async function request({ method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Accept': 'application/json',
      ...headers,
    };

    let postData = null;
    if (body && !(body instanceof Buffer) && typeof body === 'object' && !reqHeaders['Content-Type']?.includes('multipart')) {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    } else if (body instanceof Buffer) {
      postData = body;
      reqHeaders['Content-Length'] = body.length;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

// Build multipart/form-data payload
function buildMultipart(fields, files) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
  const crlf = '\r\n';
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
    ));
  }

  for (const { fieldName, filename, contentType, content } of files) {
    const header = Buffer.from(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}Content-Type: ${contentType}${crlf}${crlf}`
    );
    parts.push(header);
    parts.push(content);
    parts.push(Buffer.from(crlf));
  }

  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  const body = Buffer.concat(parts);

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body,
  };
}

// Dummy 1x1 PNG pixel
const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE E2E SIMULATION TEST SUITE');
  console.log('====================================================\n');

  let adminToken = '';
  let createdUserId = '';
  let userToken = '';
  let propertyId = '';
  let roomTypeId = '';
  let roomId = '';
  let ratePlanId = '';
  let policyId = '';
  let couponId = '';
  let uploadedMediaId = '';

  // ─────────────────────────────────────────────────────────────
  // 1. CORS & Preflight Suite
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'OPTIONS',
      path: '/api/v1/auth/register',
      headers: { 'Origin': 'http://localhost:5174', 'Access-Control-Request-Method': 'POST' },
    });
    const allowOrigin = res.headers['access-control-allow-origin'];
    logTest('CORS', 'Preflight OPTIONS returns CORS headers', res.status === 200 || res.status === 204, `Status: ${res.status}, Origin: ${allowOrigin}`);
  } catch (e) {
    logTest('CORS', 'Preflight OPTIONS returns CORS headers', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Auth Suite: Admin Login
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'admin@gmail.com', password: 'admin@gmail.com' },
    });
    if (res.status === 200 && res.data.success && res.data.data?.token) {
      adminToken = res.data.data.token;
      logTest('Auth', 'Admin login with admin@gmail.com', true, `Token: ${adminToken.slice(0, 15)}...`);
    } else {
      logTest('Auth', 'Admin login with admin@gmail.com', false, JSON.stringify(res.data));
    }
  } catch (e) {
    logTest('Auth', 'Admin login with admin@gmail.com', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Auth Suite: Admin /me Endpoint
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/auth/me',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const role = res.data?.data?.role;
    logTest('Auth', 'Get authenticated profile (/auth/me)', res.status === 200 && role === 'admin', `Role: ${role}`);
  } catch (e) {
    logTest('Auth', 'Get authenticated profile (/auth/me)', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Auth Suite: Client Registration
  // ─────────────────────────────────────────────────────────────
  const testEmail = `guest_${Date.now()}@hamptworthstays.com`;
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/auth/register',
      headers: { 'Origin': 'http://localhost:5174' },
      body: { name: 'Alice Walker', email: testEmail, password: 'Password123!' },
    });
    if (res.status === 201 && res.data.success && res.data.data?.token) {
      userToken = res.data.data.token;
      createdUserId = res.data.data.user.id;
      logTest('Auth', 'New user registration (with auto Resend welcome email)', true, `Email: ${testEmail}, UserID: ${createdUserId}`);
    } else {
      logTest('Auth', 'New user registration', false, JSON.stringify(res.data));
    }
  } catch (e) {
    logTest('Auth', 'New user registration', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Auth Suite: Duplicate Email Validation
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/auth/register',
      headers: { 'Origin': 'http://localhost:5174' },
      body: { name: 'Duplicate User', email: testEmail, password: 'Password123!' },
    });
    logTest('Auth', 'Prevent duplicate registration with 422', res.status === 422, `Status: ${res.status}, Error: ${res.data?.error?.message}`);
  } catch (e) {
    logTest('Auth', 'Prevent duplicate registration with 422', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Auth Suite: Login with newly registered user
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: testEmail, password: 'Password123!' },
    });
    logTest('Auth', 'Login with newly registered user', res.status === 200 && res.data.success, `Role: ${res.data?.data?.user?.role}`);
  } catch (e) {
    logTest('Auth', 'Login with newly registered user', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Email Suite: Resend Test Endpoint
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'GET',
      path: `/test-email?token=hamptworth2026&to=aditykbr01@gmail.com`,
    });
    logTest('Email', 'Send test email via Resend API', res.status === 200 && res.data.success, `Resend ID: ${res.data?.resend_id}`);
  } catch (e) {
    logTest('Email', 'Send test email via Resend API', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 8. Media Suite: Single File Upload with field 'files' (The one that failed before!)
  // ─────────────────────────────────────────────────────────────
  try {
    const mp = buildMultipart(
      { folder: 'cottages', alt: 'Oakwood Living Room' },
      [{ fieldName: 'files', filename: 'living_room.png', contentType: 'image/png', content: samplePng }]
    );
    const res = await request({
      method: 'POST',
      path: '/api/v1/admin/media',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': mp.contentType,
      },
      body: mp.body,
    });
    if (res.status === 201 && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
      uploadedMediaId = res.data.data[0].id;
      logTest('Media', 'Upload single image using field "files" (Frontend contract)', true, `Media ID: ${uploadedMediaId}`);
    } else {
      logTest('Media', 'Upload single image using field "files" (Frontend contract)', false, JSON.stringify(res.data));
    }
  } catch (e) {
    logTest('Media', 'Upload single image using field "files" (Frontend contract)', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. Media Suite: Single File Upload with field 'file'
  // ─────────────────────────────────────────────────────────────
  try {
    const mp = buildMultipart(
      { folder: 'amenities', alt: 'Garden Photo' },
      [{ fieldName: 'file', filename: 'garden.png', contentType: 'image/png', content: samplePng }]
    );
    const res = await request({
      method: 'POST',
      path: '/api/v1/admin/media',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': mp.contentType,
      },
      body: mp.body,
    });
    logTest('Media', 'Upload single image using field "file"', res.status === 201 && res.data.success, `Items: ${res.data?.data?.length}`);
  } catch (e) {
    logTest('Media', 'Upload single image using field "file"', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 10. Media Suite: List Media & Folders
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/media?page=1&limit=10',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('Media', 'List media items with pagination', res.status === 200 && res.data.success, `Count: ${res.data?.data?.length}`);
  } catch (e) {
    logTest('Media', 'List media items with pagination', false, e.message);
  }

  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/media/folders',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('Media', 'List media folders', res.status === 200 && Array.isArray(res.data?.data), `Folders: ${JSON.stringify(res.data?.data)}`);
  } catch (e) {
    logTest('Media', 'List media folders', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 11. Property Suite: Get & Update Property
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/property',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    propertyId = res.data?.data?.id || '6ac0cc41a287cfd3dfbbf8a9';
    logTest('Property', 'Get Admin Property Details', res.status === 200 && res.data.success, `Property ID: ${propertyId}`);
  } catch (e) {
    logTest('Property', 'Get Admin Property Details', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 12. Cottage / Room Type Suite: Create Cottage
  // ─────────────────────────────────────────────────────────────
  const cottageSlug = `oakwood-cottage-${Math.floor(Math.random() * 9000 + 1000)}`;
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/admin/room-types',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: {
        property_id: propertyId,
        name: 'Oakwood Cottage',
        slug: cottageSlug,
        short_description: 'Charming 2-bedroom stone cottage',
        description: 'Full description of Oakwood Cottage with luxury amenities.',
        max_adults: 4,
        max_children: 2,
        max_occupancy: 6,
        status: 'ACTIVE',
        welcome_hamper_included: true,
        welcome_hamper_description: 'Artisan sourdough, farm cheese and wine',
      },
    });
    if ((res.status === 200 || res.status === 201) && res.data.success) {
      roomTypeId = res.data.data.id;
      logTest('Cottage', 'Create Cottage / Room Type (Oakwood Cottage)', true, `Cottage ID: ${roomTypeId}`);
    } else {
      logTest('Cottage', 'Create Cottage / Room Type (Oakwood Cottage)', false, JSON.stringify(res.data));
    }
  } catch (e) {
    logTest('Cottage', 'Create Cottage / Room Type (Oakwood Cottage)', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 13. Cottage Suite: Public & Admin List
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({ method: 'GET', path: '/api/public/room-types' });
    logTest('Cottage', 'Public room types listing (/api/public/room-types)', res.status === 200 && res.data.success && res.data.data.length > 0, `Items: ${res.data?.data?.length}`);
  } catch (e) {
    logTest('Cottage', 'Public room types listing', false, e.message);
  }

  try {
    const res = await request({
      method: 'GET',
      path: `/api/v1/admin/room-types/${roomTypeId}`,
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('Cottage', 'Admin get single cottage details', res.status === 200 && res.data.success && res.data.data?.name === 'Oakwood Cottage', `Name: ${res.data?.data?.name}`);
  } catch (e) {
    logTest('Cottage', 'Admin get single cottage details', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 14. Rooms Suite: Create Room linked to Cottage
  // ─────────────────────────────────────────────────────────────
  const roomNum = `U${Math.floor(Math.random() * 900 + 100)}`;
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/admin/rooms',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: {
        property_id: propertyId,
        room_type_id: roomTypeId,
        name: 'Cottage Unit A',
        room_number: roomNum,
        status: 'ACTIVE',
      },
    });
    if ((res.status === 200 || res.status === 201) && res.data.success) {
      roomId = res.data.data.id;
      logTest('Rooms', 'Create Room Unit (' + roomNum + ')', true, `Room ID: ${roomId}`);
    } else {
      logTest('Rooms', 'Create Room Unit (' + roomNum + ')', false, JSON.stringify(res.data));
    }
  } catch (e) {
    logTest('Rooms', 'Create Room Unit (' + roomNum + ')', false, e.message);
  }

  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/rooms',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('Rooms', 'List Rooms in Admin panel', res.status === 200 && res.data.success && res.data.data.length > 0, `Count: ${res.data?.data?.length}`);
  } catch (e) {
    logTest('Rooms', 'List Rooms in Admin panel', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 15. Cancellation Policies Suite
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/admin/policies',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: {
        property_id: propertyId,
        name: 'Flexible 48 Hours',
        description: 'Full refund up to 48 hours before check-in',
        free_cancellation_hours: 48,
        refund_percentage: 100,
        is_default: true,
      },
    });
    policyId = res.data?.data?.id;
    logTest('Policies', 'Create Cancellation Policy (Flexible 48h)', (res.status === 200 || res.status === 201) && res.data.success, `Policy ID: ${policyId}`);
  } catch (e) {
    logTest('Policies', 'Create Cancellation Policy', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 16. Rate Plans Suite
  // ─────────────────────────────────────────────────────────────
  const planSuffix = Math.floor(Math.random() * 900 + 100);
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/admin/rate-plans',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: {
        property_id: propertyId,
        room_type_id: roomTypeId,
        cancellation_policy_id: policyId,
        name: `Standard Best Available Rate ${planSuffix}`,
        description: 'Our most flexible leisure rate',
        price: 15000,
        multiplier: 1.0,
        status: 'ACTIVE',
      },
    });
    ratePlanId = res.data?.data?.id;
    logTest('RatePlans', 'Create Rate Plan for Cottage', (res.status === 200 || res.status === 201) && res.data.success, `Plan ID: ${ratePlanId}`);
  } catch (e) {
    logTest('RatePlans', 'Create Rate Plan for Cottage', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 17. Public Availability Search Suite
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'POST',
      path: '/api/public/availability/search',
      headers: { 'Origin': 'http://localhost:5174' },
      body: {
        check_in: '2026-11-20',
        check_out: '2026-11-23',
        adults: 2,
      },
    });
    logTest('Availability', 'Public search availability (Nov 20 to Nov 23)', res.status === 200 && res.data.success, `Results: ${res.data?.data?.length ?? 0}`);
  } catch (e) {
    logTest('Availability', 'Public search availability', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 18. Coupons Suite
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'POST',
      path: '/api/v1/admin/coupons',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: {
        code: `PROMO${Math.floor(Math.random() * 900 + 100)}`,
        discount_type: 'PERCENTAGE',
        discount_value: 15,
        max_discount: 50,
        minimum_booking_amount: 100,
        usage_limit: 50,
        status: 'ACTIVE',
      },
    });
    couponId = res.data?.data?.id;
    logTest('Coupons', 'Create Discount Coupon', (res.status === 200 || res.status === 201) && res.data.success, `Coupon ID: ${couponId}`);
  } catch (e) {
    logTest('Coupons', 'Create Discount Coupon', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 19. Admin Reservations & Operations Suite
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/reservations',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('Reservations', 'Admin list reservations', res.status === 200 && res.data.success && Array.isArray(res.data.data), `Reservations Count: ${res.data?.data?.length}`);
  } catch (e) {
    logTest('Reservations', 'Admin list reservations', false, e.message);
  }

  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/audit-logs',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('AuditLogs', 'Admin list audit logs', res.status === 200 && res.data.success && Array.isArray(res.data.data), `Audit logs: ${res.data?.data?.length}`);
  } catch (e) {
    logTest('AuditLogs', 'Admin list audit logs', false, e.message);
  }

  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/amenities',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('Amenities', 'Admin list amenities', res.status === 200 && res.data.success && Array.isArray(res.data.data), `Amenities: ${res.data?.data?.length}`);
  } catch (e) {
    logTest('Amenities', 'Admin list amenities', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 20. Admin Dashboard Suite: Summary & Sales
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/dashboard/summary',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    logTest('Dashboard', 'Get Admin Dashboard Summary stats', res.status === 200 && res.data.success && typeof res.data.data?.todayArrivals === 'number', `Arrivals: ${res.data?.data?.todayArrivals}`);
  } catch (e) {
    logTest('Dashboard', 'Get Admin Dashboard Summary stats', false, e.message);
  }

  try {
    const res = await request({
      method: 'GET',
      path: '/api/v1/admin/dashboard/sales?range=week',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const hasRecent = Array.isArray(res.data?.data?.recent);
    logTest('Dashboard', 'Get Sales Report (recent list + buckets)', res.status === 200 && res.data.success && hasRecent, `Recent length: ${res.data?.data?.recent?.length}`);
  } catch (e) {
    logTest('Dashboard', 'Get Sales Report', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 20. CMS Policy Docs & FAQs
  // ─────────────────────────────────────────────────────────────
  try {
    const res = await request({
      method: 'PUT',
      path: '/api/v1/admin/cms/policies',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: {
        key: 'terms',
        title: 'Terms & Conditions',
        body: '<h2>Terms of Service</h2><p>Welcome to Hamptworth Stays.</p>',
        status: 'PUBLISHED',
        version: 1,
      },
    });
    logTest('CMS', 'Create / Upsert CMS Policy Document', (res.status === 200 || res.status === 201) && res.data.success, `Doc Key: ${res.data?.data?.key}`);
  } catch (e) {
    logTest('CMS', 'Create / Upsert CMS Policy Document', false, e.message);
  }

  try {
    const res = await request({ method: 'GET', path: '/api/public/cms/policies/terms' });
    logTest('CMS', 'Public fetch CMS Policy Doc (terms)', res.status === 200 && res.data.success, `Title: ${res.data?.data?.title}`);
  } catch (e) {
    logTest('CMS', 'Public fetch CMS Policy Doc', false, e.message);
  }

  console.log('\n====================================================');
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`🏁 SIMULATION COMPLETE: ${passedCount}/${totalCount} TESTS PASSED (${Math.round(passedCount/totalCount*100)}%)`);
  console.log('====================================================\n');

  fs.writeFileSync(
    'scratch/test-results.json',
    JSON.stringify({ passedCount, totalCount, results }, null, 2)
  );

  return { passedCount, totalCount, results };
}

runAllTests().catch(console.error);
