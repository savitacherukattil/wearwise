// netlify/functions/outfit-images.js
// Searches Pexels for outfit inspiration images.
// PEXELS_API_KEY must be set in Netlify environment variables.
// Free Pexels account: https://www.pexels.com/api/

const https = require('https');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error('PEXELS_API_KEY is not set');
    return json(500, { error: 'Pexels API key not configured.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body.' });
  }

  const query = (payload.query || 'fashion outfit').slice(0, 120);
  const perPage = Math.min(payload.per_page || 6, 9);

  try {
    const data = await searchPexels(apiKey, query, perPage);
    return json(200, data);
  } catch (err) {
    console.error('Pexels error:', err.message);
    return json(502, { error: err.message });
  }
};

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function searchPexels(apiKey, query, perPage) {
  return new Promise((resolve, reject) => {
    const path = `/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;
    const options = {
      hostname: 'api.pexels.com',
      path,
      method: 'GET',
      headers: { Authorization: apiKey },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Non-JSON response from Pexels'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}
