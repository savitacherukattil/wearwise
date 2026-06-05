const https = require('https');
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let p;
  try { p = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'Bad request' }; }
  const g = (p.gender || 'person').toLowerCase();
  const shape = p.bodyShape || '';
  const skin = p.skinTone || '';
  const occ = (p.occasion || 'casual').split('/')[0].trim().toLowerCase();
  const outfit = p.outfitDescription || 'stylish outfit';
  const prompt = `Fashion editorial photograph, full body portrait of a ${g}${shape ? ', ' + shape : ''}${skin ? ', ' + skin + ' skin' : ''}, wearing ${outfit}, ${occ} occasion, studio lighting, clean background, high quality`.replace(/\s+/g, ' ').trim();
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&nologo=true&seed=${seed}`;
  try {
    const buf = await new Promise((resolve, reject) => {
      function get(u, r) {
        https.get(u, res => {
          if ((res.statusCode === 301 || res.statusCode === 302) && r > 0) return get(res.headers.location, r - 1);
          const c = [];
          res.on('data', d => c.push(d));
          res.on('end', () => resolve(Buffer.concat(c)));
          res.on('error', reject);
        }).on('error', reject);
      }
      get(url, 3);
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: [{ base64: buf.toString('base64'), mimeType: 'image/jpeg' }] }) };
  } catch (e) {
    return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
