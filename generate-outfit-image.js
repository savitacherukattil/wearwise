// netlify/functions/generate-outfit-image.js
// Fetches an AI outfit image from Pollinations.ai (free, no API key needed)
// and returns it as base64 JSON — bypasses browser CSP entirely.

const https = require('https');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body.' });
  }

  const prompt = buildPrompt(payload);
  console.log('Generating image for prompt:', prompt.slice(0, 100));

  try {
    const imageBuffer = await fetchPollinationsImage(prompt);
    const base64 = imageBuffer.toString('base64');
    return json(200, {
      images: [{ base64, mimeType: 'image/jpeg' }]
    });
  } catch (err) {
    console.error('Image fetch error:', err.message);
    return json(502, { error: err.message });
  }
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt({ gender, bodyShape, skinTone, hairColor, hairStyle, ageRange, occasion, outfitDescription }) {
  const g      = (gender    || 'person').toLowerCase().replace('non-binary', 'person');
  const shape  = bodyShape  ? bodyShape.toLowerCase() + ' body type' : '';
  const skin   = skinTone   ? skinTone.toLowerCase() + ' complexion' : '';
  const hair   = [hairColor, hairStyle].filter(Boolean).map(s => s.toLowerCase()).join(' ') + (hairColor ? ' hair' : '');
  const age    = ageRange   || '';
  const occ    = (occasion  || 'casual').split('/')[0].trim().toLowerCase();
  const outfit = outfitDescription || 'stylish contemporary outfit';

  const personDesc = [shape, skin, hair, age].filter(Boolean).join(', ');

  return `Professional fashion editorial photograph, full body portrait of a ${g}${personDesc ? ', ' + personDesc : ''}, wearing ${outfit}, ${occ} occasion, soft studio lighting, clean neutral background, fashion magazine quality, sharp focus, natural confident pose`
    .replace(/\s+/g, ' ').trim();
}

// ── Fetch image from Pollinations ─────────────────────────────────────────────

function fetchPollinationsImage(prompt) {
  const seed = Math.floor(Math.random() * 999999);
  const url  = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&nologo=true&seed=${seed}`;

  return new Promise((resolve, reject) => {
    fetchWithRedirects(url, 3, resolve, reject);
  });
}

function fetchWithRedirects(url, redirectsLeft, resolve, reject) {
  const lib = url.startsWith('https') ? https : require('http');
  lib.get(url, (res) => {
    // Follow redirects (Pollinations sometimes redirects)
    if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirectsLeft > 0) {
      fetchWithRedirects(res.headers.location, redirectsLeft - 1, resolve, reject);
      return;
    }
    if (res.statusCode !== 200) {
      reject(new Error(`Pollinations returned status ${res.statusCode}`));
      return;
    }
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end',  ()    => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  }).on('error', reject);
}

// ── Helper ────────────────────────────────────────────────────────────────────

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
