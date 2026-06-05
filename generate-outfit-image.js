// netlify/functions/generate-outfit-image.js
// MODE 1 (photo uploaded): InstructPix2Pix — edits user's photo to wear the outfit
// MODE 2 (no photo):       FLUX.1-schnell  — generates a model matching profile

const https = require('https');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const token = process.env.HF_TOKEN;
  if (!token) return json(500, { error: 'HF_TOKEN not set in Netlify env vars.' });

  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Bad request' }); }

  const { gender, bodyShape, skinTone, hairColor, hairStyle, ageRange, occasion, outfitDescription, photoBase64, photoMimeType } = p;
  const outfit = outfitDescription || 'stylish outfit';
  const occ    = (occasion || 'casual').split('/')[0].trim().toLowerCase();

  try {
    let buf;

    if (photoBase64) {
      // ── MODE 1: Edit user's photo with InstructPix2Pix ───────────────────────
      console.log('Mode: InstructPix2Pix (user photo)');
      const instruction = `Change this person's outfit to: ${outfit}. Keep their face, hair, skin tone and body shape exactly the same. Only change the clothing and shoes.`;
      buf = await callHuggingFace(
        token,
        '/hf-inference/models/timbrooks/instruct-pix2pix',
        JSON.stringify({
          inputs: photoBase64,
          parameters: {
            prompt: instruction,
            image_guidance_scale: 1.8,
            guidance_scale: 8,
            num_inference_steps: 25,
          }
        })
      );
    } else {
      // ── MODE 2: Text-to-image with FLUX ──────────────────────────────────────
      console.log('Mode: FLUX text-to-image (no photo)');
      const g      = (gender    || 'person').toLowerCase().replace('non-binary', 'person');
      const shape  = bodyShape  ? bodyShape.toLowerCase() + ' body type' : '';
      const skin   = skinTone   ? skinTone.toLowerCase() + ' skin' : '';
      const hair   = [hairColor, hairStyle].filter(Boolean).map(s => s.toLowerCase()).join(' ') + (hairColor ? ' hair' : '');
      const age    = ageRange   || '';
      const desc   = [shape, skin, hair, age].filter(Boolean).join(', ');
      const prompt = `Fashion editorial photograph, full body portrait of a ${g}${desc ? ', ' + desc : ''}, wearing ${outfit}, ${occ} occasion, studio lighting, clean background, high quality`.replace(/\s+/g, ' ').trim();

      buf = await callHuggingFace(
        token,
        '/hf-inference/models/black-forest-labs/FLUX.1-schnell',
        JSON.stringify({ inputs: prompt })
      );
    }

    // Detect JSON error response (starts with '{')
    if (buf[0] === 123) {
      const msg = buf.toString('utf8').slice(0, 300);
      console.error('HF returned JSON instead of image:', msg);
      return json(502, { error: msg });
    }

    return json(200, { images: [{ base64: buf.toString('base64'), mimeType: 'image/jpeg' }] });

  } catch (e) {
    console.error('Error:', e.message);
    return json(502, { error: e.message });
  }
};

// ── Shared HuggingFace caller ─────────────────────────────────────────────────

function callHuggingFace(token, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'router.huggingface.co',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function json(statusCode, data) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
