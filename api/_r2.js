// =====================================================================
//  Storage se paper lana.
//  Abhi: public R2 link se.  Bucket PRIVATE karne ke baad: Vercel env mein ye 4 daalo —
//    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//  tab ye file signed (S3 SigV4) request bhejti hai aur public link ki zaroorat nahi rehti.
// =====================================================================
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
async function hmac(key, text) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(text));
}
const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
// har hissa RFC 3986 ke hisaab se encode: space, &, ( ) sab
export const encodePath = path => path.split('/').map(s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/');

// AWS Signature V4 ke headers (GET khaali body; PUT ke liye method + body ka hash do)
export async function signedHeaders({ host, path, query = '', region, accessKey, secretKey, range, now = new Date(), method = 'GET', payloadHash = EMPTY_HASH }) {
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const headers = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  if (range) headers.range = range;
  const names = Object.keys(headers).sort();
  const canonical = [method, path, query, ...names.map(n => `${n}:${headers[n]}`), '', names.join(';'), payloadHash].join('\n');
  const scope = `${day}/${region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonical)].join('\n');
  let key = await hmac('AWS4' + secretKey, day);
  for (const part of [region, 's3', 'aws4_request']) key = await hmac(key, part);
  const signature = hex(await hmac(key, toSign));
  delete headers.host;
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope},SignedHeaders=${names.join(';')},Signature=${signature}`;
  return headers;
}

export async function fetchPaper(path, range) {
  const env = process.env;
  const key = (env.R2_PREFIX ?? 'BTECH/') + path;
  if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET) {
    const host = `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, p = '/' + encodePath(env.R2_BUCKET + '/' + key);
    const headers = await signedHeaders({ host, path: p, region: 'auto', accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY, range });
    return fetch(`https://${host}${p}`, { headers });
  }
  const base = env.R2_PUBLIC_BASE || 'https://pub-b038a4e459b348ca866cf5ebc2e874ac.r2.dev/';
  return fetch(base + encodePath(key), { headers: range ? { range } : {} });
}

// =====================================================================
//  SYLLABUS bucket (private). Vercel env:
//    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY   (wahi jo PYQ ke liye)
//    ya alag token ho to SYLLABUS_ACCESS_KEY_ID, SYLLABUS_SECRET_ACCESS_KEY
//    SYLLABUS_BUCKET (default: syllabus)
// =====================================================================
const q = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function sylEnv(bucket) {
  const env = process.env;
  const accessKey = env.SYLLABUS_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID, secretKey = env.SYLLABUS_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY;
  if (!accessKey || !secretKey) return null;
  const account = env.SYLLABUS_ACCOUNT_ID || env.R2_ACCOUNT_ID || '9cb0f8d74fc864ae1a1b3ae541ed0e11';
  return { host: `${account}.r2.cloudflarestorage.com`, bucket: bucket || env.SYLLABUS_BUCKET || 'syllabus', accessKey, secretKey };
}
export const syllabusReady = () => !!sylEnv();

export async function fetchSyllabusFile(key, range, bucket) {
  const e = sylEnv(bucket);
  if (!e) return new Response('', { status: 503 });
  const p = '/' + encodePath(e.bucket + '/' + key);
  const headers = await signedHeaders({ host: e.host, path: p, region: 'auto', accessKey: e.accessKey, secretKey: e.secretKey, range });
  return fetch(`https://${e.host}${p}`, { headers });
}

const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
// bucket ki saari files: [[key, size], ...]
export async function listSyllabus(bucket, prefix = '') {
  const e = sylEnv(bucket);
  if (!e) return null;
  const out = [];
  let token = '';
  for (let round = 0; round < 40; round++) {
    const params = { 'list-type': '2', 'max-keys': '1000' };
    if (prefix) params.prefix = prefix;
    if (token) params['continuation-token'] = token;
    const query = Object.keys(params).sort().map(k => q(k) + '=' + q(params[k])).join('&');
    const p = '/' + encodePath(e.bucket);
    const headers = await signedHeaders({ host: e.host, path: p, query, region: 'auto', accessKey: e.accessKey, secretKey: e.secretKey });
    const res = await fetch(`https://${e.host}${p}?${query}`, { headers });
    if (!res.ok) throw new Error('list ' + res.status);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const k = (m[1].match(/<Key>([\s\S]*?)<\/Key>/) || [])[1], size = (m[1].match(/<Size>(\d+)<\/Size>/) || [])[1];
      if (k) out.push([unxml(k), +size || 0]);
    }
    const next = (xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1];
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml) || !next) break;
    token = unxml(next);
  }
  return out;
}
