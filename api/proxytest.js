// TEMPORARY (sirf proxy-test branch): har proxy port ka IPv4 / IPv6 / Groq test. Credentials sirf env se; response mein kabhi nahi.
import { proxyFetch, proxyConfig } from './_proxy.js';

export const config = { maxDuration: 60 };

const ip = async (url, port) => {
  const t = Date.now();
  try {
    const signal = AbortSignal.timeout(15000);
    const res = port ? await proxyFetch(url, { signal }, port) : await fetch(url, { signal });
    const text = (await res.text()).slice(0, 120);
    return { status: res.status, ms: Date.now() - t, body: text };
  } catch (e) { return { error: String(e && (e.proxyStatus ? e.message : e.name + ': ' + e.message)).slice(0, 120), ms: Date.now() - t }; }
};

export default async function handler(req, res) {
  const cfg = proxyConfig();
  const groq = [1, 2, 3, 4, 5].map(n => process.env['GROQ_API_KEY_' + n]);
  const out = { node: process.version, region: process.env.VERCEL_REGION || '', configured: !!(cfg.host && cfg.user && cfg.pass), ports: cfg.ports, direct: { v4: await ip('https://api.ipify.org?format=json') }, proxies: [] };
  out.proxies = await Promise.all(cfg.ports.map(async (port, i) => {
    const row = { port, v4: await ip('https://api.ipify.org?format=json', port), v6: await ip('https://api6.ipify.org?format=json', port) };
    if (groq[i]) {
      const t = Date.now();
      try {
        const r = await proxyFetch('https://api.groq.com/openai/v1/models', { headers: { authorization: 'Bearer ' + groq[i] }, signal: AbortSignal.timeout(15000) }, port);
        await r.text();
        row.groq = { slot: 'GROQ_API_KEY_' + (i + 1), status: r.status, ms: Date.now() - t };
      } catch (e) { row.groq = { slot: 'GROQ_API_KEY_' + (i + 1), error: String(e && e.message).slice(0, 100) }; }
    }
    return row;
  }));
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.statusCode = 200;
  res.end(JSON.stringify(out, null, 1));
}
