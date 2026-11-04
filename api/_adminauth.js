// Admin login ka cookie jaanchna (admin.js aur ai.js dono use karte hain)
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const PASS = () => process.env.ADMIN_PASSWORD || '';
async function hmac(message) {
  const key = await crypto.subtle.importKey('raw', enc.encode((process.env.RTUHUB_SECRET || 'rtuhub') + '|admin|' + PASS()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}
export const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export const YEAR = 365 * 86400;
export async function mint() { const exp = Date.now() + YEAR * 1000; return exp + '.' + await hmac('admin.v1.' + exp); }
export async function authed(request) {
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)rh_admin=([^;]+)/);
  const [exp, sig] = String(m ? m[1] : '').split('.');
  if (!PASS() || !/^\d+$/.test(exp || '') || !sig || +exp < Date.now()) return false;
  return same(await hmac('admin.v1.' + exp), sig);
}



// Vercel Cron (ya hamara apna agla step) "Authorization: Bearer CRON_SECRET" bhejta hai
export const isCron = request => { const s = String((typeof process !== 'undefined' && process.env.CRON_SECRET) || ''); const h = request.headers.get('authorization') || ''; return s.length >= 16 && same(h, 'Bearer ' + s); };
