// =====================================================================
//  Storage se paper lana.
//  Abhi: public R2 link se.  Bucket PRIVATE karne ke baad: Vercel env mein ye 4 daalo —
//    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//  tab ye file signed (S3 SigV4) request bhejti hai aur public link ki zaroorat nahi rehti.
// =====================================================================
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
async function hmac(key, text) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(text));
}
const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
// har hissa RFC 3986 ke hisaab se encode: space, &, ( ) sab
export const encodePath = path => path.split('/').map(s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())).join('/');

// AWS Signature V4 (GET, khaali body) ke headers
export async function signedHeaders({ host, path, region, accessKey, secretKey, range, now = new Date() }) {
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const headers = { host, 'x-amz-content-sha256': EMPTY_HASH, 'x-amz-date': amzDate };
  if (range) headers.range = range;
  const names = Object.keys(headers).sort();
  const canonical = ['GET', path, '', ...names.map(n => `${n}:${headers[n]}`), '', names.join(';'), EMPTY_HASH].join('\n');
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
