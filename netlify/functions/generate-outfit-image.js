// netlify/functions/generate-outfit-image.js
// Uses Together AI FLUX.1 for high-quality AI fashion image generation.
// TOGETHER_API_KEY must be set in Netlify environment variables.
// Free key at: https://api.together.ai (sign up → API Keys)

const https = require('https');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.error('TOGETHER_API_KEY is not set');
    return json(500, { error: 'Together AI key not configured. Add TOGETHER_API_KEY to Netlify env vars.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body.' });
  }

  const prompt = buildPrompt(payload);
  console.log('FLUX prompt:', prompt.slice(0, 180));

  try {
    const images = await generateWithFlux(apiKey, prompt);
    return json(200, { images });
  } catch (err) {
    console.error('FLUX error:', err.message);
    return json(502, { error: err.message });
  }
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt({ gender, bodyShape, skinTone, hairColor, hairStyle, ageRange, occasion, outfitDescription }) {
  const g      = (gender    || 'person').toLowerCase().replace('non-binary', 'person');
  const shape  = bodyShape  ? `${bodyShape.toLowerCase()} body type` : '';
  const skin   = skinTone   ? `${skinTone.toLowerCase()} complexion` : '';
  const hair   = [hairColor, hairStyle].filter(Boolean).map(s => s.toLowerCase()).join(' ') + (hairColor ? ' hair' : '');
  const age    = ageRange   || '';
  const occ    = (occasion  || 'casual').split('/')[0].trim().toLowerCase();
  const outfit = outfitDescription || 'stylish contemporary outfit';

  const personDesc = [g, shape, skin, hair, age].filter(Boolean).join(', ');

  return [
    'Professional fashion editorial photograph,',
    `full body portrait of a ${personDesc},`,
    `wearing ${outfit},`,
    `${occ} occasion,`,
    'soft studio lighting, clean neutral background,',
    'fashion magazine quality, sharp focus, detailed clothing textures, natural confident pose.',
  ].join(' ').replace(/\s+/g, ' ').trim();
}

// ── Together AI FLUX.1 call ───────────────────────────────────────────────────

function generateWithFlux(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt,
      width: 768,
      height: 1024,
      steps: 4,
      n: 1,
      response_format: 'base64',
    });

    const options = {
      hostname: 'api.together.xyz',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.data && data.data.length > 0 && data.data[0].b64_json) {
            resolve([{ base64: data.data[0].b64_json, mimeType: 'image/jpeg' }]);
          } else {
            const errMsg = data.error?.message || JSON.stringify(data).slice(0, 300);
            reject(new Error(errMsg));
          }
        } catch {
          reject(new Error('Non-JSON response from Together AI'));
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
