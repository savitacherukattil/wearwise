// netlify/functions/style-advice.js
const https = require('https');

exports.handler = async function (event) {

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set');
    return json(500, { error: 'Server configuration error: API key not set.' });
  }

  // Parse request body
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid request body: ' + e.message });
  }

  if (!payload.messages || !Array.isArray(payload.messages)) {
    return json(400, { error: 'Missing or invalid messages array.' });
  }

  // Build Anthropic request body
  const requestBody = JSON.stringify({
    model: payload.model || 'claude-sonnet-4-6',
    max_tokens: payload.max_tokens || 1000,
    messages: payload.messages,
  });

  // Call Anthropic API
  try {
    const result = await callAnthropic(apiKey, requestBody);
    console.log('Anthropic status:', result.status);
    return json(result.status, result.data);
  } catch (err) {
    console.error('Anthropic call failed:', err.message);
    return json(502, { error: 'Failed to reach AI service: ' + err.message });
  }
};

// ── helpers ──────────────────────────────────────────────────────────────────

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function callAnthropic(apiKey, requestBody) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          // Anthropic returned non-JSON (very unlikely but handle it)
          resolve({ status: res.statusCode, data: { error: 'Non-JSON response from Anthropic: ' + body.slice(0, 200) } });
        }
      });
    });

    req.on('error', (err) => reject(err));

    req.write(requestBody);
    req.end();
  });
}
