const https = require('https');
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const token = process.env.HF_TOKEN;
  if (!token) return { statusCode: 500, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ error: 'HF_TOKEN not set.' }) };
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'Bad request' }; }
  const g = (p.gender || 'person').toLowerCase();
  const shape = p.bodyShape || '';
  const skin = p.skinTone || '';
  const occ = (p.occasion || 'casual').split('/')[0].trim().toLowerCase();
  const outfit = p.outfitDescription || 'stylish outfit';
  const prompt = `Fashion editorial photograph, full body portrait of a ${g}${shape ? ', ' + shape : ''}${skin ? ', ' + skin + ' skin' : ''}, wearing ${outfit}, ${occ} occasion, studio lighting, clean background, high quality`.replace(/\s+/g, ' ').trim();
  try {
    const buf = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ inputs: prompt });
      const options = {
        hostname: 'router.huggingface.co',
        path: '/hf-inference/models/black-forest-labs/FLUX.1-schnell',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
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
    // Check if response is JSON error (not image)
    const first = buf[0];
    if (first === 123) { // starts with '{' = JSON error
      const errMsg = buf.toString('utf8').slice(0, 200);
      return { statusCode: 502, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ error: errMsg }) };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: [{ base64: buf.toString('base64'), mimeType: 'image/jpeg' }] }) };
  } catch (e) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
