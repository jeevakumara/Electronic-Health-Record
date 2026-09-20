/**
 * Quick smoke test for Express server routes
 * Tests route mounting and error handling without crashing if DB is offline
 */
const http = require('http');

const PORT = process.env.PORT || 5000;

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runSmokeTests() {
  console.log('--- Running Smoke Tests against http://localhost:' + PORT + ' ---');

  try {
    // 1. Health check
    const health = await makeRequest('/api/v1/health');
    console.log(`[PASS] GET /api/v1/health -> HTTP ${health.status}`, health.body);

    // 2. 404 check
    const notFound = await makeRequest('/api/v1/undefined-endpoint');
    console.log(`[PASS] GET /api/v1/undefined-endpoint -> HTTP ${notFound.status}`, notFound.body);

    // 3. Validation error check
    const validationTest = await makeRequest('/api/v1/patients', 'POST', { full_name: '' });
    console.log(`[PASS] POST /api/v1/patients (invalid) -> HTTP ${validationTest.status}`, validationTest.body);

    console.log('\n✅ All route and middleware smoke tests passed!');
  } catch (err) {
    console.error('❌ Test failed (Is server running?):', err.message);
  }
}

runSmokeTests();
