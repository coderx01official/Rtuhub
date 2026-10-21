// =====================================================================
//  VAULT — connector ka OAuth token browser ki HttpOnly cookie mein, taala (AES-GCM) laga kar.
//  JS (aur copy ki hui site) cookie padh nahi sakti; chaabi RTUHUB_SECRET se banti hai, server ke bahar kabhi nahi jaati.
// =====================================================================
const enc = new TextEncoder(), dec = new TextDecoder();
let keyP = null;
function key() {
  return keyP || (keyP = crypto.subtle.digest('SHA-256', enc.encode('rtuhub-vault|' + (process.env.RTUHUB_SECRET || 'rtuhub-in-default-secret-set-RTUHUB_SECRET-in-vercel')))
    .then(raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])));
}
const b64u = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; };

export async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), enc.encode(JSON.stringify(obj))));
  const all = new Uint8Array(iv.length + ct.length); all.set(iv); all.set(ct, iv.length);
  return b64u(all);
}
export async function open(str) {
  try {
    const all = unb64u(String(str || ''));
    if (all.length < 30) return null;
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, await key(), all.slice(12));
    return JSON.parse(dec.decode(pt));
  } catch (e) { return null; }
}
export const VAULT = { github: 'rh_gh', vercel: 'rh_vc' };
export function readVaultCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}
// dono connectors ke token (jo login hue hain)
export async function vaultTokens(request) {
  const out = {};
  for (const [k, c] of Object.entries(VAULT)) { const v = await open(readVaultCookie(request, c)); if (v && v.t) out[k] = v; }
  return out;
}
